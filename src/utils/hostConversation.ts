import type { HostMessage, messageService } from '../services/api/message.service';
import { onAccountChange } from '../lib/accountScope';

export interface HostConversationState {
  messages: HostMessage[];
  nextCursor: string | null;
  loading: boolean;
  loadingMore: boolean;
  sending: boolean;
  error: string | null;
  draft: string;
  draftRevision: number;
}
export const emptyConversation: HostConversationState = {
  messages: [], nextCursor: null, loading: true, loadingMore: false, sending: false, error: null,
  draft: '', draftRevision: 0,
};
const merge = (rows: HostMessage[]) => [...new Map(rows.map(row => [row.id, row])).values()]
  .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));

type SendEvent = { kind: 'draft' } | { kind: 'pending'; message: HostMessage }
  | { kind: 'settled'; optimisticId: string; sent?: HostMessage };
interface ConversationMemory {
  draft: string;
  draftRevision: number;
  pending: HostMessage | null;
  lastSent: HostMessage | null;
  sendError: string | null;
  listeners: Set<(event: SendEvent) => void>;
}
const conversations = new Map<string, ConversationMemory>();
let sendSequence = 0;
onAccountChange(() => {
  for (const memory of conversations.values()) memory.listeners.clear();
  conversations.clear();
});

// Readers belong to a focus session. Drafts and in-flight writes outlive that
// reader, but are discarded when the authenticated account changes.
export function createHostConversationSession(
  conversationId: string,
  userId: string,
  onChange: (state: HostConversationState) => void,
  service: Pick<typeof messageService, 'getHostMessages' | 'markHostConversationRead' | 'sendHostMessage'>,
) {
  const scope = `${userId}:${conversationId}`;
  let memory = conversations.get(scope);
  if (!memory) {
    memory = { draft: '', draftRevision: 0, pending: null, lastSent: null, sendError: null, listeners: new Set() };
    conversations.set(scope, memory);
  }
  const retained = memory;
  const currentAccount = () => conversations.get(scope) === retained;
  const emit = (event: SendEvent) => {
    if (currentAccount()) for (const listener of retained.listeners) listener(event);
  };
  let active = true;
  let reading = false;
  let refreshQueued = false;
  let initialized = false;
  let state: HostConversationState = { ...emptyConversation,
    messages: [retained.lastSent, retained.pending].filter((row): row is HostMessage => row !== null),
    sending: retained.pending !== null, error: retained.sendError,
    draft: retained.draft, draftRevision: retained.draftRevision };
  const publish = (patch: Partial<HostConversationState>) => {
    if (!active || !currentAccount()) return;
    state = { ...state, ...patch };
    onChange(state);
  };
  const onRetainedChange = (event: SendEvent) => {
    const draft = { draft: retained.draft, draftRevision: retained.draftRevision };
    if (event.kind === 'draft') publish(draft);
    else if (event.kind === 'pending') publish({ ...draft, sending: true, error: null,
      messages: merge([...state.messages, event.message]) });
    else publish({ ...draft, sending: false, error: retained.sendError,
      messages: merge([...state.messages.filter(row => row.id !== event.optimisticId), ...(event.sent ? [event.sent] : [])]) });
  };
  retained.listeners.add(onRetainedChange);
  const fail = (failure: unknown) => publish({ error: failure instanceof Error ? failure.message : '' });
  const read = async () => {
    if (!active || !currentAccount()) return;
    if (reading) { refreshQueued = true; return; }
    reading = true;
    try {
      do {
        refreshQueued = false;
        const page = await service.getHostMessages(conversationId);
        if (!active || !currentAccount()) return;
        publish({ messages: merge([...state.messages, ...page.messages]),
          ...(!initialized ? { nextCursor: page.nextCursor } : {}), loading: false });
        initialized = true;
        await service.markHostConversationRead(conversationId);
      } while (active && currentAccount() && refreshQueued);
    } catch (failure) { fail(failure); }
    finally { reading = false; publish({ loading: false }); }
  };
  return {
    dispose() { active = false; retained.listeners.delete(onRetainedChange); },
    getState() { return state; },
    setDraft(draft: string) {
      if (!active || !currentAccount()) return;
      retained.draft = draft;
      ++retained.draftRevision;
      emit({ kind: 'draft' });
    },
    setError(error: string) { publish({ error, loading: false }); },
    async load() { publish({ loading: !initialized, error: retained.sendError }); await read(); },
    refresh: read,
    async loadMore() {
      if (!active || !currentAccount() || !state.nextCursor || state.loadingMore) return;
      publish({ loadingMore: true, error: null });
      try {
        const page = await service.getHostMessages(conversationId, state.nextCursor!);
        publish({ messages: merge([...page.messages, ...state.messages]), nextCursor: page.nextCursor });
      } catch (failure) { fail(failure); }
      finally { publish({ loadingMore: false }); }
    },
    async send(content: string, draftRevision = retained.draftRevision): Promise<boolean> {
      if (!active || !currentAccount() || !initialized || retained.pending || !content.trim()
        || draftRevision !== retained.draftRevision) return false;
      const optimistic: HostMessage = { id: `pending:${++sendSequence}`, conversationId, senderId: userId,
        senderName: '', content, isRead: false, createdAt: new Date().toISOString(), templateId: null };
      retained.pending = optimistic;
      retained.sendError = null;
      emit({ kind: 'pending', message: optimistic });
      try {
        const sent = await service.sendHostMessage(conversationId, content);
        if (currentAccount()) {
          retained.lastSent = sent;
          retained.pending = null;
          if (retained.draftRevision === draftRevision) {
            retained.draft = '';
            ++retained.draftRevision;
          }
          emit({ kind: 'settled', optimisticId: optimistic.id, sent });
        }
        return true;
      } catch (failure) {
        if (currentAccount()) {
          retained.pending = null;
          retained.sendError = failure instanceof Error ? failure.message : '';
          emit({ kind: 'settled', optimisticId: optimistic.id });
        }
        return false;
      }
    },
  };
}
