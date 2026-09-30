import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConfigContext } from 'expo/config';
import { Buffer } from 'node:buffer';
import { spawnSync } from 'node:child_process';
import nativeConfig from '../app.config';

const variables = [
  'APP_VARIANT', 'EAS_BUILD_PROFILE', 'EAS_BUILD_PLATFORM', 'EAS_PROJECT_ID', 'EAS_OWNER',
  'ANDROID_PACKAGE', 'IOS_BUNDLE_IDENTIFIER', 'SUPABASE_STAGING_PROJECT_REF',
  'SUPABASE_PRODUCTION_PROJECT_REF', 'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY', 'EXPO_PUBLIC_GOOGLE_MAPS_API_KEY',
  'GOOGLE_MAPS_ANDROID_API_KEY', 'GOOGLE_MAPS_IOS_API_KEY',
  'EXPO_PUBLIC_AUTH_REDIRECT_URL',
];
const context = {
  config: {
    name: 'LocaMap', slug: 'LocaMap',
    android: { edgeToEdgeEnabled: true, config: { googleMaps: { apiKey: 'old-key' } } },
    ios: { supportsTablet: true }, extra: { existing: true },
  },
} as ConfigContext;
const stageRef = 'abcdefghijklmnopqrst';
const productionRef = 'uvwxyzabcdefghijklmn';

function release(variant: 'staging' | 'production' = 'staging') {
  vi.stubEnv('APP_VARIANT', variant);
  vi.stubEnv('EAS_BUILD_PLATFORM', 'android');
  vi.stubEnv('EAS_PROJECT_ID', '11111111-1111-4111-8111-111111111111');
  vi.stubEnv('EAS_OWNER', 'test-owner');
  vi.stubEnv('SUPABASE_STAGING_PROJECT_REF', stageRef);
  vi.stubEnv('SUPABASE_PRODUCTION_PROJECT_REF', productionRef);
  vi.stubEnv('EXPO_PUBLIC_SUPABASE_URL', `https://${variant === 'staging' ? stageRef : productionRef}.supabase.co`);
  vi.stubEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY', 'sb_publishable_test-only-key');
  vi.stubEnv('EXPO_PUBLIC_GOOGLE_MAPS_API_KEY', `AIza${'a'.repeat(35)}`);
  vi.stubEnv('GOOGLE_MAPS_ANDROID_API_KEY', `AIza${'b'.repeat(35)}`);
  vi.stubEnv('GOOGLE_MAPS_IOS_API_KEY', `AIza${'c'.repeat(35)}`);
}

beforeEach(() => variables.forEach(name => vi.stubEnv(name, undefined)));
afterEach(() => vi.unstubAllEnvs());

describe('native release isolation', () => {
  it('allows ordinary local Expo use without release credentials', () => {
    const config = nativeConfig(context);
    expect(config).toMatchObject({ name: 'LocaMap', scheme: 'locamap', ios: { bundleIdentifier: 'com.locamap.app' }, android: { package: 'com.locamap.app' } });
  });

  it('installs staging beside production and uses a separate recovery scheme', () => {
    release();
    const config = nativeConfig(context);
    expect(config).toMatchObject({
      name: 'LocaMap Staging', scheme: 'locamap-staging', owner: 'test-owner',
      ios: { bundleIdentifier: 'com.locamap.app.staging', supportsTablet: true },
      android: { package: 'com.locamap.app.staging', edgeToEdgeEnabled: true },
      extra: { existing: true, appVariant: 'staging', eas: { projectId: '11111111-1111-4111-8111-111111111111' } },
    });
  });

  it('retains production identity and suffixes explicit base identifiers for staging', () => {
    release('production');
    expect(nativeConfig(context)).toMatchObject({ name: 'LocaMap', scheme: 'locamap', android: { package: 'com.locamap.app' } });
    release();
    vi.stubEnv('ANDROID_PACKAGE', 'rw.example.locamap');
    vi.stubEnv('IOS_BUNDLE_IDENTIFIER', 'rw.example.locamap');
    expect(nativeConfig(context)).toMatchObject({ android: { package: 'rw.example.locamap.staging' }, ios: { bundleIdentifier: 'rw.example.locamap.staging' } });
  });

  it('refuses a staging build pointed at the production database', () => {
    release();
    vi.stubEnv('EXPO_PUBLIC_SUPABASE_URL', `https://${productionRef}.supabase.co`);
    expect(() => nativeConfig(context)).toThrow(/EXPO_PUBLIC_SUPABASE_URL/);
  });

  it.each([
    `http://${stageRef}.supabase.co`, `https://${stageRef}.supabase.co.evil.example`,
    `https://${stageRef}.supabase.co/private`, `https://${stageRef}.supabase.co?token=private`,
    `https://user:private@${stageRef}.supabase.co`,
  ])('refuses an altered Supabase endpoint', url => {
    release();
    vi.stubEnv('EXPO_PUBLIC_SUPABASE_URL', url);
    expect(() => nativeConfig(context)).toThrow(/EXPO_PUBLIC_SUPABASE_URL/);
  });

  it('requires separate staging and production database identities', () => {
    release();
    vi.stubEnv('SUPABASE_PRODUCTION_PROJECT_REF', stageRef);
    expect(() => nativeConfig(context)).toThrow(/distinct/);
  });

  it('permits staging preparation before the production project is allocated', () => {
    release();
    vi.stubEnv('SUPABASE_PRODUCTION_PROJECT_REF', undefined);
    expect(nativeConfig(context).android?.package).toBe('com.locamap.app.staging');
  });

  it.each(['EAS_PROJECT_ID', 'EAS_OWNER', 'SUPABASE_STAGING_PROJECT_REF', 'EXPO_PUBLIC_SUPABASE_ANON_KEY'])('refuses release without %s', variable => {
    release();
    vi.stubEnv(variable, undefined);
    expect(() => nativeConfig(context)).toThrow(variable);
  });

  it('accepts EAS linkage saved in app config instead of environment', () => {
    release();
    vi.stubEnv('EAS_PROJECT_ID', undefined);
    vi.stubEnv('EAS_OWNER', undefined);
    const config = nativeConfig({ ...context, config: { ...context.config, owner: 'actual-owner', extra: { eas: { projectId: '22222222-2222-4222-8222-222222222222' } } } });
    expect(config.owner).toBe('actual-owner');
    expect(config.extra?.eas.projectId).toBe('22222222-2222-4222-8222-222222222222');
  });

  it('requires the Google Maps key for Android builds', () => {
    release();
    const variable = 'GOOGLE_MAPS_ANDROID_API_KEY';
    vi.stubEnv(variable, undefined);
    expect(() => nativeConfig(context)).toThrow(variable);
  });

  it('configures Google Maps only for Android and does not expose keys in extra', () => {
    release();
    const config = nativeConfig(context);
    expect(config.android?.config?.googleMaps).toBeUndefined();
    expect(config.plugins).toContainEqual(['react-native-maps', {
      androidGoogleMapsApiKey: `AIza${'b'.repeat(35)}`,
    }]);
    expect(JSON.stringify(config.extra)).not.toContain('AIza');
  });

  it('builds iPhone Apple Maps without either Google native key', () => {
    release();
    vi.stubEnv('EAS_BUILD_PLATFORM', 'ios');
    vi.stubEnv('GOOGLE_MAPS_ANDROID_API_KEY', undefined);
    vi.stubEnv('GOOGLE_MAPS_IOS_API_KEY', undefined);
    expect(nativeConfig(context).plugins).toContainEqual(['react-native-maps', {}]);
  });

  it('allows Expo Go staging without native Maps keys', () => {
    release();
    vi.stubEnv('EAS_BUILD_PLATFORM', undefined);
    vi.stubEnv('GOOGLE_MAPS_ANDROID_API_KEY', undefined);
    vi.stubEnv('GOOGLE_MAPS_IOS_API_KEY', undefined);
    expect(nativeConfig(context).plugins).toContainEqual(['react-native-maps', {}]);
  });

  it.each(['ios', 'android'])('does not require the other platform key for a %s build', platform => {
    release();
    vi.stubEnv('EAS_BUILD_PLATFORM', platform);
    vi.stubEnv(platform === 'ios' ? 'GOOGLE_MAPS_ANDROID_API_KEY' : 'GOOGLE_MAPS_IOS_API_KEY', undefined);
    expect(nativeConfig(context).name).toBe('LocaMap Staging');
  });

  it.each([
    ['APP_VARIANT', 'typo'], ['EAS_PROJECT_ID', 'not-a-uuid'],
    ['ANDROID_PACKAGE', 'invalid'], ['IOS_BUNDLE_IDENTIFIER', 'invalid bundle'],
    ['GOOGLE_MAPS_ANDROID_API_KEY', 'invalid-google-key'],
    ['EXPO_PUBLIC_SUPABASE_ANON_KEY', 'sb_secret_private-key'],
  ])('refuses malformed or unsafe %s without echoing its value', (variable, value) => {
    release();
    vi.stubEnv(variable, value);
    expect(() => nativeConfig(context)).toThrow(variable);
    try { nativeConfig(context); } catch (error) { expect(String(error)).not.toContain(value); }
  });

  it('rejects a service role JWT in the public client configuration', () => {
    release();
    vi.stubEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY', `header.${Buffer.from(JSON.stringify({ role: 'service_role', ref: stageRef })).toString('base64url')}.signature`);
    expect(() => nativeConfig(context)).toThrow(/EXPO_PUBLIC_SUPABASE_ANON_KEY/);
  });

  it('rejects a legacy anon JWT from the other Supabase project', () => {
    release();
    vi.stubEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY', `header.${Buffer.from(JSON.stringify({ role: 'anon', ref: productionRef })).toString('base64url')}.signature`);
    expect(() => nativeConfig(context)).toThrow(/EXPO_PUBLIC_SUPABASE_ANON_KEY/);
  });

  it('rejects the production recovery URL in staging', () => {
    release();
    vi.stubEnv('EXPO_PUBLIC_AUTH_REDIRECT_URL', 'locamap://auth/recovery');
    expect(() => nativeConfig(context)).toThrow(/EXPO_PUBLIC_AUTH_REDIRECT_URL/);
  });

  it.each(['preview', 'staging', 'production'])('does not silently fall back to local config for EAS profile %s', profile => {
    vi.stubEnv('EAS_BUILD_PROFILE', profile);
    expect(() => nativeConfig(context)).toThrow(/APP_VARIANT/);
  });

  it('rejects a profile and variant mismatch', () => {
    release();
    vi.stubEnv('EAS_BUILD_PROFILE', 'production');
    expect(() => nativeConfig(context)).toThrow(/APP_VARIANT/);
  });

  it('resolves the real Expo release config while redacting key values from its report', () => {
    release();
    const result = spawnSync(process.execPath, ['scripts/verify-native-config.cjs', '--profile', 'staging'], {
      encoding: 'utf8', env: { ...process.env, EXPO_NO_DOTENV: '1' },
    });
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      name: 'LocaMap Staging', androidPackage: 'com.locamap.app.staging',
      easProjectLinked: true,
    });
    expect(result.stdout + result.stderr).not.toContain('sb_publishable_test-only-key');
    expect(result.stdout + result.stderr).not.toContain(`AIza${'a'.repeat(35)}`);
    expect(result.stdout + result.stderr).not.toContain(`AIza${'b'.repeat(35)}`);
    expect(result.stdout + result.stderr).not.toContain(`AIza${'c'.repeat(35)}`);
  });

  it('reports the missing release setting without leaking the other Expo configuration values', () => {
    release();
    vi.stubEnv('SUPABASE_STAGING_PROJECT_REF', undefined);
    const result = spawnSync(process.execPath, ['scripts/verify-native-config.cjs', '--profile', 'staging'], {
      encoding: 'utf8', env: { ...process.env, EXPO_NO_DOTENV: '1' },
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('SUPABASE_STAGING_PROJECT_REF');
    expect(result.stdout + result.stderr).not.toContain('sb_publishable_test-only-key');
    expect(result.stdout + result.stderr).not.toContain(`AIza${'a'.repeat(35)}`);
  });
});
