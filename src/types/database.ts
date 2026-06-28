export interface Database {
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
          languages: string[];
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
          languages?: string[];
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
          id: string;
          user_id: string;
          amount: number;
          reason: string;
          expires_at: string | null;
          used: boolean;
          created_at: string;
        };
        Insert: {
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

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type Insertable<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type Updatable<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
