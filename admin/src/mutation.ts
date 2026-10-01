export function createMutationExecutor(
  send: (request: Record<string, unknown>) => Promise<unknown>,
) {
  let pending: Promise<unknown> | undefined;
  let previous = '';
  let requestId = '';
  return (request: Record<string, unknown>): Promise<unknown> => {
    if (pending) return pending;
    const fingerprint = JSON.stringify(request);
    if (fingerprint !== previous || !requestId) {
      previous = fingerprint;
      requestId = crypto.randomUUID();
    }
    pending = send({ ...request, action: 'mutate', requestId })
      .then(result => {
        requestId = '';
        return result;
      })
      .finally(() => {
        pending = undefined;
      });
    return pending;
  };
}
