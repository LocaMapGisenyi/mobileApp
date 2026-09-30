import { createClient } from 'npm:@supabase/supabase-js@2.104.0';
import { boundedFetch } from './bounded-fetch.ts';

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new HttpError(503, 'Service configuration unavailable');
  return value;
}
export function cors(req: Request): Record<string, string> {
  const origin = req.headers.get('origin');
  const allowed = (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map(v => v.trim()).filter(Boolean);
  return {
    ...(origin && allowed.includes(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
  };
}
export function json(req: Request, data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...cors(req), 'Content-Type': 'application/json; charset=utf-8' } });
}
export function endpoint(handler: (req: Request) => Promise<Response>): (req: Request) => Promise<Response> {
  return async req => {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
    if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405);
    const origin = req.headers.get('origin');
    const allowed = (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map(v => v.trim());
    if (origin && !allowed.includes(origin)) return json(req, { error: 'Origin not allowed' }, 403);
    try { return await handler(req); }
    catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      console.error(JSON.stringify({ event: 'request_failed', status, kind: error instanceof Error ? error.name : 'UnknownError', route: new URL(req.url).pathname.split('/').pop() }));
      return json(req, { error: error instanceof HttpError ? error.message : 'Unable to complete request' }, status);
    }
  };
}
export async function body(req: Request): Promise<Record<string, unknown>> {
  const MAX_BODY_BYTES = 16_384;
  if (Number(req.headers.get('content-length')) > MAX_BODY_BYTES) throw new HttpError(413, 'Request too large');
  const reader = req.body?.getReader();
  const chunks: Uint8Array[] = []; let size = 0;
  if (reader) try {
    while (true) {
      const next = await reader.read(); if (next.done) break;
      size += next.value.byteLength;
      if (size > MAX_BODY_BYTES) { await reader.cancel(); throw new HttpError(413, 'Request too large'); }
      chunks.push(next.value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk,offset); offset += chunk.length; }
  const text = new TextDecoder().decode(bytes);
  try {
    const value = JSON.parse(text || '{}');
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value;
  } catch { throw new HttpError(400, 'Invalid JSON body'); }
}
export async function authenticated(req: Request) {
  const authorization = req.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) throw new HttpError(401, 'Authentication required');
  const client = createClient(requiredEnv('SUPABASE_URL'), requiredEnv('SUPABASE_ANON_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: boundedFetch, headers: { Authorization: authorization } },
  });
  const { data: { user }, error } = await client.auth.getUser(authorization.slice(7));
  if (error || !user) throw new HttpError(401, 'Authentication required');
  const admin = adminClient();
  for (const [p_name,p_actor] of [['edge_user_minute',user.id],['edge_global_minute',null]] as const) {
    const { error: quota } = await admin.rpc('consume_limit',{ p_name,p_actor,p_units:1 });
    if (quota) throw new HttpError(quota.code === 'PT429' ? 429 : 503, quota.code === 'PT429' ? 'Limite atteinte. Réessayez plus tard.' : 'Service temporairement indisponible');
  }
  return { user, client, admin };
}
export function adminClient() {
  return createClient(requiredEnv('SUPABASE_URL'), requiredEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: boundedFetch },
  });
}
