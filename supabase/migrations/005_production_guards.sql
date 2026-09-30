-- Adjustable server-owned limits. No client may read counters or change budgets.
CREATE TABLE public.runtime_limits (
  name text PRIMARY KEY, max_units bigint NOT NULL CHECK (max_units>0),
  window_seconds integer NOT NULL CHECK(window_seconds BETWEEN 60 AND 86400)
);
CREATE TABLE public.request_counters (
  name text NOT NULL REFERENCES public.runtime_limits(name), scope text NOT NULL,
  window_start timestamptz NOT NULL, units bigint NOT NULL CHECK(units>=0),
  PRIMARY KEY(name,scope,window_start)
);
ALTER TABLE public.runtime_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_counters ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.runtime_limits,public.request_counters FROM anon,authenticated;
GRANT ALL ON public.runtime_limits,public.request_counters TO service_role;
INSERT INTO public.runtime_limits VALUES
 ('messages_user_minute',30,60),('bookings_user_hour',12,3600),
 ('properties_user_hour',10,3600),('applications_user_day',3,86400),
 ('support_user_hour',10,3600),('uploads_user_hour',40,3600),
 ('uploads_global_day',500,86400),('upload_bytes_user_day',209715200,86400),
 ('upload_bytes_global_day',1073741824,86400),
 ('errors_user_hour',20,3600),('errors_global_day',5000,86400),
 ('edge_user_minute',60,60),('edge_global_minute',600,60);

CREATE FUNCTION public.consume_limit(p_name text,p_actor uuid DEFAULT NULL,p_units bigint DEFAULT 1)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE lim public.runtime_limits; start_at timestamptz; affected integer;
BEGIN
  IF p_units IS NULL OR p_units<1 THEN RAISE EXCEPTION 'Invalid quota units' USING ERRCODE='22023'; END IF;
  SELECT * INTO STRICT lim FROM public.runtime_limits WHERE name=p_name;
  start_at:=to_timestamp(floor(extract(epoch FROM clock_timestamp())/lim.window_seconds)*lim.window_seconds);
  IF p_units>lim.max_units THEN RAISE EXCEPTION 'Limite atteinte. Réessayez plus tard.' USING ERRCODE='PT429'; END IF;
  INSERT INTO public.request_counters(name,scope,window_start,units)
    VALUES(p_name,coalesce(p_actor::text,'global'),start_at,p_units)
  ON CONFLICT(name,scope,window_start) DO UPDATE SET units=request_counters.units+EXCLUDED.units
    WHERE request_counters.units+EXCLUDED.units<=lim.max_units;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected=0 THEN RAISE EXCEPTION 'Limite atteinte. Réessayez plus tard.' USING ERRCODE='PT429'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.consume_limit(text,uuid,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.consume_limit(text,uuid,bigint) TO service_role;

CREATE FUNCTION public.enforce_write_budget() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF TG_TABLE_NAME='upload_objects' THEN
    PERFORM public.consume_limit('uploads_user_hour',NEW.user_id);
    PERFORM public.consume_limit('uploads_global_day');
    PERFORM public.consume_limit('upload_bytes_user_day',NEW.user_id,NEW.size_bytes);
    PERFORM public.consume_limit('upload_bytes_global_day',NULL,NEW.size_bytes);
  ELSIF auth.uid() IS NOT NULL THEN
    PERFORM public.consume_limit(TG_ARGV[0],auth.uid());
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.enforce_write_budget() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER a_upload_budget BEFORE INSERT ON public.upload_objects FOR EACH ROW EXECUTE FUNCTION public.enforce_write_budget();
CREATE TRIGGER a_message_budget BEFORE INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.enforce_write_budget('messages_user_minute');
CREATE TRIGGER a_booking_budget BEFORE INSERT ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.enforce_write_budget('bookings_user_hour');
CREATE TRIGGER a_property_budget BEFORE INSERT ON public.properties FOR EACH ROW EXECUTE FUNCTION public.enforce_write_budget('properties_user_hour');
CREATE TRIGGER a_application_budget AFTER INSERT OR UPDATE ON public.host_applications FOR EACH ROW EXECUTE FUNCTION public.enforce_write_budget('applications_user_day');
CREATE TRIGGER a_support_budget BEFORE INSERT ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.enforce_write_budget('support_user_hour');
CREATE TRIGGER a_support_message_budget BEFORE INSERT ON public.support_ticket_messages FOR EACH ROW EXECUTE FUNCTION public.enforce_write_budget('support_user_hour');

CREATE TABLE public.app_error_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(),
 user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
 kind text NOT NULL CHECK(kind IN ('render','unhandled','network','startup')),
 code text NOT NULL CHECK(code IN ('TypeError','RangeError','ReferenceError','NetworkTimeoutError','Error','UnknownError')),
 route text NOT NULL CHECK(route ~ '^[A-Za-z][A-Za-z0-9_]{0,59}$'),
 version text NOT NULL CHECK(length(version)<=32), platform text NOT NULL CHECK(platform IN ('ios','android','web','unknown'))
);
ALTER TABLE public.app_error_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_error_events FROM anon,authenticated;
GRANT ALL ON public.app_error_events TO service_role;
CREATE FUNCTION public.prune_operational_data() RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 DELETE FROM public.request_counters WHERE window_start < now()-interval '2 days';
 DELETE FROM public.app_error_events WHERE created_at < now()-interval '30 days';
$$;
REVOKE ALL ON FUNCTION public.prune_operational_data() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.prune_operational_data() TO service_role;

CREATE INDEX IF NOT EXISTS messages_page_idx ON public.messages(conversation_id,created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS bookings_guest_page_idx ON public.bookings(guest_id,created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS bookings_host_page_idx ON public.bookings(host_id,created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS notifications_page_idx ON public.notifications(user_id,created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS properties_price_page_idx ON public.properties(status,currency,price_per_month,id);
CREATE INDEX IF NOT EXISTS properties_created_page_idx ON public.properties(status,currency,created_at DESC,id);
CREATE INDEX IF NOT EXISTS upload_user_created_idx ON public.upload_objects(user_id,created_at);
CREATE INDEX IF NOT EXISTS error_events_created_idx ON public.app_error_events(created_at);

CREATE OR REPLACE FUNCTION public.create_booking(p_property_id uuid,p_start_date date,p_end_date date,p_guest_count integer DEFAULT 1,p_message text DEFAULT NULL,p_expected_total numeric DEFAULT NULL)
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
  -- The property row is already locked: concurrent identical requests return one reservation.
  SELECT * INTO result FROM public.bookings WHERE guest_id=actor AND property_id=p_property_id
    AND start_date=p_start_date AND end_date=p_end_date AND status='pending' ORDER BY created_at LIMIT 1;
  IF FOUND THEN
    IF result.guest_count=p_guest_count AND coalesce(result.message,'')=coalesce(p_message,'')
      AND (p_expected_total IS NULL OR result.total_price=p_expected_total) THEN RETURN result; END IF;
    RAISE EXCEPTION 'Une demande existe déjà pour ces dates. Consultez vos séjours.' USING ERRCODE='PT409';
  END IF;
  INSERT INTO public.bookings(property_id,guest_id,host_id,start_date,end_date,guest_count,total_price,currency,message)
    VALUES(p_property_id,actor,listing.owner_id,p_start_date,p_end_date,p_guest_count,
    quote,listing.currency,p_message) RETURNING * INTO result;
  RETURN result;
END $$;
