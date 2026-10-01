import { authenticated, body, endpoint, HttpError, json } from './http.ts';
import { getSignedUrl, PutObjectCommand, storage } from './r2.ts';

function assert(condition: boolean, message: string) { if (!condition) throw new Error(message); }
Deno.test('endpoints reject unsupported methods and absent authentication', async () => {
  const handler = endpoint(async req => { await authenticated(req); return json(req, { ok: true }); });
  assert((await handler(new Request('https://test.invalid', { method: 'GET' }))).status === 405, 'GET accepted');
  assert((await handler(new Request('https://test.invalid', { method: 'POST' }))).status === 401, 'Anonymous accepted');
});
Deno.test('unconfigured web origins are rejected and errors omit private details', async () => {
  Deno.env.set('ALLOWED_ORIGINS', 'https://allowed.invalid');
  const handler = endpoint(async () => { throw new Error('private database details'); });
  const denied = await handler(new Request('https://test.invalid', { method: 'POST', headers: { origin: 'https://untrusted.invalid' } }));
  assert(denied.status === 403, 'Unexpected web origin accepted');
  const error = await handler(new Request('https://test.invalid', { method: 'POST', headers: { origin: 'https://allowed.invalid' } }));
  assert(error.status === 500 && !(await error.text()).includes('private database'), 'Private error leaked');
});
Deno.test('malformed and oversized request bodies fail explicitly', async () => {
  for (const payload of ['not-json', '[]', 'x'.repeat(17000)]) {
    let rejected = false;
    try { await body(new Request('https://test.invalid', { method: 'POST', body: payload })); }
    catch (error) { rejected = error instanceof HttpError; }
    assert(rejected, 'Invalid body accepted');
  }
});
Deno.test('authenticated routes distinguish suspension from quotas and unavailable storage', async () => {
  const originalFetch = globalThis.fetch;
  const values = { SUPABASE_URL: 'https://test.invalid', SUPABASE_ANON_KEY: 'test-anon', SUPABASE_SERVICE_ROLE_KEY: 'test-service' };
  const previous = Object.fromEntries(Object.keys(values).map(key => [key, Deno.env.get(key)]));
  try {
    for (const [key, value] of Object.entries(values)) Deno.env.set(key, value);
    for (const [code, status] of [['42501', 403], ['PT429', 429], ['XX000', 503]] as const) {
      globalThis.fetch = async input => new Response(JSON.stringify(String(input).includes('/auth/v1/user')
        ? { id: '00000000-0000-4000-8000-000000000001', aud: 'authenticated' }
        : { code, message: 'private diagnostic detail' }), { status: String(input).includes('/auth/v1/user') ? 200 : 403, headers: { 'Content-Type': 'application/json' } });
      const handler = endpoint(async req => { await authenticated(req); throw new Error('Protected handler was reached'); });
      const response = await handler(new Request('https://test.invalid', { method: 'POST', headers: { Authorization: 'Bearer test-token' } }));
      assert(response.status === status, `${code} returned ${response.status}, expected ${status}`);
      assert(!(await response.text()).includes('private diagnostic'), 'Private error leaked');
    }
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(previous)) { if (value === undefined) Deno.env.delete(key); else Deno.env.set(key, value); }
  }
});
Deno.test('presigned R2 URL binds content length and MIME to a temporary key', async () => {
  Deno.env.set('R2_ACCOUNT_ID', 'a'.repeat(32));
  Deno.env.set('R2_ACCESS_KEY_ID', 'test-access-key');
  Deno.env.set('R2_SECRET_ACCESS_KEY', 'test-secret-key');
  const url = new URL(await getSignedUrl(storage(), new PutObjectCommand({ Bucket: 'test-images', Key: 'pending/user/properties/example.jpg', ContentType: 'image/jpeg', ContentLength: 123 }), {
    expiresIn: 300, signableHeaders: new Set(['content-type', 'content-length']),
  }));
  assert(url.searchParams.get('X-Amz-Expires') === '300', 'Unexpected expiry');
  const headers = url.searchParams.get('X-Amz-SignedHeaders') ?? '';
  assert(headers.includes('content-type') && headers.includes('content-length'), 'Upload metadata is not signed');
  assert(url.pathname.includes('/pending/user/properties/example.jpg'), 'Final destination directly writable');
});
