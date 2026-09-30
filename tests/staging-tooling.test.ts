import { describe, expect, it } from 'vitest';
import {
  assertDenied, assertFixture, assertOwnedBooking, deploymentPlan, parseEnv,
  requestJson, validateSmokeInputs, validateTarget,
} from '../scripts/staging/core.mjs';
import { executeSmoke } from '../scripts/staging/smoke.mjs';
import { loadLocalInputs, parseArgs } from '../scripts/staging/cli.mjs';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const ref = 'abcdefghijklmnopqrst';
const targetEnv = () => ({
  LOCAMAP_STAGING_PROJECT_REF: ref,
  LOCAMAP_STAGING_URL: `https://${ref}.supabase.co`,
  LOCAMAP_STAGING_VERIFICATION: `verified-staging:${ref}`,
});
const identities = {
  host: '00000000-0000-4000-8000-000000000001',
  guest: '00000000-0000-4000-8000-000000000002',
  stranger: '00000000-0000-4000-8000-000000000003',
};
const runId = 'locamap-smoke-20260930-001';
const propertyId = '10000000-0000-4000-8000-000000000001';
function smokeEnv() {
  const env: Record<string, string> = {
    ...targetEnv(), LOCAMAP_STAGING_ANON_KEY: 'sb_publishable_test',
    LOCAMAP_SMOKE_RUN_ID: runId, LOCAMAP_SMOKE_PROPERTY_ID: propertyId,
    LOCAMAP_SMOKE_START_DATE: '2026-10-10', LOCAMAP_SMOKE_END_DATE: '2026-11-09',
    LOCAMAP_SMOKE_IDENTITIES: `dedicated-test-accounts:${ref}`,
  };
  for (const [name, id] of Object.entries(identities)) {
    env[`LOCAMAP_SMOKE_${name.toUpperCase()}_ID`] = id;
    env[`LOCAMAP_SMOKE_${name.toUpperCase()}_EMAIL`] = `locamap-smoke+${name}@example.invalid`;
    env[`LOCAMAP_SMOKE_${name.toUpperCase()}_PASSWORD`] = `secret-${name}`;
  }
  return env;
}
const target = () => validateTarget(targetEnv(), ref);
const smoke = () => validateSmokeInputs(smokeEnv(), target(), new Date('2026-09-30T00:00:00Z'));

// A simulated HTTP boundary, not a substitute for hosted PostgREST/RLS evidence.
function simulatedApi({ leakPrivateProfile = false, tamperCleanup = false, availabilityStatus = 400 } = {}) {
  const bookings: Record<string, Record<string, unknown>> = {};
  const cancelled: string[] = [];
  let read = false, hasMessage = false, bookingNumber = 0;
  const conversationId = '30000000-0000-4000-8000-000000000001';
  const messageId = '40000000-0000-4000-8000-000000000001';
  const reply = (data: unknown, status = 200) => new Response(data === null ? null : JSON.stringify(data), { status });
  const permissionDenied = () => reply({ code: '42501' }, 403);
  async function fetchImpl(rawUrl: string, options: RequestInit) {
    const url = new URL(rawUrl);
    const path = url.pathname;
    const body = options.body ? JSON.parse(String(options.body)) : {};
    const role = String((options.headers as Record<string, string>).Authorization).replace('Bearer token-', '') as keyof typeof identities;
    if (path === '/auth/v1/token') {
      const authRole = Object.keys(identities).find(name => body.email === `locamap-smoke+${name}@example.invalid`) as keyof typeof identities;
      if (!authRole || body.password !== `secret-${authRole}`) return reply({ code: 'invalid_credentials' }, 400);
      return reply({ access_token: `token-${authRole}`, user: { id: identities[authRole], email: body.email } });
    }
    if (!identities[role]) return reply({ code: 'bad_jwt' }, 401);
    if (path === '/rest/v1/properties') return reply([{ id: propertyId, owner_id: identities.host, title: `[${runId}] Staging only`, status: 'ACTIVE', currency: 'RWF', min_duration_months: 1, max_guests: 2 }]);
    if (path === '/rest/v1/profiles') {
      const id = url.searchParams.get('id')?.replace('eq.', '');
      return reply(id === identities[role] || leakPrivateProfile ? [{ id, email: 'private@example.invalid' }] : []);
    }
    if (path === '/rest/v1/public_profiles') return reply([{ id: identities.host, full_name: 'Test host' }]);
    if (path === '/rest/v1/rpc/get_or_create_conversation') return reply({ id: conversationId, property_id: propertyId });
    if (path === '/rest/v1/conversations') return reply(role === 'stranger' ? [] : [{ id: conversationId }]);
    if (path === '/rest/v1/conversation_participants') {
      if (options.method === 'POST') return permissionDenied();
      if (url.searchParams.has('user_id')) return reply([{ user_id: identities.host, unread_count: read ? 0 : 1 }]);
      return reply([{ user_id: identities.host }, { user_id: identities.guest }]);
    }
    if (path === '/rest/v1/messages') {
      if (options.method === 'POST') {
        hasMessage = true;
        return reply([{ id: messageId, ...body, is_read: false }], 201);
      }
      return reply(hasMessage && role !== 'stranger' ? [{ id: messageId, is_read: read, sender_id: identities.guest, conversation_id: conversationId }] : []);
    }
    if (path === '/rest/v1/rpc/mark_conversation_read') {
      if (role === 'stranger') return permissionDenied();
      read = true;
      return reply(null, 204);
    }
    if (path === '/rest/v1/rpc/quote_booking') return reply({ total_price: 300000, currency: 'RWF', days: 30, deposit: 0 });
    if (path === '/rest/v1/rpc/create_booking') {
      const expectedStart = bookingNumber === 0 ? '2026-10-10' : '2026-10-11';
      const expectedEnd = bookingNumber === 0 ? '2026-11-09' : '2026-11-10';
      if (body.p_expected_total !== 300000 || body.p_start_date !== expectedStart || body.p_end_date !== expectedEnd) return reply({ code: '22023' }, 400);
      const id = `20000000-0000-4000-8000-00000000000${++bookingNumber}`;
      bookings[id] = { id, property_id: propertyId, host_id: identities.host, guest_id: identities.guest, message: body.p_message, start_date: body.p_start_date, end_date: body.p_end_date, total_price: 300000, currency: 'RWF', status: 'pending' };
      return reply(bookings[id]);
    }
    if (path === '/rest/v1/rpc/update_booking_status') {
      if (role === 'stranger' || (role === 'guest' && body.p_status === 'approved')) return permissionDenied();
      if (body.p_status === 'approved' && Object.values(bookings).some(booking => booking.status === 'approved')) return reply({ code: '23P01' }, availabilityStatus);
      if (body.p_status === 'cancelled') cancelled.push(body.p_booking_id);
      bookings[body.p_booking_id].status = body.p_status;
      return reply(bookings[body.p_booking_id]);
    }
    if (path === '/rest/v1/bookings') {
      if (role === 'stranger') return reply([]);
      const id = url.searchParams.get('id');
      if (id?.startsWith('eq.')) {
        const booking = bookings[id.slice(3)];
        return reply(booking ? [{ ...booking, ...(tamperCleanup ? { guest_id: identities.stranger } : {}) }] : []);
      }
      return reply(Object.values(bookings));
    }
    if (path === '/rest/v1/calendar_days') return reply(Object.values(bookings).some(booking => booking.status === 'approved') ? [{ status: 'booked' }] : []);
    throw new Error(`Unexpected simulated API endpoint ${path}`);
  }
  return { fetchImpl, cancelled, bookings };
}

describe('explicit staging allowlist', () => {
  it('rejects unknown, duplicate or accidental execution flags', () => {
    expect(parseArgs(['smoke', '--project-ref', ref])).toMatchObject({ command: 'smoke', projectRef: ref, run: false });
    expect(parseArgs(['smoke', '--project-ref', ref, '--run'])).toMatchObject({ run: true });
    for (const args of [['plan', '--run'], ['plan', '--execute'], ['smoke', '--run', '--run'], ['smoke', '--project-ref'], ['unknown']]) {
      expect(() => parseArgs(args)).toThrow();
    }
  });

  it('loads secrets only from an ignored local config inside the repository', () => {
    const root = mkdtempSync(join(tmpdir(), 'locamap-stage-'));
    try {
      execFileSync('git', ['init', '--quiet', root]);
      mkdirSync(join(root, 'scripts', 'staging'), { recursive: true });
      writeFileSync(join(root, '.gitignore'), '.env*.local\n');
      writeFileSync(join(root, '.env'), `EXPO_PUBLIC_SUPABASE_URL=https://${ref}.supabase.co\n`);
      writeFileSync(join(root, 'scripts', 'staging', '.env.staging.local'), 'SECRET=keep-private\n');
      const loaded = loadLocalInputs({}, root);
      expect(loaded.env.SECRET).toBe('keep-private');
      expect(loaded.appUrl).toBe(`https://${ref}.supabase.co`);
      expect(() => loadLocalInputs({ configPath: '../outside.env.local' }, root)).toThrow(/inside/);
      writeFileSync(join(root, '.gitignore'), '');
      expect(() => loadLocalInputs({}, root)).toThrow(/ignored/);
    } finally {
      if (root.startsWith(join(tmpdir(), 'locamap-stage-'))) rmSync(root, { recursive: true, force: true });
    }
  });

  it('requires a project argument and a matching explicit verification', () => {
    expect(() => validateTarget(targetEnv(), undefined)).toThrow(/project-ref/);
    expect(() => validateTarget({ ...targetEnv(), LOCAMAP_STAGING_VERIFICATION: '' }, ref)).toThrow(/verified-staging/);
    expect(() => validateTarget(targetEnv(), 'qrstabcdefghijklmnop')).toThrow(/match/);
    expect(target()).toMatchObject({ ref, url: `https://${ref}.supabase.co` });
  });

  it('rejects URL confusion and every known production reference', () => {
    for (const url of ['http://abcdefghijklmnopqrst.supabase.co', 'https://abcdefghijklmnopqrst.supabase.co.evil.test', 'https://user@abcdefghijklmnopqrst.supabase.co', 'https://abcdefghijklmnopqrst.supabase.co/path']) {
      expect(() => validateTarget({ ...targetEnv(), LOCAMAP_STAGING_URL: url }, ref)).toThrow(/URL/);
    }
    expect(() => validateTarget({ ...targetEnv(), LOCAMAP_PRODUCTION_PROJECT_REFS: ref }, ref)).toThrow(/production/);
  });

  it('blocks the app target until separately acknowledged as verified staging', () => {
    expect(() => validateTarget(targetEnv(), ref, targetEnv().LOCAMAP_STAGING_URL)).toThrow(/app target/);
    expect(validateTarget({ ...targetEnv(), LOCAMAP_STAGING_ALLOW_APP_TARGET: `verified-staging:${ref}` }, ref, targetEnv().LOCAMAP_STAGING_URL)).toMatchObject({ ref });
  });

  it('parses secrets without expansion and rejects duplicate keys without echoing values', () => {
    expect(parseEnv('PASSWORD="literal$HOME`text"\nKEY=hello#literal\n# comment')).toEqual({ PASSWORD: 'literal$HOME`text', KEY: 'hello#literal' });
    expect(() => parseEnv('KEY=secret-one\nKEY=secret-two')).toThrow(/Duplicate/);
    expect(() => parseEnv('SECRET="bad')).toThrow(/Invalid/);
  });

  it('builds explicit project CLI commands and never disables JWT verification', () => {
    const plan = deploymentPlan(target(), ['001_init.sql', '002_security_and_server_flows.sql']);
    expect(plan.commands).toContain(`supabase link --project-ref ${ref}`);
    expect(plan.commands).toContain('supabase db push --linked --dry-run');
    expect(plan.commands).toContain(`supabase functions deploy get-upload-url --project-ref ${ref}`);
    expect(plan.commands.join('\n')).not.toMatch(/--no-verify-jwt|service_role|password/);
  });
});

describe('dedicated smoke fixture guards', () => {
  it('requires three distinct exact test identities and a run marker', () => {
    expect(smoke()).toMatchObject({ runId, propertyId });
    expect(() => validateSmokeInputs({ ...smokeEnv(), LOCAMAP_SMOKE_GUEST_ID: identities.host }, target())).toThrow(/distinct/);
    expect(() => validateSmokeInputs({ ...smokeEnv(), LOCAMAP_SMOKE_HOST_EMAIL: 'real-person@example.com' }, target())).toThrow(/locamap-smoke/);
    expect(() => validateSmokeInputs({ ...smokeEnv(), LOCAMAP_SMOKE_RUN_ID: 'production' }, target())).toThrow(/run ID/);
    expect(() => validateSmokeInputs({ ...smokeEnv(), LOCAMAP_SMOKE_IDENTITIES: '' }, target())).toThrow(/dedicated-test-accounts/);
  });

  it('rejects secret/service keys and invalid booking dates before any network request', () => {
    expect(() => validateSmokeInputs({ ...smokeEnv(), LOCAMAP_STAGING_ANON_KEY: 'sb_secret_never-use' }, target())).toThrow(/public/);
    const payload = Buffer.from(JSON.stringify({ role: 'service_role', ref })).toString('base64url');
    expect(() => validateSmokeInputs({ ...smokeEnv(), LOCAMAP_STAGING_ANON_KEY: `e30.${payload}.signature` }, target())).toThrow(/public/);
    expect(() => validateSmokeInputs({ ...smokeEnv(), LOCAMAP_SMOKE_END_DATE: '2026-10-09' }, target(), new Date('2026-09-30'))).toThrow(/dates/);
    expect(() => validateSmokeInputs({ ...smokeEnv(), LOCAMAP_SMOKE_START_DATE: '2026-02-30' }, target(), new Date('2026-01-01'))).toThrow(/dates/);
  });

  it('accepts only the exact tagged active property owned by the dedicated host', () => {
    const fixture = { id: propertyId, owner_id: identities.host, title: `[${runId}] Staging only`, status: 'ACTIVE', min_duration_months: 1, max_guests: 2, currency: 'RWF' };
    expect(() => assertFixture(fixture, smoke())).not.toThrow();
    for (const patch of [{ owner_id: identities.stranger }, { title: 'Customer listing' }, { status: 'DRAFT' }, { min_duration_months: 2 }, { currency: 'USD' }, { max_guests: undefined }]) {
      expect(() => assertFixture({ ...fixture, ...patch }, smoke())).toThrow();
    }
  });

  it('permits cancellation only for recorded IDs with exact run ownership', () => {
    const booking = { id: '20000000-0000-4000-8000-000000000001', property_id: propertyId, host_id: identities.host, guest_id: identities.guest, message: `[${runId}] booking-a` };
    expect(() => assertOwnedBooking(booking, smoke(), new Set([booking.id]))).not.toThrow();
    expect(() => assertOwnedBooking(booking, smoke(), new Set())).toThrow(/created/);
    expect(() => assertOwnedBooking({ ...booking, message: 'Unrelated booking' }, smoke(), new Set([booking.id]))).toThrow(/ownership/);
    expect(() => assertOwnedBooking({ ...booking, guest_id: identities.stranger }, smoke(), new Set([booking.id]))).toThrow(/ownership/);
  });
});

describe('hosted evidence must not create false passes', () => {
  it('executes the three identities, isolates data and cancels only the two bookings created by the run', async () => {
    const api = simulatedApi();
    const output: string[] = [];
    const result = await executeSmoke(smokeEnv(), ref, { run: true, now: new Date('2026-09-30'), fetchImpl: api.fetchImpl, log: (line: string) => output.push(line) });
    expect(result.failed).toBe(0);
    expect(result.passed).toBeGreaterThan(15);
    expect(api.cancelled).toEqual(['20000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002']);
    expect(Object.values(api.bookings).map(booking => booking.status)).toEqual(['cancelled', 'cancelled']);
    const [first, second] = Object.values(api.bookings);
    expect(first.start_date).not.toBe(second.start_date);
    expect(Date.parse(String(second.start_date))).toBeLessThan(Date.parse(String(first.end_date)));
    expect(output.join('\n')).toMatch(/PASS.*concurrent/);
    expect(output.join('\n')).not.toMatch(/secret-host|token-host|private@example/);
  });

  it('fails a privacy leak before writing conversations or bookings', async () => {
    const api = simulatedApi({ leakPrivateProfile: true });
    const result = await executeSmoke(smokeEnv(), ref, { run: true, now: new Date('2026-09-30'), fetchImpl: api.fetchImpl, log: () => undefined });
    expect(result.failed).toBe(1);
    expect(result.createdBookingIds).toEqual([]);
  });

  it('never records or prints an invalid booking ID returned by the API', async () => {
    const api = simulatedApi();
    const output: string[] = [];
    const fetchImpl = async (url: string, options: RequestInit) => {
      const response = await api.fetchImpl(url, options);
      if (url.endsWith('/rpc/create_booking')) {
        const data = await response.json();
        return new Response(JSON.stringify({ ...data, id: 'token-secret-malformed-id' }), { status: 200 });
      }
      return response;
    };
    const result = await executeSmoke(smokeEnv(), ref, { run: true, now: new Date('2026-09-30'), fetchImpl, log: (line: string) => output.push(line) });
    expect(result.failed).toBe(1);
    expect(result.createdBookingIds).toEqual([]);
    expect(output.join('\n')).not.toContain('token-secret-malformed-id');
  });

  it('refuses cleanup if returned booking ownership has changed', async () => {
    const api = simulatedApi({ tamperCleanup: true });
    const result = await executeSmoke(smokeEnv(), ref, { run: true, now: new Date('2026-09-30'), fetchImpl: api.fetchImpl, log: () => undefined });
    expect(result.failed).toBeGreaterThan(0);
    expect(api.cancelled).toEqual([]);
  });

  it('waits for both approval requests to settle before cancellation after a network failure', async () => {
    const api = simulatedApi();
    let secondApprovalPending = false, earlyCleanup = false;
    const fetchImpl = async (url: string, options: RequestInit) => {
      const body = options.body ? JSON.parse(String(options.body)) : {};
      if (body.p_status === 'approved' && String((options.headers as Record<string, string>).Authorization) === 'Bearer token-host') {
        if (body.p_booking_id.endsWith('1')) {
          await api.fetchImpl(url, options);
          throw new Error('Simulated lost approval response');
        }
        secondApprovalPending = true;
        await new Promise(resolve => setTimeout(resolve, 30));
        const response = await api.fetchImpl(url, options);
        secondApprovalPending = false;
        return response;
      }
      if (url.includes('/bookings?id=eq.') && secondApprovalPending) earlyCleanup = true;
      return api.fetchImpl(url, options);
    };
    const result = await executeSmoke(smokeEnv(), ref, { run: true, now: new Date('2026-09-30'), fetchImpl, log: () => undefined });
    expect(result.failed).toBe(1);
    expect(earlyCleanup).toBe(false);
    expect(api.cancelled).toHaveLength(2);
  });

  it('does no network work unless --run is explicitly enabled', async () => {
    const output: string[] = [];
    const result = await executeSmoke(smokeEnv(), ref, {
      now: new Date('2026-09-30'), log: (line: string) => output.push(line),
      fetchImpl: () => { throw new Error('Network must never run during preflight'); },
    });
    expect(result).toMatchObject({ mode: 'preflight', passed: 0, failed: 0 });
    expect(output.join('\n')).toMatch(/No network requests/);
    expect(output.join('\n')).not.toContain('secret-host');
  });

  it('stops before fixture writes when a credential resolves to a different account', async () => {
    const output: string[] = [];
    let requests = 0;
    const result = await executeSmoke(smokeEnv(), ref, {
      run: true, now: new Date('2026-09-30'), log: (line: string) => output.push(line),
      fetchImpl: async () => {
        requests++;
        return new Response(JSON.stringify({ access_token: 'session-secret', user: { id: identities.guest, email: 'locamap-smoke+host@example.invalid' } }), { status: 200 });
      },
    });
    expect(result).toMatchObject({ mode: 'hosted', passed: 0, failed: 1, createdBookingIds: [] });
    expect(requests).toBe(1);
    expect(output.join('\n')).toMatch(/FAIL.*identity/);
    expect(output.join('\n')).not.toMatch(/secret-host|session-secret/);
  });

  it('accepts actual permission SQLSTATE and rejects expired sessions, missing routes and service failures', () => {
    expect(() => assertDenied({ ok: false, status: 403, data: { code: '42501' } })).not.toThrow();
    for (const result of [
      { ok: true, status: 200, data: [] },
      { ok: false, status: 401, data: { code: '42501' } },
      { ok: false, status: 404, data: { code: 'PGRST202' } },
      { ok: false, status: 500, data: { code: 'XX000' } },
    ]) expect(() => assertDenied(result)).toThrow();
  });

  it('redacts transport errors and rejects redirects instead of forwarding credentials', async () => {
    await expect(requestJson(target(), 'token-secret', '/rest/v1/profiles', {}, async () => { throw new Error('password=secret'); })).rejects.toThrow('Network request failed');
    await expect(requestJson(target(), 'token-secret', '/rest/v1/profiles', {}, async () => ({
      status: 200, ok: true, text: async () => { throw new Error('token=secret'); },
    }))).rejects.toThrow('Network response failed');
    let redirectMode: string | undefined;
    await expect(requestJson(target(), 'token-secret', '/rest/v1/profiles', {}, async (_url: string, options: RequestInit) => {
      redirectMode = options.redirect;
      return new Response('', { status: 302, headers: { location: 'https://evil.test' } });
    })).rejects.toThrow(/redirect/);
    expect(redirectMode).toBe('error');
  });
});
