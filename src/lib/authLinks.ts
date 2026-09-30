import { Linking, Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { createURL } from 'expo-linking';
import { supabase } from './supabase';
import { useUserStore } from '../store/user';

export function authRedirectUrl(): string {
  const configured = process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL;
  if (configured) return configured;
  if (Platform.OS === 'web' && typeof window !== 'undefined') return `${window.location.origin}/auth/recovery`;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return createURL('auth/recovery');
  const configuredScheme = Constants.expoConfig?.scheme;
  const scheme = (Array.isArray(configuredScheme) ? configuredScheme[0] : configuredScheme) || 'locamap';
  return `${scheme}://auth/recovery`;
}
let lastHandledUrl: string | null = null;
export async function handleAuthUrl(raw: string): Promise<void> {
  const url = new URL(raw);
  const expected = new URL(authRedirectUrl());
  if (url.protocol !== expected.protocol || url.host !== expected.host || url.pathname !== expected.pathname) return;
  if (raw === lastHandledUrl) return;
  const params = new URLSearchParams(url.hash.slice(1));
  url.searchParams.forEach((value, key) => params.set(key, value));
  const error = params.get('error_description') || params.get('error');
  if (error) throw new Error(error);
  const code = params.get('code');
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (!code && (!accessToken || !refreshToken)) return;
  const result = code ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.setSession({ access_token: accessToken!, refresh_token: refreshToken! });
  if (result.error) throw result.error;
  if (!result.data.session) throw new Error('Lien expiré. Demandez un nouveau lien de réinitialisation.');
  useUserStore.setState({ passwordRecovery: true });
  lastHandledUrl = raw;
  if (Platform.OS === 'web' && typeof window !== 'undefined') window.history.replaceState({}, '', url.pathname);
}
export function installAuthLinkListener(): () => void {
  const handle = (url: string) => { void handleAuthUrl(url).catch(error => useUserStore.setState({ error: error instanceof Error ? error.message : 'Lien de connexion invalide.' })); };
  const listener = Linking.addEventListener('url', event => handle(event.url));
  void Linking.getInitialURL().then(url => { if (url) handle(url); }).catch(error => useUserStore.setState({ error: String(error) }));
  return () => listener.remove();
}
