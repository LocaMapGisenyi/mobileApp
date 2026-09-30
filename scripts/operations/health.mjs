import { performance } from 'node:perf_hooks';
export async function checkHealth(url, key) {
  const target = new URL(url);
  if (
    target.protocol !== 'https:' ||
    !target.hostname.endsWith('.supabase.co') ||
    target.pathname !== '/functions/v1/health'
  )
    throw Error('Use the exact HTTPS Supabase health endpoint.');
  const started = performance.now();
  const response = await fetch(target, {
    method: 'GET',
    redirect: 'error',
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    signal: globalThis.AbortSignal.timeout(25_000),
  });
  if (!response.ok) throw Error(`Health check failed (HTTP ${response.status}).`);
  const body = await response.json();
  if (body.status !== 'ok') throw Error('Health response is unavailable.');
  return {
    status: 'ok',
    durationMs: Math.round(performance.now() - started),
    checkedAt: new Date().toISOString(),
  };
}
if (process.argv[1]?.replaceAll('\\', '/').endsWith('/operations/health.mjs')) {
  try {
    console.log(
      JSON.stringify(
        await checkHealth(
          process.env.LOCAMAP_HEALTH_URL ?? '',
          process.env.LOCAMAP_HEALTH_ANON_KEY ?? '',
        ),
      ),
    );
  } catch {
    console.error('Health check failed. Verify the endpoint, gateway key and service status.');
    process.exitCode = 1;
  }
}
