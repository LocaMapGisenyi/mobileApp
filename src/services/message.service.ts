import { supabase } from '../lib/supabase';
import type { Tables } from '../types/database';

export type PublicProfile = Pick<Tables<'profiles'>, 'id' | 'full_name' | 'avatar_url'>;
export type ConversationWithMeta = Tables<'conversations'> & {
  unread_count: number; participant_profiles: PublicProfile[]; property_title: string;
};
export type MessageWithSender = Tables<'messages'> & { sender: PublicProfile | null };
async function publicProfiles(ids: string[]): Promise<PublicProfile[]> {
  if (!ids.length) return [];
  const { data, error } = await supabase.from('public_profiles').select('id, full_name, avatar_url').in('id', [...new Set(ids)]);
  if (error) throw error;
  return data ?? [];
}
export async function getConversations(userId: string): Promise<ConversationWithMeta[]> {
  const { data: own, error: ownError } = await supabase.from('conversation_participants')
    .select('conversation_id, unread_count').eq('user_id', userId);
  if (ownError) throw ownError;
  if (!own?.length) return [];
  const ids = own.map(p => p.conversation_id);
  const [{ data: rows, error }, { data: participants, error: participantError }] = await Promise.all([
    supabase.from('conversations').select('*').in('id', ids).order('updated_at', { ascending: false }),
    supabase.from('conversation_participants').select('conversation_id, user_id').in('conversation_id', ids),
  ]);
  if (error) throw error;
  if (participantError) throw participantError;
  const profiles = await publicProfiles((participants ?? []).map(p => p.user_id));
  const propertyIds = [...new Set((rows ?? []).map(r => r.property_id).filter((id): id is string => !!id))];
  const properties = propertyIds.length ? await supabase.from('properties').select('id, title').in('id', propertyIds) : { data: [], error: null };
  if (properties.error) throw properties.error;
  return (rows ?? []).map(row => ({ ...row,
    unread_count: own.find(p => p.conversation_id === row.id)?.unread_count ?? 0,
    participant_profiles: profiles.filter(p => participants?.some(cp => cp.conversation_id === row.id && cp.user_id === p.id)),
    property_title: properties.data?.find(p => p.id === row.property_id)?.title ?? '',
  }));
}
export async function getOrCreateConversation(_userId: string, otherUserId: string, propertyId?: string): Promise<Tables<'conversations'>> {
  const { data, error } = await supabase.rpc('get_or_create_conversation', { p_other_user_id: otherUserId, p_property_id: propertyId ?? null });
  if (error) throw error;
  const conversation = (Array.isArray(data) ? data[0] : data) as Tables<'conversations'> | null;
  if (!conversation?.id) throw new Error('Conversation indisponible.');
  return conversation;
}
export async function getMessages(conversationId: string, cursor?: string): Promise<{ messages: MessageWithSender[]; nextCursor: string | null }> {
  let query = supabase.from('messages').select('*').eq('conversation_id', conversationId)
    .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(31);
  if (cursor) {
    const [createdAt, id] = JSON.parse(cursor) as [string, string];
    if (!/^\d{4}-\d{2}-\d{2}T[\d:.+-]+Z?$/.test(createdAt) || !/^[\da-f-]{36}$/i.test(id)) throw new Error('Curseur de messages invalide.');
    query = query.or(`created_at.lt.${createdAt},and(created_at.eq.${createdAt},id.lt.${id})`);
  }
  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []).slice(0, 30);
  const profiles = await publicProfiles(rows.map(row => row.sender_id));
  const last = rows[rows.length - 1];
  return { messages: rows.map(row => ({ ...row, sender: profiles.find(p => p.id === row.sender_id) ?? null })),
    nextCursor: (data?.length ?? 0) > 30 && last ? JSON.stringify([last.created_at, last.id]) : null };
}
export async function sendMessage(conversationId: string, senderId: string, content: string, templateId?: string): Promise<Tables<'messages'>> {
  const text = content.trim();
  if (!text || text.length > 5000) throw new Error('Le message doit contenir entre 1 et 5000 caractères.');
  const { data, error } = await supabase.from('messages').insert({
    conversation_id: conversationId, sender_id: senderId, content: text,
    ...(templateId ? { template_id: templateId } : {}),
  }).select().single();
  if (error) throw error;
  // The database trigger atomically maintains previews, unread counts and notifications.
  return data;
}
export async function markConversationRead(conversationId: string, _userId?: string): Promise<void> {
  const { error } = await supabase.rpc('mark_conversation_read', { p_conversation_id: conversationId });
  if (error) throw error;
}
export async function archiveConversation(conversationId: string): Promise<void> {
  const { error } = await supabase.rpc('set_conversation_status', { p_conversation_id: conversationId, p_status: 'ARCHIVED' });
  if (error) throw error;
}
export async function getTemplates(userId: string): Promise<Tables<'message_templates'>[]> {
  const { data, error } = await supabase.from('message_templates').select('*').eq('user_id', userId).order('created_at');
  if (error) throw error;
  return data ?? [];
}
export async function createTemplate(userId: string, fields: { name: string; content: string; category: string }): Promise<Tables<'message_templates'>> {
  const { data, error } = await supabase.from('message_templates').insert({ user_id: userId, ...fields }).select().single();
  if (error) throw error;
  return data;
}
export async function deleteTemplate(templateId: string): Promise<void> {
  const { error } = await supabase.from('message_templates').delete().eq('id', templateId);
  if (error) throw error;
}
