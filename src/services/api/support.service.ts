import { supabase } from '../../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────
export type TicketPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type TicketStatus   = 'OPEN' | 'IN_PROGRESS' | 'WAITING_HOST' | 'RESOLVED' | 'CLOSED';

export interface SupportTicket {
  id: string;
  category: string;
  priority: TicketPriority;
  subject: string;
  description: string;
  status: TicketStatus;
  reservationId: string | null;
  createdAt: string;
  resolvedAt: string | null;
  lastReplyAt: string | null;
  unreadReplies: number;
}

export interface TicketMessage {
  id: string;
  senderId: string;
  senderName: string;
  isSupport: boolean;
  content: string;
  createdAt: string;
  rating: 1 | -1 | null;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  helpful: number;
}

export interface CreateTicketPayload {
  category: string;
  priority: TicketPriority;
  subject: string;
  description: string;
  reservationId?: string;
}

export interface ChatAvailability {
  available: boolean;
  estimatedWaitMinutes: number | null;
  nextAvailableAt: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getCurrentUserId = async (): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
};

// ─── Service ──────────────────────────────────────────────────────────────────
export const supportService = {
  getTickets: async (): Promise<SupportTicket[]> => {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (Array.isArray(data) ? data : []).map(t => ({
      id: t.id,
      category: t.category,
      priority: t.priority as TicketPriority,
      subject: t.subject,
      description: t.description,
      status: t.status as TicketStatus,
      reservationId: t.reservation_id,
      createdAt: t.created_at,
      resolvedAt: t.resolved_at,
      lastReplyAt: t.last_reply_at,
      unreadReplies: t.unread_replies,
    }));
  },

  getTicket: async (
    id: string,
  ): Promise<{ ticket: SupportTicket; messages: TicketMessage[] }> => {
    const [ticketRes, msgsRes] = await Promise.all([
      supabase.from('support_tickets').select('*').eq('id', id).single(),
      supabase
        .from('support_ticket_messages')
        .select('*')
        .eq('ticket_id', id)
        .order('created_at'),
    ]);
    if (ticketRes.error) throw ticketRes.error;
    if (msgsRes.error) throw msgsRes.error;
    const { error: readError } = await supabase.rpc('mark_support_ticket_read', { p_ticket_id: id });
    if (readError) throw readError;
    const t = ticketRes.data;
    const ticket: SupportTicket = {
      id: t.id,
      category: t.category,
      priority: t.priority as TicketPriority,
      subject: t.subject,
      description: t.description,
      status: t.status as TicketStatus,
      reservationId: t.reservation_id,
      createdAt: t.created_at,
      resolvedAt: t.resolved_at,
      lastReplyAt: t.last_reply_at,
      unreadReplies: t.unread_replies,
    };
    const messages: TicketMessage[] = (
      Array.isArray(msgsRes.data) ? msgsRes.data : []
    ).map(m => ({
      id: m.id,
      senderId: m.sender_id ?? '',
      senderName: m.sender_name,
      isSupport: m.is_support,
      content: m.content,
      createdAt: m.created_at,
      rating: m.rating as 1 | -1 | null,
    }));
    return { ticket, messages };
  },

  createTicket: async (payload: CreateTicketPayload): Promise<SupportTicket> => {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('support_tickets')
      .insert({
        user_id: userId,
        category: payload.category,
        priority: payload.priority,
        subject: payload.subject,
        description: payload.description,
        reservation_id: payload.reservationId ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return {
      id: data.id,
      category: data.category,
      priority: data.priority as TicketPriority,
      subject: data.subject,
      description: data.description,
      status: data.status as TicketStatus,
      reservationId: data.reservation_id,
      createdAt: data.created_at,
      resolvedAt: null,
      lastReplyAt: null,
      unreadReplies: 0,
    };
  },

  replyTicket: async (id: string, content: string): Promise<TicketMessage> => {
    const userId = await getCurrentUserId();
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();
    const { data, error } = await supabase
      .from('support_ticket_messages')
      .insert({
        ticket_id: id,
        sender_id: userId,
        sender_name: profile?.full_name ?? 'Utilisateur',
        is_support: false,
        content,
      })
      .select()
      .single();
    if (error) throw error;
    return {
      id: data.id,
      senderId: data.sender_id ?? '',
      senderName: data.sender_name,
      isSupport: data.is_support,
      content: data.content,
      createdAt: data.created_at,
      rating: null,
    };
  },

  rateMessage: async (
    ticketId: string,
    messageId: string,
    rating: 1 | -1,
  ): Promise<void> => {
    const { error } = await supabase.rpc('rate_support_message', { p_ticket_id: ticketId, p_message_id: messageId, p_rating: rating });
    if (error) throw error;
  },

  searchFaq: async (q: string, category?: string): Promise<FaqItem[]> => {
    const search = q.replace(/[%_(),.]/g, ' ').trim().slice(0, 200);
    let query = supabase
      .from('faq_items')
      .select('*')
      .or(`question.ilike.%${search}%,answer.ilike.%${search}%`);
    if (category) query = query.eq('category', category);
    const { data, error } = await query.limit(20);
    if (error) throw error;
    return (Array.isArray(data) ? data : []).map(f => ({
      id: f.id,
      question: f.question,
      answer: f.answer,
      category: f.category,
      helpful: f.helpful,
    }));
  },

  getChatAvailability: async (): Promise<ChatAvailability> => ({
    available: false,
    estimatedWaitMinutes: null,
    nextAvailableAt: null,
  }),
};
