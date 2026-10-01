import { createClient } from '@supabase/supabase-js';
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const configured = Boolean(url && key && /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url));
export const environment = import.meta.env.VITE_APP_ENV === 'production' ? 'Production' : 'Staging';
export const invitationFlow =
  typeof window !== 'undefined' && /(?:^|[&#])type=invite(?:&|$)/.test(window.location.hash);
export const supabase = createClient(
  url || 'https://unconfigured.supabase.co',
  key || 'unconfigured',
  {
    auth: {
      storageKey: 'locamap-admin-auth',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
    },
  },
);
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
export async function api<T>(request: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new ApiError(401, 'Votre session a expiré. Reconnectez-vous.');
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(abort, 20000);
  try {
    const response = await fetch(`${url}/functions/v1/admin-api`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: key!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const messages: Record<number, string> = {
        400: 'Vérifiez les champs et le motif de cette action.',
        401: 'Votre session a expiré. Reconnectez-vous.',
        403: 'Cet accès nécessite un compte administrateur autorisé et la vérification en deux étapes.',
        404: 'Ce dossier est introuvable ou n’est plus accessible.',
        409: 'Ce dossier a changé. Actualisez-le avant de prendre une décision.',
        413: 'Le contenu dépasse la taille autorisée.',
        429: 'Trop de demandes. Patientez un instant avant de réessayer.',
        503: 'Le service est momentanément indisponible.',
      };
      throw new ApiError(
        response.status,
        messages[response.status] || 'Le serveur n’a pas pu terminer cette action.',
      );
    }
    return data as T;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}
export const errorText = (error: unknown): string =>
  error instanceof ApiError
    ? error.message
    : error instanceof Error && error.name === 'AbortError'
      ? 'Le délai de réponse est dépassé. Vérifiez le dossier avant de réessayer.'
      : 'Impossible de charger les données. Vérifiez votre connexion puis réessayez.';
