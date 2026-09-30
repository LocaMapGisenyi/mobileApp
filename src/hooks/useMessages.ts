import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useUserStore } from '../store/user';
import { getConversations, getMessages, sendMessage as send, type ConversationWithMeta, type MessageWithSender } from '../services/message.service';
const unique = (rows: MessageWithSender[]) => [...new Map(rows.map(row => [row.id, row])).values()].sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
export function useConversations(userId: string | null) {
  const [conversations, setConversations] = useState<ConversationWithMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const refetch = useCallback(async () => {
    const request = generation.current;
    if (!userId) return;
    setLoading(true);
    try { const rows = await getConversations(userId); if (request === generation.current) { setConversations(rows); setError(null); } }
    catch (failure) { if (request === generation.current) setError(String(failure)); }
    finally { if (request === generation.current) setLoading(false); }
  }, [userId]);
  useEffect(() => {
    ++generation.current; setConversations([]);
    if (!userId) return;
    void refetch();
    const channel = supabase.channel(`conversation-hook-${userId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_participants', filter: `user_id=eq.${userId}` }, () => void refetch())
      .subscribe(status => { if (status === 'SUBSCRIBED') void refetch(); else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setError('Connexion interrompue. Actualisez les messages.'); });
    return () => { ++generation.current; void supabase.removeChannel(channel); };
  }, [userId, refetch]);
  return { conversations, loading, error, refetch };
}
export function useMessages(conversationId: string | null) {
  const userId = useUserStore(state => state.user.id);
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const generation = useRef(0);
  const busy = useRef(false);
  const fetchPage = useCallback(async (cursor?: string) => {
    if (!conversationId || !userId) return;
    const request = generation.current;
    setLoading(true);
    try {
      const result = await getMessages(conversationId, cursor);
      if (request !== generation.current) return;
      setMessages(previous => unique([...previous, ...result.messages]));
      setNextCursor(result.nextCursor); setError(null);
    } catch (failure) { if (request === generation.current) setError(String(failure)); }
    finally { if (request === generation.current) setLoading(false); }
  }, [conversationId, userId]);
  useEffect(() => {
    ++generation.current; setMessages([]); setNextCursor(null);
    if (!conversationId || !userId) return;
    void fetchPage();
    const channel = supabase.channel(`message-hook-${userId}-${conversationId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, () => void fetchPage())
      .subscribe(status => { if (status === 'SUBSCRIBED') void fetchPage(); else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setError('Connexion interrompue. Actualisez les messages.'); });
    return () => { ++generation.current; void supabase.removeChannel(channel); };
  }, [conversationId, userId, fetchPage]);
  const sendMessage = async (content: string, templateId?: string) => {
    if (!conversationId || !userId) throw new Error('Connectez-vous pour envoyer un message.');
    const request = generation.current;
    try {
      const row = await send(conversationId, userId, content, templateId);
      if (request === generation.current) setMessages(previous => unique([...previous, { ...row, sender: null }]));
    } catch (failure) { if (request === generation.current) setError(String(failure)); throw failure; }
  };
  const loadMore = async () => {
    if (!nextCursor || busy.current) return;
    busy.current = true;
    try { await fetchPage(nextCursor); } finally { busy.current = false; }
  };
  return { messages, loading, error, sendMessage, loadMore, hasMore: nextCursor !== null, refetch: () => fetchPage() };
}
