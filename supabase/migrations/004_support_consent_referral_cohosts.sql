BEGIN;
REVOKE INSERT,UPDATE,DELETE ON public.consent_records,public.referral_codes FROM anon,authenticated;
ALTER TABLE public.referral_credits ADD COLUMN referral_entry_id uuid UNIQUE REFERENCES public.referral_entries(id) ON DELETE SET NULL;

CREATE FUNCTION public.record_consent(p_document_id uuid,p_version text) RETURNS public.consent_records
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); result public.consent_records;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM public.profiles WHERE id=actor FOR UPDATE;
  PERFORM 1 FROM public.legal_documents WHERE id=p_document_id AND version=p_version FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Document version changed; read the current version' USING ERRCODE='22023'; END IF;
  SELECT * INTO result FROM public.consent_records WHERE user_id=actor AND document_id=p_document_id AND version=p_version ORDER BY accepted_at LIMIT 1;
  IF FOUND THEN RETURN result; END IF;
  INSERT INTO public.consent_records(user_id,document_id,version) VALUES(actor,p_document_id,p_version) RETURNING * INTO result;
  RETURN result;
END $$;
CREATE FUNCTION public.rate_support_message(p_ticket_id uuid,p_message_id uuid,p_rating integer) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF auth.uid() IS NULL OR p_rating IS NULL OR p_rating NOT IN (-1,1) THEN RAISE EXCEPTION 'Invalid rating' USING ERRCODE='22023'; END IF;
  UPDATE public.support_ticket_messages m SET rating=p_rating WHERE m.id=p_message_id AND m.ticket_id=p_ticket_id AND m.is_support
    AND EXISTS(SELECT 1 FROM public.support_tickets t WHERE t.id=p_ticket_id AND t.user_id=auth.uid());
  IF NOT FOUND THEN RAISE EXCEPTION 'Support reply unavailable' USING ERRCODE='42501'; END IF;
END $$;
CREATE FUNCTION public.mark_support_ticket_read(p_ticket_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  UPDATE public.support_tickets SET unread_replies=0 WHERE id=p_ticket_id AND user_id=auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Ticket unavailable' USING ERRCODE='42501'; END IF;
END $$;
CREATE FUNCTION public.validate_support_ticket() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF NEW.reservation_id IS NOT NULL AND current_user IN ('anon','authenticated') AND NOT EXISTS(
    SELECT 1 FROM public.bookings WHERE id=NEW.reservation_id AND auth.uid() IN (guest_id,host_id)) THEN
    RAISE EXCEPTION 'Reservation unavailable' USING ERRCODE='42501'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER support_ticket_booking BEFORE INSERT OR UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.validate_support_ticket();
CREATE FUNCTION public.after_support_reply() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  UPDATE public.support_tickets SET last_reply_at=NEW.created_at,
    status=CASE WHEN NEW.is_support THEN 'WAITING_HOST' ELSE 'IN_PROGRESS' END,
    unread_replies=CASE WHEN NEW.is_support THEN unread_replies+1 ELSE unread_replies END WHERE id=NEW.ticket_id;
  IF NEW.is_support THEN
    INSERT INTO public.notifications(user_id,title,message,type,related_id)
      SELECT user_id,'Réponse du support',left(NEW.content,180),'system',NEW.ticket_id::text FROM public.support_tickets WHERE id=NEW.ticket_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER support_reply_state AFTER INSERT ON public.support_ticket_messages FOR EACH ROW EXECUTE FUNCTION public.after_support_reply();
ALTER TABLE public.support_ticket_messages ADD CONSTRAINT support_content_length CHECK(length(trim(content)) BETWEEN 1 AND 10000) NOT VALID;
ALTER TABLE public.support_tickets ADD CONSTRAINT support_ticket_content CHECK(length(trim(subject)) BETWEEN 3 AND 200 AND length(trim(description)) BETWEEN 3 AND 10000) NOT VALID;

CREATE FUNCTION public.get_or_create_referral_code() RETURNS public.referral_codes
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); result public.referral_codes; new_code text;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM public.profiles WHERE id=actor FOR UPDATE;
  SELECT * INTO result FROM public.referral_codes WHERE user_id=actor;
  IF FOUND THEN RETURN result; END IF;
  new_code='LOCA-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));
  INSERT INTO public.referral_codes(user_id,code,link) VALUES(actor,new_code,NULL) RETURNING * INTO result;
  RETURN result;
END $$;
CREATE FUNCTION public.redeem_referral_code(p_code text) RETURNS public.referral_entries
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); referrer uuid; result public.referral_entries;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM public.profiles WHERE id=actor FOR UPDATE;
  SELECT user_id INTO referrer FROM public.referral_codes WHERE code=upper(trim(p_code));
  IF NOT FOUND OR referrer=actor THEN RAISE EXCEPTION 'Code unavailable' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM public.referral_entries WHERE referee_id=actor) THEN RAISE EXCEPTION 'A referral is already registered'; END IF;
  IF EXISTS(SELECT 1 FROM public.bookings WHERE guest_id=actor AND status='completed') THEN RAISE EXCEPTION 'Register the referral before the first completed stay'; END IF;
  INSERT INTO public.referral_entries(referrer_id,referee_id,referee_name,status,expires_at)
    VALUES(referrer,actor,NULL,'REGISTERED',now()+interval '1 year') RETURNING * INTO result;
  RETURN result;
END $$;
CREATE FUNCTION public.award_referral_credit(p_entry_id uuid,p_amount numeric,p_reason text) RETURNS public.referral_credits
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE entry public.referral_entries; result public.referral_credits;
BEGIN
  IF p_amount IS NULL OR p_amount<=0 OR p_amount>100000 OR coalesce(length(trim(p_reason)),0)<3 THEN RAISE EXCEPTION 'Invalid credit'; END IF;
  SELECT * INTO entry FROM public.referral_entries WHERE id=p_entry_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Referral unavailable'; END IF;
  PERFORM 1 FROM public.profiles WHERE id=entry.referrer_id FOR UPDATE;
  SELECT * INTO result FROM public.referral_credits WHERE referral_entry_id=p_entry_id;
  IF FOUND THEN RETURN result; END IF;
  IF entry.status IN ('BONUS_CREDITED','EXPIRED','FRAUD_DETECTED') OR entry.expires_at<now() OR NOT EXISTS(
    SELECT 1 FROM public.bookings WHERE guest_id=entry.referee_id AND status='completed' AND created_at>=entry.started_at) THEN
    RAISE EXCEPTION 'Referral has not qualified'; END IF;
  IF (SELECT count(*) FROM public.referral_entries WHERE referrer_id=entry.referrer_id AND credited_at>=date_trunc('year',now()))>=20 THEN
    RAISE EXCEPTION 'Annual referral cap reached'; END IF;
  INSERT INTO public.referral_credits(user_id,amount,reason,expires_at,referral_entry_id)
    VALUES(entry.referrer_id,p_amount,p_reason,now()+interval '1 year',entry.id) RETURNING * INTO result;
  UPDATE public.referral_entries SET status='BONUS_CREDITED',bonus_amount=p_amount,credited_at=now() WHERE id=entry.id;
  RETURN result;
END $$;

-- Only calendar and review delegation are exposed in this release. Other
-- capabilities require broader guest-data and financial workflows and are denied.
CREATE FUNCTION public.valid_cohost_permissions(p_permissions jsonb) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
  SELECT coalesce(jsonb_typeof(p_permissions)='object' AND NOT EXISTS(
    SELECT 1 FROM jsonb_each(p_permissions) e WHERE e.key NOT IN ('calendar','reservations','messages','pricing','revenue_view','reviews','guest_info')
      OR jsonb_typeof(e.value)<>'boolean' OR (e.key NOT IN ('calendar','reviews') AND e.value='true'::jsonb)),false);
$$;
CREATE FUNCTION public.cohost_has_permission(p_property_id uuid,p_permission text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT auth.uid() IS NOT NULL AND p_permission IN ('calendar','reviews') AND EXISTS(
    SELECT 1 FROM public.co_hosts c JOIN public.properties p ON p.id=p_property_id AND p.owner_id=c.host_id
    WHERE c.co_host_id=auth.uid() AND c.status='ACTIVE' AND p_property_id=ANY(c.listing_ids) AND c.permissions->p_permission='true'::jsonb);
$$;
CREATE FUNCTION public.invite_cohost(p_email text,p_listing_ids uuid[],p_permissions jsonb,p_revenue_share_type text,p_revenue_share_value numeric)
RETURNS public.co_hosts LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); candidate uuid; result public.co_hosts;
BEGIN
  IF actor IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=actor AND is_host AND kyc_status='VERIFIED') THEN
    RAISE EXCEPTION 'Approved host required' USING ERRCODE='42501'; END IF;
  IF NOT public.valid_cohost_permissions(p_permissions) THEN RAISE EXCEPTION 'Unsupported delegated permission' USING ERRCODE='22023'; END IF;
  IF coalesce(cardinality(p_listing_ids),0) NOT BETWEEN 1 AND 50 OR EXISTS(
    SELECT 1 FROM unnest(p_listing_ids) id WHERE NOT EXISTS(SELECT 1 FROM public.properties p WHERE p.id=id AND p.owner_id=actor)) THEN
    RAISE EXCEPTION 'Select owned listings' USING ERRCODE='42501'; END IF;
  IF p_revenue_share_type IS NULL OR p_revenue_share_type NOT IN ('PERCENTAGE','FIXED_PER_BOOKING','FIXED_MONTHLY') OR
     p_revenue_share_value IS NULL OR p_revenue_share_value<0 OR p_revenue_share_value>10000000 OR
     (p_revenue_share_type='PERCENTAGE' AND p_revenue_share_value>100) THEN RAISE EXCEPTION 'Invalid remuneration terms'; END IF;
  SELECT id INTO candidate FROM public.profiles WHERE lower(email)=lower(trim(p_email)) AND id<>actor;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invitation unavailable; verify the registered account address'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(actor::text||candidate::text||':cohost',0));
  IF EXISTS(SELECT 1 FROM public.co_hosts WHERE host_id=actor AND co_host_id=candidate AND status IN ('PENDING','ACTIVE','SUSPENDED')) THEN
    RAISE EXCEPTION 'A collaboration already exists'; END IF;
  INSERT INTO public.co_hosts(host_id,co_host_id,listing_ids,permissions,revenue_share_type,revenue_share_value)
    VALUES(actor,candidate,p_listing_ids,p_permissions,p_revenue_share_type,p_revenue_share_value) RETURNING * INTO result;
  INSERT INTO public.notifications(user_id,title,message,type,related_id) VALUES(candidate,'Invitation co-hôte','Consultez et acceptez les permissions proposées.','system',result.id::text);
  RETURN result;
END $$;
CREATE FUNCTION public.respond_cohost_invitation(p_cohost_id uuid,p_accept boolean) RETURNS public.co_hosts
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result public.co_hosts;
BEGIN
  IF auth.uid() IS NULL OR p_accept IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  SELECT * INTO result FROM public.co_hosts WHERE id=p_cohost_id AND co_host_id=auth.uid() AND status='PENDING' FOR UPDATE;
  IF NOT FOUND OR NOT public.valid_cohost_permissions(result.permissions) THEN RAISE EXCEPTION 'Invitation unavailable' USING ERRCODE='42501'; END IF;
  UPDATE public.co_hosts SET status=CASE WHEN p_accept THEN 'ACTIVE' ELSE 'TERMINATED' END,
    start_date=CASE WHEN p_accept THEN CURRENT_DATE ELSE NULL END WHERE id=result.id RETURNING * INTO result;
  RETURN result;
END $$;
CREATE FUNCTION public.set_cohost_permissions(p_cohost_id uuid,p_permissions jsonb) RETURNS public.co_hosts
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result public.co_hosts;
BEGIN
  IF NOT public.valid_cohost_permissions(p_permissions) THEN RAISE EXCEPTION 'Unsupported delegated permission'; END IF;
  UPDATE public.co_hosts SET permissions=p_permissions,status='PENDING' WHERE id=p_cohost_id AND host_id=auth.uid() AND status IN ('ACTIVE','PENDING') RETURNING * INTO result;
  IF NOT FOUND THEN RAISE EXCEPTION 'Collaboration unavailable' USING ERRCODE='42501'; END IF;
  INSERT INTO public.notifications(user_id,title,message,type,related_id) VALUES(result.co_host_id,'Permissions modifiées','Votre accord est à nouveau nécessaire.','system',result.id::text);
  RETURN result;
END $$;
CREATE FUNCTION public.terminate_cohost(p_cohost_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  UPDATE public.co_hosts SET status='TERMINATED' WHERE id=p_cohost_id AND auth.uid() IN (host_id,co_host_id) AND status<>'TERMINATED';
  IF NOT FOUND THEN RAISE EXCEPTION 'Collaboration unavailable' USING ERRCODE='42501'; END IF;
END $$;
CREATE POLICY cohost_properties_read ON public.properties FOR SELECT TO authenticated
  USING(public.cohost_has_permission(id,'calendar') OR public.cohost_has_permission(id,'reviews'));
CREATE POLICY cohost_calendar_insert ON public.calendar_days FOR INSERT TO authenticated WITH CHECK(public.cohost_has_permission(property_id,'calendar') AND price_override IS NULL AND min_nights IS NULL);
CREATE POLICY cohost_calendar_update ON public.calendar_days FOR UPDATE TO authenticated USING(public.cohost_has_permission(property_id,'calendar')) WITH CHECK(public.cohost_has_permission(property_id,'calendar'));
CREATE POLICY cohost_calendar_delete ON public.calendar_days FOR DELETE TO authenticated USING(public.cohost_has_permission(property_id,'calendar') AND price_override IS NULL AND min_nights IS NULL);
CREATE FUNCTION public.lock_calendar_property(p_property_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.properties WHERE id=p_property_id AND owner_id=auth.uid()) AND
    NOT public.cohost_has_permission(p_property_id,'calendar') THEN RAISE EXCEPTION 'Calendar unavailable' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM public.properties WHERE id=p_property_id FOR UPDATE;
END $$;
CREATE OR REPLACE FUNCTION public.guard_calendar_write() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
DECLARE listing_id uuid;
BEGIN
  IF current_user NOT IN ('anon','authenticated') THEN RETURN coalesce(NEW,OLD); END IF;
  listing_id=CASE WHEN TG_OP='DELETE' THEN OLD.property_id ELSE NEW.property_id END;
  PERFORM public.lock_calendar_property(listing_id);
  IF (TG_OP<>'INSERT' AND (OLD.status='booked' OR OLD.reservation_id IS NOT NULL)) OR
     (TG_OP<>'DELETE' AND (NEW.status='booked' OR NEW.reservation_id IS NOT NULL)) THEN
    RAISE EXCEPTION 'Booked calendar days are server controlled' USING ERRCODE='42501'; END IF;
  IF TG_OP='UPDATE' AND (NEW.property_id,NEW.date) IS DISTINCT FROM (OLD.property_id,OLD.date) THEN
    RAISE EXCEPTION 'Calendar identity cannot change' USING ERRCODE='42501'; END IF;
  RETURN coalesce(NEW,OLD);
END $$;
CREATE FUNCTION public.guard_cohost_calendar_price() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF current_user IN ('anon','authenticated') AND NOT EXISTS(SELECT 1 FROM public.properties WHERE id=NEW.property_id AND owner_id=auth.uid()) AND
    (NEW.price_override,NEW.min_nights) IS DISTINCT FROM (OLD.price_override,OLD.min_nights) THEN
    RAISE EXCEPTION 'Calendar permission does not grant pricing permission' USING ERRCODE='42501'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER cohost_calendar_price BEFORE UPDATE ON public.calendar_days FOR EACH ROW EXECUTE FUNCTION public.guard_cohost_calendar_price();
CREATE POLICY cohost_review_reply ON public.review_replies FOR INSERT TO authenticated WITH CHECK(
  author_id=auth.uid() AND EXISTS(SELECT 1 FROM public.reviews WHERE id=review_id AND public.cohost_has_permission(property_id,'reviews')));
-- Revocation also applies to editing/deleting replies created during delegation.
DROP POLICY review_replies_update_own ON public.review_replies;
DROP POLICY review_replies_delete_own ON public.review_replies;
CREATE POLICY review_reply_update_authorized ON public.review_replies FOR UPDATE TO authenticated USING(author_id=auth.uid() AND EXISTS(
  SELECT 1 FROM public.reviews r JOIN public.properties p ON p.id=r.property_id WHERE r.id=review_id AND (p.owner_id=auth.uid() OR public.cohost_has_permission(p.id,'reviews'))));
CREATE POLICY review_reply_delete_authorized ON public.review_replies FOR DELETE TO authenticated USING(author_id=auth.uid() AND EXISTS(
  SELECT 1 FROM public.reviews r JOIN public.properties p ON p.id=r.property_id WHERE r.id=review_id AND (p.owner_id=auth.uid() OR public.cohost_has_permission(p.id,'reviews'))));
REVOKE UPDATE ON public.review_replies FROM anon,authenticated;
GRANT UPDATE(text) ON public.review_replies TO authenticated;

REVOKE ALL ON FUNCTION public.record_consent(uuid,text),public.rate_support_message(uuid,uuid,integer),public.mark_support_ticket_read(uuid),
  public.get_or_create_referral_code(),public.redeem_referral_code(text),public.award_referral_credit(uuid,numeric,text),
  public.valid_cohost_permissions(jsonb),public.cohost_has_permission(uuid,text),public.lock_calendar_property(uuid),public.invite_cohost(text,uuid[],jsonb,text,numeric),
  public.respond_cohost_invitation(uuid,boolean),public.set_cohost_permissions(uuid,jsonb),public.terminate_cohost(uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_consent(uuid,text),public.rate_support_message(uuid,uuid,integer),public.mark_support_ticket_read(uuid),
  public.get_or_create_referral_code(),public.redeem_referral_code(text),public.cohost_has_permission(uuid,text),public.lock_calendar_property(uuid),
  public.invite_cohost(text,uuid[],jsonb,text,numeric),public.respond_cohost_invitation(uuid,boolean),public.set_cohost_permissions(uuid,jsonb),public.terminate_cohost(uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_referral_credit(uuid,numeric,text) TO service_role;
COMMIT;
