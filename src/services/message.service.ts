import { supabase } from '../lib/supabase';
import type { Tables } from '../types/database';

export async function getConversations(
  userId: string,
): Promise<(Tables<'conversations'> & { unread_count: number; participant_profiles: Tables<'profiles'>[] })[]> {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*, conversation_participants!inner(user_id, unread_count), property:properties(title, city)')
      .filter('conversation_participants.user_id', 'eq', userId)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    if (!Array.isArray(data)) return [];
    return data as unknown as (Tables<'conversations'> & {
      unread_count: number;
      participant_profiles: Tables<'profiles'>[];
    })[];
  } catch (err) {
    throw err;
  }
}

export async function getOrCreateConversation(
  userId: string,
  otherUserId: string,
  propertyId?: string,
): Promise<Tables<'conversations'>> {
  try {
    const { data: myParticipations, error: myError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId);
    if (myError) throw myError;

    if (Array.isArray(myParticipations) && myParticipations.length > 0) {
      const myConvIds = myParticipations.map((p) => p.conversation_id);

      const { data: otherParticipations, error: otherError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', otherUserId)
        .in('conversation_id', myConvIds);
      if (otherError) throw otherError;

      if (Array.isArray(otherParticipations) && otherParticipations.length > 0) {
        const sharedConvIds = otherParticipations.map((p) => p.conversation_id);

        let query = supabase
          .from('conversations')
          .select('*')
          .in('id', sharedConvIds);

        if (propertyId) {
          query = query.eq('property_id', propertyId);
        }

        const { data: existing, error: convError } = await query.limit(1).single();
        if (!convError && existing) {
          return existing as Tables<'conversations'>;
        }
      }
    }

    const { data: newConv, error: createError } = await supabase
      .from('conversations')
      .insert({
        ...(propertyId ? { property_id: propertyId } : {}),
        status: 'ACTIVE',
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (createError) throw createError;

    const { error: p1Error } = await supabase
      .from('conversation_participants')
      .insert({ conversation_id: (newConv as Tables<'conversations'>).id, user_id: userId, unread_count: 0 });
    if (p1Error) throw p1Error;

    const { error: p2Error } = await supabase
      .from('conversation_participants')
      .insert({ conversation_id: (newConv as Tables<'conversations'>).id, user_id: otherUserId, unread_count: 0 });
    if (p2Error) throw p2Error;

    return newConv as Tables<'conversations'>;
  } catch (err) {
    throw err;
  }
}

export async function getMessages(
  conversationId: string,
  cursor?: string,
): Promise<{
  messages: (Tables<'messages'> & { sender: Tables<'profiles'> | null })[];
  nextCursor: string | null;
}> {
  try {
    let query = supabase
      .from('messages')
      .select('*, sender:profiles!sender_id(id, full_name, avatar_url)')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(30);

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data, error } = await query;
    if (error) throw error;

    if (!Array.isArray(data)) return { messages: [], nextCursor: null };

    const messages = data as (Tables<'messages'> & { sender: Tables<'profiles'> | null })[];
    const nextCursor = messages.length === 30 ? messages[messages.length - 1].created_at : null;

    return { messages, nextCursor };
  } catch (err) {
    throw err;
  }
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string,
  templateId?: string,
): Promise<Tables<'messages'>> {
  try {
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content,
        ...(templateId ? { template_id: templateId } : {}),
      })
      .select()
      .single();
    if (msgError) throw msgError;

    const now = new Date().toISOString();
    const { error: convError } = await supabase
      .from('conversations')
      .update({
        last_message_text: content,
        last_message_at: now,
        last_message_sender_id: senderId,
        updated_at: now,
      })
      .eq('id', conversationId);
    if (convError) throw convError;

    const { data: otherParticipants, error: partError } = await supabase
      .from('conversation_participants')
      .select('user_id, unread_count')
      .eq('conversation_id', conversationId)
      .neq('user_id', senderId);
    if (partError) throw partError;

    if (Array.isArray(otherParticipants)) {
      for (const participant of otherParticipants) {
        const { error: updateError } = await supabase
          .from('conversation_participants')
          .update({ unread_count: (participant.unread_count ?? 0) + 1 })
          .eq('conversation_id', conversationId)
          .eq('user_id', participant.user_id);
        if (updateError) throw updateError;
      }
    }

    return message as Tables<'messages'>;
  } catch (err) {
    throw err;
  }
}

export async function markConversationRead(conversationId: string, userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('conversation_participants')
      .update({ unread_count: 0 })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);
    if (error) throw error;
  } catch (err) {
    throw err;
  }
}

export async function archiveConversation(conversationId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('conversations')
      .update({ status: 'ARCHIVED' })
      .eq('id', conversationId);
    if (error) throw error;
  } catch (err) {
    throw err;
  }
}

export async function getTemplates(userId: string): Promise<Tables<'message_templates'>[]> {
  try {
    const { data, error } = await supabase
      .from('message_templates')
      .select('*')
      .eq('user_id', userId)
      .order('created_at');
    if (error) throw error;
    if (!Array.isArray(data)) return [];
    return data as Tables<'message_templates'>[];
  } catch (err) {
    throw err;
  }
}

export async function createTemplate(
  userId: string,
  data: { name: string; content: string; category: string },
): Promise<Tables<'message_templates'>> {
  try {
    const { data: template, error } = await supabase
      .from('message_templates')
      .insert({ user_id: userId, ...data })
      .select()
      .single();
    if (error) throw error;
    return template as Tables<'message_templates'>;
  } catch (err) {
    throw err;
  }
}

export async function deleteTemplate(templateId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('message_templates')
      .delete()
      .eq('id', templateId);
    if (error) throw error;
  } catch (err) {
    throw err;
  }
}
