import { randomBytes, createHmac } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { parseEnv } from '../staging/core.mjs';
const ref = 'uwoesteqkprwitnhfmes';
const env = parseEnv(readFileSync('scripts/staging/.env.service.local', 'utf8'));
if (env.SUPABASE_URL !== `https://${ref}.supabase.co`) throw new Error('Unexpected staging');
const service = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const client = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const file = 'scripts/staging/.env.admin.local';
let qa = existsSync(file) ? parseEnv(readFileSync(file, 'utf8')) : {};
function save() { writeFileSync(file, Object.entries(qa).map(([k, v]) => `${k}=${v}`).join('\n') + '\n'); }
export function totp(secret) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits = '';
  for (const char of secret.replace(/=/g, '').toUpperCase()) bits += alphabet.indexOf(char).toString(2).padStart(5, '0');
  const bytes = Buffer.from((bits.match(/.{8}/g) || []).map(v => parseInt(v, 2))); const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const digest = createHmac('sha1', bytes).update(counter).digest(); const offset = digest[19] & 15;
  return String((digest.readUInt32BE(offset) & 0x7fffffff) % 1000000).padStart(6, '0');
}
const check = (result, title) => { if (result.error) throw new Error(`${title} failed`); return result.data; };
async function login() {
  check(await client.auth.signInWithPassword({ email: qa.EMAIL, password: qa.PASSWORD }), 'QA sign-in');
  if (!qa.TOTP_SECRET) {
    const enrollment = check(await client.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'LocaMap staging QA' }), 'QA MFA enrollment');
    qa.FACTOR_ID = enrollment.id; qa.TOTP_SECRET = enrollment.totp.secret; save();
  }
  check(await client.auth.mfa.challengeAndVerify({ factorId: qa.FACTOR_ID, code: totp(qa.TOTP_SECRET) }), 'QA MFA verification');
  return (await client.auth.getSession()).data.session.access_token;
}
async function main() {
  const command = process.argv[2];
  if (command === 'setup') {
    if (!process.argv.includes('--run')) { console.log('PLAN: create a synthetic staging admin with TOTP and store credentials only in ignored local configuration.'); return; }
    if (!qa.USER_ID) {
      qa.EMAIL = `locamap-admin-qa-${randomBytes(4).toString('hex')}@example.invalid`; qa.PASSWORD = randomBytes(32).toString('base64url');
      const user = check(await service.auth.admin.createUser({ email: qa.EMAIL, password: qa.PASSWORD, email_confirm: true, user_metadata: { full_name: 'Équipe de recette LocaMap' } }), 'QA account creation').user;
      qa.USER_ID = user.id; save();
    }
    check(await service.from('admin_members').upsert({ user_id: qa.USER_ID, role: 'owner', active: true }), 'QA membership');
    await login(); console.log('Dedicated QA administrator and TOTP configured. No credentials printed.');
  } else if (command === 'activate-owner') {
    if (!process.argv.includes('--run')) throw new Error('Use activate-owner --run only after explicit owner authorization.');
    const owner = parseEnv(readFileSync('scripts/staging/.env.admin-owner.local','utf8'));
    if (owner.EMAIL !== 'peter23xp@gmail.com') throw new Error('Unexpected intended owner.');
    const user = check(await service.auth.admin.getUserById(owner.USER_ID),'Owner identity verification').user;
    if (user.email !== owner.EMAIL || !user.email_confirmed_at) throw new Error('The intended owner has not confirmed the invitation yet.');
    const token = await login();
    const response = await fetch(`${env.SUPABASE_URL}/functions/v1/admin-api`, { method:'POST', headers:{apikey:env.SUPABASE_ANON_KEY,Authorization:`Bearer ${token}`,'Content-Type':'application/json',Origin:'http://localhost:8098'}, body:JSON.stringify({action:'mutate',resource:'members',requestId:crypto.randomUUID(),payload:{operation:'grant',user_id:owner.USER_ID,role:'owner',note:'Création du compte principal explicitement autorisée par l’exploitant ; invitation confirmée.'}}) });
    if (!response.ok) throw new Error(`Owner access activation failed (${response.status}).`);
    console.log('Confirmed intended owner now has audited administrator access. Password and TOTP are controlled by the owner.');
  } else if (command === 'finish') {
    if (!process.argv.includes('--run')) throw new Error('Use finish --run to revoke only the dedicated QA administrator.');
    if (!/^locamap-admin-qa-[a-f0-9]+@example\.invalid$/.test(qa.EMAIL)) throw new Error('Unexpected QA identity.');
    const owner = parseEnv(readFileSync('scripts/staging/.env.admin-owner.local', 'utf8'));
    const user = check(await service.auth.admin.getUserById(owner.USER_ID), 'Owner verification').user;
    const member = check(await service.from('admin_members').select('active,role').eq('user_id', owner.USER_ID).single(), 'Owner membership verification');
    if (owner.EMAIL !== 'peter23xp@gmail.com' || user.email !== owner.EMAIL || !user.email_confirmed_at || !member.active || member.role !== 'owner') throw new Error('Confirmed real owner must be active before QA revocation.');
    const token = await login();
    const call = async body => {
      const response = await fetch(`${env.SUPABASE_URL}/functions/v1/admin-api`, { method: 'POST', headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Origin: 'http://localhost:8098' }, body: JSON.stringify(body) });
      return { status: response.status, data: await response.json() };
    };
    const current = await call({ action: 'detail', resource: 'members', id: qa.USER_ID });
    if (current.status !== 200) throw new Error('QA membership could not be read.');
    const revoked = await call({ action: 'mutate', resource: 'members', id: qa.USER_ID, expectedVersion: current.data.record.version, requestId: crypto.randomUUID(), payload: { operation: 'revoke', note: 'Recette terminée : retrait de l’accès administrateur temporaire. Le compte principal confirmé conserve ses droits.' } });
    if (revoked.status !== 200) throw new Error('QA revocation failed.');
    const denied = await call({ action: 'session' });
    if (denied.status !== 403) throw new Error('Revoked QA token was not denied.');
    const result = { timestamp: new Date().toISOString(), revokedQaAccess: true, previousTokenStatus: denied.status, confirmedOwnerPreserved: true };
    writeFileSync('.expo/admin-revocation.json', JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result));
  } else if (command === 'seed') {
    if (!process.argv.includes('--run')) throw new Error('Use seed --run for synthetic fixtures.');
    if (!qa.APPLICANT_ID) {
      qa.APPLICANT_EMAIL = `locamap-admin-applicant-${randomBytes(4).toString('hex')}@example.invalid`; qa.APPLICANT_PASSWORD = randomBytes(32).toString('base64url');
      const user = check(await service.auth.admin.createUser({ email: qa.APPLICANT_EMAIL, password: qa.APPLICANT_PASSWORD, email_confirm: true, user_metadata: { full_name: '[Recette admin] Hôte fictif' } }), 'QA applicant creation').user;
      qa.APPLICANT_ID = user.id; save();
    }
    const applicant = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    check(await applicant.auth.signInWithPassword({ email: qa.APPLICANT_EMAIL, password: qa.APPLICANT_PASSWORD }), 'Applicant sign-in');
    const bearer = (await applicant.auth.getSession()).data.session.access_token;
    if (!qa.DOCUMENT_KEY) {
      const bytes = readFileSync('assets/icon.png');
      const start = await fetch(`${env.SUPABASE_URL}/functions/v1/get-upload-url`, { method: 'POST', headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ entity: 'kyc', mimeType: 'image/png', sizeBytes: bytes.length, fileName: 'synthetic-document.png' }) });
      if (!start.ok) throw new Error(`Fixture upload signing failed (${start.status})`);
      const upload = await start.json();
      const put = await fetch(upload.uploadUrl, { method: 'PUT', headers: upload.headers, body: bytes }); if (!put.ok) throw new Error('Fixture R2 upload failed');
      const finalize = await fetch(`${env.SUPABASE_URL}/functions/v1/finalize-upload`, { method: 'POST', headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ key: upload.key }) });
      if (!finalize.ok) throw new Error('Fixture R2 finalization failed'); qa.DOCUMENT_KEY = upload.key; save();
    }
    const current = await applicant.from('host_applications').select('status').eq('user_id',qa.APPLICANT_ID).maybeSingle();
    if (!current.data || current.data.status === 'REJECTED') check(await applicant.rpc('submit_host_application', { p_legal_name: '[Recette admin] Identité fictive', p_document_keys: [qa.DOCUMENT_KEY] }), 'Host application');
    if (!qa.TICKET_ID) { const ticket = check(await applicant.from('support_tickets').insert({ user_id: qa.APPLICANT_ID, subject: '[Recette admin] Vérifier le suivi du dossier', description: 'Demande synthétique réservée à la recette du nouvel espace administrateur.', category: 'account', priority: 'NORMAL' }).select('id').single(), 'QA support ticket'); qa.TICKET_ID = ticket.id; save(); }
    console.log('Synthetic applicant, private logo document and support ticket ready. Real identity documents untouched.');
  } else if (command === 'check') {
    const token = await login();
    const call = async (payload, bearer = token, origin = 'http://localhost:8098') => {
      const r = await fetch(`${env.SUPABASE_URL}/functions/v1/admin-api`, { method: 'POST', headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${bearer}`, Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      return { status: r.status, data: await r.json() };
    };
    const session = await call({ action: 'session' }); if (session.status !== 200 || session.data.mfaRequired) throw new Error('Hosted MFA session failed');
    let passed = 1;
    for (const resource of ['users','hosts','properties','bookings','tickets','reports','faq_items','guides','guide_categories','articles','courses','course_steps','legal_documents','errors','limits','cleanup','audit','members']) {
      const response = await call({ action: 'list', resource, page: 1 }); if (response.status !== 200 || !Array.isArray(response.data.rows)) throw new Error(`Hosted list ${resource} failed (${response.status})`); passed++;
    }
    if ((await call({ action: 'overview' }, token, 'https://not-allowed.example')).status !== 403) throw new Error('Origin refusal failed'); passed++;
    const ordinary = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    check(await ordinary.auth.signInWithPassword({ email: qa.EMAIL, password: qa.PASSWORD }), 'QA AAL1 login');
    const aal1 = (await ordinary.auth.getSession()).data.session.access_token;
    if ((await call({ action: 'list', resource: 'users' }, aal1)).status !== 403) throw new Error('AAL1 data refusal failed'); passed++;
    const fixture = parseEnv(readFileSync('scripts/staging/.env.staging.local','utf8'));
    check(await ordinary.auth.signInWithPassword({ email: fixture.LOCAMAP_SMOKE_STRANGER_EMAIL, password: fixture.LOCAMAP_SMOKE_STRANGER_PASSWORD }), 'Ordinary fixture login');
    if ((await call({ action: 'session' }, (await ordinary.auth.getSession()).data.session.access_token)).status !== 403) throw new Error('Ordinary account refusal failed'); passed++;
    const result = { timestamp: new Date().toISOString(), ref, passed, scope: 'All resource lists, MFA and origin/ordinary-account refusals; no client data output.' }; writeFileSync('.expo/admin-hosted-checks.json',JSON.stringify(result,null,2)); console.log(JSON.stringify(result));
  } else throw new Error('Expected setup, seed, check, activate-owner or finish; mutations require --run.');
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
