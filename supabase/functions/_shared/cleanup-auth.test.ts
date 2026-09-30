import { authorizeStorageCleanup } from './cleanup-auth.ts';
import { HttpError } from './http.ts';

const secret = 'cleanup-test-token-with-32-or-more-characters';
function assert(value: boolean, message: string) { if (!value) throw new Error(message); }
function withSecret(value: string | undefined, run: () => void) {
  const previous = Deno.env.get('STORAGE_CLEANUP_SECRET');
  const previousServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'different-runtime-service-role-token');
  if (value === undefined) Deno.env.delete('STORAGE_CLEANUP_SECRET');
  else Deno.env.set('STORAGE_CLEANUP_SECRET', value);
  try { run(); } finally {
    if (previous === undefined) Deno.env.delete('STORAGE_CLEANUP_SECRET');
    else Deno.env.set('STORAGE_CLEANUP_SECRET', previous);
    if (previousServiceRole === undefined) Deno.env.delete('SUPABASE_SERVICE_ROLE_KEY');
    else Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', previousServiceRole);
  }
}
function request(token?: string) {
  return new Request('https://cleanup.test.invalid', {
    method: 'POST',
    headers: { Authorization: 'Bearer gateway-validated-service-token', ...(token ? { 'X-Cleanup-Token': token } : {}) },
  });
}
function rejects(req: Request, status: number) {
  let rejection: unknown;
  try { authorizeStorageCleanup(req); } catch (error) { rejection = error; }
  assert(rejection instanceof HttpError && rejection.status === status, 'Unexpected cleanup authorization result');
  assert(!String(rejection).includes(secret), 'Cleanup secret leaked in error');
}

Deno.test('cleanup accepts a dedicated server token independently of the gateway bearer value', () => {
  withSecret(secret, () => authorizeStorageCleanup(request(secret)));
});

Deno.test('cleanup accepts a configured token at the 32 character minimum', () => {
  const minimum = 'a'.repeat(32);
  withSecret(minimum, () => authorizeStorageCleanup(request(minimum)));
});

Deno.test('cleanup refuses missing secret configuration even when a token is supplied', () => {
  withSecret(undefined, () => rejects(request(secret), 503));
});

Deno.test('cleanup refuses short or blank configured secrets even when the header matches', () => {
  for (const invalid of ['', 'a'.repeat(31), ' '.repeat(32)]) {
    withSecret(invalid, () => rejects(request(invalid), 503));
  }
});

Deno.test('cleanup refuses a gateway bearer without its dedicated cleanup header', () => {
  withSecret(secret, () => rejects(request(), 401));
});

Deno.test('cleanup refuses incorrect same-length and different-length tokens', () => {
  withSecret(secret, () => {
    for (const invalid of ['x'.repeat(secret.length), `${secret}-extra`, secret.slice(1), secret.toUpperCase()]) {
      rejects(request(invalid), 401);
    }
  });
});

Deno.test('cleanup requires the dedicated header rather than a query string token', () => {
  withSecret(secret, () => rejects(new Request(`https://cleanup.test.invalid?token=${secret}`, {
    method: 'POST', headers: { Authorization: 'Bearer gateway-validated-service-token' },
  }), 401));
});
