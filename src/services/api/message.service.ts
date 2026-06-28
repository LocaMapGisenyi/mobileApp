import { supabase } from '../../lib/supabase';
import * as msgSvc from '../message.service';

// ─── Core types ───────────────────────────────────────────────────────────────
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: Date;
  read: boolean;
}

export interface Conversation {
  id: string;
  participants: {
    id: string;
    name: string;
    avatar?: string;
  }[];
  lastMessage?: {
    text: string;
    senderId: string;
    createdAt: Date;
    read: boolean;
  };
  propertyId?: string;
  propertyTitle?: string;
  unreadCount: number;
  updatedAt: Date;
}

// ─── Host messaging types ──────────────────────────────────────────────────────
export type ConvStatus = 'ACTIVE' | 'ARCHIVED' | 'REPORTED' | 'FROZEN';
export type ConvFilter = 'all' | 'unread' | 'archived';

export interface HostConversation {
  id: string;
  status: ConvStatus;
  guestId: string;
  guestName: string;
  guestAvatar: string | null;
  listingId: string;
  listingTitle: string;
  reservationId: string | null;
  lastMessageText: string | null;
  lastMessageAt: string | null;
  lastMessageSenderId: string | null;
  unreadCount: number;
}

export interface HostMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  templateId: string | null;
}

export interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  category: string;
}

export type ReportCategory = 'language' | 'harassment' | 'fraud' | 'spam';

export const CONTACT_REGEX =
  /(\+?250\s?7\d{2}\s?\d{3}\s?\d{3}|07\d{2}\s?\d{3}\s?\d{3}|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;

export const maskContacts = (text: string): string =>
  text.replace(CONTACT_REGEX, '[INFO MASQUÉE]');

export const hasContacts = (text: string): boolean => CONTACT_REGEX.test(text);

const getCurrentUserId = async (): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
};

export const messageService = {
  getConversations: async (): Promise<Conversation[]> => {
    const userId = await getCurrentUserId();
    const rows = await msgSvc.getConversations(userId);
    return rows.map(r => ({
      id: r.id,
      participants: Array.isArray((r as any).participant_profiles)
        ? (r as any).participant_profiles.map((p: any) => ({ id: p.id, name: p.full_name, avatar: p.avatar_url }))
        : [],
      lastMessage: r.last_message_text
        ? { text: r.last_message_text, senderId: r.last_message_sender_id ?? '', createdAt: new Date(r.last_message_at ?? r.updated_at), read: true }
        : undefined,
      propertyId: r.property_id ?? undefined,
      unreadCount: (r as any).unread_count ?? 0,
      updatedAt: new Date(r.updated_at),
    }));
  },

  getConversationById: async (conversationId: string): Promise<Conversation> => {
    const { data, error } = await supabase
      .from('conversations')
      .select('*, conversation_participants(user_id, unread_count)')
      .eq('id', conversationId)
      .single();
    if (error) throw error;
    return {
      id: data.id,
      participants: [],
      unreadCount: 0,
      updatedAt: new Date(data.updated_at),
      propertyId: data.property_id ?? undefined,
      lastMessage: data.last_message_text
        ? { text: data.last_message_text, senderId: data.last_message_sender_id ?? '', createdAt: new Date(data.last_message_at!), read: true }
        : undefined,
    };
  },

  getMessages: async (conversationId: string): Promise<Message[]> => {
    const { messages } = await msgSvc.getMessages(conversationId);
    return messages.map(m => ({
      id: m.id,
      conversationId: m.conversation_id,
      senderId: m.sender_id,
      text: m.content,
      createdAt: new Date(m.created_at),
      read: m.is_read,
    }));
  },

  sendMessage: async (conversationId: string, text: string): Promise<Message> => {
    const userId = await getCurrentUserId();
    const m = await msgSvc.sendMessage(conversationId, userId, text);
    return {
      id: m.id,
      conversationId: m.conversation_id,
      senderId: m.sender_id,
      text: m.content,
      createdAt: new Date(m.created_at),
      read: m.is_read,
    };
  },

  markAsRead: async (conversationId: string): Promise<void> => {
    const userId = await getCurrentUserId();
    await msgSvc.markConversationRead(conversationId, userId);
  },

  createConversation: async (ownerId: string, propertyId: string, initialMessage: string): Promise<Conversation> => {
    const userId = await getCurrentUserId();
    const conv = await msgSvc.getOrCreateConversation(userId, ownerId, propertyId);
    await msgSvc.sendMessage(conv.id, userId, initialMessage);
    return { id: conv.id, participants: [], unreadCount: 0, updatedAt: new Date(conv.updated_at), propertyId };
  },

  getMessageStats: async (): Promise<{ total: number; unread: number }> => {
    const userId = await getCurrentUserId();
    const { data } = await supabase
      .from('conversation_participants')
      .select('unread_count')
      .eq('user_id', userId);
    const total = Array.isArray(data) ? data.length : 0;
    const unread = Array.isArray(data) ? data.reduce((s, r) => s + (r.unread_count ?? 0), 0) : 0;
    return { total, unread };
  },

  // ─── Host messaging ────────────────────────────────────────────────────────
  getHostConversations: async (filter?: ConvFilter): Promise<HostConversation[]> => {
    const userId = await getCurrentUserId();
    const rows = await msgSvc.getConversations(userId);
    const filtered =
      filter === 'archived'
        ? rows.filter(r => r.status === 'ARCHIVED')
        : filter === 'unread'
        ? rows.filter(r => (r as any).unread_count > 0)
        : rows.filter(r => r.status !== 'ARCHIVED');
    return filtered.map(r => ({
      id: r.id,
      status: r.status as ConvStatus,
      guestId: '',
      guestName: 'Locataire',
      guestAvatar: null,
      listingId: r.property_id ?? '',
      listingTitle: '',
      reservationId: null,
      lastMessageText: r.last_message_text,
      lastMessageAt: r.last_message_at,
      lastMessageSenderId: r.last_message_sender_id,
      unreadCount: (r as any).unread_count ?? 0,
    }));
  },

  getHostMessages: async (
    conversationId: string,
    cursor?: string,
  ): Promise<{ messages: HostMessage[]; nextCursor: string | null }> => {
    const { messages, nextCursor } = await msgSvc.getMessages(conversationId, cursor);
    return {
      messages: messages.map(m => ({
        id: m.id,
        conversationId: m.conversation_id,
        senderId: m.sender_id,
        senderName: (m as any).sender?.full_name ?? 'Utilisateur',
        content: m.content,
        isRead: m.is_read,
        createdAt: m.created_at,
        templateId: m.template_id,
      })),
      nextCursor,
    };
  },

  sendHostMessage: async (
    conversationId: string,
    content: string,
    templateId?: string,
  ): Promise<HostMessage> => {
    const userId = await getCurrentUserId();
    const m = await msgSvc.sendMessage(conversationId, userId, content, templateId);
    return {
      id: m.id,
      conversationId: m.conversation_id,
      senderId: m.sender_id,
      senderName: 'Hôte',
      content: m.content,
      isRead: m.is_read,
      createdAt: m.created_at,
      templateId: m.template_id,
    };
  },

  markHostConversationRead: async (conversationId: string): Promise<void> => {
    const userId = await getCurrentUserId();
    await msgSvc.markConversationRead(conversationId, userId);
  },

  archiveHostConversation: async (conversationId: string): Promise<void> => {
    await msgSvc.archiveConversation(conversationId);
  },

  reportMessage: async (
    conversationId: string,
    _category: ReportCategory,
    _description?: string,
  ): Promise<void> => {
    const { error } = await supabase
      .from('conversations')
      .update({ status: 'REPORTED' })
      .eq('id', conversationId);
    if (error) throw error;
  },

  getTemplates: async (): Promise<MessageTemplate[]> => {
    const userId = await getCurrentUserId();
    const rows = await msgSvc.getTemplates(userId);
    return rows.map(r => ({ id: r.id, name: r.name, content: r.content, category: r.category }));
  },

  createTemplate: async (data: Omit<MessageTemplate, 'id'>): Promise<MessageTemplate> => {
    const userId = await getCurrentUserId();
    const row = await msgSvc.createTemplate(userId, data);
    return { id: row.id, name: row.name, content: row.content, category: row.category };
  },

  deleteTemplate: async (templateId: string): Promise<void> => {
    await msgSvc.deleteTemplate(templateId);
  },
};
