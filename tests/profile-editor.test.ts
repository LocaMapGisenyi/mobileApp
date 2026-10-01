import { expect, it } from 'vitest';
import { profileEditorPatch } from '../src/utils/profileEditor';

const fields = { name: '  Alice  ', phone: '  +250 700000000 ', bio: 'Bonjour', languages: ' Français, English, français, , Kiswahili ' };
it('personal information only updates name and phone, without clearing the photo or biography', () => {
  expect(profileEditorPatch('personal', fields)).toEqual({ full_name: 'Alice', phone_number: '+250 700000000' });
});
it('a photo-only edit does not require or overwrite a missing name', () => {
  expect(profileEditorPatch('photo', { ...fields, name: '' }, 'https://images.example/avatar.jpg')).toEqual({ avatar_url: 'https://images.example/avatar.jpg' });
  expect(profileEditorPatch('photo', fields)).toEqual({});
});
it('removing an avatar is explicit and unrelated edits preserve it', () => {
  expect(profileEditorPatch('photo', fields, null)).toEqual({ avatar_url: null });
  expect(profileEditorPatch('bio', { ...fields, bio: '  ' })).toEqual({ bio: null });
});
it('spoken languages are trimmed and deduplicated, and can be cleared', () => {
  expect(profileEditorPatch('languages', fields)).toEqual({ languages: ['Français', 'English', 'Kiswahili'] });
  expect(profileEditorPatch('languages', { ...fields, languages: '  , ' })).toEqual({ languages: [] });
});
it('requires a name for personal information and validates visible field limits', () => {
  expect(() => profileEditorPatch('all', { ...fields, name: ' ' })).toThrow('nameRequired');
  expect(() => profileEditorPatch('bio', { ...fields, bio: 'a'.repeat(2001) })).toThrow('tooLong');
});
