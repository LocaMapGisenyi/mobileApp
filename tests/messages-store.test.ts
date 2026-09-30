import { beforeEach, expect, it, vi } from 'vitest';
const fake = vi.hoisted(() => ({ auth: null as Promise<any> | null, sent: 0 }));
vi.mock('../src/lib/supabase', () => ({ supabase: { auth: { getUser: async () => fake.auth ?? ({ data: { user: { id: 'alice' } }, error: null }) } } }));
vi.mock('../src/services/message.service', () => ({ sendMessage: async () => { ++fake.sent; return { id: 'message', conversation_id: 'conversation', sender_id: 'alice', content: 'Bonjour', created_at: '2026-09-29T10:00:00Z', is_read: false, template_id: null }; } }));
beforeEach(() => { vi.resetModules(); fake.auth = null; fake.sent = 0; });
it('server acceptance alone does not claim the recipient received or read the message', async () => {
  const { useMessagesStore } = await import('../src/store/messages');
  useMessagesStore.setState({ conversations: [{ id: 'conversation', propertyId: 'property', propertyTitle: 'Maison', otherUser: { id: 'bob', name: 'Bob', isOwner: true }, messages: [], unreadCount: 0 }] });
  await useMessagesStore.getState().sendMessage('conversation', 'Bonjour');
  expect(useMessagesStore.getState().conversations[0].messages[0]).toMatchObject({ sent: true, received: false, read: false });
});
it('an account change while authenticating cancels a send before the database write', async () => {
  const { useMessagesStore } = await import('../src/store/messages');
  let resolve!: (value: any) => void;
  fake.auth = new Promise(done => { resolve = done; });
  const pending = useMessagesStore.getState().sendMessage('conversation', 'Bonjour');
  useMessagesStore.getState().clearAllConversations();
  resolve({ data: { user: { id: 'alice' } }, error: null });
  await expect(pending).rejects.toThrow();
  expect(fake.sent).toBe(0);
});
