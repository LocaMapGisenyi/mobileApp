export const EDGE_TIMEOUT_MS = 20_000;
export const boundedFetch: typeof fetch = async (input, init) => {
  const signal = AbortSignal.any([AbortSignal.timeout(EDGE_TIMEOUT_MS), ...(init?.signal ? [init.signal] : [])]);
  return fetch(input, { ...init, signal });
};
