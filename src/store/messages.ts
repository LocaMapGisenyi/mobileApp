import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { onAccountChange } from '../lib/accountScope';
import * as service from '../services/message.service';
import type { Conversation, Message } from '../types';

interface MessagesState {
  conversations: Conversation[];
  totalUnreadCount: number;
  loading: boolean;
  error: string | null;
  cursors: Record<string, string | null>;
  connect(userId: string): () => void;
  fetchConversations(): Promise<void>;
  loadMessages(id: string, more?: boolean): Promise<void>;
  sendMessage(id: string, text: string): Promise<void>;
  markConversationAsRead(id: string): Promise<void>;
  getConversation(id: string): Conversation | undefined;
  startNewConversation(propertyId: string, propertyTitle: string, ownerId: string, ownerName: string, ownerAvatar: string): Promise<string>;
  deleteConversation(id: string): Promise<void>;
  clearAllConversations(): void;
}
let epoch = 0;
let ownerId: string | null = null;
const loadingPages = new Set<string>();
let channelId = 0;
const errorText = (failure: unknown) => failure instanceof Error ? failure.message : 'Messagerie indisponible. Réessayez.';
const mergeMessages = (existing: Message[], incoming: Message[]) => [...new Map([...existing, ...incoming].map(m => [m.id, m])).values()]
  .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() || a.id.localeCompare(b.id));
const asMessage = (row: service.MessageWithSender, userId: string): Message => ({
  id: row.id, text: row.content, createdAt: new Date(row.created_at),
  user: { id: row.sender_id === userId ? 'me' : row.sender_id, name: row.sender?.full_name ?? '', avatar: row.sender?.avatar_url ?? undefined },
  sent: true, received: row.is_read, read: row.is_read,
});
async function identity(): Promise<string> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!user) throw new Error('Connectez-vous pour accéder aux messages.');
  return user.id;
}

export const useMessagesStore = create<MessagesState>((set, get) => ({
  conversations: [], totalUnreadCount: 0, loading: false, error: null, cursors: {},
  connect: (userId) => {
    if (ownerId !== userId) { get().clearAllConversations(); ownerId = userId; }
    const request = epoch;
    const refresh = () => {
      if (request !== epoch) return;
      void get().fetchConversations();
      for (const id of Object.keys(get().cursors)) void get().loadMessages(id);
    };
    const channel = supabase.channel(`inbox-${userId}-${++channelId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_participants', filter: `user_id=eq.${userId}` }, () => { if (request === epoch) void get().fetchConversations(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, payload => {
        if (request !== epoch) return;
        const conversationId = (payload.new as { conversation_id?: string }).conversation_id;
        void get().fetchConversations();
        if (conversationId && Object.prototype.hasOwnProperty.call(get().cursors, conversationId)) void get().loadMessages(conversationId);
      })
      .subscribe(status => {
        if (status === 'SUBSCRIBED') refresh();
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') set({ error: 'Connexion aux messages interrompue. Tirez pour actualiser.' });
      });
    refresh();
    return () => { void supabase.removeChannel(channel); };
  },
  fetchConversations: async () => {
    const request = epoch;
    set({ loading: true, error: null });
    try {
      const id = await identity();
      const rows = await service.getConversations(id);
      if (request !== epoch) return;
      const conversations = rows.filter(row => row.status !== 'ARCHIVED').map(row => {
        const other = row.participant_profiles.find(p => p.id !== id);
        const existing = get().getConversation(row.id);
        const summary: Message[] = row.last_message_text ? [{ id: `preview-${row.id}`, text: row.last_message_text,
          createdAt: new Date(row.last_message_at ?? row.updated_at), user: { id: row.last_message_sender_id === id ? 'me' : row.last_message_sender_id ?? '', name: other?.full_name ?? '' }, sent: true, received: true, read: false }] : [];
        return { id: row.id, propertyId: row.property_id ?? '', propertyTitle: row.property_title,
          otherUser: { id: other?.id ?? '', name: other?.full_name ?? 'Utilisateur', avatar: other?.avatar_url ?? undefined, isOwner: false },
          messages: Object.prototype.hasOwnProperty.call(get().cursors, row.id) ? existing?.messages ?? [] : summary,
          unreadCount: row.unread_count, lastMessageAt: new Date(row.last_message_at ?? row.updated_at) };
      });
      set({ conversations, totalUnreadCount: conversations.reduce((sum, c) => sum + c.unreadCount, 0) });
    } catch (failure) { if (request === epoch) set({ error: errorText(failure) }); }
    finally { if (request === epoch) set({ loading: false }); }
  },
  loadMessages: async (id, more = false) => {
    if (loadingPages.has(id) || (more && !get().cursors[id])) return;
    loadingPages.add(id);
    const request = epoch;
    try {
      const userId = await identity();
      if (!get().getConversation(id)) await get().fetchConversations();
      const result = await service.getMessages(id, more ? get().cursors[id] ?? undefined : undefined);
      if (request !== epoch) return;
      set({ error: null, cursors: { ...get().cursors, [id]: result.nextCursor }, conversations: get().conversations.map(c => c.id === id ? {
        ...c, messages: mergeMessages(c.messages.filter(m => !m.id.startsWith('preview-')), result.messages.map(m => asMessage(m, userId))),
      } : c) });
    } catch (failure) { if (request === epoch) set({ error: errorText(failure) }); }
    finally { loadingPages.delete(id); }
  },
  sendMessage: async (id, text) => {
    const request = epoch;
    const userId = await identity();
    if (request !== epoch) throw new Error('Le compte actif a changé.');
    try {
      const saved = await service.sendMessage(id, userId, text);
      if (request !== epoch) return;
      const message = asMessage({ ...saved, sender: null }, userId);
      set({ error: null, conversations: get().conversations.map(c => c.id === id ? { ...c, messages: mergeMessages(c.messages.filter(m => !m.id.startsWith('preview-')), [message]), lastMessageAt: message.createdAt } : c) });
    } catch (failure) { if (request === epoch) set({ error: errorText(failure) }); throw failure; }
  },
  markConversationAsRead: async (id) => {
    const request = epoch;
    try {
      await service.markConversationRead(id);
      if (request !== epoch) return;
      const conversations = get().conversations.map(c => c.id === id ? { ...c, unreadCount: 0 } : c);
      set({ conversations, totalUnreadCount: conversations.reduce((sum, c) => sum + c.unreadCount, 0) });
    } catch (failure) { if (request === epoch) set({ error: errorText(failure) }); }
  },
  getConversation: id => get().conversations.find(c => c.id === id),
  startNewConversation: async (propertyId, _title, otherId) => {
    const request = epoch;
    const id = await identity();
    if (request !== epoch) throw new Error('Le compte actif a changé.');
    const row = await service.getOrCreateConversation(id, otherId, propertyId);
    if (request !== epoch) throw new Error('Le compte actif a changé.');
    await get().fetchConversations();
    return row.id;
  },
  deleteConversation: async id => { await service.archiveConversation(id); await get().fetchConversations(); },
  clearAllConversations: () => { ++epoch; ownerId = null; loadingPages.clear(); set({ conversations: [], totalUnreadCount: 0, loading: false, error: null, cursors: {} }); },
}));
onAccountChange(() => useMessagesStore.getState().clearAllConversations());
