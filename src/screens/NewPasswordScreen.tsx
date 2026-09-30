import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authService } from '../services/api/auth.service';
import { useUserStore } from '../store/user';
import { colors } from '../theme';

export default function NewPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (password !== confirmation || password.length < 8) { setError('Saisissez deux mots de passe identiques, de 8 caractères minimum.'); return; }
    setBusy(true); setError('');
    try {
      await authService.resetPassword('', password);
      useUserStore.setState({ passwordRecovery: false });
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Réinitialisation impossible.'); }
    finally { setBusy(false); }
  };
  return <SafeAreaView style={styles.root}><View style={styles.card}>
    <Text style={styles.title}>Nouveau mot de passe</Text>
    <Text>Choisissez un mot de passe de 8 caractères minimum.</Text>
    <TextInput style={styles.input} accessibilityLabel="Nouveau mot de passe" placeholder="Nouveau mot de passe" secureTextEntry value={password} onChangeText={setPassword} autoCapitalize="none" />
    <TextInput style={styles.input} accessibilityLabel="Confirmer le mot de passe" placeholder="Confirmer le mot de passe" secureTextEntry value={confirmation} onChangeText={setConfirmation} autoCapitalize="none" />
    {!!error && <Text accessibilityRole="alert" style={{ color: colors.error }}>{error}</Text>}
    <TouchableOpacity disabled={busy} accessibilityRole="button" style={styles.button} onPress={() => void submit()}>{busy ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white' }}>Enregistrer le mot de passe</Text>}</TouchableOpacity>
    <TouchableOpacity disabled={busy} onPress={() => { void useUserStore.getState().actions.logout().catch(failure => setError(String(failure))); }}><Text>Annuler et se déconnecter</Text></TouchableOpacity>
  </View></SafeAreaView>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: 24 }, card: { gap: 18 }, title: { fontSize: 24, fontWeight: '700', color: colors.ink }, input: { backgroundColor: colors.surface, padding: 16, borderRadius: 8, borderWidth: 1, borderColor: colors.border }, button: { backgroundColor: colors.primary, padding: 16, borderRadius: 8, alignItems: 'center' } });
