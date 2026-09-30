-- Additive repair of 001. Apply in a transaction after backing up deployed data.
-- No existing user records are deleted or silently approved by this migration.
BEGIN;
ALTER TABLE public.notification_preferences ADD COLUMN alert_matches boolean NOT NULL DEFAULT true;

CREATE VIEW public.public_profiles WITH (security_barrier = true) AS
SELECT id, full_name, avatar_url, bio, languages, kyc_status, is_host, created_at
FROM public.profiles;
REVOKE ALL ON public.public_profiles FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.public_profiles TO anon, authenticated;
DROP POLICY profiles_select_policy ON public.profiles;
CREATE POLICY profiles_select_private ON public.profiles FOR SELECT USING (id = auth.uid());
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM anon, authenticated;
GRANT UPDATE(full_name, phone_number, avatar_url, bio, languages, preferred_currency, preferred_language)
  ON public.profiles TO authenticated;

CREATE TABLE public.favorites (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,property_id)
);
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY favorites_own ON public.favorites FOR ALL TO authenticated
  USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;

CREATE TABLE public.user_payment_preferences (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK(provider IN ('MTN_MOMO','AIRTEL_MONEY','M_PESA','BANK_TRANSFER','NONE')),
  account_label text NOT NULL DEFAULT '' CHECK(length(account_label)<=120),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_payment_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY payment_preferences_own ON public.user_payment_preferences FOR ALL TO authenticated
  USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_payment_preferences TO authenticated;

CREATE TABLE public.upload_objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  key text NOT NULL UNIQUE,
  entity text NOT NULL CHECK(entity IN ('properties','avatars','kyc')),
  mime_type text NOT NULL CHECK(mime_type IN ('image/jpeg','image/png','image/webp')),
  size_bytes integer NOT NULL CHECK(size_bytes BETWEEN 1 AND 10485760),
  finalizing_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.upload_objects ENABLE ROW LEVEL SECURITY;
CREATE POLICY upload_objects_own ON public.upload_objects FOR SELECT TO authenticated USING(user_id=auth.uid());
REVOKE ALL ON public.upload_objects FROM anon,authenticated;
GRANT SELECT ON public.upload_objects TO authenticated;
GRANT ALL ON public.upload_objects TO service_role;
CREATE FUNCTION public.limit_upload_requests() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.user_id::text||':uploads',0));
  IF (SELECT count(*) FROM public.upload_objects WHERE user_id=NEW.user_id AND created_at>now()-interval '1 hour')>=40 THEN
    RAISE EXCEPTION 'Upload limit reached' USING ERRCODE='54000'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER upload_request_limit BEFORE INSERT ON public.upload_objects FOR EACH ROW EXECUTE FUNCTION public.limit_upload_requests();

CREATE TABLE public.host_applications (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  legal_name text NOT NULL CHECK(length(trim(legal_name)) BETWEEN 2 AND 200),
  document_keys text[] NOT NULL,
  payout_details jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','APPROVED','REJECTED')),
  submitted_at timestamptz NOT NULL DEFAULT now(), reviewed_at timestamptz, review_note text
);
ALTER TABLE public.host_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY host_application_private ON public.host_applications FOR SELECT TO authenticated USING(user_id=auth.uid());
REVOKE ALL ON public.host_applications FROM anon,authenticated;
GRANT SELECT ON public.host_applications TO authenticated;
GRANT ALL ON public.host_applications TO service_role;

CREATE FUNCTION public.submit_host_application(p_legal_name text,p_document_keys text[],p_payout_details jsonb DEFAULT '{}')
RETURNS public.host_applications LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE result public.host_applications; actor uuid := auth.uid();
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  IF length(trim(p_legal_name)) NOT BETWEEN 2 AND 200 OR p_legal_name IS NULL
     OR coalesce(cardinality(p_document_keys),0) NOT BETWEEN 1 AND 5
     OR jsonb_typeof(p_payout_details) <> 'object' OR length(p_payout_details::text)>4000 THEN
    RAISE EXCEPTION 'Invalid application' USING ERRCODE='22023';
  END IF;
  PERFORM 1 FROM public.profiles WHERE id=actor FOR UPDATE;
  IF EXISTS(SELECT 1 FROM public.host_applications WHERE user_id=actor AND status='APPROVED') THEN
    RAISE EXCEPTION 'Application already approved';
  END IF;
  IF EXISTS(SELECT 1 FROM unnest(p_document_keys) k WHERE NOT EXISTS(
      SELECT 1 FROM public.upload_objects u WHERE u.key=k AND u.user_id=actor AND u.entity='kyc' AND u.verified_at IS NOT NULL)) THEN
    RAISE EXCEPTION 'A verified private document is required' USING ERRCODE='22023';
  END IF;
  INSERT INTO public.host_applications(user_id,legal_name,document_keys,payout_details)
  VALUES(actor,trim(p_legal_name),p_document_keys,p_payout_details)
  ON CONFLICT(user_id) DO UPDATE SET legal_name=excluded.legal_name,document_keys=excluded.document_keys,
    payout_details=excluded.payout_details,status='PENDING',submitted_at=now(),reviewed_at=NULL,review_note=NULL
  RETURNING * INTO result;
  UPDATE public.profiles SET kyc_status='PENDING' WHERE id=actor;
  RETURN result;
END $$;

-- This operation is intentionally service-role only: no client can decide KYC.
CREATE FUNCTION public.review_host_application(p_user_id uuid,p_approved boolean,p_note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.host_applications SET status=CASE WHEN p_approved THEN 'APPROVED' ELSE 'REJECTED' END,
    reviewed_at=now(),review_note=p_note WHERE user_id=p_user_id AND status='PENDING';
  IF NOT FOUND THEN RAISE EXCEPTION 'No pending application'; END IF;
  UPDATE public.profiles SET is_host=p_approved,kyc_status=CASE WHEN p_approved THEN 'VERIFIED' ELSE 'REJECTED' END WHERE id=p_user_id;
END $$;

REVOKE INSERT,UPDATE,DELETE ON public.referral_credits FROM anon,authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.referral_entries FROM anon,authenticated;
REVOKE INSERT,UPDATE ON public.notifications FROM anon,authenticated;
GRANT UPDATE(is_read) ON public.notifications TO authenticated;
REVOKE INSERT,UPDATE ON public.payout_accounts FROM anon,authenticated;
GRANT INSERT(user_id,type,account_number,account_name,is_default),UPDATE(type,account_number,account_name,is_default)
  ON public.payout_accounts TO authenticated;
CREATE FUNCTION public.reset_payout_verification() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF current_user IN ('anon','authenticated') AND (NEW.type,NEW.account_number,NEW.account_name) IS DISTINCT FROM
     (OLD.type,OLD.account_number,OLD.account_name) THEN NEW.is_verified=false; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER payout_verification BEFORE UPDATE ON public.payout_accounts FOR EACH ROW EXECUTE FUNCTION public.reset_payout_verification();

ALTER TABLE public.properties ADD COLUMN size numeric, ADD COLUMN visitors_allowed boolean NOT NULL DEFAULT true,
  ADD COLUMN noise_after22 boolean NOT NULL DEFAULT false;
ALTER TABLE public.properties ADD CONSTRAINT valid_property_values CHECK(
  (price_per_month>0 OR (status='DRAFT' AND price_per_month=0)) AND deposit>=0 AND min_duration_months BETWEEN 1 AND 120 AND max_guests BETWEEN 1 AND 100
  AND bedrooms>=0 AND bathrooms>=0 AND (size IS NULL OR size>0)
  AND currency='RWF' AND (latitude IS NULL OR latitude BETWEEN -90 AND 90)
  AND (longitude IS NULL OR longitude BETWEEN -180 AND 180)) NOT VALID;
CREATE FUNCTION public.guard_property_write() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF current_user NOT IN ('anon','authenticated') THEN RETURN NEW; END IF;
  IF TG_OP='INSERT' THEN
    IF NEW.status NOT IN ('DRAFT','PENDING_REVIEW') OR NEW.avg_rating IS NOT NULL OR NEW.review_count<>0
       OR NEW.view_count<>0 OR NEW.revenue_month<>0 OR NEW.occupancy_rate IS NOT NULL THEN
      RAISE EXCEPTION 'Moderation and statistics are server controlled' USING ERRCODE='42501';
    END IF;
  ELSE
    IF NEW.owner_id<>OLD.owner_id OR NEW.id<>OLD.id OR
       (NEW.avg_rating,NEW.review_count,NEW.view_count,NEW.revenue_month,NEW.occupancy_rate)
       IS DISTINCT FROM (OLD.avg_rating,OLD.review_count,OLD.view_count,OLD.revenue_month,OLD.occupancy_rate) THEN
      RAISE EXCEPTION 'Ownership and statistics are server controlled' USING ERRCODE='42501';
    END IF;
    IF NEW.status<>OLD.status AND NOT (
      (OLD.status IN ('DRAFT','PAUSED','PENDING_REVIEW') AND NEW.status IN ('DRAFT','PENDING_REVIEW','ARCHIVED')) OR
      (OLD.status='ACTIVE' AND NEW.status IN ('PAUSED','ARCHIVED'))) THEN
      RAISE EXCEPTION 'Invalid moderation transition' USING ERRCODE='42501';
    END IF;
    IF OLD.status='SUSPENDED' THEN RAISE EXCEPTION 'Suspended listing requires administrator review' USING ERRCODE='42501'; END IF;
    IF OLD.status='ACTIVE' AND NEW.status='ACTIVE' AND
      (to_jsonb(NEW)-ARRAY['updated_at','completion_score']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['updated_at','completion_score']) THEN
      NEW.status='PENDING_REVIEW';
    END IF;
  END IF;
  IF NEW.status='PENDING_REVIEW' AND NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND is_host AND kyc_status='VERIFIED') THEN
    RAISE EXCEPTION 'Host approval required' USING ERRCODE='42501';
  END IF;
  IF NEW.status='PENDING_REVIEW' AND (length(trim(NEW.title))<5 OR coalesce(length(trim(NEW.description)),0)<20 OR
     coalesce(length(trim(NEW.address)),0)<5 OR NEW.latitude IS NULL OR NEW.longitude IS NULL OR
     NOT EXISTS(SELECT 1 FROM public.property_images WHERE property_id=NEW.id)) THEN
    RAISE EXCEPTION 'Complete title, description, address, coordinates and at least one photo before submission' USING ERRCODE='22023';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER properties_guard BEFORE INSERT OR UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.guard_property_write();

CREATE FUNCTION public.review_property_image_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE listing_id uuid:=coalesce(NEW.property_id,OLD.property_id);
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF EXISTS(SELECT 1 FROM public.properties WHERE id=listing_id AND status='SUSPENDED') THEN
      RAISE EXCEPTION 'Suspended listing requires administrator review' USING ERRCODE='42501'; END IF;
    UPDATE public.properties SET status='PENDING_REVIEW' WHERE id=listing_id AND status='ACTIVE';
  END IF;
  RETURN coalesce(NEW,OLD);
END $$;
CREATE TRIGGER property_images_review AFTER INSERT OR UPDATE OR DELETE ON public.property_images FOR EACH ROW EXECUTE FUNCTION public.review_property_image_change();

-- Membership checks bypass the participants RLS only inside this fixed predicate.
CREATE FUNCTION public.is_conversation_member(p_conversation_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.conversation_participants WHERE conversation_id=p_conversation_id AND user_id=auth.uid());
$$;
DROP POLICY conversation_participants_select_own ON public.conversation_participants;
CREATE POLICY conversation_participants_members ON public.conversation_participants FOR SELECT
  USING(public.is_conversation_member(conversation_id));
REVOKE INSERT,UPDATE,DELETE ON public.conversation_participants,public.conversations FROM anon,authenticated;
DROP POLICY messages_insert_policy ON public.messages;
CREATE POLICY messages_insert_member ON public.messages FOR INSERT TO authenticated WITH CHECK(
  sender_id=auth.uid() AND NOT is_read AND public.is_conversation_member(conversation_id)
  AND EXISTS(SELECT 1 FROM public.conversations WHERE id=conversation_id AND status IN ('ACTIVE','ARCHIVED')));
ALTER TABLE public.messages ADD CONSTRAINT message_content_length CHECK(length(trim(content)) BETWEEN 1 AND 5000) NOT VALID;
REVOKE INSERT ON public.messages FROM anon,authenticated;
GRANT INSERT(conversation_id,sender_id,content,template_id) ON public.messages TO authenticated;

CREATE FUNCTION public.get_or_create_conversation(p_other_user_id uuid,p_property_id uuid DEFAULT NULL)
RETURNS public.conversations LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); result public.conversations;
BEGIN
  IF actor IS NULL OR p_other_user_id IS NULL OR actor=p_other_user_id THEN RAISE EXCEPTION 'Invalid participants' USING ERRCODE='42501'; END IF;
  IF p_property_id IS NOT NULL THEN
    IF NOT EXISTS(SELECT 1 FROM public.properties WHERE id=p_property_id AND status='ACTIVE'
       AND owner_id IN (actor,p_other_user_id)) THEN RAISE EXCEPTION 'Active property host required' USING ERRCODE='42501'; END IF;
  ELSIF NOT EXISTS(SELECT 1 FROM public.bookings WHERE (guest_id=actor AND host_id=p_other_user_id) OR (host_id=actor AND guest_id=p_other_user_id)) THEN
    RAISE EXCEPTION 'A property or shared booking is required' USING ERRCODE='42501';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(least(actor::text,p_other_user_id::text)||greatest(actor::text,p_other_user_id::text)||coalesce(p_property_id::text,''),0));
  SELECT c.* INTO result FROM public.conversations c
    WHERE c.property_id IS NOT DISTINCT FROM p_property_id
    AND EXISTS(SELECT 1 FROM public.conversation_participants WHERE conversation_id=c.id AND user_id=actor)
    AND EXISTS(SELECT 1 FROM public.conversation_participants WHERE conversation_id=c.id AND user_id=p_other_user_id)
    AND (SELECT count(*) FROM public.conversation_participants WHERE conversation_id=c.id)=2
    ORDER BY c.created_at LIMIT 1;
  IF FOUND THEN RETURN result; END IF;
  INSERT INTO public.conversations(property_id) VALUES(p_property_id) RETURNING * INTO result;
  INSERT INTO public.conversation_participants(conversation_id,user_id) VALUES(result.id,actor),(result.id,p_other_user_id);
  RETURN result;
END $$;
CREATE FUNCTION public.mark_conversation_read(p_conversation_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NOT public.is_conversation_member(p_conversation_id) THEN RAISE EXCEPTION 'Conversation unavailable' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM public.conversations WHERE id=p_conversation_id FOR UPDATE;
  UPDATE public.messages SET is_read=true WHERE conversation_id=p_conversation_id AND sender_id<>auth.uid() AND NOT is_read;
  UPDATE public.conversation_participants SET unread_count=0 WHERE conversation_id=p_conversation_id AND user_id=auth.uid();
END $$;
CREATE FUNCTION public.set_conversation_status(p_conversation_id uuid,p_status text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NOT public.is_conversation_member(p_conversation_id) OR p_status NOT IN ('ACTIVE','ARCHIVED','REPORTED') OR p_status IS NULL THEN
    RAISE EXCEPTION 'Conversation unavailable or invalid status' USING ERRCODE='42501'; END IF;
  UPDATE public.conversations SET status=p_status WHERE id=p_conversation_id AND status NOT IN ('FROZEN','REPORTED');
  IF NOT FOUND THEN RAISE EXCEPTION 'Moderated conversation'; END IF;
END $$;
CREATE FUNCTION public.after_message_insert() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  -- Same row lock as mark_conversation_read, so counts cannot lose concurrent sends.
  UPDATE public.conversations SET last_message_text=NEW.content,last_message_at=NEW.created_at,
    last_message_sender_id=NEW.sender_id,updated_at=now() WHERE id=NEW.conversation_id;
  UPDATE public.conversation_participants SET unread_count=unread_count+1 WHERE conversation_id=NEW.conversation_id AND user_id<>NEW.sender_id;
  INSERT INTO public.notifications(user_id,title,message,type,related_id)
    SELECT cp.user_id,'Nouveau message',left(NEW.content,180),'message',NEW.conversation_id::text
    FROM public.conversation_participants cp LEFT JOIN public.notification_preferences np ON np.user_id=cp.user_id
    WHERE cp.conversation_id=NEW.conversation_id AND cp.user_id<>NEW.sender_id AND coalesce(np.messages,true);
  RETURN NEW;
END $$;
CREATE TRIGGER messages_server_state AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.after_message_insert();

REVOKE INSERT,UPDATE,DELETE ON public.bookings FROM anon,authenticated;
ALTER TABLE public.bookings ADD CONSTRAINT booking_valid_values CHECK(end_date>start_date AND guest_count>0 AND total_price>0 AND guest_id<>host_id) NOT VALID;
CREATE INDEX bookings_property_dates ON public.bookings(property_id,start_date,end_date) WHERE status='approved';
CREATE FUNCTION public.quote_booking(p_property_id uuid,p_start_date date,p_end_date date,p_guest_count integer DEFAULT 1)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE listing public.properties; total numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  SELECT * INTO listing FROM public.properties WHERE id=p_property_id;
  IF NOT FOUND OR listing.status<>'ACTIVE' OR listing.owner_id=auth.uid() THEN RAISE EXCEPTION 'Property unavailable'; END IF;
  IF p_start_date IS NULL OR p_end_date IS NULL OR p_start_date<CURRENT_DATE OR
    p_end_date-p_start_date<listing.min_duration_months*30 OR p_end_date-p_start_date>3660 OR
    p_guest_count IS NULL OR p_guest_count NOT BETWEEN 1 AND listing.max_guests THEN
    RAISE EXCEPTION 'Invalid reservation dates, duration or party size' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM public.calendar_days WHERE property_id=p_property_id AND date>=p_start_date AND date<p_end_date AND status<>'available') OR
     EXISTS(SELECT 1 FROM public.bookings WHERE property_id=p_property_id AND status='approved' AND start_date<p_end_date AND end_date>p_start_date) THEN
    RAISE EXCEPTION 'Dates unavailable' USING ERRCODE='23P01'; END IF;
  IF EXISTS(SELECT 1 FROM public.calendar_days WHERE property_id=p_property_id AND date>=p_start_date AND date<p_end_date
    AND min_nights>p_end_date-p_start_date) THEN RAISE EXCEPTION 'Stay does not meet the calendar minimum' USING ERRCODE='22023'; END IF;
  SELECT round(sum(coalesce(cd.price_override,listing.price_per_month/30)),0) INTO total
    FROM generate_series(p_start_date::timestamp,(p_end_date-1)::timestamp,interval '1 day') d
    LEFT JOIN public.calendar_days cd ON cd.property_id=p_property_id AND cd.date=d::date;
  RETURN jsonb_build_object('total_price',total,'currency',listing.currency,'days',p_end_date-p_start_date,'deposit',listing.deposit);
END $$;
CREATE FUNCTION public.create_booking(p_property_id uuid,p_start_date date,p_end_date date,p_guest_count integer DEFAULT 1,p_message text DEFAULT NULL,p_expected_total numeric DEFAULT NULL)
RETURNS public.bookings LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); listing public.properties; result public.bookings; quote numeric;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM public.profiles WHERE id=actor FOR KEY SHARE;
  SELECT * INTO listing FROM public.properties WHERE id=p_property_id FOR UPDATE;
  IF NOT FOUND OR listing.status<>'ACTIVE' OR listing.owner_id=actor THEN RAISE EXCEPTION 'Property unavailable'; END IF;
  IF p_start_date IS NULL OR p_end_date IS NULL OR p_start_date<CURRENT_DATE OR
    p_end_date-p_start_date<listing.min_duration_months*30 OR p_end_date-p_start_date>3660 OR
    p_guest_count IS NULL OR p_guest_count NOT BETWEEN 1 AND listing.max_guests OR length(p_message)>5000 THEN
    RAISE EXCEPTION 'Invalid reservation dates, duration or party size' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM public.calendar_days WHERE property_id=p_property_id AND date>=p_start_date AND date<p_end_date AND status<>'available') OR
     EXISTS(SELECT 1 FROM public.bookings WHERE property_id=p_property_id AND status='approved' AND start_date<p_end_date AND end_date>p_start_date) THEN
    RAISE EXCEPTION 'Dates unavailable' USING ERRCODE='23P01'; END IF;
  IF EXISTS(SELECT 1 FROM public.calendar_days WHERE property_id=p_property_id AND date>=p_start_date AND date<p_end_date
    AND min_nights>p_end_date-p_start_date) THEN RAISE EXCEPTION 'Stay does not meet the calendar minimum' USING ERRCODE='22023'; END IF;
  SELECT round(sum(coalesce(cd.price_override,listing.price_per_month/30)),0) INTO quote
    FROM generate_series(p_start_date::timestamp,(p_end_date-1)::timestamp,interval '1 day') d
    LEFT JOIN public.calendar_days cd ON cd.property_id=p_property_id AND cd.date=d::date;
  IF p_expected_total IS NOT NULL AND p_expected_total<>quote THEN RAISE EXCEPTION 'Price changed; request a new quote' USING ERRCODE='22023'; END IF;
  INSERT INTO public.bookings(property_id,guest_id,host_id,start_date,end_date,guest_count,total_price,currency,message)
    VALUES(p_property_id,actor,listing.owner_id,p_start_date,p_end_date,p_guest_count,
    quote,listing.currency,p_message) RETURNING * INTO result;
  RETURN result;
END $$;
CREATE FUNCTION public.update_booking_status(p_booking_id uuid,p_status text)
RETURNS public.bookings LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); result public.bookings; listing_id uuid;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  SELECT property_id INTO listing_id FROM public.bookings WHERE id=p_booking_id;
  PERFORM 1 FROM public.properties WHERE id=listing_id FOR UPDATE;
  SELECT * INTO result FROM public.bookings WHERE id=p_booking_id FOR UPDATE;
  IF NOT FOUND OR actor NOT IN (result.host_id,result.guest_id) THEN RAISE EXCEPTION 'Reservation unavailable' USING ERRCODE='42501'; END IF;
  IF p_status IS NULL OR NOT (
    (actor=result.host_id AND result.status='pending' AND p_status IN ('approved','rejected')) OR
    (actor IN (result.host_id,result.guest_id) AND result.status IN ('pending','approved') AND p_status='cancelled') OR
    (actor=result.host_id AND result.status='approved' AND p_status='completed' AND result.end_date<=CURRENT_DATE)) THEN
      RAISE EXCEPTION 'Invalid reservation transition' USING ERRCODE='42501'; END IF;
  IF p_status='approved' THEN
    IF NOT EXISTS(SELECT 1 FROM public.properties WHERE id=listing_id AND owner_id=result.host_id AND status='ACTIVE') OR result.start_date<CURRENT_DATE THEN
      RAISE EXCEPTION 'Reservation no longer available'; END IF;
    IF EXISTS(SELECT 1 FROM public.bookings WHERE property_id=listing_id AND id<>result.id AND status='approved'
       AND start_date<result.end_date AND end_date>result.start_date) OR
       EXISTS(SELECT 1 FROM public.calendar_days WHERE property_id=listing_id AND date>=result.start_date AND date<result.end_date AND status<>'available') THEN
      RAISE EXCEPTION 'Dates unavailable' USING ERRCODE='23P01'; END IF;
    INSERT INTO public.calendar_days(property_id,date,status,reservation_id)
      SELECT listing_id,d::date,'booked',result.id FROM generate_series(result.start_date::timestamp,(result.end_date-1)::timestamp,interval '1 day') d
      ON CONFLICT(property_id,date) DO UPDATE SET status='booked',reservation_id=excluded.reservation_id,block_reason=NULL;
  ELSIF p_status='cancelled' THEN
    UPDATE public.calendar_days SET status='available',reservation_id=NULL WHERE reservation_id=result.id;
  END IF;
  UPDATE public.bookings SET status=p_status WHERE id=result.id RETURNING * INTO result;
  RETURN result;
END $$;
CREATE FUNCTION public.guard_calendar_write() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
DECLARE listing_id uuid;
BEGIN
  IF current_user NOT IN ('anon','authenticated') THEN RETURN coalesce(NEW,OLD); END IF;
  listing_id=CASE WHEN TG_OP='DELETE' THEN OLD.property_id ELSE NEW.property_id END;
  PERFORM 1 FROM public.properties WHERE id=listing_id FOR UPDATE;
  IF (TG_OP<>'INSERT' AND (OLD.status='booked' OR OLD.reservation_id IS NOT NULL)) OR
     (TG_OP<>'DELETE' AND (NEW.status='booked' OR NEW.reservation_id IS NOT NULL)) THEN
    RAISE EXCEPTION 'Booked calendar days are server controlled' USING ERRCODE='42501'; END IF;
  IF TG_OP='UPDATE' AND (NEW.property_id,NEW.date) IS DISTINCT FROM (OLD.property_id,OLD.date) THEN
    RAISE EXCEPTION 'Calendar identity cannot change' USING ERRCODE='42501'; END IF;
  RETURN coalesce(NEW,OLD);
END $$;
CREATE TRIGGER calendar_guard BEFORE INSERT OR UPDATE OR DELETE ON public.calendar_days FOR EACH ROW EXECUTE FUNCTION public.guard_calendar_write();
ALTER TABLE public.calendar_days ADD CONSTRAINT valid_calendar_prices CHECK(
  (price_override IS NULL OR price_override>0) AND (min_nights IS NULL OR min_nights BETWEEN 1 AND 3660)) NOT VALID;
DROP POLICY calendar_days_select_policy ON public.calendar_days;
CREATE POLICY calendar_days_visible ON public.calendar_days FOR SELECT USING(EXISTS(SELECT 1 FROM public.properties p WHERE p.id=property_id));

CREATE FUNCTION public.after_booking_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  INSERT INTO public.notifications(user_id,title,message,type,related_id)
    SELECT u,'Réservation',CASE WHEN TG_OP='INSERT' THEN 'Nouvelle demande de réservation' ELSE 'Statut de réservation : '||NEW.status END,'booking',NEW.id::text
    FROM unnest(ARRAY[NEW.guest_id,NEW.host_id]) u LEFT JOIN public.notification_preferences np ON np.user_id=u
    WHERE u IS DISTINCT FROM auth.uid() AND coalesce(np.reservations,true);
  RETURN NEW;
END $$;
CREATE TRIGGER bookings_notifications AFTER INSERT OR UPDATE OF status ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.after_booking_change();

-- A review derives its trust from a completed reservation, never the request body.
CREATE FUNCTION public.guard_review() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE stay public.bookings;
BEGIN
  IF TG_OP='UPDATE' THEN
    IF (NEW.author_id,NEW.property_id,NEW.booking_id,NEW.is_verified,NEW.stay_duration,NEW.created_at)
       IS DISTINCT FROM (OLD.author_id,OLD.property_id,OLD.booking_id,OLD.is_verified,OLD.stay_duration,OLD.created_at) THEN
      RAISE EXCEPTION 'Review identity and verification are immutable' USING ERRCODE='42501'; END IF;
    RETURN NEW;
  END IF;
  SELECT * INTO stay FROM public.bookings WHERE id=NEW.booking_id FOR UPDATE;
  IF NOT FOUND OR stay.guest_id<>NEW.author_id OR stay.property_id<>NEW.property_id OR stay.status<>'completed' OR stay.end_date>CURRENT_DATE THEN
    RAISE EXCEPTION 'A completed stay is required to review' USING ERRCODE='42501'; END IF;
  IF EXISTS(SELECT 1 FROM public.reviews WHERE booking_id=NEW.booking_id AND author_id=NEW.author_id) THEN RAISE EXCEPTION 'Stay already reviewed' USING ERRCODE='23505'; END IF;
  NEW.is_verified=true;
  NEW.stay_duration=CASE WHEN stay.end_date-stay.start_date>=90 THEN 'long terme' ELSE 'court terme' END;
  RETURN NEW;
END $$;
CREATE TRIGGER reviews_guard BEFORE INSERT OR UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.guard_review();
REVOKE UPDATE ON public.reviews FROM anon,authenticated;
GRANT UPDATE(rating,comment) ON public.reviews TO authenticated;
CREATE FUNCTION public.refresh_review_stats() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE listing_id uuid:=coalesce(NEW.property_id,OLD.property_id);
BEGIN
  UPDATE public.properties SET avg_rating=(SELECT avg(rating) FROM public.reviews WHERE property_id=listing_id),
    review_count=(SELECT count(*) FROM public.reviews WHERE property_id=listing_id) WHERE id=listing_id;
  RETURN coalesce(NEW,OLD);
END $$;
CREATE TRIGGER reviews_stats AFTER INSERT OR UPDATE OR DELETE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.refresh_review_stats();

-- Support messages cannot impersonize employees or another sender.
DROP POLICY support_ticket_messages_insert_policy ON public.support_ticket_messages;
CREATE POLICY support_ticket_messages_user ON public.support_ticket_messages FOR INSERT TO authenticated WITH CHECK(
  sender_id=auth.uid() AND NOT is_support AND EXISTS(SELECT 1 FROM public.support_tickets WHERE id=ticket_id AND user_id=auth.uid()));
REVOKE INSERT,UPDATE ON public.support_tickets FROM anon,authenticated;
GRANT INSERT(user_id,category,priority,subject,description,reservation_id),UPDATE(subject,description)
  ON public.support_tickets TO authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.co_hosts FROM anon,authenticated;

DO $$ DECLARE t text; BEGIN
  IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') THEN
    FOREACH t IN ARRAY ARRAY['messages','conversations','conversation_participants','notifications'] LOOP
      IF NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',t);
      END IF;
    END LOOP;
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.is_conversation_member(uuid),public.get_or_create_conversation(uuid,uuid),
  public.mark_conversation_read(uuid),public.set_conversation_status(uuid,text),public.create_booking(uuid,date,date,integer,text,numeric),public.quote_booking(uuid,date,date,integer),
  public.update_booking_status(uuid,text),public.submit_host_application(text,text[],jsonb),public.review_host_application(uuid,boolean,text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.is_conversation_member(uuid),public.get_or_create_conversation(uuid,uuid),
  public.mark_conversation_read(uuid),public.set_conversation_status(uuid,text),public.create_booking(uuid,date,date,integer,text,numeric),public.quote_booking(uuid,date,date,integer),
  public.update_booking_status(uuid,text),public.submit_host_application(text,text[],jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_host_application(uuid,boolean,text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.after_message_insert(),public.after_booking_change(),public.guard_review(),public.refresh_review_stats()
  FROM PUBLIC,anon,authenticated;
COMMIT;
