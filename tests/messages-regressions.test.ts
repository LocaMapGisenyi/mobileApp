import { beforeEach, expect, it, vi } from 'vitest';
const fake = vi.hoisted(() => ({ inserted: [] as any[], writes: [] as string[], rpcError: null as any, rpcData: { id: 'server-conversation' } as any }));
vi.mock('../src/lib/supabase', () => ({ supabase: {
  auth: { getUser: async () => ({ data: { user: { id: 'sender' } }, error: null }) },
  rpc: async (name: string) => ({ data: name === 'get_or_create_conversation' ? fake.rpcData : null, error: fake.rpcError }),
  from: (table: string) => ({
    insert: (row: any) => { fake.inserted.push(row); return { select: () => ({ single: async () => ({ data: { id: 'server-message', ...row }, error: null }) }) }; },
    update: () => { fake.writes.push(table); return { eq: async () => ({ error: new Error('clients cannot update server counters') }) }; },
  }),
} }));
beforeEach(() => { fake.inserted = []; fake.writes = []; fake.rpcError = null; });
it('accepts the PostgREST row-array representation of a composite conversation RPC', async () => {
  const { getOrCreateConversation } = await import('../src/services/message.service');
  fake.rpcData = [{ id: 'server-conversation' }];
  expect(await getOrCreateConversation('sender', 'host', 'property')).toMatchObject({ id: 'server-conversation' });
});
it('a committed message is successful without attempting forbidden client preview or unread updates', async () => {
  const { sendMessage } = await import('../src/services/message.service');
  await expect(sendMessage('conversation', 'sender', 'Bonjour')).resolves.toMatchObject({ id: 'server-message', content: 'Bonjour' });
  expect(fake.writes).toEqual([]);
});
it('a whitespace-only message is rejected before any insertion', async () => {
  const { sendMessage } = await import('../src/services/message.service');
  await expect(sendMessage('conversation', 'sender', '  ')).rejects.toThrow();
  expect(fake.inserted).toEqual([]);
});
