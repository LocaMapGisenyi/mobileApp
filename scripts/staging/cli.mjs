import { existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { basename, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deploymentPlan, parseEnv, validateTarget } from './core.mjs';
import { executeSmoke } from './smoke.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const HELP = `LocaMap staging tools (Node 20+; no new dependencies)

node scripts/staging/cli.mjs plan --project-ref <verified-staging-ref>
node scripts/staging/cli.mjs smoke --project-ref <verified-staging-ref>
node scripts/staging/cli.mjs smoke --project-ref <verified-staging-ref> --run

Optional: --config <ignored-.env.name.local-path-inside-repository>
Default config: scripts/staging/.env.staging.local

plan prints commands only; it never contacts or deploys a remote service.
smoke defaults to local validation; only --run enables hosted requests and test writes.
Read docs/STAGING-RECIPE.md before running against a hosted project.`;

export function parseArgs(argv) {
  if (argv.length === 0 || (argv.length === 1 && argv[0] === '--help')) return { help: true };
  const [command, ...rest] = argv;
  if (!['plan', 'smoke'].includes(command)) throw new Error('Expected plan or smoke command');
  const result = { command, run: false };
  const seen = new Set();
  for (let index = 0; index < rest.length; index++) {
    const option = rest[index];
    if (seen.has(option)) throw new Error('Duplicate command option');
    seen.add(option);
    if (option === '--run' && command === 'smoke') { result.run = true; continue; }
    if (!['--project-ref', '--config'].includes(option)) throw new Error('Unknown or unsupported command option');
    const value = rest[++index];
    if (!value || value.startsWith('--')) throw new Error('Missing command option value');
    result[option === '--project-ref' ? 'projectRef' : 'configPath'] = value;
  }
  return result;
}

function insideRoot(path, root) {
  const rel = relative(root, path);
  return rel !== '' && rel !== '..' && !rel.startsWith(`..\\`) && !rel.startsWith('../') && !isAbsolute(rel);
}

export function loadLocalInputs(args, root = ROOT) {
  const absoluteRoot = realpathSync(root);
  const path = resolve(absoluteRoot, args.configPath || 'scripts/staging/.env.staging.local');
  if (!insideRoot(path, absoluteRoot)) throw new Error('Config must stay inside this repository');
  if (!/^\.env(?:\.[a-zA-Z0-9_-]+)+\.local$/.test(basename(path))) throw new Error('Use an ignored .env.name.local config file');
  if (!existsSync(path)) throw new Error('Local staging config missing; copy scripts/staging/staging.env.example to scripts/staging/.env.staging.local');
  if (!insideRoot(realpathSync(path), absoluteRoot)) throw new Error('Config must resolve inside this repository');
  try {
    // Without --no-index, tracked files are not considered ignored.
    execFileSync('git', ['check-ignore', '--quiet', '--', relative(absoluteRoot, path)], { cwd: absoluteRoot, stdio: 'pipe' });
  } catch { throw new Error('Staging config must be ignored and untracked by Git'); }
  let env;
  try { env = parseEnv(readFileSync(path, 'utf8')); }
  catch (error) {
    if (error instanceof Error && /^(Invalid|Duplicate)/.test(error.message)) throw error;
    throw new Error('Could not read local staging config');
  }
  const appPath = resolve(absoluteRoot, '.env');
  let appUrl = '';
  if (existsSync(appPath)) {
    try { appUrl = parseEnv(readFileSync(appPath, 'utf8')).EXPO_PUBLIC_SUPABASE_URL || ''; }
    catch { throw new Error('Could not parse app .env for target safety check'); }
  }
  return { env, appUrl };
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) { console.log(HELP); return; }
    const { env, appUrl } = loadLocalInputs(args);
    const target = validateTarget(env, args.projectRef, appUrl);
    if (args.command === 'plan') {
      const migrations = readdirSync(resolve(ROOT, 'supabase/migrations')).filter(name => /^\d+_[a-zA-Z0-9_-]+\.sql$/.test(name)).sort();
      const plan = deploymentPlan(target, migrations);
      console.log(`LOCAL PLAN ONLY: ${target.ref}. No network requests or deployment performed.`);
      console.log('Verification marker records operator confirmation; it does not prove dashboard ownership or remote schema state.');
      console.log(`Repository migrations: ${plan.migrations.join(', ')}`);
      console.log('Run from the repository root. Review remote migration history and the dry-run before applying.');
      console.log(plan.commands.join('\n'));
      console.log('Keep gateway JWT verification enabled. Never add --no-verify-jwt. See docs/STAGING-RECIPE.md for fixture and R2 checks.');
      return;
    }
    const result = await executeSmoke(env, args.projectRef, { appUrl, run: args.run });
    if (result.failed > 0) process.exitCode = 1;
  } catch (error) {
    // All surfaced messages are generated by local validation, never API response text.
    console.error(`FAIL staging preflight: ${error instanceof Error ? error.message : 'validation failed'}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
