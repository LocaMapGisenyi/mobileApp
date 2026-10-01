import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { useUserStore } from '../store/user';
import { getProfile, updateProfile } from '../services/profile.service';
import { uploadPhoto } from '../lib/storage';
import { borderRadius, colors } from '../theme';
import ContentSkeleton from '../components/ContentSkeleton';
import { useFormKeyboardScroll } from '../hooks/useFormKeyboardScroll';
import { profileEditorPatch, type ProfileFields, type ProfileSection } from '../utils/profileEditor';

const emptyFields: ProfileFields = { name: '', phone: '', bio: '', languages: '' };
type Props = { visible: boolean; onClose(): void; onSaved?(): void; section?: ProfileSection };

export default function AccountProfileEditor({ visible, onClose, onSaved, section = 'all' }: Props) {
  const { t } = useTranslation();
  const userId = useUserStore(state => state.user.id);
  const [fields, setFields] = useState<ProfileFields>(emptyFields);
  const original = useRef<ProfileFields>(emptyFields);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [avatarEdited, setAvatarEdited] = useState(false);
  const uploaded = useRef<{ uri: string; url: string } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const saving = useRef(false);
  const choosing = useRef(false);
  const generation = useRef(0);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const keyboard = useFormKeyboardScroll(visible ? attempt + 1 : 0);
  const nameRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const bioRef = useRef<TextInput>(null);
  const languagesRef = useRef<TextInput>(null);
  const ready = visible && !!userId && loadedId === userId;
  const locked = busy || picking;
  const shows = (value: ProfileSection) => section === 'all' || section === value;
  const current = (version: number) => generation.current === version && useUserStore.getState().user.id === userId;

  useEffect(() => {
    const version = ++generation.current;
    setLoadedId(null); setError(''); setPhoto(null); setAvatar(null); setAvatarEdited(false);
    setFields(emptyFields); setBusy(false); setPicking(false); saving.current = false; choosing.current = false; uploaded.current = null;
    if (visible && !userId) setError('signedOut');
    if (visible && userId) void getProfile(userId).then(profile => {
      if (version !== generation.current) return;
      if (!profile) { setError('loadError'); return; }
      const value = { name: profile.full_name ?? '', phone: profile.phone_number ?? '', bio: profile.bio ?? '', languages: (profile.languages ?? []).join(', ') };
      setFields(value); original.current = value; setAvatar(profile.avatar_url); setLoadedId(userId);
    }).catch(() => { if (version === generation.current) setError('loadError'); });
    return () => { ++generation.current; };
  }, [visible, userId, section, attempt]);

  const pickPhoto = async () => {
    if (!ready || saving.current || choosing.current) return;
    const version = generation.current;
    choosing.current = true; setPicking(true); setError('');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.85 });
      if (current(version) && !result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) { setError('photoTooLarge'); return; }
        if (asset.mimeType && !['image/jpeg', 'image/png', 'image/webp'].includes(asset.mimeType)) { setError('photoFormat'); return; }
        setPhoto(asset); setAvatarEdited(true); uploaded.current = null;
      }
    } catch { if (current(version)) setError('photoError'); }
    finally { if (current(version)) { choosing.current = false; setPicking(false); } }
  };
  const save = async () => {
    if (!ready || saving.current || choosing.current || !userId) return;
    const version = generation.current;
    saving.current = true; setBusy(true); setError('');
    try {
      const patch = profileEditorPatch(section, fields, avatarEdited && !photo ? avatar : undefined);
      if (photo && shows('photo')) {
        const cached = uploaded.current?.uri === photo.uri ? uploaded.current.url : null;
        const url = cached ?? await uploadPhoto(photo.uri, photo.mimeType || 'image/jpeg', userId, 'avatars');
        if (!current(version)) return;
        uploaded.current = { uri: photo.uri, url }; patch.avatar_url = url;
      }
      if (!current(version)) return;
      const saved = await updateProfile(userId, patch);
      if (!current(version)) return;
      useUserStore.setState(state => ({ user: { ...state.user, fullName: saved.full_name, phoneNumber: saved.phone_number, photoURL: saved.avatar_url } }));
      onSaved?.(); onClose();
    } catch (failure) {
      if (current(version)) {
        const message = failure instanceof Error ? failure.message : '';
        setError(['nameRequired', 'tooLong'].includes(message) ? message
          : message.includes('10 Mo maximum') ? 'photoTooLarge'
          : message.startsWith('Format non accepté') ? 'photoFormat' : 'saveError');
      }
    } finally { if (current(version)) { saving.current = false; setBusy(false); } }
  };
  const change = (key: keyof ProfileFields, value: string) => setFields(previous => ({ ...previous, [key]: value }));
  const fieldKeyboard = (ref: React.RefObject<TextInput | null>) => ({ onFocus: () => keyboard.onFocus(ref.current), onBlur: () => keyboard.onBlur(ref.current) });
  const dirty = avatarEdited || Object.keys(fields).some(key => fields[key as keyof ProfileFields] !== original.current[key as keyof ProfileFields]);
  const saveDisabled = !ready || locked || !dirty || (shows('personal') && !fields.name.trim());
  const photoUri = photo?.uri || avatar;

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { if (!locked) onClose(); }}>
    <SafeAreaView style={s.backdrop}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.modalContainer}>
        <View style={s.card} accessibilityViewIsModal>
          <Text accessibilityRole="header" style={s.title}>{t(`profileEditor.${section === 'all' ? 'title' : section}`)}</Text>
          <View ref={keyboard.viewportRef} collapsable={false} style={s.viewport} onLayout={keyboard.reveal}>
            <ScrollView ref={keyboard.scrollRef} contentContainerStyle={s.formContent} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
              onScroll={event => keyboard.onScroll(event.nativeEvent.contentOffset.y)} scrollEventThrottle={16}>
              {!ready && !error && <ContentSkeleton variant="form" />}
              {ready && <>
                {shows('photo') && <View style={s.photoSection}>
                  {photoUri ? <Image accessibilityLabel={t('profileEditor.photo')} source={{ uri: photoUri }} style={s.avatar} />
                    : <View style={[s.avatar, s.avatarPlaceholder]}><MaterialIcons name="person-outline" size={40} color={colors.primary} /></View>}
                  <View style={{ flex: 1, gap: 4 }}>
                    <TouchableOpacity accessibilityRole="button" disabled={locked} onPress={() => void pickPhoto()} style={s.photoButton}>
                      {picking ? <ActivityIndicator color={colors.primary} /> : <Text style={s.photoLabel}>{t('profileEditor.choosePhoto')}</Text>}
                    </TouchableOpacity>
                    {!!photoUri && <TouchableOpacity accessibilityRole="button" disabled={locked} onPress={() => { setPhoto(null); setAvatar(null); setAvatarEdited(true); uploaded.current = null; }} style={s.photoButton}>
                      <Text style={s.removeLabel}>{t('profileEditor.removePhoto')}</Text>
                    </TouchableOpacity>}
                  </View>
                </View>}
                {avatarEdited && <Text style={s.hint}>{t('profileEditor.photoHint')}</Text>}
                {shows('personal') && <>
                  <View style={s.field}><Text style={s.label}>{t('profileEditor.name')}</Text>
                    <TextInput ref={nameRef} {...fieldKeyboard(nameRef)} accessibilityLabel={t('profileEditor.name')} style={s.input} value={fields.name} onChangeText={value => change('name', value)} autoComplete="name" maxLength={100} editable={!locked} />
                  </View>
                  <View style={s.field}><Text style={s.label}>{t('profileEditor.phone')}</Text>
                    <TextInput ref={phoneRef} {...fieldKeyboard(phoneRef)} accessibilityLabel={t('profileEditor.phone')} style={s.input} value={fields.phone} onChangeText={value => change('phone', value)} keyboardType="phone-pad" autoComplete="tel" maxLength={40} editable={!locked} />
                    <Text style={s.hint}>{t('profileEditor.privateHint')}</Text>
                  </View>
                </>}
                {shows('bio') && <View style={s.field}><Text style={s.label}>{t('profileEditor.bio')}</Text>
                  <TextInput ref={bioRef} {...fieldKeyboard(bioRef)} accessibilityLabel={t('profileEditor.bio')} style={[s.input, s.bio]} value={fields.bio} onChangeText={value => change('bio', value)} multiline maxLength={2000} editable={!locked} />
                </View>}
                {shows('languages') && <View style={s.field}><Text style={s.label}>{t('profileEditor.languages')}</Text>
                  <TextInput ref={languagesRef} {...fieldKeyboard(languagesRef)} accessibilityLabel={t('profileEditor.languages')} style={s.input} value={fields.languages} onChangeText={value => change('languages', value)} maxLength={500} editable={!locked} />
                  <Text style={s.hint}>{t('profileEditor.languagesHint')}</Text>
                </View>}
              </>}
              {!!error && <Text accessibilityRole="alert" style={s.error}>{t(`profileEditor.${error}`)}</Text>}
              {!ready && error === 'loadError' && <TouchableOpacity accessibilityRole="button" onPress={() => setAttempt(value => value + 1)} style={s.photoButton}>
                <Text style={s.photoLabel}>{t('common.retry')}</Text>
              </TouchableOpacity>}
            </ScrollView>
          </View>
          <View style={s.actions}>
            <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: locked }} disabled={locked} onPress={onClose} style={s.cancelButton}>
              <Text style={s.cancelLabel}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('profileEditor.save')} accessibilityState={{ disabled: saveDisabled, busy }} disabled={saveDisabled} onPress={() => void save()} style={[s.saveButton, saveDisabled && s.disabledButton]}>
              {busy ? <ActivityIndicator color={colors.onAccent} /> : <Text style={s.saveLabel}>{t('common.save')}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#0008' }, modalContainer: { flex: 1, justifyContent: 'center', padding: 16 },
  card: { width: '100%', maxWidth: 560, maxHeight: '100%', alignSelf: 'center', backgroundColor: colors.surface, borderRadius: borderRadius.xl, overflow: 'hidden' },
  title: { padding: 20, paddingBottom: 16, fontSize: 21, lineHeight: 28, fontWeight: '700', color: colors.ink },
  viewport: { flexShrink: 1, minHeight: 0 }, formContent: { paddingHorizontal: 20, paddingBottom: 20, gap: 18 },
  field: { gap: 8 }, label: { color: colors.ink, fontSize: 14, fontWeight: '600' }, hint: { color: colors.inkSubtle, fontSize: 13, lineHeight: 19 },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, padding: 12, borderRadius: borderRadius.input, fontSize: 16, color: colors.ink },
  bio: { minHeight: 100, textAlignVertical: 'top' }, photoSection: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  avatar: { width: 80, height: 80, borderRadius: 40 }, avatarPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight },
  photoButton: { minHeight: 44, justifyContent: 'center' }, photoLabel: { color: colors.primary, fontSize: 15, fontWeight: '600' }, removeLabel: { color: colors.inkSubtle, fontSize: 14 },
  error: { color: colors.error, fontSize: 14, lineHeight: 20 }, actions: { flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: colors.border },
  cancelButton: { minHeight: 48, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' }, cancelLabel: { color: colors.inkMid, fontSize: 15, fontWeight: '600' },
  saveButton: { flex: 1, minHeight: 48, backgroundColor: colors.accent, padding: 12, borderRadius: borderRadius.button, alignItems: 'center', justifyContent: 'center' },
  saveLabel: { color: colors.onAccent, fontSize: 15, fontWeight: '600' }, disabledButton: { opacity: 0.5 },
});
