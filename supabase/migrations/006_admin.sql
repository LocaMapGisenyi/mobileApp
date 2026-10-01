BEGIN;

-- No browser role is trusted. Only the Edge service role may enter the admin RPCs.
CREATE TABLE public.admin_members (
 user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE RESTRICT,
 role text NOT NULL CHECK(role IN ('owner','moderator','support','editor')),
 active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.account_restrictions (
 user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
 suspended boolean NOT NULL DEFAULT false, note text NOT NULL,
 actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.admin_audit_log (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
 resource text NOT NULL, record_id uuid, action text NOT NULL, note text,request_id uuid,
 changes jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_audit_resource_idx ON public.admin_audit_log(resource,record_id,created_at DESC);
CREATE INDEX admin_audit_time_idx ON public.admin_audit_log(created_at DESC,id);
CREATE TABLE public.admin_requests (
 actor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
 request_id uuid NOT NULL, fingerprint text NOT NULL, result jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(actor_id,request_id)
);
CREATE TABLE public.admin_content_drafts (
 resource text NOT NULL CHECK(resource IN ('faq_items','guides','guide_categories','articles','courses','course_steps','legal_documents')),
 record_id uuid NOT NULL, fields jsonb NOT NULL CHECK(jsonb_typeof(fields)='object'),
 actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp(), PRIMARY KEY(resource,record_id)
);
CREATE TABLE public.admin_content_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),resource text NOT NULL,record_id uuid NOT NULL,
 fields jsonb NOT NULL,actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.conversation_reports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
 reporter_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
 category text CHECK(category IN ('language','harassment','fraud','spam')),
 description text CHECK(length(description)<=2000),created_at timestamptz NOT NULL DEFAULT now(),
 resolved_at timestamptz,resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,resolution_note text,
 context_message_ids uuid[]
);
CREATE INDEX conversation_reports_context_idx ON public.conversation_reports(conversation_id,created_at DESC);
CREATE UNIQUE INDEX conversation_report_open_idx ON public.conversation_reports(conversation_id,reporter_id) WHERE resolved_at IS NULL;
-- Legacy reports are explicitly represented by a null reporter and category.
INSERT INTO public.conversation_reports(conversation_id,created_at)
 SELECT id,updated_at FROM public.conversations WHERE status IN ('REPORTED','FROZEN');
ALTER TABLE public.support_tickets ADD COLUMN assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.runtime_limits ADD COLUMN id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE;
ALTER TABLE public.storage_deletion_queue ADD COLUMN id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE;
ALTER TABLE public.properties ADD COLUMN moderation_note text;
-- Property writes historically have table grants; a trigger protects this new server field.
CREATE FUNCTION public.admin_guard_property_note() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF current_user IN ('anon','authenticated') AND ((TG_OP='INSERT' AND NEW.moderation_note IS NOT NULL) OR
  (TG_OP='UPDATE' AND NEW.moderation_note IS DISTINCT FROM OLD.moderation_note)) THEN RAISE EXCEPTION 'Note de modération réservée au serveur.' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_admin_property_note BEFORE INSERT OR UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.admin_guard_property_note();
CREATE INDEX admin_hosts_queue_idx ON public.host_applications(status,submitted_at,user_id);
CREATE INDEX admin_tickets_queue_idx ON public.support_tickets(status,created_at,id);
CREATE INDEX admin_profiles_created_idx ON public.profiles(created_at,id);

-- An image edit on a pending listing must still serialize with publication.
-- Lock both parents in UUID order when moving an image between listings.
CREATE OR REPLACE FUNCTION public.review_property_image_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE listing_id uuid;
BEGIN
 FOR listing_id IN SELECT DISTINCT id FROM unnest(ARRAY[
  CASE WHEN TG_OP<>'DELETE' THEN NEW.property_id END,
  CASE WHEN TG_OP<>'INSERT' THEN OLD.property_id END]) id WHERE id IS NOT NULL ORDER BY id LOOP
  PERFORM 1 FROM public.properties WHERE id=listing_id FOR UPDATE;
  IF auth.uid() IS NOT NULL THEN
   IF EXISTS(SELECT 1 FROM public.properties WHERE id=listing_id AND status='SUSPENDED') THEN RAISE EXCEPTION 'Suspended listing requires administrator review' USING ERRCODE='42501'; END IF;
   UPDATE public.properties SET status='PENDING_REVIEW' WHERE id=listing_id AND status='ACTIVE';
  END IF;
 END LOOP;
 RETURN coalesce(NEW,OLD);
END $$;

DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['admin_members','account_restrictions','admin_audit_log','admin_requests','admin_content_drafts','admin_content_history','conversation_reports'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',t);
  EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
 END LOOP;
END $$;
-- Even service clients do not need to rewrite historical audit records.
REVOKE UPDATE,DELETE,TRUNCATE ON public.admin_audit_log,public.admin_content_history FROM service_role;

CREATE FUNCTION public.account_active(p_user uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT p_user IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.account_restrictions WHERE user_id=p_user AND suspended)
$$;
CREATE FUNCTION public.assert_account_active(p_user uuid) RETURNS void
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF p_user IS NOT NULL AND NOT public.account_active(p_user) THEN
  RAISE EXCEPTION 'Compte suspendu.' USING ERRCODE='42501';
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.account_active(uuid),public.assert_account_active(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.account_active(uuid),public.assert_account_active(uuid) TO authenticated,service_role;

-- Restrictive policies are ANDed with all existing policies, including private joins.
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['profiles','notification_preferences','payout_accounts','bookings','conversations','conversation_participants','messages','message_templates','alerts','notifications','support_tickets','support_ticket_messages','consent_records','referral_entries','referral_credits','co_hosts','user_bookmarks','course_progress','favorites','user_payment_preferences','upload_objects','host_applications'] LOOP
  EXECUTE format('CREATE POLICY active_account_required ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING(public.account_active(auth.uid())) WITH CHECK(public.account_active(auth.uid()))',t);
 END LOOP;
 CREATE POLICY active_account_property_read ON public.properties AS RESTRICTIVE FOR SELECT TO authenticated
  USING(public.account_active(auth.uid()) OR status='ACTIVE');
END $$;

CREATE FUNCTION public.guard_suspended_write() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM public.assert_account_active(auth.uid());
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
DO $$ DECLARE t text; BEGIN
 FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT LIKE 'admin_%' AND tablename<>'account_restrictions' LOOP
  EXECUTE format('CREATE TRIGGER a_account_active BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.guard_suspended_write()',t);
 END LOOP;
END $$;
-- Definer RPCs bypass RLS: add the same active-account gate to each existing
-- authenticated PL/pgSQL RPC. CREATE OR REPLACE preserves its original grants.
DO $$ DECLARE f record; source text; BEGIN
 FOR f IN SELECT p.oid,p.proname,p.prosrc,pg_get_function_arguments(p.oid) args,pg_get_function_result(p.oid) result
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
  WHERE n.nspname='public' AND p.prosecdef AND l.lanname='plpgsql' AND p.prorettype<>'trigger'::regtype
    AND p.proname NOT IN ('assert_account_active') AND has_function_privilege('authenticated',p.oid,'EXECUTE')
 LOOP
  source:=regexp_replace(f.prosrc,'\mBEGIN\M','BEGIN PERFORM public.assert_account_active(auth.uid());','i');
  EXECUTE format('CREATE OR REPLACE FUNCTION public.%I(%s) RETURNS %s LANGUAGE plpgsql SECURITY DEFINER SET search_path='''' AS %L',f.proname,f.args,f.result,source);
 END LOOP;
END $$;
-- All existing Edge routes consume this quota using their verified user UUID.
CREATE OR REPLACE FUNCTION public.consume_limit(p_name text,p_actor uuid DEFAULT NULL,p_units bigint DEFAULT 1)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE lim public.runtime_limits; start_at timestamptz; affected integer;
BEGIN
 PERFORM public.assert_account_active(p_actor);
 IF p_units IS NULL OR p_units<1 THEN RAISE EXCEPTION 'Invalid quota units' USING ERRCODE='22023'; END IF;
 SELECT * INTO STRICT lim FROM public.runtime_limits WHERE name=p_name;
 start_at:=to_timestamp(floor(extract(epoch FROM clock_timestamp())/lim.window_seconds)*lim.window_seconds);
 IF p_units>lim.max_units THEN RAISE EXCEPTION 'Limite atteinte. Réessayez plus tard.' USING ERRCODE='PT429'; END IF;
 INSERT INTO public.request_counters(name,scope,window_start,units) VALUES(p_name,coalesce(p_actor::text,'global'),start_at,p_units)
 ON CONFLICT(name,scope,window_start) DO UPDATE SET units=request_counters.units+EXCLUDED.units WHERE request_counters.units+EXCLUDED.units<=lim.max_units;
 GET DIAGNOSTICS affected=ROW_COUNT;
 IF affected=0 THEN RAISE EXCEPTION 'Limite atteinte. Réessayez plus tard.' USING ERRCODE='PT429'; END IF;
END $$;
INSERT INTO public.runtime_limits(name,max_units,window_seconds) VALUES('admin_user_minute',120,60),('admin_global_minute',1200,60),('admin_documents_user_minute',10,60);

CREATE FUNCTION public.report_conversation(p_conversation_id uuid,p_category text,p_description text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM public.assert_account_active(auth.uid());
 IF auth.uid() IS NULL OR NOT public.is_conversation_member(p_conversation_id) THEN RAISE EXCEPTION 'Conversation unavailable' USING ERRCODE='42501'; END IF;
 IF p_category IS NULL OR p_category NOT IN ('language','harassment','fraud','spam') OR length(p_description)>2000 THEN RAISE EXCEPTION 'Invalid report' USING ERRCODE='22023'; END IF;
 PERFORM 1 FROM public.conversations WHERE id=p_conversation_id FOR UPDATE;
 INSERT INTO public.conversation_reports(conversation_id,reporter_id,category,description)
 VALUES(p_conversation_id,auth.uid(),p_category,nullif(trim(p_description),'')) ON CONFLICT(conversation_id,reporter_id) WHERE resolved_at IS NULL DO NOTHING;
 UPDATE public.conversations SET status=CASE WHEN status='FROZEN' THEN 'FROZEN' ELSE 'REPORTED' END WHERE id=p_conversation_id;
END $$;
REVOKE ALL ON FUNCTION public.report_conversation(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.report_conversation(uuid,text,text) TO authenticated;
-- Preserve the old app contract and legacy category absence.
CREATE OR REPLACE FUNCTION public.set_conversation_status(p_conversation_id uuid,p_status text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM public.assert_account_active(auth.uid());
 IF NOT public.is_conversation_member(p_conversation_id) OR p_status NOT IN ('ACTIVE','ARCHIVED','REPORTED') OR p_status IS NULL THEN RAISE EXCEPTION 'Conversation unavailable or invalid status' USING ERRCODE='42501'; END IF;
 UPDATE public.conversations SET status=p_status WHERE id=p_conversation_id AND status NOT IN ('FROZEN','REPORTED');
 IF NOT FOUND THEN RAISE EXCEPTION 'Moderated conversation'; END IF;
 IF p_status='REPORTED' THEN INSERT INTO public.conversation_reports(conversation_id,reporter_id) VALUES(p_conversation_id,auth.uid()); END IF;
END $$;
-- RLS alone can race a concurrent freeze; this trigger serializes sends on the same row.
CREATE FUNCTION public.guard_moderated_message() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE state text; BEGIN
 SELECT status INTO state FROM public.conversations WHERE id=NEW.conversation_id FOR UPDATE;
 IF state='FROZEN' THEN RAISE EXCEPTION 'Conversation gelée.' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_moderated_message BEFORE INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.guard_moderated_message();

CREATE FUNCTION public.admin_require(p_actor uuid,p_resource text,p_write boolean DEFAULT false) RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE r text; BEGIN
 SELECT role INTO r FROM public.admin_members WHERE user_id=p_actor AND active AND public.account_active(p_actor);
 IF r IS NULL THEN RAISE EXCEPTION 'Accès administrateur refusé.' USING ERRCODE='42501'; END IF;
 IF p_resource NOT IN ('session','overview','users','hosts','properties','bookings','tickets','reports','faq_items','guides','guide_categories','articles','courses','course_steps','legal_documents','errors','limits','cleanup','audit','members') THEN RAISE EXCEPTION 'Ressource inconnue.' USING ERRCODE='22023'; END IF;
 IF r='owner' THEN RETURN r; END IF;
 IF p_resource IN ('session','overview') AND NOT p_write THEN RETURN r; END IF;
 IF r='moderator' AND (p_resource IN ('hosts','properties','reports') OR (NOT p_write AND p_resource IN ('users','bookings'))) THEN RETURN r; END IF;
 IF r='support' AND (p_resource IN ('tickets','reports') OR (NOT p_write AND p_resource IN ('users','bookings','properties'))) THEN RETURN r; END IF;
 IF r='editor' AND p_resource IN ('faq_items','guides','guide_categories','articles','courses','course_steps','legal_documents') THEN RETURN r; END IF;
 RAISE EXCEPTION 'Permission insuffisante.' USING ERRCODE='42501';
END $$;

-- All table names below come from this fixed server allowlist, never from SQL supplied by a client.
CREATE FUNCTION public.admin_table(p_resource text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT CASE p_resource WHEN 'users' THEN 'profiles' WHEN 'hosts' THEN 'host_applications' WHEN 'tickets' THEN 'support_tickets'
 WHEN 'reports' THEN 'conversations' WHEN 'errors' THEN 'app_error_events' WHEN 'limits' THEN 'runtime_limits'
 WHEN 'cleanup' THEN 'storage_deletion_queue' WHEN 'audit' THEN 'admin_audit_log' WHEN 'members' THEN 'admin_members'
 WHEN 'properties' THEN 'properties' WHEN 'bookings' THEN 'bookings' WHEN 'faq_items' THEN 'faq_items' WHEN 'guides' THEN 'guides'
 WHEN 'guide_categories' THEN 'guide_categories' WHEN 'articles' THEN 'articles' WHEN 'courses' THEN 'courses'
 WHEN 'course_steps' THEN 'course_steps' WHEN 'legal_documents' THEN 'legal_documents' END
$$;

CREATE FUNCTION public.admin_rows(p_resource text) RETURNS SETOF jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE q text; t text:=public.admin_table(p_resource); editorial boolean:=p_resource IN ('faq_items','guides','guide_categories','articles','courses','course_steps','legal_documents');
BEGIN
 IF t IS NULL THEN RAISE EXCEPTION 'Ressource inconnue.' USING ERRCODE='22023'; END IF;
 IF p_resource='users' THEN
  q:=$q$SELECT jsonb_build_object('id',p.id,'full_name',p.full_name,'email',p.email,'phone_number',p.phone_number,'avatar_url',p.avatar_url,'is_host',p.is_host,'kyc_status',p.kyc_status,'created_at',p.created_at,'updated_at',p.updated_at,'status',CASE WHEN coalesce(r.suspended,false) THEN 'SUSPENDED' ELSE 'ACTIVE' END,'restriction_note',r.note,'restriction_updated_at',r.updated_at) d FROM public.profiles p LEFT JOIN public.account_restrictions r ON r.user_id=p.id$q$;
 ELSIF p_resource='hosts' THEN
  q:=$q$SELECT (to_jsonb(h)-'payout_details')||jsonb_build_object('id',h.user_id,'full_name',p.full_name,'email',p.email,'phone_number',p.phone_number,'created_at',h.submitted_at) d FROM public.host_applications h JOIN public.profiles p ON p.id=h.user_id$q$;
 ELSIF p_resource='reports' THEN
  q:=$q$SELECT (to_jsonb(c)-ARRAY['last_message_text','last_message_sender_id','last_message_at'])||jsonb_build_object('category',r.category,'reporter_id',r.reporter_id,'reported_at',r.created_at,'resolved_at',r.resolved_at,'resolution_note',r.resolution_note,'updated_at',CASE WHEN c.status IN ('REPORTED','FROZEN') THEN c.updated_at ELSE r.resolved_at END,'status',CASE WHEN c.status='FROZEN' THEN 'FROZEN' WHEN c.status='REPORTED' THEN 'REPORTED' ELSE 'RESOLVED' END) d FROM public.conversations c LEFT JOIN LATERAL (SELECT * FROM public.conversation_reports WHERE conversation_id=c.id ORDER BY created_at DESC,id DESC LIMIT 1) r ON true WHERE c.status IN ('REPORTED','FROZEN') OR r.id IS NOT NULL$q$;
 ELSIF p_resource='members' THEN
  q:=$q$SELECT to_jsonb(m)||jsonb_build_object('id',m.user_id,'email',p.email,'full_name',p.full_name,'status',CASE WHEN m.active THEN 'ACTIVE' ELSE 'REVOKED' END) d FROM public.admin_members m JOIN public.profiles p ON p.id=m.user_id$q$;
 ELSIF p_resource='cleanup' THEN
  q:=$q$SELECT (to_jsonb(t)-'key')||jsonb_build_object('status',CASE WHEN deleted_at IS NULL THEN 'PENDING' ELSE 'DONE' END,'created_at',queued_at) d FROM public.storage_deletion_queue t$q$;
 ELSIF p_resource='errors' THEN
  q:=$q$SELECT (to_jsonb(t)-'version')||jsonb_build_object('app_version',version) d FROM public.app_error_events t$q$;
 ELSIF p_resource='properties' THEN
  q:=$q$SELECT to_jsonb(p)||jsonb_build_object('owner_name',u.full_name,'image_url',(SELECT url FROM public.property_images WHERE property_id=p.id ORDER BY is_cover DESC,position,id LIMIT 1),'image_revision',(SELECT md5(coalesce(jsonb_agg(to_jsonb(i) ORDER BY i.id)::text,'')) FROM public.property_images i WHERE property_id=p.id)) d FROM public.properties p JOIN public.profiles u ON u.id=p.owner_id$q$;
 ELSIF p_resource='bookings' THEN
  q:=$q$SELECT to_jsonb(b)||jsonb_build_object('property_title',p.title,'guest_name',g.full_name,'host_name',h.full_name,'deposit',p.deposit,'payment_collected',false) d FROM public.bookings b JOIN public.properties p ON p.id=b.property_id JOIN public.profiles g ON g.id=b.guest_id JOIN public.profiles h ON h.id=b.host_id$q$;
 ELSIF p_resource='tickets' THEN
  q:=$q$SELECT to_jsonb(t)||jsonb_build_object('user_name',p.full_name,'user_email',p.email) d FROM public.support_tickets t JOIN public.profiles p ON p.id=t.user_id$q$;
 ELSIF editorial THEN
  q:=format($q$SELECT (coalesce(to_jsonb(t),d.fields,'{}'::jsonb) - 'version') || jsonb_build_object('id',coalesce(t.id,d.record_id),'publication_status',CASE WHEN t.id IS NULL THEN 'DRAFT' WHEN d.record_id IS NOT NULL THEN 'CHANGES_PENDING' ELSE 'PUBLISHED' END,'draft_updated_at',d.updated_at,'created_at',coalesce(to_jsonb(t)->'created_at',to_jsonb(d.updated_at)),'legal_version',coalesce(to_jsonb(t)->'version',d.fields->'version'),'draft_fields',d.fields) d FROM public.%I t FULL JOIN (SELECT * FROM public.admin_content_drafts WHERE resource=%L) d ON d.record_id=t.id$q$,t,p_resource);
 ELSE q:=format('SELECT to_jsonb(t) d FROM public.%I t',t); END IF;
 RETURN QUERY EXECUTE 'SELECT (d - ''draft_fields'') || jsonb_build_object(''version'',md5(d::text)) FROM ('||q||') source';
END $$;

CREATE FUNCTION public.admin_query(p_actor uuid,p_resource text,p_id uuid DEFAULT NULL,p_search text DEFAULT '',p_status text DEFAULT '',p_page integer DEFAULT 1)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r text; rec jsonb; related jsonb:='{}'; rows jsonb; total bigint; counts jsonb:='{}'; n bigint;
BEGIN
 r:=public.admin_require(p_actor,p_resource);
 IF p_page IS NULL OR p_page NOT BETWEEN 1 AND 10000 OR length(coalesce(p_search,''))>120 OR length(coalesce(p_status,''))>32 THEN RAISE EXCEPTION 'Filtre invalide.' USING ERRCODE='22023'; END IF;
 IF coalesce(p_status,'')<>'' AND NOT (p_status=ANY(CASE p_resource
  WHEN 'users' THEN ARRAY['ACTIVE','SUSPENDED','NOT_VERIFIED','PENDING','VERIFIED','REJECTED','HOST','TENANT']
  WHEN 'hosts' THEN ARRAY['PENDING','APPROVED','REJECTED']
  WHEN 'properties' THEN ARRAY['DRAFT','PENDING_REVIEW','ACTIVE','PAUSED','SUSPENDED','ARCHIVED']
  WHEN 'bookings' THEN ARRAY['pending','approved','rejected','cancelled','completed']
  WHEN 'tickets' THEN ARRAY['OPEN','IN_PROGRESS','WAITING_HOST','RESOLVED','CLOSED','UNRESOLVED']
  WHEN 'reports' THEN ARRAY['REPORTED','FROZEN','RESOLVED','UNRESOLVED']
  WHEN 'members' THEN ARRAY['ACTIVE','REVOKED'] WHEN 'cleanup' THEN ARRAY['PENDING','DONE']
  WHEN 'faq_items' THEN ARRAY['DRAFT','CHANGES_PENDING','PUBLISHED'] WHEN 'guides' THEN ARRAY['DRAFT','CHANGES_PENDING','PUBLISHED']
  WHEN 'guide_categories' THEN ARRAY['DRAFT','CHANGES_PENDING','PUBLISHED'] WHEN 'articles' THEN ARRAY['DRAFT','CHANGES_PENDING','PUBLISHED']
  WHEN 'courses' THEN ARRAY['DRAFT','CHANGES_PENDING','PUBLISHED'] WHEN 'course_steps' THEN ARRAY['DRAFT','CHANGES_PENDING','PUBLISHED']
  WHEN 'legal_documents' THEN ARRAY['DRAFT','CHANGES_PENDING','PUBLISHED'] ELSE ARRAY[]::text[] END)) THEN RAISE EXCEPTION 'État de filtre invalide.' USING ERRCODE='22023'; END IF;
 IF p_resource='session' THEN RETURN jsonb_build_object('role',r); END IF;
 IF p_resource='overview' THEN
  IF r IN ('owner','moderator') THEN
   SELECT count(*) INTO n FROM public.host_applications WHERE status='PENDING';counts:=counts||jsonb_build_object('hosts_pending',n);
   SELECT count(*) INTO n FROM public.properties WHERE status='PENDING_REVIEW';counts:=counts||jsonb_build_object('properties_pending',n);
  END IF;
  IF r IN ('owner','moderator','support') THEN
   SELECT count(*) INTO n FROM public.conversations WHERE status IN ('REPORTED','FROZEN');counts:=counts||jsonb_build_object('reports_open',n);
  END IF;
  IF r IN ('owner','support') THEN SELECT count(*) INTO n FROM public.support_tickets WHERE status NOT IN ('RESOLVED','CLOSED');counts:=counts||jsonb_build_object('tickets_open',n); END IF;
  IF r='owner' THEN
   SELECT count(*) INTO n FROM public.profiles;counts:=counts||jsonb_build_object('users',n);
   SELECT count(*) INTO n FROM public.properties WHERE status='ACTIVE';counts:=counts||jsonb_build_object('properties_active',n);
   SELECT count(*) INTO n FROM public.bookings WHERE status IN ('pending','approved');counts:=counts||jsonb_build_object('bookings_active',n);
  END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(a)),'[]') INTO rows FROM (
   SELECT * FROM (
    SELECT 'hosts' resource,user_id id,legal_name title,status,submitted_at created_at FROM public.host_applications WHERE status='PENDING' AND r IN ('owner','moderator')
    UNION ALL SELECT 'properties',id,title,status,created_at FROM public.properties WHERE status='PENDING_REVIEW' AND r IN ('owner','moderator')
    UNION ALL SELECT 'tickets',id,subject,status,created_at FROM public.support_tickets WHERE status NOT IN ('RESOLVED','CLOSED') AND r IN ('owner','support')
    UNION ALL SELECT 'reports',id,'Conversation signalée',status,created_at FROM public.conversations WHERE status IN ('REPORTED','FROZEN') AND r IN ('owner','moderator','support')
    UNION ALL SELECT resource,record_id,coalesce(fields->>'title',fields->>'question','Brouillon'),'DRAFT',updated_at FROM public.admin_content_drafts WHERE r IN ('owner','editor')
   ) pending ORDER BY created_at,id LIMIT 10) a;
  IF r='editor' THEN SELECT count(*) INTO n FROM public.admin_content_drafts;counts:=counts||jsonb_build_object('content_drafts',n); END IF;
  RETURN jsonb_build_object('counts',counts,'recent',rows);
 END IF;
 IF p_id IS NULL THEN
  SELECT count(*) INTO total FROM public.admin_rows(p_resource) d WHERE (coalesce(p_status,'')='' OR d->>'status'=p_status OR d->>'publication_status'=p_status OR d->>'kyc_status'=p_status OR (p_resource='users' AND ((p_status='HOST' AND d->>'is_host'='true') OR (p_status='TENANT' AND d->>'is_host'='false'))) OR (p_status='UNRESOLVED' AND ((p_resource='tickets' AND d->>'status' NOT IN ('RESOLVED','CLOSED')) OR (p_resource='reports' AND d->>'status' IN ('REPORTED','FROZEN')))))
   AND (coalesce(p_search,'')='' OR concat_ws(' ',d->>'id',d->>'full_name',d->>'email',d->>'title',d->>'subject',d->>'name',d->>'legal_name',d->>'property_title',d->>'host_name',d->>'guest_name',d->>'question',d->>'resource',d->>'action',d->>'actor_id',d->>'record_id',d->>'start_date',d->>'end_date',d->>'property_id',d->>'host_id',d->>'guest_id') ILIKE '%'||replace(replace(replace(p_search,'\','\\'),'%','\%'),'_','\_')||'%');
  SELECT coalesce(jsonb_agg(d),'[]') INTO rows FROM (SELECT d - ARRAY['content','answer','description','document_keys','previous_versions'] d FROM public.admin_rows(p_resource) d
   WHERE (coalesce(p_status,'')='' OR d->>'status'=p_status OR d->>'publication_status'=p_status OR d->>'kyc_status'=p_status OR (p_resource='users' AND ((p_status='HOST' AND d->>'is_host'='true') OR (p_status='TENANT' AND d->>'is_host'='false'))) OR (p_status='UNRESOLVED' AND ((p_resource='tickets' AND d->>'status' NOT IN ('RESOLVED','CLOSED')) OR (p_resource='reports' AND d->>'status' IN ('REPORTED','FROZEN')))))
   AND (coalesce(p_search,'')='' OR concat_ws(' ',d->>'id',d->>'full_name',d->>'email',d->>'title',d->>'subject',d->>'name',d->>'legal_name',d->>'property_title',d->>'host_name',d->>'guest_name',d->>'question',d->>'resource',d->>'action',d->>'actor_id',d->>'record_id',d->>'start_date',d->>'end_date',d->>'property_id',d->>'host_id',d->>'guest_id') ILIKE '%'||replace(replace(replace(p_search,'\','\\'),'%','\%'),'_','\_')||'%')
   ORDER BY d->>'created_at' DESC NULLS LAST,d->>'id' LIMIT 25 OFFSET (p_page-1)*25) page;
  RETURN jsonb_build_object('rows',rows,'total',total,'page',p_page,'pageSize',25);
 END IF;
 SELECT d INTO rec FROM public.admin_rows(p_resource) d WHERE d->>'id'=p_id::text;
 IF rec IS NULL THEN RAISE EXCEPTION 'Dossier introuvable.' USING ERRCODE='P0002'; END IF;
 IF p_resource='users' THEN
  SELECT coalesce(jsonb_agg(d),'[]') INTO rows FROM (SELECT id,title,status FROM public.properties WHERE owner_id=p_id ORDER BY created_at DESC LIMIT 25) d; related:=related||jsonb_build_object('properties',rows);
  SELECT coalesce(jsonb_agg(d),'[]') INTO rows FROM (SELECT id,status,start_date,end_date,property_id,total_price,currency FROM public.bookings WHERE guest_id=p_id OR host_id=p_id ORDER BY created_at DESC LIMIT 25) d; related:=related||jsonb_build_object('bookings',rows);
  SELECT count(*) INTO n FROM public.bookings WHERE (guest_id=p_id OR host_id=p_id) AND status IN ('pending','approved');related:=related||jsonb_build_object('active_bookings',n);
  IF r IN ('owner','support') THEN SELECT coalesce(jsonb_agg(d),'[]') INTO rows FROM (SELECT id,subject,status FROM public.support_tickets WHERE user_id=p_id ORDER BY created_at DESC LIMIT 25) d;related:=related||jsonb_build_object('tickets',rows); END IF;
 ELSIF p_resource='hosts' THEN
  -- payout_details intentionally omitted; verification documents are separately authorized.
  related:=jsonb_build_object('documents',rec->'document_keys');
  SELECT jsonb_build_object('id',id,'full_name',full_name,'email',email,'phone_number',phone_number,'kyc_status',kyc_status,'is_host',is_host) INTO rows FROM public.profiles WHERE id=p_id;related:=related||jsonb_build_object('profile',rows);
 ELSIF p_resource='properties' THEN
  SELECT coalesce(jsonb_agg(d),'[]') INTO rows FROM (SELECT id,url,position,is_cover FROM public.property_images WHERE property_id=p_id ORDER BY position LIMIT 50) d; related:=jsonb_build_object('images',rows);
  SELECT count(*) INTO n FROM public.bookings WHERE property_id=p_id AND status IN ('pending','approved');related:=related||jsonb_build_object('active_bookings',n);
  SELECT jsonb_build_object('id',id,'full_name',full_name,'email',email,'kyc_status',kyc_status,'is_host',is_host) INTO rows FROM public.profiles WHERE id=(rec->>'owner_id')::uuid;related:=related||jsonb_build_object('owner',rows);
 ELSIF p_resource='tickets' THEN
  SELECT coalesce(jsonb_agg(d ORDER BY d.created_at),'[]') INTO rows FROM (SELECT id,sender_id,sender_name,is_support,content,created_at,rating FROM public.support_ticket_messages WHERE ticket_id=p_id ORDER BY created_at DESC LIMIT 100) d;related:=jsonb_build_object('messages',rows);
  SELECT coalesce(jsonb_agg(d),'[]') INTO rows FROM (SELECT m.user_id id,p.full_name,m.role FROM public.admin_members m JOIN public.profiles p ON p.id=m.user_id WHERE m.active AND m.role IN ('owner','support') AND public.account_active(m.user_id) ORDER BY p.full_name LIMIT 100) d;related:=related||jsonb_build_object('assignees',rows);
 ELSIF p_resource='reports' THEN
  INSERT INTO public.admin_audit_log(actor_id,resource,record_id,action) VALUES(p_actor,p_resource,p_id,'view_context');
  SELECT coalesce(jsonb_agg(d ORDER BY d.created_at),'[]') INTO rows FROM (SELECT id,sender_id,content,created_at FROM public.messages WHERE conversation_id=p_id AND (rec->>'status'<>'RESOLVED' OR id=ANY(coalesce((SELECT context_message_ids FROM public.conversation_reports WHERE conversation_id=p_id ORDER BY created_at DESC,id DESC LIMIT 1),'{}'::uuid[]))) ORDER BY created_at DESC LIMIT 100) d;related:=jsonb_build_object('messages',rows);
  SELECT coalesce(jsonb_agg(d),'[]') INTO rows FROM (SELECT id,reporter_id,category,description,created_at,resolved_at,resolution_note FROM public.conversation_reports WHERE conversation_id=p_id ORDER BY created_at DESC LIMIT 25) d;related:=related||jsonb_build_object('reports',rows);
 ELSIF p_resource='bookings' THEN
  IF r IN ('owner','support') THEN SELECT coalesce(jsonb_agg(d),'[]') INTO rows FROM (SELECT id,subject,status FROM public.support_tickets WHERE reservation_id=p_id ORDER BY created_at DESC LIMIT 25) d;related:=jsonb_build_object('tickets',rows); END IF;
 ELSIF p_resource IN ('faq_items','guides','guide_categories','articles','courses','course_steps','legal_documents') THEN
  SELECT jsonb_build_object('fields',CASE WHEN p_resource='legal_documents' THEN (fields-'version')||jsonb_build_object('legal_version',fields->'version') ELSE fields END,'updated_at',updated_at,'actor_id',actor_id) INTO rows FROM public.admin_content_drafts WHERE resource=p_resource AND record_id=p_id;
  related:=jsonb_build_object('draft',rows);
  SELECT coalesce(jsonb_agg(d),'[]') INTO rows FROM (SELECT id,fields,created_at,actor_id FROM public.admin_content_history WHERE resource=p_resource AND record_id=p_id ORDER BY created_at DESC LIMIT 25) d;related:=related||jsonb_build_object('history',rows);
 END IF;
 IF r='owner' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(a)),'[]') INTO rows FROM (SELECT * FROM public.admin_audit_log WHERE resource=p_resource AND record_id=p_id ORDER BY created_at DESC LIMIT 25) a;related:=related||jsonb_build_object('audit',rows);
 END IF;
 RETURN jsonb_build_object('record',rec,'related',related);
END $$;

CREATE FUNCTION public.admin_validate_fields(p_resource text,p_fields jsonb) RETURNS void
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE allowed text[]; k text; v jsonb; BEGIN
 allowed:=CASE p_resource
 WHEN 'faq_items' THEN ARRAY['question','answer','category']
 WHEN 'guides' THEN ARRAY['category_id','title','summary','image','content','is_new']
 WHEN 'guide_categories' THEN ARRAY['title','icon','description']
 WHEN 'articles' THEN ARRAY['slug','title','summary','content','category','level','lang','read_minutes','has_video','video_url','thumbnail_url']
 WHEN 'courses' THEN ARRAY['title','description','level','cover_url','certificate_badge']
 WHEN 'course_steps' THEN ARRAY['course_id','title','type','duration_minutes','position']
 WHEN 'legal_documents' THEN ARRAY['slug','title','version','summary','content','required','category'] END;
 IF allowed IS NULL OR jsonb_typeof(p_fields) IS DISTINCT FROM 'object' OR octet_length(p_fields::text)>14000 OR p_fields='{}' THEN RAISE EXCEPTION 'Champs de contenu invalides.' USING ERRCODE='22023'; END IF;
 FOR k,v IN SELECT * FROM jsonb_each(p_fields) LOOP
  IF NOT k=ANY(allowed) THEN RAISE EXCEPTION 'Champ non autorisé.' USING ERRCODE='22023'; END IF;
  IF v='null'::jsonb THEN CONTINUE; END IF;
  IF k IN ('is_new','has_video','required') THEN
   IF jsonb_typeof(v)<>'boolean' THEN RAISE EXCEPTION 'Booléen requis.' USING ERRCODE='22023'; END IF;
  ELSIF k IN ('read_minutes','duration_minutes','position') THEN
   IF jsonb_typeof(v)<>'number' OR (v#>>'{}')!~'^\d+$' OR (v#>>'{}')::numeric>10000 THEN RAISE EXCEPTION 'Entier invalide.' USING ERRCODE='22023'; END IF;
  ELSE
   IF jsonb_typeof(v)<>'string' OR length(v#>>'{}')>12000 THEN RAISE EXCEPTION 'Texte invalide.' USING ERRCODE='22023'; END IF;
   IF k IN ('title','question','slug','version') AND length(trim(v#>>'{}')) NOT BETWEEN 1 AND 300 THEN RAISE EXCEPTION 'Titre ou version invalide.' USING ERRCODE='22023'; END IF;
   IF k IN ('image','video_url','thumbnail_url','cover_url') AND (v#>>'{}')<>'' AND (v#>>'{}')!~'^https://[^[:space:]]+$' THEN RAISE EXCEPTION 'URL HTTPS requise.' USING ERRCODE='22023'; END IF;
   IF k IN ('course_id','category_id') AND (v#>>'{}')!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN RAISE EXCEPTION 'Identifiant invalide.' USING ERRCODE='22023'; END IF;
  END IF;
 END LOOP;
 IF p_fields ? 'lang' AND p_fields->>'lang' NOT IN ('fr','en','rw','sw') THEN RAISE EXCEPTION 'Langue invalide.' USING ERRCODE='22023'; END IF;
 IF p_fields ? 'level' AND p_fields->>'level' NOT IN ('beginner','intermediate','advanced') THEN RAISE EXCEPTION 'Niveau invalide.' USING ERRCODE='22023'; END IF;
END $$;

CREATE FUNCTION public.admin_mutate(p_actor uuid,p_resource text,p_id uuid,p_payload jsonb,p_expected_version text,p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE role_name text; op text:=p_payload->>'operation'; note text:=nullif(trim(p_payload->>'note'),''); rec jsonb; after_rec jsonb; result jsonb;
 target uuid:=coalesce(p_id,gen_random_uuid()); table_name text; pk text; fingerprint text; existing public.admin_requests; allowed text[];
 fields jsonb; draft public.admin_content_drafts; original jsonb; cols text; vals text; changes jsonb; next_state text; assignee uuid; lim bigint; win integer;
BEGIN
 -- Serialize membership decisions before checking permissions, including simultaneous last-owner changes.
 PERFORM pg_advisory_xact_lock(hashtextextended('locamap:admin:membership',0));
 role_name:=public.admin_require(p_actor,p_resource,true);
 IF p_request_id IS NULL OR jsonb_typeof(p_payload) IS DISTINCT FROM 'object' OR octet_length(p_payload::text)>15000 THEN RAISE EXCEPTION 'Requête invalide.' USING ERRCODE='22023'; END IF;
 fingerprint:=md5(jsonb_build_object('resource',p_resource,'id',p_id,'payload',p_payload,'expectedVersion',p_expected_version)::text);
 PERFORM pg_advisory_xact_lock(hashtextextended(p_actor::text||p_request_id::text,0));
 SELECT * INTO existing FROM public.admin_requests WHERE actor_id=p_actor AND request_id=p_request_id;
 IF FOUND THEN
  IF existing.fingerprint<>fingerprint THEN RAISE EXCEPTION 'Identifiant de requête déjà utilisé.' USING ERRCODE='PT409'; END IF;
  RETURN existing.result;
 END IF;
 allowed:=CASE WHEN p_resource IN ('users','hosts','properties','reports') THEN ARRAY['operation','note']
 WHEN p_resource='tickets' AND op='reply' THEN ARRAY['operation','content']
 WHEN p_resource='tickets' THEN ARRAY['operation','note','status','priority','assigned_to']
 WHEN p_resource='limits' THEN ARRAY['operation','note','max_units','window_seconds']
 WHEN p_resource='members' THEN ARRAY['operation','note','role','user_id']
 WHEN p_resource IN ('faq_items','guides','guide_categories','articles','courses','course_steps','legal_documents') THEN ARRAY['operation','note','fields','legal_identity_confirmed','legal_operator_name','legal_operator_address'] END;
 IF allowed IS NULL OR EXISTS(SELECT 1 FROM jsonb_object_keys(p_payload) k WHERE NOT k=ANY(allowed)) THEN RAISE EXCEPTION 'Opération ou champ interdit.' USING ERRCODE='22023'; END IF;
 IF op IS NULL OR (op NOT IN ('reply','save_draft') AND (note IS NULL OR length(note)>2000)) THEN RAISE EXCEPTION 'Motif requis (2000 caractères maximum).' USING ERRCODE='22023'; END IF;
 IF p_resource='members' AND ((p_id IS NULL AND op<>'grant') OR (p_id IS NOT NULL AND p_payload ? 'user_id' AND p_payload->>'user_id' IS DISTINCT FROM p_id::text)) THEN RAISE EXCEPTION 'Cible de membre invalide.' USING ERRCODE='22023'; END IF;
 IF p_resource='members' AND p_id IS NULL THEN target:=(p_payload->>'user_id')::uuid; END IF;
 IF target IS NULL THEN RAISE EXCEPTION 'Identifiant requis.' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_resource||target::text,0));
 table_name:=public.admin_table(p_resource);pk:=CASE WHEN p_resource IN ('hosts','members') THEN 'user_id' ELSE 'id' END;
 -- Host submission locks profile then application; preserve that order.
 IF p_resource='hosts' THEN PERFORM 1 FROM public.profiles WHERE id=target FOR UPDATE; END IF;
 EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE %I=$1 FOR UPDATE',table_name,pk) INTO original USING target;
 SELECT d INTO rec FROM public.admin_rows(p_resource) d WHERE d->>'id'=target::text;
 IF rec IS NOT NULL THEN
  IF p_expected_version IS NULL OR rec->>'version'<>p_expected_version THEN RAISE EXCEPTION 'Ce dossier a changé. Rechargez avant de décider.' USING ERRCODE='PT409'; END IF;
 ELSIF p_id IS NOT NULL OR p_resource NOT IN ('members','faq_items','guides','guide_categories','articles','courses','course_steps','legal_documents') THEN RAISE EXCEPTION 'Dossier introuvable.' USING ERRCODE='P0002';
 END IF;
 IF p_resource='users' THEN
  IF op NOT IN ('suspend','reactivate') THEN RAISE EXCEPTION 'Opération invalide.' USING ERRCODE='22023'; END IF;
  IF op='suspend' AND EXISTS(SELECT 1 FROM public.admin_members WHERE user_id=target AND role='owner' AND active) AND
   (SELECT count(*) FROM public.admin_members WHERE role='owner' AND active AND public.account_active(user_id))<=1 THEN RAISE EXCEPTION 'Conservez au moins un propriétaire actif.' USING ERRCODE='PT409'; END IF;
  INSERT INTO public.account_restrictions(user_id,suspended,note,actor_id) VALUES(target,op='suspend',note,p_actor)
  ON CONFLICT(user_id) DO UPDATE SET suspended=excluded.suspended,note=excluded.note,actor_id=p_actor,updated_at=clock_timestamp();
 ELSIF p_resource='hosts' THEN
  IF op NOT IN ('approve','reject') OR rec->>'status'<>'PENDING' THEN RAISE EXCEPTION 'Dossier non soumis à validation.' USING ERRCODE='PT409'; END IF;
  IF op='approve' AND NOT public.account_active(target) THEN RAISE EXCEPTION 'Compte suspendu.' USING ERRCODE='PT409'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(rec->'document_keys') k WHERE NOT EXISTS(SELECT 1 FROM public.upload_objects WHERE key=k AND user_id=target AND entity='kyc' AND verified_at IS NOT NULL)) THEN RAISE EXCEPTION 'Justificatif finalisé requis.' USING ERRCODE='PT409'; END IF;
  PERFORM public.review_host_application(target,op='approve',note);
 ELSIF p_resource='properties' THEN
  next_state:=CASE op WHEN 'publish' THEN 'ACTIVE' WHEN 'return' THEN 'DRAFT' WHEN 'suspend' THEN 'SUSPENDED' WHEN 'review' THEN 'PENDING_REVIEW' END;
  IF next_state IS NULL OR (op IN ('publish','return') AND rec->>'status'<>'PENDING_REVIEW') OR (op='review' AND rec->>'status'<>'SUSPENDED') OR (op='suspend' AND rec->>'status' NOT IN ('ACTIVE','PAUSED','PENDING_REVIEW')) THEN RAISE EXCEPTION 'Transition de modération invalide.' USING ERRCODE='PT409'; END IF;
  IF op='publish' THEN
   PERFORM 1 FROM public.profiles WHERE id=(rec->>'owner_id')::uuid AND is_host AND kyc_status='VERIFIED' AND public.account_active(id) FOR SHARE;
   IF NOT FOUND OR coalesce(length(trim(rec->>'title')),0)<5 OR coalesce(length(trim(rec->>'description')),0)<20 OR coalesce(length(trim(rec->>'address')),0)<5 OR rec->>'latitude' IS NULL OR rec->>'longitude' IS NULL OR (rec->>'price_per_month')::numeric<=0 OR NOT EXISTS(SELECT 1 FROM public.property_images WHERE property_id=target) THEN RAISE EXCEPTION 'Annonce incomplète ou hôte non validé.' USING ERRCODE='22023'; END IF;
  END IF;
  UPDATE public.properties SET status=next_state,moderation_note=note WHERE id=target;
 ELSIF p_resource='tickets' THEN
  IF op='reply' THEN
   IF rec->>'status'='CLOSED' OR jsonb_typeof(p_payload->'content') IS DISTINCT FROM 'string' OR length(trim(p_payload->>'content')) NOT BETWEEN 1 AND 10000 THEN RAISE EXCEPTION 'Réponse invalide ou ticket fermé.' USING ERRCODE='22023'; END IF;
   INSERT INTO public.support_ticket_messages(ticket_id,sender_id,sender_name,is_support,content)
    SELECT target,p_actor,coalesce(full_name,'Support LocaMap'),true,trim(p_payload->>'content') FROM public.profiles WHERE id=p_actor;
  ELSIF op='update' THEN
   IF (p_payload ? 'status' AND (p_payload->>'status' IS NULL OR p_payload->>'status' NOT IN ('OPEN','IN_PROGRESS','WAITING_HOST','RESOLVED','CLOSED'))) OR
      (p_payload ? 'priority' AND (p_payload->>'priority' IS NULL OR p_payload->>'priority' NOT IN ('LOW','NORMAL','HIGH','URGENT'))) THEN RAISE EXCEPTION 'État ou priorité invalide.' USING ERRCODE='22023'; END IF;
   IF p_payload ? 'assigned_to' AND p_payload->>'assigned_to' IS NOT NULL THEN
    assignee:=(p_payload->>'assigned_to')::uuid;
    IF NOT EXISTS(SELECT 1 FROM public.admin_members WHERE user_id=assignee AND active AND role IN ('owner','support') AND public.account_active(user_id)) THEN RAISE EXCEPTION 'Opérateur indisponible.' USING ERRCODE='22023'; END IF;
   END IF;
   UPDATE public.support_tickets SET status=coalesce(p_payload->>'status',status),priority=coalesce(p_payload->>'priority',priority),
    assigned_to=CASE WHEN p_payload ? 'assigned_to' THEN assignee ELSE assigned_to END,
    resolved_at=CASE WHEN coalesce(p_payload->>'status',status) IN ('RESOLVED','CLOSED') THEN coalesce(resolved_at,now()) ELSE NULL END WHERE id=target;
  ELSE RAISE EXCEPTION 'Opération invalide.' USING ERRCODE='22023'; END IF;
 ELSIF p_resource='reports' THEN
  IF op NOT IN ('freeze','resolve') OR rec->>'status' NOT IN ('REPORTED','FROZEN') THEN RAISE EXCEPTION 'Signalement non ouvert.' USING ERRCODE='PT409'; END IF;
  UPDATE public.conversations SET status=CASE WHEN op='freeze' THEN 'FROZEN' ELSE 'ACTIVE' END WHERE id=target;
  IF op='resolve' THEN
   -- Snapshot identifiers while holding the conversation lock. A timestamp alone
   -- can include a later send whose transaction began before this resolution.
   UPDATE public.conversation_reports SET resolved_at=clock_timestamp(),resolved_by=p_actor,resolution_note=note,
    context_message_ids=ARRAY(SELECT id FROM public.messages WHERE conversation_id=target ORDER BY created_at DESC,id DESC LIMIT 100)
    WHERE conversation_id=target AND resolved_at IS NULL;
  END IF;
 ELSIF p_resource='members' THEN
  IF op NOT IN ('grant','revoke') OR (op='grant' AND (p_payload->>'role' IS NULL OR p_payload->>'role' NOT IN ('owner','moderator','support','editor'))) THEN RAISE EXCEPTION 'Rôle invalide.' USING ERRCODE='22023'; END IF;
  IF rec->>'role'='owner' AND (rec->>'active')::boolean AND (op='revoke' OR p_payload->>'role'<>'owner') AND
   (SELECT count(*) FROM public.admin_members WHERE role='owner' AND active AND public.account_active(user_id))<=1 THEN RAISE EXCEPTION 'Conservez au moins un propriétaire actif.' USING ERRCODE='PT409'; END IF;
  IF op='grant' THEN
   IF NOT public.account_active(target) OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=target) THEN RAISE EXCEPTION 'Compte actif requis.' USING ERRCODE='22023'; END IF;
   INSERT INTO public.admin_members(user_id,role) VALUES(target,p_payload->>'role') ON CONFLICT(user_id) DO UPDATE SET role=excluded.role,active=true,updated_at=clock_timestamp();
  ELSE UPDATE public.admin_members SET active=false,updated_at=clock_timestamp() WHERE user_id=target; END IF;
 ELSIF p_resource='limits' THEN
  IF op<>'update' OR coalesce(p_payload->>'max_units','')!~'^\d+$' OR coalesce(p_payload->>'window_seconds','')!~'^\d+$' THEN RAISE EXCEPTION 'Limite invalide.' USING ERRCODE='22023'; END IF;
  lim:=(p_payload->>'max_units')::bigint;win:=(p_payload->>'window_seconds')::integer;
  IF lim<1 OR lim>(CASE WHEN rec->>'name' LIKE '%bytes%' THEN 107374182400 ELSE 1000000 END) OR win NOT BETWEEN 60 AND 86400 THEN RAISE EXCEPTION 'Limite hors bornes.' USING ERRCODE='22023'; END IF;
  UPDATE public.runtime_limits SET max_units=lim,window_seconds=win WHERE id=target;
 ELSE
  IF op NOT IN ('save_draft','publish') THEN RAISE EXCEPTION 'Opération éditoriale invalide.' USING ERRCODE='22023'; END IF;
  fields:=p_payload->'fields';
  IF p_resource='legal_documents' AND fields ? 'legal_version' THEN
   IF fields ? 'version' THEN RAISE EXCEPTION 'Version juridique ambiguë.' USING ERRCODE='22023'; END IF;
   fields:=(fields-'legal_version')||jsonb_build_object('version',fields->'legal_version');
  END IF;
  PERFORM public.admin_validate_fields(p_resource,fields);
  SELECT * INTO draft FROM public.admin_content_drafts WHERE resource=p_resource AND record_id=target;
  fields:=coalesce(original,'{}')||coalesce(draft.fields,'{}')||fields;
  -- Keep only allowed submitted/draft fields plus the editable public values.
  allowed:=CASE p_resource WHEN 'faq_items' THEN ARRAY['question','answer','category'] WHEN 'guides' THEN ARRAY['category_id','title','summary','image','content','is_new'] WHEN 'guide_categories' THEN ARRAY['title','icon','description'] WHEN 'articles' THEN ARRAY['slug','title','summary','content','category','level','lang','read_minutes','has_video','video_url','thumbnail_url'] WHEN 'courses' THEN ARRAY['title','description','level','cover_url','certificate_badge'] WHEN 'course_steps' THEN ARRAY['course_id','title','type','duration_minutes','position'] WHEN 'legal_documents' THEN ARRAY['slug','title','version','summary','content','required','category'] END;
  SELECT jsonb_object_agg(key,value) INTO fields FROM jsonb_each(fields) WHERE key=ANY(allowed);
  PERFORM public.admin_validate_fields(p_resource,fields);
  IF op='save_draft' THEN
   INSERT INTO public.admin_content_drafts(resource,record_id,fields,actor_id) VALUES(p_resource,target,fields,p_actor)
   ON CONFLICT(resource,record_id) DO UPDATE SET fields=excluded.fields,actor_id=p_actor,updated_at=clock_timestamp();
  ELSE
   IF p_resource='legal_documents' THEN
    IF p_payload->'legal_identity_confirmed' IS DISTINCT FROM 'true'::jsonb OR length(trim(coalesce(p_payload->>'legal_operator_name','')))<2 OR length(trim(coalesce(p_payload->>'legal_operator_address','')))<5 THEN RAISE EXCEPTION 'Identité légale et adresse définitives requises.' USING ERRCODE='22023'; END IF;
    IF original IS NOT NULL AND fields->>'version'=original->>'version' THEN RAISE EXCEPTION 'Nouvelle version juridique requise.' USING ERRCODE='PT409'; END IF;
    fields:=fields||jsonb_build_object('previous_versions',coalesce(original->'previous_versions','[]')||CASE WHEN original IS NULL THEN '[]'::jsonb ELSE jsonb_build_array((original-'previous_versions')||jsonb_build_object('updatedAt',original->'updated_at')) END);
   ELSIF p_resource='articles' THEN fields:=fields||jsonb_build_object('published_at',now()); END IF;
   -- Typed populate_record validates numbers, UUIDs, enum constraints and foreign keys.
   SELECT string_agg(format('%I',key),',' ORDER BY key),string_agg(format('(jsonb_populate_record(NULL::public.%I,$2)).%I',table_name,key),',' ORDER BY key) INTO cols,vals FROM jsonb_object_keys(fields) key;
   IF original IS NULL THEN
    EXECUTE format('INSERT INTO public.%I(id,%s) SELECT $1,%s',table_name,cols,vals) USING target,fields;
   ELSE
    INSERT INTO public.admin_content_history(resource,record_id,fields,actor_id) VALUES(p_resource,target,original,p_actor);
    EXECUTE format('UPDATE public.%I SET (%s)=(SELECT %s) WHERE id=$1',table_name,cols,vals) USING target,fields;
   END IF;
   DELETE FROM public.admin_content_drafts WHERE resource=p_resource AND record_id=target;
  END IF;
 END IF;
 SELECT d INTO after_rec FROM public.admin_rows(p_resource) d WHERE d->>'id'=target::text;
 -- Audit contains decision state and changed field names, never documents/messages/content.
 changes:=jsonb_strip_nulls(jsonb_build_object('before_status',rec->'status','after_status',after_rec->'status','before_role',rec->'role','after_role',after_rec->'role','before_version',rec->'version','after_version',after_rec->'version','fields',CASE WHEN p_payload ? 'fields' THEN (SELECT jsonb_agg(k) FROM jsonb_object_keys(p_payload->'fields') k) ELSE NULL END));
 IF p_resource='limits' THEN changes:=changes||jsonb_build_object('before_max_units',rec->'max_units','after_max_units',after_rec->'max_units','before_window_seconds',rec->'window_seconds','after_window_seconds',after_rec->'window_seconds'); END IF;
 IF p_resource='tickets' THEN changes:=changes||jsonb_build_object('before_assigned_to',rec->'assigned_to','after_assigned_to',after_rec->'assigned_to','before_priority',rec->'priority','after_priority',after_rec->'priority'); END IF;
 INSERT INTO public.admin_audit_log(actor_id,resource,record_id,action,note,request_id,changes) VALUES(p_actor,p_resource,target,op,note,p_request_id,changes);
 result:=jsonb_build_object('ok',true,'id',target,'version',after_rec->>'version');
 INSERT INTO public.admin_requests(actor_id,request_id,fingerprint,result) VALUES(p_actor,p_request_id,fingerprint,result);
 RETURN result;
END $$;

CREATE FUNCTION public.admin_document(p_actor uuid,p_host_id uuid,p_key text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE app public.host_applications; BEGIN
 PERFORM public.admin_require(p_actor,'hosts');
 SELECT * INTO app FROM public.host_applications WHERE user_id=p_host_id FOR SHARE;
 IF app.user_id IS NULL OR p_key IS NULL OR NOT p_key=ANY(app.document_keys) OR NOT EXISTS(SELECT 1 FROM public.upload_objects WHERE user_id=p_host_id AND key=p_key AND entity='kyc' AND verified_at IS NOT NULL) THEN RAISE EXCEPTION 'Justificatif indisponible.' USING ERRCODE='42501'; END IF;
 INSERT INTO public.admin_audit_log(actor_id,resource,record_id,action) VALUES(p_actor,'hosts',p_host_id,'view_document');
 RETURN jsonb_build_object('key',p_key,'entity','kyc');
END $$;

-- The server bootstrap command calls this only for a deliberately selected UUID.
-- No first-user logic, email metadata role or browser path exists.
CREATE FUNCTION public.admin_bootstrap_owner(p_user_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE identity jsonb; profile_email text; existing_member public.admin_members;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('locamap:admin:membership',0));
 SELECT to_jsonb(u) INTO identity FROM auth.users u WHERE id=p_user_id FOR UPDATE;
 SELECT email INTO profile_email FROM public.profiles WHERE id=p_user_id FOR UPDATE;
 IF identity IS NULL OR nullif(trim(identity->>'email'),'') IS NULL OR identity->>'email_confirmed_at' IS NULL
  OR profile_email IS NULL OR lower(trim(profile_email))<>lower(trim(identity->>'email'))
  OR NOT public.account_active(p_user_id) OR identity->>'deleted_at' IS NOT NULL
  OR coalesce((identity->>'banned_until')::timestamptz>now(),false) THEN
  RAISE EXCEPTION 'Compte confirmé et profil concordant requis.' USING ERRCODE='22023';
 END IF;
 SELECT * INTO existing_member FROM public.admin_members WHERE user_id=p_user_id;
 IF existing_member.active AND existing_member.role='owner' THEN RETURN jsonb_build_object('ok',true,'id',p_user_id,'existing',true); END IF;
 IF EXISTS(SELECT 1 FROM public.admin_members WHERE role='owner' AND active AND public.account_active(user_id)) THEN RAISE EXCEPTION 'Un propriétaire actif existe déjà.' USING ERRCODE='PT409'; END IF;
 INSERT INTO public.admin_members(user_id,role,active) VALUES(p_user_id,'owner',true)
 ON CONFLICT(user_id) DO UPDATE SET role='owner',active=true,updated_at=clock_timestamp();
 INSERT INTO public.admin_audit_log(actor_id,resource,record_id,action,note,changes)
 VALUES(p_user_id,'members',p_user_id,'bootstrap_owner','Attribution initiale par commande serveur.',jsonb_build_object('source','server_bootstrap','before_role',existing_member.role,'after_role','owner'));
 RETURN jsonb_build_object('ok',true,'id',p_user_id,'existing',false);
END $$;

-- Close default PUBLIC EXECUTE on every new helper and entry point.
DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT p.oid::regprocedure sig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND (p.proname LIKE 'admin_%' OR p.proname IN ('guard_suspended_write','guard_moderated_message')) LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.sig);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.sig);
 END LOOP;
END $$;
COMMIT;
