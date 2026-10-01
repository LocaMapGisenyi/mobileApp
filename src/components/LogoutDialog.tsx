import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Button, Dialog, Portal } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme';
import AppLogo from './AppLogo';

interface Props {
  visible: boolean;
  busy: boolean;
  error: string;
  onCancel(): void;
  onConfirm(): void;
}

export default function LogoutDialog({ visible, busy, error, onCancel, onConfirm }: Props) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  return <Portal>
    <Dialog visible={visible} dismissable={!busy} dismissableBackButton={!busy} onDismiss={onCancel}
      style={[s.dialog, { width: Math.min(400, width - 40) }]}>
      <Dialog.Content style={s.content}>
        <AppLogo size={88} style={s.logo} />
        <Text accessibilityRole="header" style={s.title}>{t('profile.logoutConfirmTitle')}</Text>
        <Text style={s.message}>{t('profile.logoutConfirmMessage')}</Text>
        {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
        <View style={s.actions}>
          <Button mode="contained" buttonColor={colors.accent} textColor={colors.onAccent}
            loading={busy} disabled={busy} onPress={onConfirm} style={s.button}
            contentStyle={s.buttonContent} labelStyle={s.buttonLabel}>
            {t(busy ? 'profile.loggingOut' : 'profile.logoutAction')}
          </Button>
          <Button mode="outlined" textColor={colors.ink} disabled={busy} onPress={onCancel}
            style={[s.button, s.cancel]} contentStyle={s.buttonContent} labelStyle={s.buttonLabel}>
            {t('common.cancel')}
          </Button>
        </View>
      </Dialog.Content>
    </Dialog>
  </Portal>;
}

const s = StyleSheet.create({
  dialog: { alignSelf: 'center', marginHorizontal: 20, borderRadius: 20, backgroundColor: colors.surface },
  content: { paddingTop: 24, paddingHorizontal: 24, paddingBottom: 24 },
  logo: { alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700', color: colors.ink, marginBottom: 10 },
  message: { fontSize: 16, lineHeight: 24, color: colors.inkSubtle },
  error: { fontSize: 14, lineHeight: 20, color: colors.error, marginTop: 16 },
  actions: { marginTop: 24, gap: 10 },
  button: { borderRadius: 12 },
  buttonContent: { minHeight: 50 },
  buttonLabel: { fontSize: 16, lineHeight: 22, fontWeight: '600', marginHorizontal: 12 },
  cancel: { borderColor: colors.borderMid },
});
