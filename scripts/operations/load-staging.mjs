import { performance } from 'node:perf_hooks';
import { writeFile } from 'node:fs/promises';
import { loadLocalInputs } from '../staging/cli.mjs';
import { validateTarget, validateSmokeInputs, requestJson } from '../staging/core.mjs';
const args = process.argv.slice(2);
const ref = args[args.indexOf('--project-ref') + 1];
const { env, appUrl } = loadLocalInputs({});
const config = validateSmokeInputs(env, validateTarget(env, ref, appUrl));
if (!args.includes('--run')) {
  console.log(
    'Validated staging only. Add --run for 60 read requests, maximum 10 concurrent, no writes.',
  );
  process.exit(0);
}
const login = await requestJson(config, config.anonKey, '/auth/v1/token?grant_type=password', {
  method: 'POST',
  body: { email: config.accounts.guest.email, password: config.accounts.guest.password },
});
if (!login.ok || !login.data?.access_token)
  throw Error('Staging sign-in failed; response withheld.');
const token = login.data.access_token;
const stages = [];
for (const concurrency of [2, 5, 10]) {
  const durations = [];
  const statuses = {};
  let next = 0;
  const count = 20;
  const start = performance.now();
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (next++ < count) {
        const at = performance.now();
        let status = 'network';
        try {
          const response = await requestJson(
            config,
            token,
            `/rest/v1/properties?select=id,title,price_per_month,currency&status=eq.ACTIVE&limit=30`,
          );
          status = String(response.status);
        } catch {}
        durations.push(performance.now() - at);
        statuses[status] = (statuses[status] ?? 0) + 1;
      }
    }),
  );
  durations.sort((a, b) => a - b);
  stages.push({
    concurrency,
    requests: count,
    statuses,
    p50Ms: Math.round(durations[Math.floor(count * 0.5)]),
    p95Ms: Math.round(durations[Math.ceil(count * 0.95) - 1]),
    durationMs: Math.round(performance.now() - start),
  });
}
const report = {
  checkedAt: new Date().toISOString(),
  target: config.ref,
  scope: 'Bounded staging reads; not a production capacity estimate',
  stages,
};
await writeFile('.expo/readiness-load.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (stages.some(stage => Object.keys(stage.statuses).some(code => code !== '200')))
  process.exitCode = 1;
