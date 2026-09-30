import type { ConfigContext, ExpoConfig } from 'expo/config';
import { Buffer } from 'node:buffer';

// Keep validation in this file: Expo evaluates app.config.ts before Metro runs.
function requireValue(name: string, fallback?: string): string {
  const value = process.env[name]?.trim() || fallback;
  if (!value) throw new Error(`Native release: ${name} is required.`);
  return value;
}

function mapsKey(name: string, required: boolean): string | undefined {
  const value = process.env[name]?.trim();
  if (!value && !required) return undefined;
  if (!value) throw new Error(`Native release: ${name} is required.`);
  if (!/^AIza[A-Za-z0-9_-]{35}$/.test(value)) throw new Error(`Native release: ${name} must be a Google Maps API key.`);
  return value;
}

function validateSupabase(variant: 'staging' | 'production') {
  const selectedName = variant === 'staging' ? 'SUPABASE_STAGING_PROJECT_REF' : 'SUPABASE_PRODUCTION_PROJECT_REF';
  const otherName = variant === 'staging' ? 'SUPABASE_PRODUCTION_PROJECT_REF' : 'SUPABASE_STAGING_PROJECT_REF';
  const ref = requireValue(selectedName);
  if (!/^[a-z0-9]{20}$/.test(ref)) throw new Error(`Native release: ${selectedName} must be a Supabase project reference.`);
  if (ref === process.env[otherName]?.trim()) throw new Error('Native release: staging and production Supabase references must be distinct.');
  const url = requireValue('EXPO_PUBLIC_SUPABASE_URL');
  if (url !== `https://${ref}.supabase.co` && url !== `https://${ref}.supabase.co/`) {
    throw new Error(`Native release: EXPO_PUBLIC_SUPABASE_URL must match ${selectedName} exactly.`);
  }
  const key = requireValue('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  let isPublic = /^sb_publishable_[A-Za-z0-9_-]+$/.test(key);
  if (!isPublic) {
    try {
      const parts = key.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
      isPublic = parts.length === 3 && payload.role === 'anon' && payload.ref === ref;
    } catch { /* A malformed or server-only key must never enter a native release. */ }
  }
  if (!isPublic) throw new Error('Native release: EXPO_PUBLIC_SUPABASE_ANON_KEY must be the selected project public publishable key or anon JWT.');
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const variant = process.env.APP_VARIANT || undefined;
  if (variant !== undefined && variant !== 'staging' && variant !== 'production') {
    throw new Error('Native release: APP_VARIANT must be staging or production.');
  }
  const profile = process.env.EAS_BUILD_PROFILE;
  const expectedVariant = profile === 'production' ? 'production' : ['staging', 'preview'].includes(profile ?? '') ? 'staging' : undefined;
  if (expectedVariant && variant !== expectedVariant) {
    throw new Error('Native release: APP_VARIANT does not match EAS_BUILD_PROFILE.');
  }
  const staging = variant === 'staging';
  const scheme = staging ? 'locamap-staging' : 'locamap';
  const androidBase = process.env.ANDROID_PACKAGE?.trim() || 'com.locamap.app';
  const iosBase = process.env.IOS_BUNDLE_IDENTIFIER?.trim() || 'com.locamap.app';
  const projectId = process.env.EAS_PROJECT_ID?.trim() || config.extra?.eas?.projectId;
  const owner = process.env.EAS_OWNER?.trim() || config.owner;
  const { googleMaps: _googleMaps, ...androidConfig } = config.android?.config ?? {};

  if (variant === 'staging' || variant === 'production') {
    requireValue('EAS_PROJECT_ID', projectId);
    requireValue('EAS_OWNER', owner);
    if (typeof projectId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId)) {
      throw new Error('Native release: EAS_PROJECT_ID must be the actual EAS project UUID.');
    }
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(owner!)) throw new Error('Native release: EAS_OWNER must be an Expo account or organization.');
    if (!/^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/.test(androidBase)) throw new Error('Native release: ANDROID_PACKAGE must be a valid application ID.');
    if (!/^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/.test(iosBase)) throw new Error('Native release: IOS_BUNDLE_IDENTIFIER must be a valid bundle identifier.');
    validateSupabase(variant);
    const redirect = process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL;
    if (redirect && redirect !== `${scheme}://auth/recovery`) {
      throw new Error('Native release: EXPO_PUBLIC_AUTH_REDIRECT_URL must use the selected native recovery scheme.');
    }
  }

  // iOS uses Apple Maps without a Google key. Signed Android builds need their
  // restricted key from EAS or an ignored local env file.
  const nativeBuild = Boolean(variant && (profile || process.env.EAS_BUILD_PLATFORM));
  const platform = process.env.EAS_BUILD_PLATFORM;
  const androidMapsKey = mapsKey('GOOGLE_MAPS_ANDROID_API_KEY', nativeBuild && platform !== 'ios');
  const plugins = (config.plugins ?? []).filter(plugin => (Array.isArray(plugin) ? plugin[0] : plugin) !== 'react-native-maps');

  return {
    ...config,
    name: staging ? 'LocaMap Staging' : 'LocaMap',
    slug: config.slug || 'LocaMap',
    scheme,
    plugins: [...plugins, ['react-native-maps', {
      ...(androidMapsKey ? { androidGoogleMapsApiKey: androidMapsKey } : {}),
    }]],
    ...(owner ? { owner } : {}),
    extra: {
      ...config.extra,
      appVariant: variant ?? 'local',
      ...(projectId ? { eas: { ...config.extra?.eas, projectId } } : {}),
    },
    ios: { ...config.ios, bundleIdentifier: `${iosBase}${staging ? '.staging' : ''}` },
    android: {
      ...config.android,
      package: `${androidBase}${staging ? '.staging' : ''}`,
      config: androidConfig,
    },
  };
};
