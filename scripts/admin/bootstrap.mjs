import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { parseEnv } from '../staging/core.mjs';

// This command stays on the operator's machine. Never bundle it into the site.
const args = process.argv.slice(2);
const email = args[args.indexOf('--email') + 1];
const run = args.includes('--run');
const expectedRef = 'uwoesteqkprwitnhfmes';
async function main() {
  if (!args.includes('--email') || !email || !email.includes('@')) throw new Error('Usage: node scripts/admin/bootstrap.mjs --email <confirmed-account-email> [--run]');
  const env = parseEnv(readFileSync('scripts/staging/.env.service.local', 'utf8'));
  if (env.SUPABASE_URL !== `https://${expectedRef}.supabase.co`) throw new Error('Unexpected project; this command is restricted to the approved staging.');
  const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  let found;
  for (let page = 1; page <= 100; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw new Error('Could not verify the existing Auth account.');
    found = data.users.find(user => user.email?.toLowerCase() === email.toLowerCase());
    if (found || data.users.length < 100) break;
  }
  if (!found || !found.email_confirmed_at) throw new Error('No existing confirmed account matches this email. No access was granted.');
  const { data: profile, error: profileError } = await admin.from('profiles').select('id,email').eq('id', found.id).single();
  if (profileError || profile.email?.toLowerCase() !== email.toLowerCase()) throw new Error('Auth/profile identity mismatch. No access was granted.');
  console.log(`Verified existing confirmed account ${found.id} on staging ${expectedRef}.`);
  if (!run) { console.log('PLAN: grant owner to this exact account. No data changed. Add --run to execute.'); return; }
  const { error } = await admin.rpc('admin_bootstrap_owner', { p_user_id: found.id });
  if (error) throw new Error('Initial owner could not be granted: check confirmed identity, account state and existing owners.');
  console.log('Initial owner configured. The account must complete TOTP in the admin site. No password was changed.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
