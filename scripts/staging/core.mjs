import { Buffer } from 'node:buffer';

const REF = /^[a-z]{20}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const DAY = 86_400_000;

// Deliberately no expansion, shell execution or process.env fallback.
export function parseEnv(text) {
  const result = Object.create(null);
  for (const [index, line] of text.replace(/^\uFEFF/, '').split(/\r?\n/).entries()) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const match = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line.trim());
    if (!match) throw new Error(`Invalid config line ${index + 1}`);
    const [, key, raw] = match;
    if (Object.hasOwn(result, key)) throw new Error(`Duplicate config key at line ${index + 1}`);
    let value = raw.trim();
    if (value.startsWith('"')) {
      try { value = JSON.parse(value); } catch { throw new Error(`Invalid quoted config at line ${index + 1}`); }
      if (typeof value !== 'string') throw new Error(`Invalid config value at line ${index + 1}`);
    } else if (value.startsWith("'")) {
      if (!value.endsWith("'") || value.length < 2) throw new Error(`Invalid quoted config at line ${index + 1}`);
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

export function validateTarget(env, requestedRef, appUrl = '') {
  if (!requestedRef || !REF.test(requestedRef)) throw new Error('An explicit valid --project-ref is required');
  const ref = env.LOCAMAP_STAGING_PROJECT_REF;
  if (ref !== requestedRef) throw new Error('Project argument must match the staging allowlist');
  if (env.LOCAMAP_STAGING_VERIFICATION !== `verified-staging:${ref}`) {
    throw new Error('Set LOCAMAP_STAGING_VERIFICATION=verified-staging:<ref> after verifying the project');
  }
  const production = (env.LOCAMAP_PRODUCTION_PROJECT_REFS || '').split(',').map(value => value.trim()).filter(Boolean);
  if (production.some(value => !REF.test(value))) throw new Error('Invalid production project reference');
  if (production.includes(ref)) throw new Error('The target is on the production denylist');
  const url = `https://${ref}.supabase.co`;
  if (env.LOCAMAP_STAGING_URL !== url) throw new Error('Staging URL must exactly match the HTTPS project origin');
  let sameAppTarget = false;
  if (appUrl) {
    try { sameAppTarget = new URL(appUrl).hostname === `${ref}.supabase.co`; }
    catch { throw new Error('Invalid app Supabase URL; review .env before proceeding'); }
  }
  if (sameAppTarget && env.LOCAMAP_STAGING_ALLOW_APP_TARGET !== `verified-staging:${ref}`) {
    throw new Error('The app target requires LOCAMAP_STAGING_ALLOW_APP_TARGET=verified-staging:<ref>');
  }
  return { ref, url };
}

function isPublicKey(key, ref) {
  if (typeof key !== 'string') return false;
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return true;
  try {
    const parts = key.split('.');
    if (parts.length !== 3) return false;
    const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return claims.role === 'anon' && claims.ref === ref;
  } catch { return false; }
}

function dateValue(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return NaN;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value ? timestamp : NaN;
}

export function validateSmokeInputs(env, target, now = new Date()) {
  if (!isPublicKey(env.LOCAMAP_STAGING_ANON_KEY, target.ref)) throw new Error('Smoke tests require a public anon or publishable key for staging');
  if (env.LOCAMAP_SMOKE_IDENTITIES !== `dedicated-test-accounts:${target.ref}`) {
    throw new Error('Set LOCAMAP_SMOKE_IDENTITIES=dedicated-test-accounts:<ref> after verifying account ownership');
  }
  const runId = env.LOCAMAP_SMOKE_RUN_ID;
  if (!/^locamap-smoke-\d{8}-[a-z0-9-]{3,32}$/.test(runId || '')) throw new Error('Invalid smoke run ID');
  const propertyId = env.LOCAMAP_SMOKE_PROPERTY_ID;
  if (!UUID.test(propertyId || '')) throw new Error('A dedicated smoke property UUID is required');
  const accounts = {};
  for (const role of ['host', 'guest', 'stranger']) {
    const prefix = `LOCAMAP_SMOKE_${role.toUpperCase()}`;
    const id = env[`${prefix}_ID`];
    const email = env[`${prefix}_EMAIL`];
    const password = env[`${prefix}_PASSWORD`];
    if (!UUID.test(id || '') || !password) throw new Error(`Dedicated ${role} UUID and password are required`);
    if (!/^locamap-smoke[+.-][^@\s]+@[^@\s]+\.[^@\s]+$/i.test(email || '')) {
      throw new Error(`Dedicated ${role} email must begin with locamap-smoke plus a separator`);
    }
    accounts[role] = { id: id.toLowerCase(), email: email.toLowerCase(), password };
  }
  if (new Set(Object.values(accounts).map(account => account.id)).size !== 3 ||
      new Set(Object.values(accounts).map(account => account.email)).size !== 3) {
    throw new Error('Smoke accounts must have three distinct IDs and emails');
  }
  const startDate = env.LOCAMAP_SMOKE_START_DATE;
  const endDate = env.LOCAMAP_SMOKE_END_DATE;
  const start = dateValue(startDate), end = dateValue(endDate);
  const days = (end - start) / DAY;
  if (!Number.isInteger(days) || days < 30 || days > 3660 || start < dateValue(now.toISOString().slice(0, 10)) + DAY) {
    throw new Error('Smoke booking dates must start tomorrow or later and span 30 to 3660 days');
  }
  return { ...target, anonKey: env.LOCAMAP_STAGING_ANON_KEY, accounts, runId, propertyId: propertyId.toLowerCase(), startDate, endDate, days };
}

export function assertFixture(property, config) {
  if (!property || property.id !== config.propertyId || property.owner_id !== config.accounts.host.id ||
      !property.title?.startsWith(`[${config.runId}] `) || property.status !== 'ACTIVE') {
    throw new Error('Fixture must be the exact tagged ACTIVE property owned by the dedicated host');
  }
  if (property.currency !== 'RWF' || !Number.isInteger(property.min_duration_months) || property.min_duration_months < 1 ||
      property.min_duration_months * 30 > config.days || !Number.isInteger(property.max_guests) || property.max_guests < 1) {
    throw new Error('Fixture price currency, duration or capacity is unsuitable for this smoke test');
  }
}

export function assertOwnedBooking(booking, config, createdIds) {
  if (!booking || !UUID.test(booking.id || '') || !createdIds.has(booking.id)) throw new Error('Cancellation requires a booking ID created by this run');
  if (booking.property_id !== config.propertyId || booking.host_id !== config.accounts.host.id ||
      booking.guest_id !== config.accounts.guest.id || !booking.message?.startsWith(`[${config.runId}] `)) {
    throw new Error('Booking ownership or run marker does not match; cancellation refused');
  }
}

export function assertDenied(response) {
  if (response.ok || response.status !== 403 || response.data?.code !== '42501') {
    throw new Error('Expected authenticated permission denial (HTTP 403 / SQLSTATE 42501)');
  }
}

export function deploymentPlan(target, migrations) {
  const functions = ['get-upload-url', 'finalize-upload', 'account-export', 'account-delete', 'storage-cleanup', 'health', 'report-client-error'];
  return {
    target: target.ref,
    migrations,
    commands: [
      'supabase projects list',
      `supabase link --project-ref ${target.ref}`,
      'supabase migration list --linked',
      'supabase db push --linked --dry-run',
      '# Review the backup, target, schema and pending migrations before applying:',
      'supabase db push --linked',
      `supabase secrets set --project-ref ${target.ref} --env-file scripts/staging/.env.r2.local`,
      ...functions.map(name => `supabase functions deploy ${name} --project-ref ${target.ref}`),
    ],
  };
}

// No raw API errors, request body, credentials or response bodies enter logs.
export async function requestJson(config, token, path, { method = 'GET', body, prefer } = {}, fetchImpl = fetch) {
  if (!/^\/(?:rest|auth)\/v1\//.test(path)) throw new Error('Unsupported API path');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    let response;
    try {
      response = await fetchImpl(`${config.url}${path}`, {
        method, redirect: 'error', signal: controller.signal,
        headers: {
          apikey: config.anonKey || '', Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch { throw new Error('Network request failed (details withheld to protect credentials)'); }
    if (response.status >= 300 && response.status < 400) throw new Error('API redirect refused');
    let data = null;
    let text;
    try { text = await response.text(); }
    catch { throw new Error('Network response failed (details withheld to protect credentials)'); }
    if (text) {
      try { data = JSON.parse(text); }
      catch { throw new Error(`Expected JSON response (HTTP ${response.status})`); }
    }
    return { ok: response.ok, status: response.status, data };
  } finally { clearTimeout(timeout); }
}
