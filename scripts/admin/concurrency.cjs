/* Authorized staging-only SQL concurrency checks. No accounts or storage objects
 * are created/changed. Public evidence contains counts and results, never IDs,
 * credentials, customer content or raw database errors. */
const { randomUUID } = require('node:crypto');
const { readFileSync, mkdirSync, writeFileSync } = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.resolve(__dirname, '../..');
const EXPECTED_REF = 'uwoesteqkprwitnhfmes';
const HELPER = path.join(process.env.LOCALAPPDATA || '', 'LocaMap/staging-tools/database.cjs');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const evidence = { timestamp: new Date().toISOString(), ref: EXPECTED_REF, passed: false, checks: [], cleanup: null };
let stage = 'preflight';

function ensure(value, label) { if (!value) throw Object.assign(new Error(label), { safeLabel: label }); }
function record(name, facts) { evidence.checks.push({ name, passed: true, ...facts }); }
function pause(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function begin(client, mobileActor) {
  await client.query('BEGIN');
  await client.query("SET LOCAL statement_timeout = '15000ms'; SET LOCAL lock_timeout = '10000ms'; SET LOCAL idle_in_transaction_session_timeout = '20000ms'");
  await client.query("SELECT set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)", [mobileActor || '', JSON.stringify(mobileActor ? { sub: mobileActor, role: 'authenticated' } : {})]);
  if (mobileActor) await client.query('SET LOCAL ROLE authenticated');
  return Number((await client.query('SELECT pg_backend_pid() AS pid')).rows[0].pid);
}

async function rollback(client) { try { await client.query('ROLLBACK'); } catch { /* Connection failure remains a reported failure. */ } }

async function observeBlock(observer, waiterPid, holderPid, pending) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const result = await observer.query('SELECT $2::int = ANY(pg_blocking_pids($1::int)) AS blocked', [waiterPid, holderPid]);
    if (result.rows[0].blocked) return true;
    ensure(!pending.done, 'competing operation completed before the publication transaction released its lock');
    await pause(75);
  }
  throw Object.assign(new Error('expected PostgreSQL lock was not observed'), { safeLabel: 'expected PostgreSQL lock was not observed' });
}

function start(client, text, values) {
  const pending = { done: false, outcome: null, promise: null };
  pending.promise = client.query(text, values).then(
    result => { pending.done = true; pending.outcome = { ok: true, result }; return pending.outcome; },
    error => { pending.done = true; pending.outcome = { ok: false, code: error.code || 'QUERY_FAILED' }; return pending.outcome; },
  );
  return pending;
}

async function readVersion(client, actor, id) {
  const result = await client.query("SELECT public.admin_query($1,'properties',$2,'','',1) AS data", [actor, id]);
  return result.rows[0].data.record.version;
}

const mutationSql = "SELECT public.admin_mutate($1,'properties',$2,$3::jsonb,$4,$5) AS data";

async function run(first, second, actor, host) {
  for (const client of [first, second]) await client.query("SET statement_timeout = '15000ms'; SET lock_timeout = '10000ms'; SET idle_in_transaction_session_timeout = '20000ms'");
  const propertyIds = [randomUUID(), randomUUID()];
  const imageIds = [randomUUID(), randomUUID()];
  const requestIds = [randomUUID(), randomUUID(), randomUUID()];
  const runTag = randomUUID().slice(0, 8);
  let created = false;
  let pending = null;
  let mainError;
  try {
    stage = 'verify dedicated fixture identities';
    await begin(first);
    const eligible = (await first.query(`SELECT
      EXISTS(SELECT 1 FROM public.profiles p JOIN public.admin_members m ON m.user_id=p.id
       WHERE p.id=$1 AND lower(p.email) LIKE 'locamap-admin-qa-%@example.invalid'
        AND m.role='owner' AND m.active AND public.account_active(p.id)) AS admin_fixture,
      EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=$2 AND lower(p.email) LIKE 'locamap-smoke%'
        AND p.is_host AND p.kyc_status='VERIFIED' AND public.account_active(p.id)) AS host_fixture`, [actor, host])).rows[0];
    ensure(eligible.admin_fixture && eligible.host_fixture && actor !== host, 'dedicated active admin and verified smoke host required');
    await first.query('COMMIT');

    stage = 'create exact synthetic property fixtures';
    await begin(first);
    for (let i = 0; i < 2; i++) {
      await first.query(`INSERT INTO public.properties(id,owner_id,title,description,address,status,price_per_month,currency,latitude,longitude)
        VALUES($1,$2,$3,'Synthetic staging concurrency fixture. No real rental offer.','Synthetic staging test address','PENDING_REVIEW',300000,'RWF',-1.7,29.25)`, [propertyIds[i], host, `[admin-concurrency] ${i === 0 ? 'photo' : 'decision'} ${runTag}`]);
      await first.query('INSERT INTO public.property_images(id,property_id,url,is_cover) VALUES($1,$2,$3,true)', [imageIds[i], propertyIds[i], 'https://example.invalid/admin-concurrency-fixture.jpg']);
    }
    await first.query('COMMIT');
    created = true;

    stage = 'photo versus publication';
    const photoVersion = await readVersion(first, actor, propertyIds[0]);
    const publisherPid = await begin(first);
    const imageWriterPid = await begin(second, host);
    ensure(publisherPid !== imageWriterPid, 'two different PostgreSQL backends required');
    await first.query(mutationSql, [actor, propertyIds[0], JSON.stringify({ operation: 'publish', note: 'Synthetic photo concurrency check.' }), photoVersion, requestIds[0]]);
    pending = start(second, 'UPDATE public.property_images SET url=$2 WHERE id=$1 RETURNING id', [imageIds[0], 'https://example.invalid/admin-concurrency-changed.jpg']);
    const observedPhotoBlock = await observeBlock(first, imageWriterPid, publisherPid, pending);
    await first.query('COMMIT');
    const photoWrite = await pending.promise;
    pending = null;
    ensure(photoWrite.ok && photoWrite.result.rowCount === 1, 'host image mutation must finish after publication commits');
    await second.query('COMMIT');
    const photoState = (await first.query(`SELECT p.status,i.url,
      (SELECT count(*)::int FROM public.admin_audit_log WHERE resource='properties' AND record_id=p.id AND action='publish') AS audits
      FROM public.properties p JOIN public.property_images i ON i.property_id=p.id WHERE p.id=$1 AND i.id=$2`, [propertyIds[0], imageIds[0]])).rows[0];
    ensure(photoState.status === 'PENDING_REVIEW' && photoState.url === 'https://example.invalid/admin-concurrency-changed.jpg' && photoState.audits === 1, 'changed photograph must return the published property to review');
    record('photo_edit_serializes_with_publication', { distinctBackends: true, blockerObserved: observedPhotoBlock, imageWrites: 1, publicationAudits: photoState.audits, finalStatus: photoState.status });

    stage = 'same-version competing administrative decisions';
    const decisionVersion = await readVersion(first, actor, propertyIds[1]);
    const firstPid = await begin(first);
    const secondPid = await begin(second);
    ensure(firstPid !== secondPid, 'two different PostgreSQL backends required');
    const firstPayload = { operation: 'publish', note: 'Synthetic first concurrent decision.' };
    const committedResult = (await first.query(mutationSql, [actor, propertyIds[1], JSON.stringify(firstPayload), decisionVersion, requestIds[1]])).rows[0].data;
    pending = start(second, mutationSql, [actor, propertyIds[1], JSON.stringify({ operation: 'publish', note: 'Synthetic second concurrent decision.' }), decisionVersion, requestIds[2]]);
    const observedDecisionBlock = await observeBlock(first, secondPid, firstPid, pending);
    await first.query('COMMIT');
    const competing = await pending.promise;
    pending = null;
    ensure(!competing.ok && competing.code === 'PT409', 'second stale decision must fail with PT409');
    await second.query('ROLLBACK');
    const replay = (await first.query(mutationSql, [actor, propertyIds[1], JSON.stringify(firstPayload), decisionVersion, requestIds[1]])).rows[0].data;
    ensure(JSON.stringify(replay) === JSON.stringify(committedResult), 'same-intent replay must return the original result');
    const decisionState = (await first.query(`SELECT p.status,
      (SELECT count(*)::int FROM public.admin_audit_log WHERE resource='properties' AND record_id=p.id AND action='publish') AS audits,
      (SELECT count(*)::int FROM public.admin_requests WHERE actor_id=$2 AND request_id=ANY($3::uuid[])) AS requests
      FROM public.properties p WHERE p.id=$1`, [propertyIds[1], actor, requestIds.slice(1)])).rows[0];
    ensure(decisionState.status === 'ACTIVE' && decisionState.audits === 1 && decisionState.requests === 1, 'one decision, one audit and one idempotency row must commit');
    record('same_version_decisions_commit_once', { distinctBackends: true, blockerObserved: observedDecisionBlock, successfulDecisions: 1, rejectedDecisions: 1, rejectionCode: competing.code, publicationAudits: decisionState.audits, idempotencyRows: decisionState.requests, replayDeduplicated: true, finalStatus: decisionState.status });
  } catch (error) {
    mainError = error;
  } finally {
    // First release the holder; otherwise rollback on a connection with a queued
    // blocked query would itself wait behind that query.
    await rollback(first);
    if (pending) await pending.promise;
    await rollback(second);
    if (created) {
      const priorStage = stage;
      stage = 'cleanup exact synthetic rows';
      try {
        await begin(first);
        const owned = (await first.query("SELECT count(*)::int AS count FROM public.properties WHERE id=ANY($1::uuid[]) AND owner_id=$2 AND title LIKE '[admin-concurrency]%'", [propertyIds, host])).rows[0].count;
        ensure(owned === 2, 'cleanup ownership marker mismatch');
        await first.query('DELETE FROM public.admin_requests WHERE actor_id=$1 AND request_id=ANY($2::uuid[])', [actor, requestIds]);
        await first.query("DELETE FROM public.admin_audit_log WHERE actor_id=$1 AND resource='properties' AND record_id=ANY($2::uuid[])", [actor, propertyIds]);
        await first.query('DELETE FROM public.property_images WHERE id=ANY($1::uuid[]) AND property_id=ANY($2::uuid[])', [imageIds, propertyIds]);
        await first.query("DELETE FROM public.properties WHERE id=ANY($1::uuid[]) AND owner_id=$2 AND title LIKE '[admin-concurrency]%'", [propertyIds, host]);
        await first.query('COMMIT');
        evidence.cleanup = (await first.query(`SELECT
          (SELECT count(*)::int FROM public.properties WHERE id=ANY($1::uuid[])) AS properties,
          (SELECT count(*)::int FROM public.property_images WHERE id=ANY($2::uuid[])) AS images,
          (SELECT count(*)::int FROM public.admin_audit_log WHERE record_id=ANY($1::uuid[])) AS audit_rows,
          (SELECT count(*)::int FROM public.admin_requests WHERE actor_id=$3 AND request_id=ANY($4::uuid[])) AS request_rows`, [propertyIds, imageIds, actor, requestIds])).rows[0];
        ensure(Object.values(evidence.cleanup).every(count => count === 0), 'synthetic cleanup must leave zero rows');
        stage = priorStage;
      } catch (cleanupError) {
        await rollback(first);
        mainError = cleanupError;
      }
    }
  }
  if (mainError) throw mainError;
  evidence.passed = true;
}

function save() {
  mkdirSync(path.join(ROOT, '.expo'), { recursive: true });
  writeFileSync(path.join(ROOT, '.expo/admin-concurrency.json'), JSON.stringify(evidence, null, 2) + '\n');
  const reportDir = path.join(ROOT, '.superpowers/sdd/2026-09-30-admin');
  mkdirSync(reportDir, { recursive: true });
  const report = [
    '# Hosted PostgreSQL concurrency checks', '',
    `Date: ${evidence.timestamp}. Target: authorized staging ${EXPECTED_REF}.`, '',
    `Result: ${evidence.passed ? 'PASS' : 'FAIL'}. ${evidence.checks.length} completed concurrency checks.`, '',
    'Two distinct real PostgreSQL backends were used through the local verified database helper. Statement timeout: 15 seconds; lock timeout: 10 seconds; idle transaction timeout: 20 seconds. Blocking was observed with pg_blocking_pids before the publishing transaction committed.', '',
    ...evidence.checks.map(check => `- ${check.name}: ${JSON.stringify(check)}`), '',
    `Exact fixture cleanup counts: ${JSON.stringify(evidence.cleanup)}.`, '',
    evidence.failure ? `Failure: ${JSON.stringify(evidence.failure)}.` : 'The mobile image update waited for publication, then changed ACTIVE back to PENDING_REVIEW. Two administrative decisions using the same version yielded one commit and one PT409; one audit and one idempotency record existed before cleanup, and replay added neither.', '',
    'Only two properties titled [admin-concurrency] and their two database image rows were created. No accounts, existing client properties or storage objects were changed. All fixture property/image/audit/request rows were removed by exact generated UUIDs in finally; account rows were never deleted. No actual upload took place.', '',
    'Public evidence: .expo/admin-concurrency.json. This exercise covers hosted SQL transaction concurrency; separate parent QA covers actual MFA, Edge and R2.', '',
  ].join('\n');
  writeFileSync(path.join(reportDir, 'hosted-concurrency.md'), report);
}

async function main() {
  process.chdir(ROOT);
  const { parseEnv } = await import(pathToFileURL(path.join(ROOT, 'scripts/staging/core.mjs')).href);
  const admin = parseEnv(readFileSync(path.join(ROOT, 'scripts/staging/.env.admin.local'), 'utf8'));
  const smoke = parseEnv(readFileSync(path.join(ROOT, 'scripts/staging/.env.staging.local'), 'utf8'));
  ensure(UUID.test(admin.USER_ID || '') && UUID.test(smoke.LOCAMAP_SMOKE_HOST_ID || ''), 'dedicated fixture UUID configuration is missing');
  ensure(smoke.LOCAMAP_STAGING_PROJECT_REF === EXPECTED_REF && smoke.LOCAMAP_STAGING_URL === `https://${EXPECTED_REF}.supabase.co`, 'staging allowlist mismatch');
  const { withDb, ref } = require(HELPER);
  ensure(ref === EXPECTED_REF, 'database helper target mismatch');
  // Nested lifetimes keep both clients open while their queries run concurrently.
  await withDb(first => withDb(second => run(first, second, admin.USER_ID, smoke.LOCAMAP_SMOKE_HOST_ID)));
}

main().catch(error => {
  evidence.failure = { stage, code: /^[A-Z0-9_]{3,30}$/.test(error.code || '') ? error.code : 'CHECK_FAILED', reason: error.safeLabel || 'Bounded staging concurrency check failed; no raw database details emitted.' };
  process.exitCode = 1;
}).finally(() => {
  save();
  console.log(JSON.stringify(evidence));
});
