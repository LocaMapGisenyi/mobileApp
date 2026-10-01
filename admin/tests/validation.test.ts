import { describe, expect, it } from 'vitest';
import { validateDecision, normalizeError, safeImageUrl, buildFields } from '../src/validation';
describe('administrator input boundaries', () => {
  it('requires a factual note for rejection and suspension', () => {
    expect(validateDecision({ operation: 'reject', note: '' })).toBe(
      'Indiquez le motif de la décision.',
    );
    expect(validateDecision({ operation: 'suspend', note: '   ' })).toBe(
      'Indiquez le motif de la décision.',
    );
    expect(validateDecision({ operation: 'reject', note: 'Document illisible' })).toBeNull();
  });
  it('prevents an empty reply', () => {
    expect(validateDecision({ operation: 'reply', content: '  ' })).toBe(
      'Écrivez une réponse avant de l’envoyer.',
    );
  });
  it('does not expose SQL or raw authentication errors', () => {
    expect(normalizeError(new Error('Invalid login credentials'))).toBe(
      'Email ou mot de passe incorrect.',
    );
    expect(normalizeError(new Error('relation admin_members does not exist'))).toBe(
      'Impossible de terminer cette action. Réessayez ou contactez le responsable technique.',
    );
  });
  it('rejects active and insecure image URLs', () => {
    expect(safeImageUrl('javascript:alert(1)')).toBeUndefined();
    expect(safeImageUrl('http://example.org/a.jpg')).toBeUndefined();
    expect(safeImageUrl('https://example.org/a.jpg')).toBe('https://example.org/a.jpg');
  });
  it('only sends declared fields with correct primitive types', () => {
    expect(
      buildFields(
        [
          { key: 'title', label: 'Titre' },
          { key: 'read_minutes', label: 'Minutes', type: 'number' },
        ],
        { title: ' Guide ', read_minutes: '5', id: 'forged' },
      ),
    ).toEqual({ title: 'Guide', read_minutes: 5 });
    expect(() =>
      buildFields([{ key: 'read_minutes', label: 'Minutes', type: 'number' }], {
        read_minutes: 'x',
      }),
    ).toThrow('Minutes');
  });
  it('allows an incomplete private draft but requires complete publication fields', () => {
    const fields = [{ key: 'title', label: 'Titre', required: true }];
    expect(buildFields(fields, { title: '' }, false)).toEqual({ title: null });
    expect(() => buildFields(fields, { title: '' }, true)).toThrow('obligatoire');
  });
});
