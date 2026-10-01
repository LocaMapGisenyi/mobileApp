import type { Tables } from '../types/database';

export type ProfileSection = 'all' | 'personal' | 'photo' | 'bio' | 'languages';
export type ProfileFields = { name: string; phone: string; bio: string; languages: string };
type Patch = Partial<Pick<Tables<'profiles'>, 'full_name' | 'phone_number' | 'avatar_url' | 'bio' | 'languages'>>;

/** Write only the displayed section so a photo or biography edit cannot clear private details. */
export function profileEditorPatch(section: ProfileSection, fields: ProfileFields, avatar?: string | null): Patch {
  const patch: Patch = {};
  if (section === 'all' || section === 'personal') {
    if (!fields.name.trim()) throw new Error('nameRequired');
    if (fields.name.trim().length > 100 || fields.phone.trim().length > 40) throw new Error('tooLong');
    patch.full_name = fields.name.trim();
    patch.phone_number = fields.phone.trim() || null;
  }
  if (section === 'all' || section === 'bio') {
    if (fields.bio.length > 2000) throw new Error('tooLong');
    patch.bio = fields.bio.trim() || null;
  }
  if (section === 'all' || section === 'languages') {
    if (fields.languages.length > 500) throw new Error('tooLong');
    const seen = new Set<string>();
    patch.languages = fields.languages.split(',').map(value => value.trim()).filter(value => {
      const key = value.toLocaleLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key); return true;
    });
  }
  if ((section === 'all' || section === 'photo') && avatar !== undefined) patch.avatar_url = avatar;
  return patch;
}
