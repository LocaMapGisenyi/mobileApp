BEGIN;
-- Storage deletion survives an account deletion or an unavailable R2 service.
-- No client access. A scheduled service-role cleanup must drain this outbox.
CREATE TABLE public.storage_deletion_queue (
  key text PRIMARY KEY,
  entity text NOT NULL CHECK(entity IN ('properties','avatars','kyc')),
  queued_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
ALTER TABLE public.storage_deletion_queue ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.storage_deletion_queue FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.storage_deletion_queue TO service_role;

CREATE FUNCTION public.export_account_data(p_user_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb := '{}'::jsonb; t text; rows jsonb;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_user_id) THEN RAISE EXCEPTION 'Account unavailable'; END IF;
  SELECT to_jsonb(p) INTO rows FROM public.profiles p WHERE id=p_user_id;
  result=jsonb_build_object('profile',rows);
  FOREACH t IN ARRAY ARRAY['notification_preferences','payout_accounts','favorites','user_payment_preferences',
      'host_applications','upload_objects','alerts','notifications','message_templates','consent_records',
      'referral_codes','referral_credits','user_bookmarks','course_progress','support_tickets'] LOOP
    EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(t)),''[]''::jsonb) FROM public.%I t WHERE user_id=$1',t) INTO rows USING p_user_id;
    result=result||jsonb_build_object(t,rows);
  END LOOP;
  SELECT coalesce(jsonb_agg(to_jsonb(p)),'[]') INTO rows FROM public.properties p WHERE owner_id=p_user_id;
  result=result||jsonb_build_object('properties',rows);
  SELECT coalesce(jsonb_agg(to_jsonb(b)),'[]') INTO rows FROM public.bookings b WHERE guest_id=p_user_id OR host_id=p_user_id;
  result=result||jsonb_build_object('bookings',rows);
  SELECT coalesce(jsonb_agg(to_jsonb(c)),'[]') INTO rows FROM public.conversations c
    WHERE EXISTS(SELECT 1 FROM public.conversation_participants cp WHERE cp.conversation_id=c.id AND cp.user_id=p_user_id);
  result=result||jsonb_build_object('conversations',rows);
  SELECT coalesce(jsonb_agg(to_jsonb(m)),'[]') INTO rows FROM public.messages m
    WHERE EXISTS(SELECT 1 FROM public.conversation_participants cp WHERE cp.conversation_id=m.conversation_id AND cp.user_id=p_user_id);
  result=result||jsonb_build_object('messages',rows);
  SELECT coalesce(jsonb_agg(to_jsonb(r)),'[]') INTO rows FROM public.reviews r WHERE author_id=p_user_id;
  result=result||jsonb_build_object('reviews',rows);
  SELECT coalesce(jsonb_agg(to_jsonb(r)),'[]') INTO rows FROM public.review_replies r WHERE author_id=p_user_id;
  result=result||jsonb_build_object('review_replies',rows);
  SELECT coalesce(jsonb_agg(to_jsonb(m)),'[]') INTO rows FROM public.support_ticket_messages m
    WHERE EXISTS(SELECT 1 FROM public.support_tickets t WHERE t.id=m.ticket_id AND t.user_id=p_user_id);
  result=result||jsonb_build_object('support_messages',rows);
  SELECT coalesce(jsonb_agg(to_jsonb(r)),'[]') INTO rows FROM public.referral_entries r WHERE referrer_id=p_user_id OR referee_id=p_user_id;
  result=result||jsonb_build_object('referrals',rows);
  SELECT coalesce(jsonb_agg(to_jsonb(c)),'[]') INTO rows FROM public.co_hosts c WHERE host_id=p_user_id OR co_host_id=p_user_id;
  RETURN result||jsonb_build_object('co_hosts',rows);
END $$;

CREATE FUNCTION public.erase_account_data(p_user_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE objects jsonb; conversation_ids uuid[]; booking_ids uuid[];
BEGIN
  PERFORM 1 FROM public.profiles WHERE id=p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Account unavailable'; END IF;
  -- Lock owned listings in deterministic order before examining reservations.
  PERFORM 1 FROM public.properties WHERE owner_id=p_user_id ORDER BY id FOR UPDATE;
  IF EXISTS(SELECT 1 FROM public.bookings WHERE (guest_id=p_user_id OR host_id=p_user_id) AND status IN ('pending','approved')) THEN
    RAISE EXCEPTION 'Resolve pending and approved reservations before deleting the account' USING ERRCODE='23514';
  END IF;
  INSERT INTO public.storage_deletion_queue(key,entity)
    SELECT key,entity FROM public.upload_objects WHERE user_id=p_user_id ON CONFLICT(key) DO NOTHING;
  SELECT coalesce(jsonb_agg(jsonb_build_object('key',key,'entity',entity)),'[]') INTO objects FROM public.upload_objects WHERE user_id=p_user_id;
  SELECT array_agg(conversation_id) INTO conversation_ids FROM public.conversation_participants WHERE user_id=p_user_id;
  SELECT array_agg(id) INTO booking_ids FROM public.bookings WHERE guest_id=p_user_id OR host_id=p_user_id;
  DELETE FROM public.notifications WHERE (type='message' AND related_id=ANY(conversation_ids::text[])) OR (type='booking' AND related_id=ANY(booking_ids::text[]));
  DELETE FROM public.review_replies WHERE author_id=p_user_id;
  DELETE FROM public.reviews WHERE author_id=p_user_id OR booking_id IN (SELECT id FROM public.bookings WHERE guest_id=p_user_id OR host_id=p_user_id);
  UPDATE public.conversations SET last_message_text=NULL,last_message_at=NULL,last_message_sender_id=NULL WHERE last_message_sender_id=p_user_id;
  UPDATE public.calendar_days SET reservation_id=NULL WHERE reservation_id IN (SELECT id FROM public.bookings WHERE guest_id=p_user_id OR host_id=p_user_id);
  DELETE FROM public.messages WHERE sender_id=p_user_id;
  UPDATE public.conversations c SET (last_message_text,last_message_at,last_message_sender_id)=(
    SELECT content,created_at,sender_id FROM public.messages WHERE conversation_id=c.id ORDER BY created_at DESC,id DESC LIMIT 1)
    WHERE c.id=ANY(conversation_ids);
  UPDATE public.conversation_participants cp SET unread_count=(SELECT count(*) FROM public.messages m
    WHERE m.conversation_id=cp.conversation_id AND m.sender_id<>cp.user_id AND NOT m.is_read)
    WHERE cp.conversation_id=ANY(conversation_ids);
  DELETE FROM public.bookings WHERE guest_id=p_user_id OR host_id=p_user_id;
  DELETE FROM public.properties WHERE owner_id=p_user_id;
  DELETE FROM public.support_tickets WHERE user_id=p_user_id;
  DELETE FROM public.referral_entries WHERE referrer_id=p_user_id;
  UPDATE public.referral_entries SET referee_name=NULL WHERE referee_id=p_user_id;
  DELETE FROM public.co_hosts WHERE co_host_id=p_user_id;
  -- Auth identity and dependent profile/sessions are removed in this transaction.
  -- Deliberately service-role only; the Edge function supplies validated user.id.
  DELETE FROM auth.users WHERE id=p_user_id;
  RETURN jsonb_build_object('deleted',true,'objects',objects);
END $$;
REVOKE ALL ON FUNCTION public.export_account_data(uuid),public.erase_account_data(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.export_account_data(uuid),public.erase_account_data(uuid) TO service_role;
COMMIT;
