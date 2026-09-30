const listeners = new Set<() => void>();
let accountId: string | null = null;
export function onAccountChange(reset: () => void): () => void {
  listeners.add(reset);
  return () => { listeners.delete(reset); };
}
export function setAccountIdentity(id: string | null): void {
  if (accountId === id) return;
  accountId = id;
  for (const reset of listeners) reset();
}
