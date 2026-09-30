import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';
import { setNetworkErrorObserver } from './network';

const REPORT_COOLDOWN_MS = 60_000;
const reported = new Map<string, number>();
const codes = new Set([
  'TypeError',
  'RangeError',
  'ReferenceError',
  'NetworkTimeoutError',
  'Error',
]);
export function captureError(
  kind: 'render' | 'unhandled' | 'network' | 'startup',
  error: unknown,
  route = 'App',
): void {
  const code = error instanceof Error && codes.has(error.name) ? error.name : 'UnknownError';
  const safeRoute = /^[A-Za-z][A-Za-z0-9_]{0,59}$/.test(route) ? route : 'App';
  const key = `${kind}:${code}:${safeRoute}`;
  if (Date.now() - (reported.get(key) ?? 0) < REPORT_COOLDOWN_MS) return;
  reported.set(key, Date.now());
  const event = {
    kind,
    code,
    route: safeRoute,
    platform: Platform.OS,
    version: Constants.expoConfig?.version ?? 'unknown',
  };
  console.warn(JSON.stringify({ event: 'application_error', ...event }));
  // No message/stack/URL/user payload is transmitted; telemetry failure is never recursive.
  void (async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) await supabase.functions.invoke('report-client-error', { body: event });
  })().catch(() => {});
}
export function installGlobalDiagnostics(): () => void {
  setNetworkErrorObserver(error => captureError('network', error, 'Api'));
  const removeNetwork = () => setNetworkErrorObserver(undefined);
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const error = (event: ErrorEvent) => captureError('unhandled', event.error);
    const rejection = (event: PromiseRejectionEvent) => captureError('unhandled', event.reason);
    window.addEventListener('error', error);
    window.addEventListener('unhandledrejection', rejection);
    return () => {
      removeNetwork();
      window.removeEventListener('error', error);
      window.removeEventListener('unhandledrejection', rejection);
    };
  }
  type Handler = (error: Error, fatal?: boolean) => void;
  const utils = (
    globalThis as unknown as {
      ErrorUtils?: { getGlobalHandler(): Handler; setGlobalHandler(handler: Handler): void };
    }
  ).ErrorUtils;
  if (!utils) return removeNetwork;
  const previous = utils.getGlobalHandler();
  const handler: Handler = (error, fatal) => {
    captureError('unhandled', error);
    previous(error, fatal);
  };
  utils.setGlobalHandler(handler);
  return () => {
    removeNetwork();
    if (utils.getGlobalHandler() === handler) utils.setGlobalHandler(previous);
  };
}
