import type { Field } from './types';
export function validateDecision(payload: Record<string, unknown>): string | null {
  if (
    [
      'approve',
      'reject',
      'suspend',
      'reactivate',
      'return',
      'review',
      'freeze',
      'resolve',
      'grant',
      'revoke',
      'publish',
    ].includes(String(payload.operation)) &&
    !String(payload.note ?? '').trim()
  )
    return 'Indiquez le motif de la décision.';
  if (payload.operation === 'reply' && !String(payload.content ?? '').trim())
    return 'Écrivez une réponse avant de l’envoyer.';
  if (String(payload.note ?? '').length > 2000)
    return 'Le motif doit contenir au maximum 2 000 caractères.';
  return null;
}
export function normalizeError(error: unknown): string {
  const msg = error instanceof Error ? error.message : '';
  if (/Invalid login credentials/i.test(msg)) return 'Email ou mot de passe incorrect.';
  if (/email not confirmed/i.test(msg))
    return 'Confirmez votre adresse email avant de vous connecter.';
  if (/invalid.*(code|totp)|verification.*failed/i.test(msg))
    return 'Le code de vérification est incorrect ou a expiré.';
  if (/fetch|network|abort|timeout/i.test(msg))
    return 'La connexion a été interrompue. Vérifiez votre réseau puis réessayez.';
  return 'Impossible de terminer cette action. Réessayez ou contactez le responsable technique.';
}
export function safeImageUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? value : undefined;
  } catch {
    return undefined;
  }
}
export function buildFields(
  fields: Field[],
  values: Record<string, unknown>,
  requireComplete = true,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const f of fields) {
    const value = values[f.key];
    if (f.type === 'checkbox') {
      result[f.key] = Boolean(value);
      continue;
    }
    const text = String(value ?? '').trim();
    if (!text && f.required && requireComplete)
      throw new Error(`${f.label} : ce champ est obligatoire.`);
    if (f.type === 'number') {
      if (text && !Number.isFinite(Number(text)))
        throw new Error(`${f.label} : indiquez un nombre valide.`);
      result[f.key] = text ? Number(text) : null;
    } else {
      if (f.type === 'url' && text && !safeImageUrl(text))
        throw new Error(`${f.label} : utilisez une adresse HTTPS.`);
      result[f.key] = text || null;
    }
  }
  return result;
}
