// Tune these together with the API's latency and the expected mobile connection.
export const NETWORK = Object.freeze({
  readTimeoutMs: 15_000,
  writeTimeoutMs: 30_000,
  uploadTimeoutMs: 60_000,
  readAttempts: 3,
  retryBaseMs: 250,
  maxRetryDelayMs: 2_000,
});
export class NetworkTimeoutError extends Error {
  constructor() {
    super('La connexion prend trop de temps. Vérifiez le résultat avant de renvoyer une demande.');
    this.name = 'NetworkTimeoutError';
  }
}
function cancelled(): Error {
  const error = new Error('Requête annulée.');
  error.name = 'AbortError';
  return error;
}
let errorObserver: ((error: Error) => void) | undefined;
export function setNetworkErrorObserver(observer: typeof errorObserver): void {
  errorObserver = observer;
}
function reportFailure(input: RequestInfo | URL, error: Error): void {
  const url = typeof input === 'string' ? input : 'url' in input ? input.url : input.toString();
  // Diagnostics must never report their own failure or include a request URL/body.
  if (url.split('?')[0].endsWith('/report-client-error')) return;
  try {
    errorObserver?.(error);
  } catch {
    /* Reporting cannot affect app requests. */
  }
}

export async function withDeadline<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  parent?: AbortSignal | null,
): Promise<T> {
  if (parent?.aborted) throw cancelled();
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let abort: () => void = () => {};
  const stop = new Promise<never>((_, reject) => {
    abort = () => {
      controller.abort();
      reject(cancelled());
    };
    parent?.addEventListener('abort', abort, { once: true });
    timer = setTimeout(() => {
      controller.abort();
      reject(new NetworkTimeoutError());
    }, timeoutMs);
  });
  try {
    return await Promise.race([operation(controller.signal), stop]);
  } finally {
    clearTimeout(timer);
    parent?.removeEventListener('abort', abort);
  }
}

interface RetryOptions {
  fetchImpl?: typeof fetch;
  wait?: (ms: number) => Promise<void>;
  random?: () => number;
}
const temporary = new Set([429, 500, 502, 503, 504]);
export async function resilientFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  options: RetryOptions = {},
): Promise<Response> {
  const method = (
    init?.method ?? (typeof input === 'object' && 'method' in input ? input.method : 'GET')
  ).toUpperCase();
  const read = method === 'GET' || method === 'HEAD';
  const attempts = read ? NETWORK.readAttempts : 1;
  const parent =
    init?.signal ?? (typeof input === 'object' && 'signal' in input ? input.signal : undefined);
  const fetchImpl = options.fetchImpl ?? fetch;
  const wait = options.wait ?? (ms => new Promise(resolve => setTimeout(resolve, ms)));
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (parent?.aborted) throw cancelled();
    let response: Response | undefined;
    try {
      response = await withDeadline(
        async signal => {
          const result = await fetchImpl(input, { ...init, signal });
          // Keep the deadline active while reading the body, not only the headers.
          const bytes = await result.arrayBuffer();
          return new Response(
            method === 'HEAD' || [204, 205, 304].includes(result.status) ? null : bytes,
            { status: result.status, statusText: result.statusText, headers: result.headers },
          );
        },
        read ? NETWORK.readTimeoutMs : NETWORK.writeTimeoutMs,
        parent,
      );
      if (!temporary.has(response.status) || attempt === attempts - 1) {
        if (response.status >= 500) reportFailure(input, new Error('API unavailable'));
        return response;
      }
    } catch (error) {
      if (parent?.aborted || (error instanceof Error && error.name === 'AbortError')) throw error;
      lastError = error;
      if (attempt === attempts - 1) break;
    }
    let delay = NETWORK.retryBaseMs * 2 ** attempt * (0.5 + (options.random ?? Math.random)());
    const retryAfter = response?.headers.get('Retry-After');
    if (retryAfter) {
      const seconds = Number(retryAfter);
      const requested = Number.isFinite(seconds)
        ? seconds * 1000
        : Date.parse(retryAfter) - Date.now();
      if (requested > NETWORK.maxRetryDelayMs) return response!;
      if (Number.isFinite(requested)) delay = Math.max(delay, requested);
    }
    await wait(Math.min(NETWORK.maxRetryDelayMs, Math.max(0, delay)));
  }
  const failure =
    lastError instanceof NetworkTimeoutError
      ? lastError
      : new Error('Connexion indisponible. Vérifiez votre réseau, puis réessayez.');
  reportFailure(input, failure);
  throw failure;
}
