const fs = require('node:fs');
const path = require('node:path');
const helper = path.join(process.env.LOCALAPPDATA, 'LocaMap', 'staging-tools', 'database.cjs');
const { withDb, ref } = require(helper);
if (ref !== 'uwoesteqkprwitnhfmes') throw new Error('Unexpected staging helper');
const command = process.argv[2];
withDb(async db => {
  if (command === 'inspect') {
    const history = await db.query('SELECT version FROM supabase_migrations.schema_migrations ORDER BY version');
    const counts = await db.query('SELECT (SELECT count(*) FROM auth.users)::int accounts,(SELECT count(*) FROM public.properties)::int properties');
    console.log(JSON.stringify({ history: history.rows, counts: counts.rows[0] }));
  } else if (command === 'snapshot') {
    // Schema only; real account documents/data are excluded from this review artifact.
    const definitions = await db.query("SELECT p.oid::regprocedure::text name,pg_get_functiondef(p.oid) definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prokind='f'");
    fs.writeFileSync('.expo/pre-admin-functions.json', JSON.stringify(definitions.rows));
    console.log('Pre-admin function definitions saved in ignored workspace.');
  } else throw new Error('Expected inspect or snapshot');
}).catch(() => { console.error('Staging database operation failed; no credentials displayed.'); process.exitCode = 1; });
