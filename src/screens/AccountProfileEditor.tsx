import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useUserStore } from '../store/user';
import { getProfile, updateProfile } from '../services/profile.service';
import { uploadPhoto } from '../lib/storage';
import { borderRadius, colors } from '../theme';

export default function AccountProfileEditor({ visible, onClose }: { visible: boolean; onClose(): void }) {
  const userId = useUserStore(state => state.user.id);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [languages, setLanguages] = useState('');
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    setReady(false); setError(''); setPhoto(null);
    setName(''); setPhone(''); setBio(''); setLanguages('');
    if (visible && !userId) setError('Connectez-vous pour modifier votre profil.');
    if (visible && userId) void getProfile(userId).then(profile => {
      if (!active) return;
      if (!profile) { setError('Profil introuvable. Veuillez réessayer plus tard.'); return; }
      setName(profile.full_name ?? ''); setPhone(profile.phone_number ?? ''); setBio(profile.bio ?? '');
      setLanguages((profile.languages ?? []).join(', ')); setReady(true);
    }).catch(failure => { if (active) setError(failure instanceof Error ? failure.message : 'Profil indisponible.'); });
    return () => { active = false; };
  }, [visible, userId]);
  const pickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.85 });
      if (!result.canceled) setPhoto(result.assets[0]);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Accès aux photos impossible.'); }
  };
  const save = async () => {
    if (!userId || !name.trim() || !ready || saving.current) return;
    saving.current = true;
    setBusy(true); setError('');
    try {
      const avatar = photo ? await uploadPhoto(photo.uri, photo.mimeType || 'image/jpeg', userId, 'avatars') : undefined;
      if (useUserStore.getState().user.id !== userId) throw new Error('Le compte actif a changé.');
      await updateProfile(userId, { full_name: name.trim(), phone_number: phone.trim() || null,
        bio: bio.trim() || null, languages: languages.split(',').map(language => language.trim()).filter(Boolean), ...(avatar ? { avatar_url: avatar } : {}) });
      await useUserStore.getState().actions.fetchCurrentUser();
      onClose();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Profil non enregistré.'); }
    finally { saving.current = false; setBusy(false); }
  };
  const saveDisabled = !ready || busy || !name.trim();
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { if (!busy) onClose(); }}>
    <SafeAreaView style={styles.backdrop}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalContainer}>
        <View style={styles.card} accessibilityViewIsModal>
          <Text accessibilityRole="header" style={styles.title}>Mon profil</Text>
          <ScrollView style={styles.form} contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
            {!ready && !error && <ActivityIndicator accessibilityLabel="Chargement du profil" color={colors.primary} />}
            {ready && <>
              <View style={styles.field}>
                <Text style={styles.label}>Nom complet</Text>
                <TextInput accessibilityLabel="Nom complet" style={styles.input} value={name} onChangeText={setName} autoComplete="name" editable={!busy} />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Téléphone privé</Text>
                <TextInput accessibilityLabel="Téléphone privé" style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" editable={!busy} />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Présentation publique</Text>
                <TextInput accessibilityLabel="Présentation publique" style={[styles.input, styles.bio]} value={bio} onChangeText={setBio} multiline maxLength={2000} editable={!busy} />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Langues, séparées par des virgules</Text>
                <TextInput accessibilityLabel="Langues" style={styles.input} value={languages} onChangeText={setLanguages} editable={!busy} />
              </View>
              <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => void pickPhoto()} style={styles.photoButton}>
                <Text style={styles.photoLabel}>{photo ? 'Photo sélectionnée' : 'Choisir une photo de profil'}</Text>
              </TouchableOpacity>
            </>}
            {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          </ScrollView>
          <View style={styles.actions}>
            <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={onClose} style={styles.cancelButton}>
              <Text style={styles.cancelLabel}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Enregistrer le profil" accessibilityState={{ disabled: saveDisabled, busy }} disabled={saveDisabled} onPress={() => void save()} style={[styles.saveButton, saveDisabled && styles.disabledButton]}>
              {busy ? <ActivityIndicator color={colors.onAccent} /> : <Text style={styles.saveLabel}>Enregistrer</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#0008' },
  modalContainer: { flex: 1, justifyContent: 'center', padding: 16 },
  card: { width: '100%', maxWidth: 560, maxHeight: '100%', alignSelf: 'center', backgroundColor: colors.surface, borderRadius: borderRadius.xl, overflow: 'hidden' },
  title: { padding: 20, paddingBottom: 16, fontSize: 21, fontWeight: '700', color: colors.ink },
  form: { flexShrink: 1 },
  formContent: { paddingHorizontal: 20, paddingBottom: 20, gap: 16 },
  field: { gap: 6 },
  label: { color: colors.inkMid, fontSize: 14 },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, padding: 12, borderRadius: borderRadius.input, fontSize: 16, color: colors.ink },
  bio: { minHeight: 88, textAlignVertical: 'top' },
  photoButton: { minHeight: 44, justifyContent: 'center' },
  photoLabel: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  error: { color: colors.error, fontSize: 14 },
  actions: { flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: colors.border },
  cancelButton: { minHeight: 48, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  cancelLabel: { color: colors.inkMid, fontSize: 15, fontWeight: '600' },
  saveButton: { flex: 1, minHeight: 48, backgroundColor: colors.accent, padding: 12, borderRadius: borderRadius.button, alignItems: 'center', justifyContent: 'center' },
  saveLabel: { color: colors.onAccent, fontSize: 15, fontWeight: '600' },
  disabledButton: { opacity: 0.5 },
});
