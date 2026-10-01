interface DatabaseDefinition {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string | null;
          phone_number: string | null;
          avatar_url: string | null;
          bio: string | null;
          languages: string[] | null;
          kyc_status: 'NOT_VERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
          is_host: boolean;
          preferred_currency: string;
          preferred_language: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          email?: string | null;
          phone_number?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          languages?: string[] | null;
          kyc_status?: 'NOT_VERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
          is_host?: boolean;
          preferred_currency?: string;
          preferred_language?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };

      notification_preferences: {
        Row: {
          user_id: string;
          alert_matches: boolean;
          reservations: boolean;
          messages: boolean;
          promotions: boolean;
          newsletter: boolean;
          push_enabled: boolean;
          email_enabled: boolean;
          sms_enabled: boolean;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          alert_matches?: boolean;
          reservations?: boolean;
          messages?: boolean;
          promotions?: boolean;
          newsletter?: boolean;
          push_enabled?: boolean;
          email_enabled?: boolean;
          sms_enabled?: boolean;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['notification_preferences']['Insert']>;
      };

      payout_accounts: {
        Row: {
          id: string;
          user_id: string;
          type: 'MTN_MOMO' | 'AIRTEL_MONEY' | 'M_PESA' | 'BANK_TRANSFER';
          account_number: string;
          account_name: string;
          is_default: boolean;
          is_verified: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: 'MTN_MOMO' | 'AIRTEL_MONEY' | 'M_PESA' | 'BANK_TRANSFER';
          account_number: string;
          account_name: string;
          is_default?: boolean;
          is_verified?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['payout_accounts']['Insert']>;
      };

      properties: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          description: string | null;
          property_type: string;
          accommodation_type: string | null;
          status: 'DRAFT' | 'PENDING_REVIEW' | 'ACTIVE' | 'PAUSED' | 'SUSPENDED' | 'ARCHIVED';
          size: number | null;
          visitors_allowed: boolean;
          noise_after22: boolean;
          price_per_month: number;
          currency: string;
          deposit: number;
          min_duration_months: number;
          notice_period_days: number;
          bedrooms: number;
          bathrooms: number;
          max_guests: number;
          amenities: string[];
          smoking_allowed: boolean;
          pets_allowed: boolean;
          address: string | null;
          city: string;
          district: string | null;
          country: string;
          latitude: number | null;
          longitude: number | null;
          avg_rating: number | null;
          review_count: number;
          view_count: number;
          completion_score: number;
          occupancy_rate: number | null;
          revenue_month: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title: string;
          description?: string | null;
          property_type: string;
          accommodation_type?: string | null;
          status?: 'DRAFT' | 'PENDING_REVIEW' | 'ACTIVE' | 'PAUSED' | 'SUSPENDED' | 'ARCHIVED';
          size?: number | null;
          visitors_allowed?: boolean;
          noise_after22?: boolean;
          price_per_month: number;
          currency?: string;
          deposit?: number;
          min_duration_months?: number;
          notice_period_days?: number;
          bedrooms?: number;
          bathrooms?: number;
          max_guests?: number;
          amenities?: string[];
          smoking_allowed?: boolean;
          pets_allowed?: boolean;
          address?: string | null;
          city: string;
          district?: string | null;
          country?: string;
          latitude?: number | null;
          longitude?: number | null;
          avg_rating?: number | null;
          review_count?: number;
          view_count?: number;
          completion_score?: number;
          occupancy_rate?: number | null;
          revenue_month?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['properties']['Insert']>;
      };

      property_images: {
        Row: {
          id: string;
          property_id: string;
          url: string;
          position: number;
          is_cover: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          url: string;
          position?: number;
          is_cover?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['property_images']['Insert']>;
      };

      calendar_days: {
        Row: {
          id: string;
          property_id: string;
          date: string;
          status: 'available' | 'booked' | 'blocked';
          price_override: number | null;
          min_nights: number | null;
          block_reason: 'personal' | 'maintenance' | 'other' | null;
          reservation_id: string | null;
        };
        Insert: {
          id?: string;
          property_id: string;
          date: string;
          status?: 'available' | 'booked' | 'blocked';
          price_override?: number | null;
          min_nights?: number | null;
          block_reason?: 'personal' | 'maintenance' | 'other' | null;
          reservation_id?: string | null;
        };
        Update: Partial<Database['public']['Tables']['calendar_days']['Insert']>;
      };

      bookings: {
        Row: {
          id: string;
          property_id: string;
          guest_id: string;
          host_id: string;
          start_date: string;
          end_date: string;
          guest_count: number;
          status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';
          total_price: number;
          currency: string;
          message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          guest_id: string;
          host_id: string;
          start_date: string;
          end_date: string;
          guest_count?: number;
          status?: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';
          total_price: number;
          currency?: string;
          message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['bookings']['Insert']>;
      };

      conversations: {
        Row: {
          id: string;
          property_id: string | null;
          booking_id: string | null;
          status: 'ACTIVE' | 'ARCHIVED' | 'REPORTED' | 'FROZEN';
          last_message_text: string | null;
          last_message_at: string | null;
          last_message_sender_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          property_id?: string | null;
          booking_id?: string | null;
          status?: 'ACTIVE' | 'ARCHIVED' | 'REPORTED' | 'FROZEN';
          last_message_text?: string | null;
          last_message_at?: string | null;
          last_message_sender_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['conversations']['Insert']>;
      };

      conversation_participants: {
        Row: {
          conversation_id: string;
          user_id: string;
          unread_count: number;
          joined_at: string;
        };
        Insert: {
          conversation_id: string;
          user_id: string;
          unread_count?: number;
          joined_at?: string;
        };
        Update: Partial<Database['public']['Tables']['conversation_participants']['Insert']>;
      };

      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          is_read: boolean;
          template_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          is_read?: boolean;
          template_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['messages']['Insert']>;
      };

      message_templates: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          content: string;
          category: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          content: string;
          category: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['message_templates']['Insert']>;
      };

      reviews: {
        Row: {
          id: string;
          property_id: string;
          booking_id: string | null;
          author_id: string;
          rating: number;
          comment: string;
          is_verified: boolean;
          stay_duration: 'court terme' | 'long terme' | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          booking_id?: string | null;
          author_id: string;
          rating: number;
          comment: string;
          is_verified?: boolean;
          stay_duration?: 'court terme' | 'long terme' | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['reviews']['Insert']>;
      };

      review_replies: {
        Row: {
          id: string;
          review_id: string;
          author_id: string;
          text: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          review_id: string;
          author_id: string;
          text: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['review_replies']['Insert']>;
      };

      alerts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          filters: Record<string, unknown>;
          frequency: 'daily' | 'weekly' | 'instant';
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          filters: Record<string, unknown>;
          frequency?: 'daily' | 'weekly' | 'instant';
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['alerts']['Insert']>;
      };

      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          type: 'alert' | 'message' | 'system' | 'booking';
          is_read: boolean;
          related_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          message: string;
          type: 'alert' | 'message' | 'system' | 'booking';
          is_read?: boolean;
          related_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
      };

      support_tickets: {
        Row: {
          id: string;
          user_id: string;
          category: string;
          priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
          subject: string;
          description: string;
          status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_HOST' | 'RESOLVED' | 'CLOSED';
          reservation_id: string | null;
          resolved_at: string | null;
          last_reply_at: string | null;
          unread_replies: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category: string;
          priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
          subject: string;
          description: string;
          status?: 'OPEN' | 'IN_PROGRESS' | 'WAITING_HOST' | 'RESOLVED' | 'CLOSED';
          reservation_id?: string | null;
          resolved_at?: string | null;
          last_reply_at?: string | null;
          unread_replies?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['support_tickets']['Insert']>;
      };

      support_ticket_messages: {
        Row: {
          id: string;
          ticket_id: string;
          sender_id: string | null;
          sender_name: string;
          is_support: boolean;
          content: string;
          rating: -1 | 1 | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          ticket_id: string;
          sender_id?: string | null;
          sender_name: string;
          is_support?: boolean;
          content: string;
          rating?: -1 | 1 | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['support_ticket_messages']['Insert']>;
      };

      faq_items: {
        Row: {
          id: string;
          question: string;
          answer: string;
          category: string;
          helpful: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          question: string;
          answer: string;
          category: string;
          helpful?: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['faq_items']['Insert']>;
      };

      legal_documents: {
        Row: {
          id: string;
          slug: string;
          title: string;
          version: string;
          summary: string | null;
          content: string | null;
          required: boolean;
          category: 'cgu' | 'privacy' | 'cancellation' | 'discrimination' | 'rules' | null;
          previous_versions: Array<{ version: string; updatedAt: string }>;
          updated_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          version: string;
          summary?: string | null;
          content?: string | null;
          required?: boolean;
          category?: 'cgu' | 'privacy' | 'cancellation' | 'discrimination' | 'rules' | null;
          previous_versions?: Array<{ version: string; updatedAt: string }>;
          updated_at?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['legal_documents']['Insert']>;
      };

      consent_records: {
        Row: {
          id: string;
          user_id: string;
          document_id: string;
          version: string;
          ip_address: string | null;
          accepted_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          document_id: string;
          version: string;
          ip_address?: string | null;
          accepted_at?: string;
        };
        Update: Partial<Database['public']['Tables']['consent_records']['Insert']>;
      };

      referral_codes: {
        Row: {
          id: string;
          user_id: string;
          code: string;
          link: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          code: string;
          link: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['referral_codes']['Insert']>;
      };

      referral_entries: {
        Row: {
          id: string;
          referrer_id: string;
          referee_id: string | null;
          referee_name: string;
          status:
            | 'LINK_CLICKED'
            | 'REGISTERED'
            | 'KYC_DONE'
            | 'LISTING_PUBLISHED'
            | 'FIRST_BOOKING_DONE'
            | 'BONUS_CREDITED'
            | 'EXPIRED'
            | 'FRAUD_DETECTED';
          bonus_amount: number;
          bonus_currency: string;
          credited_at: string | null;
          expires_at: string | null;
          started_at: string;
        };
        Insert: {
          id?: string;
          referrer_id: string;
          referee_id?: string | null;
          referee_name: string;
          status?:
            | 'LINK_CLICKED'
            | 'REGISTERED'
            | 'KYC_DONE'
            | 'LISTING_PUBLISHED'
            | 'FIRST_BOOKING_DONE'
            | 'BONUS_CREDITED'
            | 'EXPIRED'
            | 'FRAUD_DETECTED';
          bonus_amount?: number;
          bonus_currency?: string;
          credited_at?: string | null;
          expires_at?: string | null;
          started_at?: string;
        };
        Update: Partial<Database['public']['Tables']['referral_entries']['Insert']>;
      };

      referral_credits: {
        Row: {
          referral_entry_id: string | null;
          id: string;
          user_id: string;
          amount: number;
          reason: string;
          expires_at: string | null;
          used: boolean;
          created_at: string;
        };
        Insert: {
          referral_entry_id?: string | null;
          id?: string;
          user_id: string;
          amount: number;
          reason: string;
          expires_at?: string | null;
          used?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['referral_credits']['Insert']>;
      };

      co_hosts: {
        Row: {
          id: string;
          host_id: string;
          co_host_id: string;
          status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';
          permissions: {
            calendar: boolean;
            reservations: boolean;
            messages: boolean;
            pricing: boolean;
            revenue_view: boolean;
            reviews: boolean;
            guest_info: boolean;
          };
          revenue_share_type: 'PERCENTAGE' | 'FIXED_PER_BOOKING' | 'FIXED_MONTHLY' | null;
          revenue_share_value: number;
          listing_ids: string[];
          start_date: string | null;
          contract_url: string | null;
          probation_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          host_id: string;
          co_host_id: string;
          status?: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';
          permissions?: {
            calendar: boolean;
            reservations: boolean;
            messages: boolean;
            pricing: boolean;
            revenue_view: boolean;
            reviews: boolean;
            guest_info: boolean;
          };
          revenue_share_type?: 'PERCENTAGE' | 'FIXED_PER_BOOKING' | 'FIXED_MONTHLY' | null;
          revenue_share_value?: number;
          listing_ids?: string[];
          start_date?: string | null;
          contract_url?: string | null;
          probation_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['co_hosts']['Insert']>;
      };

      articles: {
        Row: {
          id: string;
          slug: string;
          title: string;
          summary: string | null;
          content: string;
          category: string;
          level: 'beginner' | 'intermediate' | 'advanced' | null;
          lang: 'fr' | 'en' | 'rw' | 'sw';
          read_minutes: number;
          has_video: boolean;
          video_url: string | null;
          thumbnail_url: string | null;
          published_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          summary?: string | null;
          content: string;
          category: string;
          level?: 'beginner' | 'intermediate' | 'advanced' | null;
          lang?: 'fr' | 'en' | 'rw' | 'sw';
          read_minutes?: number;
          has_video?: boolean;
          video_url?: string | null;
          thumbnail_url?: string | null;
          published_at?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['articles']['Insert']>;
      };

      courses: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          level: 'beginner' | 'intermediate' | 'advanced' | null;
          cover_url: string | null;
          certificate_badge: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          level?: 'beginner' | 'intermediate' | 'advanced' | null;
          cover_url?: string | null;
          certificate_badge?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['courses']['Insert']>;
      };

      course_steps: {
        Row: {
          id: string;
          course_id: string;
          title: string;
          type: 'article' | 'video' | 'quiz' | null;
          duration_minutes: number;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          title: string;
          type?: 'article' | 'video' | 'quiz' | null;
          duration_minutes?: number;
          position?: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['course_steps']['Insert']>;
      };

      user_bookmarks: {
        Row: {
          user_id: string;
          article_slug: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          article_slug: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['user_bookmarks']['Insert']>;
      };

      course_progress: {
        Row: {
          user_id: string;
          step_id: string;
          completed_at: string;
        };
        Insert: {
          user_id: string;
          step_id: string;
          completed_at?: string;
        };
        Update: Partial<Database['public']['Tables']['course_progress']['Insert']>;
      };

      guide_categories: {
        Row: {
          id: string;
          title: string;
          icon: string | null;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          icon?: string | null;
          description?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['guide_categories']['Insert']>;
      };

      guides: {
        Row: {
          id: string;
          category_id: string | null;
          title: string;
          summary: string | null;
          image: string | null;
          content: string;
          is_new: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          category_id?: string | null;
          title: string;
          summary?: string | null;
          image?: string | null;
          content: string;
          is_new?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['guides']['Insert']>;
      };
    };
  };
}

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
type TableDefinition<Row, Required extends keyof Row = never> = { Row: Row; Insert: Partial<Row> & Pick<Row, Required>; Update: Partial<Row>; Relationships: []; };
export type PublicProfile = Pick<DatabaseDefinition['public']['Tables']['profiles']['Row'], 'id' | 'full_name' | 'avatar_url' | 'bio' | 'languages' | 'kyc_status' | 'is_host' | 'created_at'>;
export type HostApplication = { user_id: string; legal_name: string; document_keys: string[]; payout_details: Json; status: 'PENDING' | 'APPROVED' | 'REJECTED'; submitted_at: string; reviewed_at: string | null; review_note: string | null };
type AdditionalTables = {
  favorites: TableDefinition<{user_id: string; property_id: string; created_at: string}, 'user_id' | 'property_id'>;
  host_applications: TableDefinition<HostApplication, 'user_id' | 'legal_name' | 'document_keys'>;
  user_payment_preferences: TableDefinition<{user_id: string; provider: string; account_label: string; updated_at: string}, 'user_id' | 'provider'>;
  upload_objects: TableDefinition<{id: string; key: string; user_id: string; entity: string; mime_type: string; size_bytes: number; verified_at: string | null; finalizing_at: string | null; created_at: string}, 'key' | 'user_id' | 'entity' | 'mime_type' | 'size_bytes'>;
};
type RelationshipMap = {
  profiles: [];
  notification_preferences: [{"foreignKeyName":"notification_preferences_user_id_fkey","columns":["user_id"],"isOneToOne":true,"referencedRelation":"profiles","referencedColumns":["id"]}];
  payout_accounts: [{"foreignKeyName":"payout_accounts_user_id_fkey","columns":["user_id"],"isOneToOne":false,"referencedRelation":"profiles","referencedColumns":["id"]}];
  properties: [{"foreignKeyName":"properties_owner_id_fkey","columns":["owner_id"],"isOneToOne":false,"referencedRelation":"profiles","referencedColumns":["id"]}];
  property_images: [{"foreignKeyName":"property_images_property_id_fkey","columns":["property_id"],"isOneToOne":false,"referencedRelation":"properties","referencedColumns":["id"]}];
  calendar_days: [{"foreignKeyName":"calendar_days_property_id_fkey","columns":["property_id"],"isOneToOne":false,"referencedRelation":"properties","referencedColumns":["id"]}];
  bookings: [{"foreignKeyName":"bookings_property_id_fkey","columns":["property_id"],"isOneToOne":false,"referencedRelation":"properties","referencedColumns":["id"]},{"foreignKeyName":"bookings_guest_id_fkey","columns":["guest_id"],"isOneToOne":false,"referencedRelation":"profiles","referencedColumns":["id"]},{"foreignKeyName":"bookings_host_id_fkey","columns":["host_id"],"isOneToOne":false,"referencedRelation":"profiles","referencedColumns":["id"]}];
  conversations: [{"foreignKeyName":"conversations_property_id_fkey","columns":["property_id"],"isOneToOne":false,"referencedRelation":"properties","referencedColumns":["id"]},{"foreignKeyName":"conversations_booking_id_fkey","columns":["booking_id"],"isOneToOne":false,"referencedRelation":"bookings","referencedColumns":["id"]},{"foreignKeyName":"conversations_last_message_sender_id_fkey","columns":["last_message_sender_id"],"isOneToOne":false,"referencedRelation":"profiles","referencedColumns":["id"]}];
  conversation_participants: [{"foreignKeyName":"conversation_participants_conversation_id_fkey","columns":["conversation_id"],"isOneToOne":false,"referencedRelation":"conversations","referencedColumns":["id"]},{"foreignKeyName":"conversation_participants_user_id_fkey","columns":["user_id"],"isOneToOne":false,"referencedRelation":"profiles","referencedColumns":["id"]}];
  messages: [{"foreignKeyName":"messages_conversation_id_fkey","columns":["conversation_id"],"isOneToOne":false,"referencedRelation":"conversations","referencedColumns":["id"]},{"foreignKeyName":"messages_sender_id_fkey","columns":["sender_id"],"isOneToOne":false,"referencedRelation":"profiles","referencedColumns":["id"]}];
  message_templates: [{"foreignKeyName":"message_templates_user_id_fkey","columns":["user_id"],"isOneToOne":false,"referencedRelation":"profiles","referencedColumns":["id"]}];
  reviews: [{"foreignKeyName":"reviews_property_id_fkey","columns":["property_id"],"isOneToOne":false,"referencedRelation":"properties","referencedColumns":["id"]},{"foreignKeyName":"reviews_booking_id_fkey","columns":["booking_id"],"isOneToOne":false,"referencedRelation":"bookings","referencedColumns":["id"]},{"foreignKeyName":"reviews_author_id_fkey","columns":["author_id"],"isOneToOne":false,"referencedRelation":"profiles","referencedColumns":["id"]}];
  review_replies: [{"foreignKeyName":"review_replies_review_id_fkey","columns":["review_id"],"isOneToOne":false,"referencedRelation":"reviews","referencedColumns":["id"]},{"foreignKeyName":"review_replies_author_id_fkey","columns":["author_id"],"isOneToOne":false,"referencedRelation":"profiles","referencedColumns":["id"]}];
  alerts: [{"foreignKeyName":"alerts_user_id_fkey","columns":["user_id"],"isOneToOne":false,"referencedRelation":"profiles","referencedColumns":["id"]}];
  notifications: [{"foreignKeyName":"notifications_user_id_fkey","columns":["user_id"],"isOneToOne":false,"referencedRelation":"profiles","referencedColumns":["id"]}];
  support_tickets: [{"foreignKeyName":"support_tickets_user_id_fkey","columns":["user_id"],"isOneToOne":false,"referencedRelation":"profiles","referencedColumns":["id"]},{"foreignKeyName":"support_tickets_reservation_id_fkey","columns":["reservation_id"],"isOneToOne":false,"referencedRelation":"bookings","referencedColumns":["id"]}];
  support_ticket_messages: [{"foreignKeyName":"support_ticket_messages_ticket_id_fkey","columns":["ticket_id"],"isOneToOne":false,"referencedRelation":"support_tickets","referencedColumns":["id"]},{"foreignKeyName":"support_ticket_messages_sender_id_fkey","columns":["sender_id"],"isOneToOne":false,"referencedRelation":"profiles","referencedColumns":["id"]}];
  faq_items: [];
  legal_documents: [];
  consent_records: [{"foreignKeyName":"consent_records_user_id_fkey","columns":["user_id"],"isOneToOne":false,"referencedRelation":"profiles","referencedColumns":["id"]},{"foreignKeyName":"consent_records_document_id_fkey","columns":["document_id"],"isOneToOne":false,"referencedRelation":"legal_documents","referencedColumns":["id"]}];
  referral_codes: [{"foreignKeyName":"referral_codes_user_id_fkey","columns":["user_id"],"isOneToOne":true,"referencedRelation":"profiles","referencedColumns":["id"]}];
  referral_entries: [{"foreignKeyName":"referral_entries_referrer_id_fkey","columns":["referrer_id"],"isOneToOne":false,"referencedRelation":"profiles","referencedColumns":["id"]},{"foreignKeyName":"referral_entries_referee_id_fkey","columns":["referee_id"],"isOneToOne":false,"referencedRelation":"profiles","referencedColumns":["id"]}];
  referral_credits: [{"foreignKeyName":"referral_credits_user_id_fkey","columns":["user_id"],"isOneToOne":false,"referencedRelation":"profiles","referencedColumns":["id"]}];
  co_hosts: [{"foreignKeyName":"co_hosts_host_id_fkey","columns":["host_id"],"isOneToOne":false,"referencedRelation":"profiles","referencedColumns":["id"]},{"foreignKeyName":"co_hosts_co_host_id_fkey","columns":["co_host_id"],"isOneToOne":false,"referencedRelation":"profiles","referencedColumns":["id"]}];
  articles: [];
  courses: [];
  course_steps: [{"foreignKeyName":"course_steps_course_id_fkey","columns":["course_id"],"isOneToOne":false,"referencedRelation":"courses","referencedColumns":["id"]}];
  user_bookmarks: [{"foreignKeyName":"user_bookmarks_user_id_fkey","columns":["user_id"],"isOneToOne":false,"referencedRelation":"profiles","referencedColumns":["id"]}];
  course_progress: [{"foreignKeyName":"course_progress_user_id_fkey","columns":["user_id"],"isOneToOne":false,"referencedRelation":"profiles","referencedColumns":["id"]},{"foreignKeyName":"course_progress_step_id_fkey","columns":["step_id"],"isOneToOne":false,"referencedRelation":"course_steps","referencedColumns":["id"]}];
  guide_categories: [];
  guides: [{"foreignKeyName":"guides_category_id_fkey","columns":["category_id"],"isOneToOne":false,"referencedRelation":"guide_categories","referencedColumns":["id"]}];
};

export type Database = {
  public: {
    Tables: { [Name in keyof DatabaseDefinition['public']['Tables']]: DatabaseDefinition['public']['Tables'][Name] & { Relationships: RelationshipMap[Name] } } & AdditionalTables;
    Views: { public_profiles: { Row: PublicProfile; Relationships: [] } };
    Functions: BackendOperations & {
      get_or_create_conversation: { Args: { p_other_user_id: string; p_property_id?: string | null }; Returns: DatabaseDefinition['public']['Tables']['conversations']['Row'] };
      mark_conversation_read: { Args: { p_conversation_id: string }; Returns: undefined };
      set_conversation_status: { Args: { p_conversation_id: string; p_status: string }; Returns: undefined };
      report_conversation: { Args: { p_conversation_id: string; p_category: 'language' | 'harassment' | 'fraud' | 'spam'; p_description?: string | null }; Returns: undefined };
      quote_booking: { Args: {p_property_id: string; p_start_date: string; p_end_date: string; p_guest_count?: number}; Returns: Json };
      create_booking: { Args: { p_property_id: string; p_start_date: string; p_end_date: string; p_guest_count?: number; p_message?: string | null; p_expected_total?: number }; Returns: DatabaseDefinition['public']['Tables']['bookings']['Row'] };
      update_booking_status: { Args: { p_booking_id: string; p_status: string }; Returns: DatabaseDefinition['public']['Tables']['bookings']['Row'] };
      submit_host_application: { Args: { p_legal_name: string; p_document_keys: string[]; p_payout_details?: Json }; Returns: HostApplication };
    };
  };
};

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type Insertable<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type Updatable<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

// Authenticated operations introduced by migration 004.
type BackendOperations = {
  invite_cohost: { Args: { p_email: string; p_listing_ids: string[]; p_permissions: Json; p_revenue_share_type: string; p_revenue_share_value: number }; Returns: Tables<'co_hosts'> };
  respond_cohost_invitation: { Args: { p_cohost_id: string; p_accept: boolean }; Returns: Tables<'co_hosts'> };
  set_cohost_permissions: { Args: { p_cohost_id: string; p_permissions: Json }; Returns: Tables<'co_hosts'> };
  terminate_cohost: { Args: { p_cohost_id: string }; Returns: undefined };
  record_consent: { Args: { p_document_id: string; p_version: string }; Returns: Tables<'consent_records'> };
  rate_support_message: { Args: { p_ticket_id: string; p_message_id: string; p_rating: number }; Returns: undefined };
  mark_support_ticket_read: { Args: { p_ticket_id: string }; Returns: undefined };
  get_or_create_referral_code: { Args: Record<string, never>; Returns: Tables<'referral_codes'> };
  redeem_referral_code: { Args: { p_code: string }; Returns: Tables<'referral_entries'> };
};
