-- =============================================================================
-- LocaMap Rental Platform — Supabase PostgreSQL Schema + RLS Policies
-- Target: Gisenyi, Rwanda | Currency: RWF
-- Migration: 001_init.sql
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- SECTION 1: TABLE DEFINITIONS
-- =============================================================================

-- ----------------------------------------------------------------------------
-- 1. profiles — extends auth.users
-- ----------------------------------------------------------------------------
CREATE TABLE public.profiles (
    id                  uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name           text,
    email               text,
    phone_number        text,
    avatar_url          text,
    bio                 text,
    languages           text[],
    kyc_status          text        NOT NULL DEFAULT 'NOT_VERIFIED'
                                    CHECK (kyc_status IN ('NOT_VERIFIED','PENDING','VERIFIED','REJECTED')),
    is_host             boolean     NOT NULL DEFAULT false,
    preferred_currency  text        NOT NULL DEFAULT 'RWF',
    preferred_language  text        NOT NULL DEFAULT 'fr',
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 2. notification_preferences
-- ----------------------------------------------------------------------------
CREATE TABLE public.notification_preferences (
    user_id             uuid        PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    reservations        boolean     NOT NULL DEFAULT true,
    messages            boolean     NOT NULL DEFAULT true,
    promotions          boolean     NOT NULL DEFAULT false,
    newsletter          boolean     NOT NULL DEFAULT false,
    push_enabled        boolean     NOT NULL DEFAULT true,
    email_enabled       boolean     NOT NULL DEFAULT true,
    sms_enabled         boolean     NOT NULL DEFAULT false
);

-- ----------------------------------------------------------------------------
-- 3. payout_accounts
-- ----------------------------------------------------------------------------
CREATE TABLE public.payout_accounts (
    id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type            text        NOT NULL
                                CHECK (type IN ('MTN_MOMO','AIRTEL_MONEY','M_PESA','BANK_TRANSFER')),
    account_number  text        NOT NULL,
    account_name    text        NOT NULL,
    is_default      boolean     NOT NULL DEFAULT false,
    is_verified     boolean     NOT NULL DEFAULT false
);

-- ----------------------------------------------------------------------------
-- 4. properties
-- ----------------------------------------------------------------------------
CREATE TABLE public.properties (
    id                      uuid            PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id                uuid            NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    title                   text            NOT NULL,
    description             text,
    property_type           text,
    accommodation_type      text,
    status                  text            NOT NULL DEFAULT 'DRAFT'
                                            CHECK (status IN ('DRAFT','PENDING_REVIEW','ACTIVE','PAUSED','SUSPENDED','ARCHIVED')),
    price_per_month         numeric         NOT NULL,
    currency                text            NOT NULL DEFAULT 'RWF',
    deposit                 numeric         NOT NULL DEFAULT 0,
    min_duration_months     int             NOT NULL DEFAULT 1,
    notice_period_days      int             NOT NULL DEFAULT 30,
    bedrooms                int             NOT NULL DEFAULT 1,
    bathrooms               int             NOT NULL DEFAULT 1,
    max_guests              int             NOT NULL DEFAULT 2,
    amenities               text[],
    smoking_allowed         boolean         NOT NULL DEFAULT false,
    pets_allowed            boolean         NOT NULL DEFAULT false,
    address                 text,
    city                    text            NOT NULL DEFAULT 'Gisenyi',
    district                text,
    country                 text            NOT NULL DEFAULT 'Rwanda',
    latitude                numeric,
    longitude               numeric,
    avg_rating              numeric(3,2),
    review_count            int             NOT NULL DEFAULT 0,
    view_count              int             NOT NULL DEFAULT 0,
    completion_score        int             NOT NULL DEFAULT 0,
    occupancy_rate          numeric(5,2),
    revenue_month           numeric         NOT NULL DEFAULT 0,
    created_at              timestamptz     NOT NULL DEFAULT now(),
    updated_at              timestamptz     NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 5. property_images
-- ----------------------------------------------------------------------------
CREATE TABLE public.property_images (
    id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id     uuid        NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    url             text        NOT NULL,
    position        int         NOT NULL DEFAULT 0,
    is_cover        boolean     NOT NULL DEFAULT false,
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 6. calendar_days
-- ----------------------------------------------------------------------------
CREATE TABLE public.calendar_days (
    id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id     uuid        NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    date            date        NOT NULL,
    status          text        NOT NULL DEFAULT 'available'
                                CHECK (status IN ('available','booked','blocked')),
    price_override  numeric,
    min_nights      int,
    block_reason    text        CHECK (block_reason IN ('personal','maintenance','other')),
    reservation_id  uuid,
    UNIQUE (property_id, date)
);

-- ----------------------------------------------------------------------------
-- 7. bookings
-- ----------------------------------------------------------------------------
CREATE TABLE public.bookings (
    id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id     uuid        NOT NULL REFERENCES public.properties(id) ON DELETE RESTRICT,
    guest_id        uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    host_id         uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    start_date      date        NOT NULL,
    end_date        date        NOT NULL,
    guest_count     int         NOT NULL DEFAULT 1,
    status          text        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending','approved','rejected','cancelled','completed')),
    total_price     numeric     NOT NULL,
    currency        text        NOT NULL DEFAULT 'RWF',
    message         text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 8. conversations
-- ----------------------------------------------------------------------------
CREATE TABLE public.conversations (
    id                      uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id             uuid        REFERENCES public.properties(id) ON DELETE SET NULL,
    booking_id              uuid        REFERENCES public.bookings(id) ON DELETE SET NULL,
    status                  text        NOT NULL DEFAULT 'ACTIVE'
                                        CHECK (status IN ('ACTIVE','ARCHIVED','REPORTED','FROZEN')),
    last_message_text       text,
    last_message_at         timestamptz,
    last_message_sender_id  uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 9. conversation_participants
-- ----------------------------------------------------------------------------
CREATE TABLE public.conversation_participants (
    conversation_id uuid        NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id         uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    unread_count    int         NOT NULL DEFAULT 0,
    joined_at       timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (conversation_id, user_id)
);

-- ----------------------------------------------------------------------------
-- 10. messages
-- ----------------------------------------------------------------------------
CREATE TABLE public.messages (
    id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id uuid        NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id       uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    content         text        NOT NULL,
    is_read         boolean     NOT NULL DEFAULT false,
    template_id     uuid,
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 11. message_templates
-- ----------------------------------------------------------------------------
CREATE TABLE public.message_templates (
    id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name        text        NOT NULL,
    content     text        NOT NULL,
    category    text,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 12. reviews
-- ----------------------------------------------------------------------------
CREATE TABLE public.reviews (
    id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id     uuid        NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    booking_id      uuid        REFERENCES public.bookings(id) ON DELETE RESTRICT,
    author_id       uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    rating          int         NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment         text,
    is_verified     boolean     NOT NULL DEFAULT false,
    stay_duration   text        CHECK (stay_duration IN ('court terme','long terme')),
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 13. review_replies
-- ----------------------------------------------------------------------------
CREATE TABLE public.review_replies (
    id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id   uuid        NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
    author_id   uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    text        text        NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 14. alerts
-- ----------------------------------------------------------------------------
CREATE TABLE public.alerts (
    id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name        text        NOT NULL,
    filters     jsonb       NOT NULL DEFAULT '{}',
    frequency   text        NOT NULL DEFAULT 'daily'
                            CHECK (frequency IN ('daily','weekly','instant')),
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 15. notifications
-- ----------------------------------------------------------------------------
CREATE TABLE public.notifications (
    id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title       text        NOT NULL,
    message     text        NOT NULL,
    type        text        NOT NULL DEFAULT 'system'
                            CHECK (type IN ('alert','message','system','booking')),
    is_read     boolean     NOT NULL DEFAULT false,
    related_id  text,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 16. support_tickets
-- ----------------------------------------------------------------------------
CREATE TABLE public.support_tickets (
    id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    category        text,
    priority        text        NOT NULL DEFAULT 'NORMAL'
                                CHECK (priority IN ('LOW','NORMAL','HIGH','URGENT')),
    subject         text        NOT NULL,
    description     text        NOT NULL,
    status          text        NOT NULL DEFAULT 'OPEN'
                                CHECK (status IN ('OPEN','IN_PROGRESS','WAITING_HOST','RESOLVED','CLOSED')),
    reservation_id  uuid        REFERENCES public.bookings(id) ON DELETE SET NULL,
    resolved_at     timestamptz,
    last_reply_at   timestamptz,
    unread_replies  int         NOT NULL DEFAULT 0,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 17. support_ticket_messages
-- ----------------------------------------------------------------------------
CREATE TABLE public.support_ticket_messages (
    id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id   uuid        NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    sender_id   uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
    sender_name text,
    is_support  boolean     NOT NULL DEFAULT false,
    content     text        NOT NULL,
    rating      smallint    CHECK (rating IN (-1, 1)),
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 18. faq_items
-- ----------------------------------------------------------------------------
CREATE TABLE public.faq_items (
    id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    question    text        NOT NULL,
    answer      text        NOT NULL,
    category    text,
    helpful     int         NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 19. legal_documents
-- ----------------------------------------------------------------------------
CREATE TABLE public.legal_documents (
    id                  uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug                text        UNIQUE NOT NULL,
    title               text        NOT NULL,
    version             text        NOT NULL,
    summary             text,
    content             text        NOT NULL,
    required            boolean     NOT NULL DEFAULT false,
    category            text        NOT NULL
                                    CHECK (category IN ('cgu','privacy','cancellation','discrimination','rules')),
    previous_versions   jsonb       NOT NULL DEFAULT '[]',
    updated_at          timestamptz NOT NULL DEFAULT now(),
    created_at          timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 20. consent_records
-- ----------------------------------------------------------------------------
CREATE TABLE public.consent_records (
    id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    document_id     uuid        NOT NULL REFERENCES public.legal_documents(id) ON DELETE RESTRICT,
    version         text        NOT NULL,
    ip_address      text,
    accepted_at     timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 21. referral_codes
-- ----------------------------------------------------------------------------
CREATE TABLE public.referral_codes (
    id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     uuid        NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    code        text        UNIQUE NOT NULL,
    link        text,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 22. referral_entries
-- ----------------------------------------------------------------------------
CREATE TABLE public.referral_entries (
    id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    referee_id      uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
    referee_name    text,
    status          text        NOT NULL DEFAULT 'LINK_CLICKED'
                                CHECK (status IN (
                                    'LINK_CLICKED','REGISTERED','KYC_DONE',
                                    'LISTING_PUBLISHED','FIRST_BOOKING_DONE',
                                    'BONUS_CREDITED','EXPIRED','FRAUD_DETECTED'
                                )),
    bonus_amount    numeric     NOT NULL DEFAULT 0,
    bonus_currency  text        NOT NULL DEFAULT 'RWF',
    credited_at     timestamptz,
    expires_at      timestamptz,
    started_at      timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 23. referral_credits
-- ----------------------------------------------------------------------------
CREATE TABLE public.referral_credits (
    id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount      numeric     NOT NULL,
    reason      text,
    expires_at  timestamptz,
    used        boolean     NOT NULL DEFAULT false,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 24. co_hosts
-- ----------------------------------------------------------------------------
CREATE TABLE public.co_hosts (
    id                  uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    host_id             uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    co_host_id          uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    status              text        NOT NULL DEFAULT 'PENDING'
                                    CHECK (status IN ('PENDING','ACTIVE','SUSPENDED','TERMINATED')),
    permissions         jsonb       NOT NULL DEFAULT '{
                                        "calendar": false,
                                        "reservations": false,
                                        "messages": false,
                                        "pricing": false,
                                        "revenue_view": false,
                                        "reviews": false,
                                        "guest_info": false
                                    }',
    revenue_share_type  text        CHECK (revenue_share_type IN ('PERCENTAGE','FIXED_PER_BOOKING','FIXED_MONTHLY')),
    revenue_share_value numeric     NOT NULL DEFAULT 0,
    listing_ids         uuid[]      NOT NULL DEFAULT '{}',
    start_date          date,
    contract_url        text,
    probation_end       date,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 25. articles
-- ----------------------------------------------------------------------------
CREATE TABLE public.articles (
    id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug            text        UNIQUE NOT NULL,
    title           text        NOT NULL,
    summary         text,
    content         text        NOT NULL,
    category        text,
    level           text        CHECK (level IN ('beginner','intermediate','advanced')),
    lang            text        NOT NULL DEFAULT 'fr'
                                CHECK (lang IN ('fr','en','rw','sw')),
    read_minutes    int         NOT NULL DEFAULT 5,
    has_video       boolean     NOT NULL DEFAULT false,
    video_url       text,
    thumbnail_url   text,
    published_at    timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 26. courses
-- ----------------------------------------------------------------------------
CREATE TABLE public.courses (
    id                  uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    title               text        NOT NULL,
    description         text,
    level               text        CHECK (level IN ('beginner','intermediate','advanced')),
    cover_url           text,
    certificate_badge   text,
    created_at          timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 27. course_steps
-- ----------------------------------------------------------------------------
CREATE TABLE public.course_steps (
    id                  uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id           uuid        NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    title               text        NOT NULL,
    type                text        NOT NULL CHECK (type IN ('article','video','quiz')),
    duration_minutes    int         NOT NULL DEFAULT 5,
    position            int         NOT NULL DEFAULT 0,
    created_at          timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 28. user_bookmarks
-- ----------------------------------------------------------------------------
CREATE TABLE public.user_bookmarks (
    user_id         uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    article_slug    text        NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, article_slug)
);

-- ----------------------------------------------------------------------------
-- 29. course_progress
-- ----------------------------------------------------------------------------
CREATE TABLE public.course_progress (
    user_id         uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    step_id         uuid        NOT NULL REFERENCES public.course_steps(id) ON DELETE CASCADE,
    completed_at    timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, step_id)
);

-- ----------------------------------------------------------------------------
-- 30. guide_categories
-- ----------------------------------------------------------------------------
CREATE TABLE public.guide_categories (
    id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    title       text        NOT NULL,
    icon        text,
    description text,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 31. guides
-- ----------------------------------------------------------------------------
CREATE TABLE public.guides (
    id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id uuid        REFERENCES public.guide_categories(id) ON DELETE SET NULL,
    title       text        NOT NULL,
    summary     text,
    image       text,
    content     text        NOT NULL,
    is_new      boolean     NOT NULL DEFAULT false,
    created_at  timestamptz NOT NULL DEFAULT now()
);


-- =============================================================================
-- SECTION 2: TRIGGERS
-- =============================================================================

-- ----------------------------------------------------------------------------
-- Auto-update updated_at timestamp function
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER properties_updated_at
    BEFORE UPDATE ON public.properties
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER bookings_updated_at
    BEFORE UPDATE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER conversations_updated_at
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER support_tickets_updated_at
    BEFORE UPDATE ON public.support_tickets
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER co_hosts_updated_at
    BEFORE UPDATE ON public.co_hosts
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- handle_new_user: auto-create profile + notification_preferences on signup
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        NEW.email
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.notification_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- =============================================================================
-- SECTION 3: INDEXES
-- =============================================================================

-- properties
CREATE INDEX idx_properties_owner_id     ON public.properties(owner_id);
CREATE INDEX idx_properties_status       ON public.properties(status);
CREATE INDEX idx_properties_city         ON public.properties(city);
CREATE INDEX idx_properties_lat_lng      ON public.properties(latitude, longitude);

-- bookings
CREATE INDEX idx_bookings_guest_id       ON public.bookings(guest_id);
CREATE INDEX idx_bookings_host_id        ON public.bookings(host_id);
CREATE INDEX idx_bookings_property_id    ON public.bookings(property_id);
CREATE INDEX idx_bookings_status         ON public.bookings(status);

-- conversations
CREATE INDEX idx_conversations_property_id ON public.conversations(property_id);

-- conversation_participants
CREATE INDEX idx_conv_participants_user_id ON public.conversation_participants(user_id);

-- messages
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_sender_id       ON public.messages(sender_id);

-- notifications
CREATE INDEX idx_notifications_user_id   ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read   ON public.notifications(is_read);

-- reviews
CREATE INDEX idx_reviews_property_id     ON public.reviews(property_id);
CREATE INDEX idx_reviews_author_id       ON public.reviews(author_id);

-- articles
CREATE INDEX idx_articles_lang           ON public.articles(lang);
CREATE INDEX idx_articles_category       ON public.articles(category);
CREATE INDEX idx_articles_level          ON public.articles(level);

-- referral_entries
CREATE INDEX idx_referral_entries_referrer_id ON public.referral_entries(referrer_id);

-- co_hosts
CREATE INDEX idx_co_hosts_host_id        ON public.co_hosts(host_id);
CREATE INDEX idx_co_hosts_co_host_id     ON public.co_hosts(co_host_id);


-- =============================================================================
-- SECTION 4: ROW LEVEL SECURITY — ENABLE
-- =============================================================================

ALTER TABLE public.profiles                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_accounts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_images           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_days             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_replies            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_messages   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_items                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_documents           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_records           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_codes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_entries          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_credits          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.co_hosts                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_steps              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_bookmarks            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_progress           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guide_categories          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guides                    ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- SECTION 5: RLS POLICIES
-- =============================================================================

-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------
CREATE POLICY profiles_select_policy
    ON public.profiles FOR SELECT
    USING (true);

CREATE POLICY profiles_insert_own
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY profiles_update_own
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY profiles_delete_own
    ON public.profiles FOR DELETE
    USING (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- notification_preferences
-- ----------------------------------------------------------------------------
CREATE POLICY notification_preferences_select_own
    ON public.notification_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY notification_preferences_insert_own
    ON public.notification_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY notification_preferences_update_own
    ON public.notification_preferences FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY notification_preferences_delete_own
    ON public.notification_preferences FOR DELETE
    USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- payout_accounts
-- ----------------------------------------------------------------------------
CREATE POLICY payout_accounts_select_own
    ON public.payout_accounts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY payout_accounts_insert_own
    ON public.payout_accounts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY payout_accounts_update_own
    ON public.payout_accounts FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY payout_accounts_delete_own
    ON public.payout_accounts FOR DELETE
    USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- properties
-- ----------------------------------------------------------------------------
CREATE POLICY properties_select_policy
    ON public.properties FOR SELECT
    USING ((status = 'ACTIVE') OR (owner_id = auth.uid()));

CREATE POLICY properties_insert_own
    ON public.properties FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY properties_update_own
    ON public.properties FOR UPDATE
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY properties_delete_own
    ON public.properties FOR DELETE
    USING (auth.uid() = owner_id);

-- ----------------------------------------------------------------------------
-- property_images
-- ----------------------------------------------------------------------------
CREATE POLICY property_images_select_policy
    ON public.property_images FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.properties
            WHERE id = property_id
              AND (status = 'ACTIVE' OR owner_id = auth.uid())
        )
    );

CREATE POLICY property_images_insert_own
    ON public.property_images FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.properties
            WHERE id = property_id
              AND owner_id = auth.uid()
        )
    );

CREATE POLICY property_images_update_own
    ON public.property_images FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.properties
            WHERE id = property_id
              AND owner_id = auth.uid()
        )
    );

CREATE POLICY property_images_delete_own
    ON public.property_images FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.properties
            WHERE id = property_id
              AND owner_id = auth.uid()
        )
    );

-- ----------------------------------------------------------------------------
-- calendar_days
-- ----------------------------------------------------------------------------
CREATE POLICY calendar_days_select_policy
    ON public.calendar_days FOR SELECT
    USING (true);

CREATE POLICY calendar_days_insert_own
    ON public.calendar_days FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.properties
            WHERE id = property_id
              AND owner_id = auth.uid()
        )
    );

CREATE POLICY calendar_days_update_own
    ON public.calendar_days FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.properties
            WHERE id = property_id
              AND owner_id = auth.uid()
        )
    );

CREATE POLICY calendar_days_delete_own
    ON public.calendar_days FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.properties
            WHERE id = property_id
              AND owner_id = auth.uid()
        )
    );

-- ----------------------------------------------------------------------------
-- bookings
-- ----------------------------------------------------------------------------
CREATE POLICY bookings_select_policy
    ON public.bookings FOR SELECT
    USING ((auth.uid() = guest_id) OR (auth.uid() = host_id));

CREATE POLICY bookings_insert_own
    ON public.bookings FOR INSERT
    WITH CHECK (auth.uid() = guest_id AND auth.uid() IS NOT NULL);

CREATE POLICY bookings_update_policy
    ON public.bookings FOR UPDATE
    USING (
        (auth.uid() = host_id)
        OR (auth.uid() = guest_id AND status = 'pending')
    );

CREATE POLICY bookings_delete_deny
    ON public.bookings FOR DELETE
    USING (false);

-- ----------------------------------------------------------------------------
-- conversations
-- ----------------------------------------------------------------------------
CREATE POLICY conversations_select_policy
    ON public.conversations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.conversation_participants
            WHERE conversation_id = id
              AND user_id = auth.uid()
        )
    );

CREATE POLICY conversations_insert_policy
    ON public.conversations FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY conversations_update_policy
    ON public.conversations FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.conversation_participants
            WHERE conversation_id = id
              AND user_id = auth.uid()
        )
    );

CREATE POLICY conversations_delete_deny
    ON public.conversations FOR DELETE
    USING (false);

-- ----------------------------------------------------------------------------
-- conversation_participants
-- ----------------------------------------------------------------------------
CREATE POLICY conversation_participants_select_own
    ON public.conversation_participants FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY conversation_participants_insert_policy
    ON public.conversation_participants FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY conversation_participants_update_own
    ON public.conversation_participants FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY conversation_participants_delete_own
    ON public.conversation_participants FOR DELETE
    USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- messages
-- ----------------------------------------------------------------------------
CREATE POLICY messages_select_policy
    ON public.messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.conversation_participants
            WHERE conversation_id = messages.conversation_id
              AND user_id = auth.uid()
        )
    );

CREATE POLICY messages_insert_policy
    ON public.messages FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id
        AND EXISTS (
            SELECT 1 FROM public.conversation_participants
            WHERE conversation_id = messages.conversation_id
              AND user_id = auth.uid()
        )
    );

CREATE POLICY messages_update_deny
    ON public.messages FOR UPDATE
    USING (false);

CREATE POLICY messages_delete_deny
    ON public.messages FOR DELETE
    USING (false);

-- ----------------------------------------------------------------------------
-- message_templates
-- ----------------------------------------------------------------------------
CREATE POLICY message_templates_select_own
    ON public.message_templates FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY message_templates_insert_own
    ON public.message_templates FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY message_templates_update_own
    ON public.message_templates FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY message_templates_delete_own
    ON public.message_templates FOR DELETE
    USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- reviews
-- ----------------------------------------------------------------------------
CREATE POLICY reviews_select_policy
    ON public.reviews FOR SELECT
    USING (true);

CREATE POLICY reviews_insert_own
    ON public.reviews FOR INSERT
    WITH CHECK (auth.uid() = author_id AND auth.uid() IS NOT NULL);

CREATE POLICY reviews_update_own
    ON public.reviews FOR UPDATE
    USING (auth.uid() = author_id)
    WITH CHECK (auth.uid() = author_id);

CREATE POLICY reviews_delete_own
    ON public.reviews FOR DELETE
    USING (auth.uid() = author_id);

-- ----------------------------------------------------------------------------
-- review_replies
-- ----------------------------------------------------------------------------
CREATE POLICY review_replies_select_policy
    ON public.review_replies FOR SELECT
    USING (true);

CREATE POLICY review_replies_insert_host_only
    ON public.review_replies FOR INSERT
    WITH CHECK (
        auth.uid() = author_id
        AND EXISTS (
            SELECT 1 FROM public.reviews r
            JOIN public.properties p ON p.id = r.property_id
            WHERE r.id = review_id
              AND p.owner_id = auth.uid()
        )
    );

CREATE POLICY review_replies_update_own
    ON public.review_replies FOR UPDATE
    USING (auth.uid() = author_id)
    WITH CHECK (auth.uid() = author_id);

CREATE POLICY review_replies_delete_own
    ON public.review_replies FOR DELETE
    USING (auth.uid() = author_id);

-- ----------------------------------------------------------------------------
-- alerts
-- ----------------------------------------------------------------------------
CREATE POLICY alerts_select_own
    ON public.alerts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY alerts_insert_own
    ON public.alerts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY alerts_update_own
    ON public.alerts FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY alerts_delete_own
    ON public.alerts FOR DELETE
    USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- notifications
-- ----------------------------------------------------------------------------
CREATE POLICY notifications_select_own
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY notifications_insert_own
    ON public.notifications FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY notifications_update_own
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY notifications_delete_own
    ON public.notifications FOR DELETE
    USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- support_tickets
-- ----------------------------------------------------------------------------
CREATE POLICY support_tickets_select_own
    ON public.support_tickets FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY support_tickets_insert_own
    ON public.support_tickets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY support_tickets_update_own
    ON public.support_tickets FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY support_tickets_delete_deny
    ON public.support_tickets FOR DELETE
    USING (false);

-- ----------------------------------------------------------------------------
-- support_ticket_messages
-- ----------------------------------------------------------------------------
CREATE POLICY support_ticket_messages_select_policy
    ON public.support_ticket_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.support_tickets
            WHERE id = ticket_id
              AND user_id = auth.uid()
        )
    );

CREATE POLICY support_ticket_messages_insert_policy
    ON public.support_ticket_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.support_tickets
            WHERE id = ticket_id
              AND user_id = auth.uid()
        )
    );

CREATE POLICY support_ticket_messages_update_deny
    ON public.support_ticket_messages FOR UPDATE
    USING (false);

CREATE POLICY support_ticket_messages_delete_deny
    ON public.support_ticket_messages FOR DELETE
    USING (false);

-- ----------------------------------------------------------------------------
-- faq_items — read-only for users; admin writes via service_role
-- ----------------------------------------------------------------------------
CREATE POLICY faq_items_select_policy
    ON public.faq_items FOR SELECT
    USING (true);

CREATE POLICY faq_items_insert_deny
    ON public.faq_items FOR INSERT
    WITH CHECK (false);

CREATE POLICY faq_items_update_deny
    ON public.faq_items FOR UPDATE
    USING (false);

CREATE POLICY faq_items_delete_deny
    ON public.faq_items FOR DELETE
    USING (false);

-- ----------------------------------------------------------------------------
-- legal_documents — read-only for users; admin writes via service_role
-- ----------------------------------------------------------------------------
CREATE POLICY legal_documents_select_policy
    ON public.legal_documents FOR SELECT
    USING (true);

CREATE POLICY legal_documents_insert_deny
    ON public.legal_documents FOR INSERT
    WITH CHECK (false);

CREATE POLICY legal_documents_update_deny
    ON public.legal_documents FOR UPDATE
    USING (false);

CREATE POLICY legal_documents_delete_deny
    ON public.legal_documents FOR DELETE
    USING (false);

-- ----------------------------------------------------------------------------
-- consent_records
-- ----------------------------------------------------------------------------
CREATE POLICY consent_records_select_own
    ON public.consent_records FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY consent_records_insert_own
    ON public.consent_records FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY consent_records_update_own
    ON public.consent_records FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY consent_records_delete_own
    ON public.consent_records FOR DELETE
    USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- referral_codes
-- ----------------------------------------------------------------------------
CREATE POLICY referral_codes_select_policy
    ON public.referral_codes FOR SELECT
    USING (true);

CREATE POLICY referral_codes_insert_own
    ON public.referral_codes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY referral_codes_update_deny
    ON public.referral_codes FOR UPDATE
    USING (false);

CREATE POLICY referral_codes_delete_deny
    ON public.referral_codes FOR DELETE
    USING (false);

-- ----------------------------------------------------------------------------
-- referral_entries
-- ----------------------------------------------------------------------------
CREATE POLICY referral_entries_select_own
    ON public.referral_entries FOR SELECT
    USING (auth.uid() = referrer_id);

CREATE POLICY referral_entries_insert_deny
    ON public.referral_entries FOR INSERT
    WITH CHECK (false);

CREATE POLICY referral_entries_update_deny
    ON public.referral_entries FOR UPDATE
    USING (false);

CREATE POLICY referral_entries_delete_deny
    ON public.referral_entries FOR DELETE
    USING (false);

-- ----------------------------------------------------------------------------
-- referral_credits
-- ----------------------------------------------------------------------------
CREATE POLICY referral_credits_select_own
    ON public.referral_credits FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY referral_credits_insert_own
    ON public.referral_credits FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY referral_credits_update_own
    ON public.referral_credits FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY referral_credits_delete_own
    ON public.referral_credits FOR DELETE
    USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- user_bookmarks
-- ----------------------------------------------------------------------------
CREATE POLICY user_bookmarks_select_own
    ON public.user_bookmarks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY user_bookmarks_insert_own
    ON public.user_bookmarks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_bookmarks_update_own
    ON public.user_bookmarks FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_bookmarks_delete_own
    ON public.user_bookmarks FOR DELETE
    USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- course_progress
-- ----------------------------------------------------------------------------
CREATE POLICY course_progress_select_own
    ON public.course_progress FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY course_progress_insert_own
    ON public.course_progress FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY course_progress_update_own
    ON public.course_progress FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY course_progress_delete_own
    ON public.course_progress FOR DELETE
    USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- co_hosts
-- ----------------------------------------------------------------------------
CREATE POLICY co_hosts_select_policy
    ON public.co_hosts FOR SELECT
    USING (auth.uid() = host_id OR auth.uid() = co_host_id);

CREATE POLICY co_hosts_insert_own
    ON public.co_hosts FOR INSERT
    WITH CHECK (auth.uid() = host_id);

CREATE POLICY co_hosts_update_own
    ON public.co_hosts FOR UPDATE
    USING (auth.uid() = host_id)
    WITH CHECK (auth.uid() = host_id);

CREATE POLICY co_hosts_delete_own
    ON public.co_hosts FOR DELETE
    USING (auth.uid() = host_id);

-- ----------------------------------------------------------------------------
-- articles — read-only for users; admin writes via service_role
-- ----------------------------------------------------------------------------
CREATE POLICY articles_select_policy
    ON public.articles FOR SELECT
    USING (true);

CREATE POLICY articles_insert_deny
    ON public.articles FOR INSERT
    WITH CHECK (false);

CREATE POLICY articles_update_deny
    ON public.articles FOR UPDATE
    USING (false);

CREATE POLICY articles_delete_deny
    ON public.articles FOR DELETE
    USING (false);

-- ----------------------------------------------------------------------------
-- courses — read-only for users; admin writes via service_role
-- ----------------------------------------------------------------------------
CREATE POLICY courses_select_policy
    ON public.courses FOR SELECT
    USING (true);

CREATE POLICY courses_insert_deny
    ON public.courses FOR INSERT
    WITH CHECK (false);

CREATE POLICY courses_update_deny
    ON public.courses FOR UPDATE
    USING (false);

CREATE POLICY courses_delete_deny
    ON public.courses FOR DELETE
    USING (false);

-- ----------------------------------------------------------------------------
-- course_steps — read-only for users; admin writes via service_role
-- ----------------------------------------------------------------------------
CREATE POLICY course_steps_select_policy
    ON public.course_steps FOR SELECT
    USING (true);

CREATE POLICY course_steps_insert_deny
    ON public.course_steps FOR INSERT
    WITH CHECK (false);

CREATE POLICY course_steps_update_deny
    ON public.course_steps FOR UPDATE
    USING (false);

CREATE POLICY course_steps_delete_deny
    ON public.course_steps FOR DELETE
    USING (false);

-- ----------------------------------------------------------------------------
-- guide_categories — read-only for users; admin writes via service_role
-- ----------------------------------------------------------------------------
CREATE POLICY guide_categories_select_policy
    ON public.guide_categories FOR SELECT
    USING (true);

CREATE POLICY guide_categories_insert_deny
    ON public.guide_categories FOR INSERT
    WITH CHECK (false);

CREATE POLICY guide_categories_update_deny
    ON public.guide_categories FOR UPDATE
    USING (false);

CREATE POLICY guide_categories_delete_deny
    ON public.guide_categories FOR DELETE
    USING (false);

-- ----------------------------------------------------------------------------
-- guides — read-only for users; admin writes via service_role
-- ----------------------------------------------------------------------------
CREATE POLICY guides_select_policy
    ON public.guides FOR SELECT
    USING (true);

CREATE POLICY guides_insert_deny
    ON public.guides FOR INSERT
    WITH CHECK (false);

CREATE POLICY guides_update_deny
    ON public.guides FOR UPDATE
    USING (false);

CREATE POLICY guides_delete_deny
    ON public.guides FOR DELETE
    USING (false);

-- =============================================================================
-- END OF MIGRATION 001_init.sql
-- =============================================================================
