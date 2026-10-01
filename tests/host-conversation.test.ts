import { beforeEach, expect, it, vi } from 'vitest';
import { createHostConversationSession } from '../src/utils/hostConversation';
import { setAccountIdentity } from '../src/lib/accountScope';

let accountGeneration = 0;
beforeEach(() => setAccountIdentity(`test-account:${++accountGeneration}`));

const row = (id: string) => ({ id, conversationId: 'conversation', senderId: 'guest', senderName: 'Guest', content: id, isRead: false, createdAt: `2026-10-01T12:00:0${id === 'old' ? '0' : '1'}Z`, templateId: null });
function fixture() {
  let state: any;
  const service = {
    getHostMessages: vi.fn().mockResolvedValue({ messages: [row('latest')], nextCursor: 'cursor' }),
    markHostConversationRead: vi.fn().mockResolvedValue(undefined),
    sendHostMessage: vi.fn().mockResolvedValue(row('sent')),
  };
  const session = createHostConversationSession('conversation', 'host', next => { state = next; }, service);
  return { session, service, state: () => state };
}
it('merges realtime and paginated messages once, preserving older history', async () => {
  const f = fixture();
  await f.session.load();
  f.service.getHostMessages.mockResolvedValueOnce({ messages: [row('old'), row('latest')], nextCursor: null });
  await f.session.loadMore();
  await f.session.refresh();
  expect(f.state().messages.map((m: any) => m.id)).toEqual(['old', 'latest']);
  expect(f.state().nextCursor).toBeNull();
  expect(f.service.markHostConversationRead).toHaveBeenCalled();
});
it('blocks double sends synchronously and merges an echoed server message', async () => {
  const f = fixture();
  await f.session.load();
  let finish!: (value: any) => void;
  f.service.sendHostMessage.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const first = f.session.send('Hello');
  expect(await f.session.send('Hello')).toBe(false);
  f.service.getHostMessages.mockResolvedValueOnce({ messages: [row('sent')], nextCursor: null });
  await f.session.refresh();
  finish(row('sent'));
  expect(await first).toBe(true);
  expect(f.service.sendHostMessage).toHaveBeenCalledTimes(1);
  expect(f.state().messages.filter((m: any) => m.id === 'sent')).toHaveLength(1);
  expect(f.state().messages.some((m: any) => m.id.startsWith('pending:'))).toBe(false);
});
it('ignores in-flight reads after leaving an account or conversation', async () => {
  const f = fixture();
  let finish!: (value: any) => void;
  f.service.getHostMessages.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const read = f.session.load();
  f.session.dispose();
  finish({ messages: [row('old')], nextCursor: null });
  await read;
  expect(f.state().messages).toEqual([]);
  expect(f.service.markHostConversationRead).not.toHaveBeenCalled();
});
it('retains a send failure and removes only the optimistic message', async () => {
  const f = fixture();
  await f.session.load();
  f.service.sendHostMessage.mockRejectedValueOnce(new Error('Offline'));
  expect(await f.session.send('Hello')).toBe(false);
  expect(f.state()).toMatchObject({ error: 'Offline', sending: false });
  expect(f.state().messages.map((m: any) => m.id)).toEqual(['latest']);
});
it('keeps the pending send locked after blur and reopening the same conversation', async () => {
  const f = fixture();
  await f.session.load();
  let finish!: (value: any) => void;
  f.service.sendHostMessage.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const first = f.session.send('Hello');
  f.session.dispose();
  let reopenedState: any;
  const reopened = createHostConversationSession('conversation', 'host', next => { reopenedState = next; }, f.service);
  await reopened.load();
  const duplicate = await reopened.send('Hello');
  finish(row('sent'));
  await first;
  expect(duplicate).toBe(false);
  expect(f.service.sendHostMessage).toHaveBeenCalledTimes(1);
  expect(reopenedState.sending).toBe(false);
  expect(reopenedState.messages.filter((m: any) => m.id === 'sent')).toHaveLength(1);
});
it('reports a confirmed send as successful even when its original reader was disposed', async () => {
  const f = fixture();
  await f.session.load();
  let finish!: (value: any) => void;
  f.service.sendHostMessage.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const first = f.session.send('Hello');
  f.session.dispose();
  const disposedState = f.state();
  finish(row('sent'));
  expect(await first).toBe(true);
  expect(f.state()).toBe(disposedState);
});
it('hydrates a pending draft and reconciles it in the reopened reader after late success', async () => {
  const f = fixture();
  await f.session.load();
  f.session.setDraft('Hello');
  let finish!: (value: any) => void;
  f.service.sendHostMessage.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const first = f.session.send('Hello');
  f.session.dispose();
  const reopened = createHostConversationSession('conversation', 'host', () => {}, f.service);
  expect(reopened.getState()).toMatchObject({ sending: true, draft: 'Hello' });
  await reopened.load();
  finish(row('sent'));
  await first;
  expect(reopened.getState()).toMatchObject({ sending: false, draft: '' });
  expect(reopened.getState().messages.some(message => message.id.startsWith('pending:'))).toBe(false);
});
it('clears the submitted draft even if success arrives with no reader open', async () => {
  const f = fixture();
  await f.session.load();
  f.session.setDraft('Hello');
  let finish!: (value: any) => void;
  f.service.sendHostMessage.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const first = f.session.send('Hello');
  f.session.dispose();
  finish(row('sent'));
  await first;
  const reopened = createHostConversationSession('conversation', 'host', () => {}, f.service);
  expect(reopened.getState()).toMatchObject({ sending: false, draft: '' });
});
it('preserves a later draft revision even if it has the same text as the submitted draft', async () => {
  const f = fixture();
  await f.session.load();
  f.session.setDraft('Hello');
  let finish!: (value: any) => void;
  f.service.sendHostMessage.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const first = f.session.send('Hello');
  f.session.dispose();
  const reopened = createHostConversationSession('conversation', 'host', () => {}, f.service);
  reopened.setDraft('A new message');
  reopened.setDraft('Hello');
  finish(row('sent'));
  await first;
  expect(reopened.getState()).toMatchObject({ sending: false, draft: 'Hello' });
});
it('retains a failed draft across blur and allows a deliberate retry once the failure settles', async () => {
  const f = fixture();
  await f.session.load();
  f.session.setDraft('Hello');
  let reject!: (reason: Error) => void;
  f.service.sendHostMessage.mockReturnValueOnce(new Promise((_, no) => { reject = no; }));
  const first = f.session.send('Hello');
  f.session.dispose();
  reject(new Error('Offline'));
  expect(await first).toBe(false);
  const reopened = createHostConversationSession('conversation', 'host', () => {}, f.service);
  await reopened.load();
  expect(reopened.getState()).toMatchObject({ draft: 'Hello', sending: false, error: 'Offline' });
  expect(await reopened.send('Hello')).toBe(true);
  expect(reopened.getState()).toMatchObject({ draft: '', error: null });
  expect(f.service.sendHostMessage).toHaveBeenCalledTimes(2);
});
it('does not reconcile a late send into a new authenticated session of the same account', async () => {
  const f = fixture();
  await f.session.load();
  f.session.setDraft('Old session draft');
  let finish!: (value: any) => void;
  f.service.sendHostMessage.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const first = f.session.send('Old session draft');
  setAccountIdentity(null);
  setAccountIdentity('host');
  const newSession = createHostConversationSession('conversation', 'host', () => {}, f.service);
  expect(newSession.getState()).toMatchObject({ draft: '', sending: false });
  newSession.setDraft('New session draft');
  const beforeLateResult = newSession.getState();
  finish(row('sent'));
  await first;
  expect(newSession.getState()).toBe(beforeLateResult);
  expect(newSession.getState().messages).toEqual([]);
});
it('scopes pending locks and draft clearing to one account and conversation', async () => {
  const f = fixture();
  await f.session.load();
  f.session.setDraft('First conversation');
  let finish!: (value: any) => void;
  f.service.sendHostMessage.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const first = f.session.send('First conversation');
  const otherConversation = createHostConversationSession('other', 'host', () => {}, f.service);
  const otherAccount = createHostConversationSession('conversation', 'other-host', () => {}, f.service);
  await otherConversation.load();
  otherAccount.setDraft('Other account');
  expect(await otherConversation.send('Independent message')).toBe(true);
  finish(row('sent'));
  await first;
  expect(otherAccount.getState().draft).toBe('Other account');
});
