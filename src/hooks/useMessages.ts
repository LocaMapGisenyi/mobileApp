import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Tables } from '../types/database';
import {
  getConversations,
  getMessages,
  sendMessage as sendMessageService,
} from '../services/message.service';

type ConversationWithMeta = Tables<'conversations'> & {
  unread_count: number;
  participant_profiles: Tables<'profiles'>[];
};

type MessageWithSender = Tables<'messages'> & { sender: Tables<'profiles'> | null };

export function useConversations(userId: string | null): {
  conversations: ConversationWithMeta[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const [conversations, setConversations] = useState<ConversationWithMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getConversations(userId);
      setConversations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    fetchConversations();
  }, [userId, fetchConversations]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`conversations-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_participants',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchConversations();
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [userId, fetchConversations]);

  return { conversations, loading, error, refetch: fetchConversations };
}

export function useMessages(conversationId: string | null): {
  messages: MessageWithSender[];
  loading: boolean;
  error: string | null;
  sendMessage: (content: string, templateId?: string) => Promise<void>;
  loadMore: () => Promise<void>;
  hasMore: boolean;
} {
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const senderIdRef = useRef<string | null>(null);

  const fetchInitial = useCallback(async () => {
    if (!conversationId) return;
    try {
      setLoading(true);
      setError(null);
      const { messages: fetched, nextCursor: cursor } = await getMessages(conversationId);
      setMessages(fetched);
      setNextCursor(cursor);
      setHasMore(cursor !== null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;
    fetchInitial();
  }, [conversationId, fetchInitial]);

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as MessageWithSender;
          setMessages((prev) => {
            const alreadyExists = prev.some((m) => m.id === newMsg.id);
            if (alreadyExists) return prev;
            return [newMsg, ...prev];
          });
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [conversationId]);

  const loadMore = useCallback(async () => {
    if (!conversationId || !nextCursor) return;
    try {
      const { messages: older, nextCursor: newCursor } = await getMessages(conversationId, nextCursor);
      setMessages((prev) => [...prev, ...older]);
      setNextCursor(newCursor);
      setHasMore(newCursor !== null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more messages');
    }
  }, [conversationId, nextCursor]);

  const sendMessage = useCallback(
    async (content: string, templateId?: string) => {
      if (!conversationId) return;

      const { data: { user } } = await supabase.auth.getUser();
      const senderId = user?.id;
      if (!senderId) throw new Error('Not authenticated');
      senderIdRef.current = senderId;

      const optimisticId = `optimistic-${Date.now()}`;
      const optimisticMsg: MessageWithSender = {
        id: optimisticId,
        conversation_id: conversationId,
        sender_id: senderId,
        content,
        created_at: new Date().toISOString(),
        sender: null,
      } as unknown as MessageWithSender;

      setMessages((prev) => [optimisticMsg, ...prev]);

      try {
        const saved = await sendMessageService(conversationId, senderId, content, templateId);
        setMessages((prev) =>
          prev.map((m) => (m.id === optimisticId ? ({ ...saved, sender: null } as MessageWithSender) : m)),
        );
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        throw err;
      }
    },
    [conversationId],
  );

  return { messages, loading, error, sendMessage, loadMore, hasMore };
}
