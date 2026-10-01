import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme';

type Icon = React.ComponentProps<typeof MaterialIcons>['name'];

export function HostPage({ children, scroll = true, bottomSafe = true }: {
  children: React.ReactNode; scroll?: boolean; bottomSafe?: boolean;
}) {
  return <SafeAreaView style={s.page} edges={bottomSafe ? ['top', 'left', 'right', 'bottom'] : ['top', 'left', 'right']}>
    {scroll ? <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={s.content}>
      {children}
    </ScrollView> : <View style={s.flex}>{children}</View>}
  </SafeAreaView>;
}

export function HostHeader({ title, subtitle, onBack, action }: {
  title: string; subtitle?: string; onBack?: () => void; action?: React.ReactNode;
}) {
  const { t } = useTranslation();
  return <View style={s.header}>
    {onBack && <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={onBack}
      style={({ pressed }) => [s.iconButton, pressed && s.pressed]}>
      <MaterialIcons name="arrow-back" size={24} color={colors.ink} />
    </Pressable>}
    <View style={s.flex}>
      <Text accessibilityRole="header" style={s.title}>{title}</Text>
      {!!subtitle && <Text style={[s.muted, { marginTop: 6 }]}>{subtitle}</Text>}
    </View>
    {action}
  </View>;
}

export function HostButton({ label, onPress, variant = 'primary', busy = false, disabled = false, icon }: {
  label: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  busy?: boolean; disabled?: boolean; icon?: Icon;
}) {
  const blocked = busy || disabled;
  const color = variant === 'danger' ? colors.error : colors.ink;
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: blocked, busy }}
    disabled={blocked} onPress={onPress} style={({ pressed }) => [s.button,
      variant === 'primary' ? s.primaryButton : variant === 'quiet' ? s.quietButton : s.secondaryButton,
      variant === 'danger' && { borderColor: colors.error }, blocked && s.disabled, pressed && s.pressed]}>
    {busy ? <ActivityIndicator size="small" color={color} /> : icon ? <MaterialIcons name={icon} size={20} color={color} /> : null}
    <Text style={[s.buttonLabel, { color }]}>{label}</Text>
  </Pressable>;
}

export function HostNotice({ message, tone = 'error', onRetry }: {
  message: string; tone?: 'error' | 'success' | 'info'; onRetry?: () => void;
}) {
  const { t } = useTranslation();
  const color = tone === 'error' ? colors.error : colors.primaryDark;
  return <View accessibilityRole={tone === 'error' ? 'alert' : undefined} accessibilityLiveRegion="polite"
    style={[s.notice, { backgroundColor: tone === 'error' ? '#FFF2EF' : colors.primaryLight }]}>
    <MaterialIcons name={tone === 'error' ? 'error-outline' : tone === 'success' ? 'check-circle-outline' : 'info-outline'} size={21} color={color} />
    <View style={s.flex}><Text style={[s.body, { color }]}>{message}</Text>
      {onRetry && <Pressable onPress={onRetry} accessibilityRole="button" style={s.retry}>
        <Text style={[s.buttonLabel, { color }]}>{t('common.retry')}</Text>
      </Pressable>}
    </View>
  </View>;
}

export function HostEmpty({ icon, title, description, action }: {
  icon: Icon; title: string; description?: string; action?: React.ReactNode;
}) {
  return <View style={s.empty}>
    <MaterialIcons name={icon} size={32} color={colors.primary} />
    <Text style={s.section}>{title}</Text>
    {!!description && <Text style={s.muted}>{description}</Text>}
    {action && <View style={{ marginTop: 8, alignSelf: 'flex-start' }}>{action}</View>}
  </View>;
}

export function HostRow({ title, description, icon, onPress, trailing }: {
  title: string; description?: string; icon?: Icon; onPress?: () => void; trailing?: React.ReactNode;
}) {
  const content = <>
    {icon && <MaterialIcons name={icon} size={23} color={colors.inkMid} />}
    <View style={s.flex}><Text style={s.rowTitle}>{title}</Text>
      {!!description && <Text style={[s.muted, { marginTop: 4 }]}>{description}</Text>}
    </View>
    {trailing ?? (onPress ? <MaterialIcons name="chevron-right" size={23} color={colors.inkSubtle} /> : null)}
  </>;
  return onPress ? <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s.row, pressed && s.pressed]}>{content}</Pressable>
    : <View style={s.row}>{content}</View>;
}

export function HostStatus({ label, tone = 'neutral' }: {
  label: string; tone?: 'neutral' | 'success' | 'warning' | 'error';
}) {
  const color = tone === 'success' ? colors.primaryDark : tone === 'warning' ? colors.warning : tone === 'error' ? colors.error : colors.inkMid;
  return <View style={[s.status, { backgroundColor: tone === 'warning' ? colors.accentLight : tone === 'error' ? '#FFF2EF' : colors.surfaceSunken }]}>
    <View style={[s.dot, { backgroundColor: color }]} /><Text style={[s.statusText, { color }]}>{label}</Text>
  </View>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.surface }, flex: { flex: 1, minWidth: 0 },
  content: { flexGrow: 1, width: '100%', maxWidth: 1000, alignSelf: 'center', paddingHorizontal: 20, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 24, paddingBottom: 24 },
  title: { color: colors.ink, fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.6 },
  section: { color: colors.ink, fontSize: 21, lineHeight: 28, fontWeight: '600', letterSpacing: -0.3 },
  body: { color: colors.ink, fontSize: 16, lineHeight: 24 },
  muted: { color: colors.inkSubtle, fontSize: 14, lineHeight: 21 },
  iconButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  button: { minHeight: 48, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  primaryButton: { backgroundColor: colors.accent, borderWidth: 1, borderColor: colors.accent },
  secondaryButton: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderMid },
  quietButton: { backgroundColor: 'transparent' }, buttonLabel: { fontSize: 16, lineHeight: 22, fontWeight: '600', flexShrink: 1, textAlign: 'center' },
  pressed: { opacity: 0.65 }, disabled: { opacity: 0.5 },
  notice: { borderRadius: 12, padding: 16, gap: 10, flexDirection: 'row', marginBottom: 16 }, retry: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', marginTop: 4 },
  empty: { gap: 12, paddingVertical: 32 }, row: { minHeight: 72, paddingVertical: 18, gap: 14, flexDirection: 'row', alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1 },
  rowTitle: { color: colors.ink, fontSize: 16, lineHeight: 23, fontWeight: '500' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 24 },
  status: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start', flexDirection: 'row', gap: 6, alignItems: 'center', maxWidth: '100%' },
  statusText: { fontSize: 14, lineHeight: 19, fontWeight: '500', flexShrink: 1 }, dot: { width: 6, height: 6, borderRadius: 3 },
});
export const hostStyles = s;
