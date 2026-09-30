const { spawnSync } = require('node:child_process');
const { resolve } = require('node:path');

const args = process.argv.slice(2);
if (args.length % 2 !== 0) {
  console.error('Every option requires a value.');
  process.exit(1);
}
let profile;
let platform = 'android';
for (let i = 0; i < args.length; i += 2) {
  if (args[i] === '--profile') profile = args[i + 1];
  else if (args[i] === '--platform') platform = args[i + 1];
  else { console.error('Use --profile staging|preview|production and --platform android|ios.'); process.exit(1); }
}
if ((profile !== undefined && !['staging', 'preview', 'production'].includes(profile)) || !['android', 'ios'].includes(platform)) {
  console.error('Use --profile staging|preview|production and --platform android|ios.');
  process.exit(1);
}

const env = { ...process.env, EAS_BUILD_PLATFORM: platform };
if (profile) {
  env.EAS_BUILD_PROFILE = profile;
  // Preserve an explicitly supplied variant so app.config catches mismatches.
  env.APP_VARIANT ||= profile === 'production' ? 'production' : 'staging';
}
const root = resolve(__dirname, '..');
// Expo CLI --json suppresses thrown config diagnostics. Use its official resolver
// in an isolated process, retaining all raw output until it has been redacted.
const evaluate = `
  try {
    require('@expo/env').loadProjectEnv(process.cwd(), { silent: true });
    process.stdout.write(JSON.stringify(require('@expo/config').getConfig(process.cwd()).exp));
  } catch (error) {
    process.stderr.write(String(error.message));
    process.exit(1);
  }
`;
const result = spawnSync(process.execPath, ['-e', evaluate], { cwd: root, env, encoding: 'utf8' });
if (result.status !== 0) {
  const safeError = result.stderr?.match(/Native release:[^\r\n]*/)?.[0];
  console.error(safeError || 'Expo config failed; raw configuration output was withheld to protect credentials.');
  process.exit(1);
}
try {
  const config = JSON.parse(result.stdout);
  const maps = config.plugins?.find(plugin => Array.isArray(plugin) && plugin[0] === 'react-native-maps')?.[1];
  console.log(JSON.stringify({
    name: config.name,
    variant: config.extra?.appVariant,
    scheme: config.scheme,
    androidPackage: config.android?.package,
    iosBundleIdentifier: config.ios?.bundleIdentifier,
    easProjectLinked: Boolean(config.extra?.eas?.projectId),
    easOwner: config.owner || null,
    nativeMapProvider: platform === 'ios' ? 'apple' : 'google',
    androidMapsKeyConfigured: Boolean(maps?.androidGoogleMapsApiKey),
    iosMapsKeyConfigured: Boolean(maps?.iosGoogleMapsApiKey),
  }, null, 2));
} catch {
  console.error('Expo config could not be parsed; raw output was withheld to protect credentials.');
  process.exit(1);
}
