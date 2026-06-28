# Task 1: Extraire les composants partagés

**Project:** LocaMap — React Native + Expo, app de location immobilière à Gisenyi, Rwanda.
**Working directory:** D:/PETER/mobileApp
**Branch:** Peter

## What this task does
Crée le dossier `src/components/account/` avec 4 composants partagés extraits de l'actuel `EditProfileScreen.tsx`, plus un barrel export. Ces composants seront utilisés par Task 2 (HostAccountScreen) et Task 4 (GuestAccountScreen).

## Global Constraints
- StyleSheet.create, couleurs depuis `../theme` (`colors.*`)
- Pas de chaînes hardcodées (mais ces composants reçoivent leurs labels via props, donc pas de i18n directe ici)
- Composants animés avec react-native-reanimated (FadeInDown) uniquement dans DeleteAccountModal
- TypeScript strict

## Files to create

### `src/components/account/SectionHeader.tsx`
```tsx
import React from 'react';
import { StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { colors } from '../../theme';

const SectionHeader = ({ title }: { title: string }) => (
  <Text style={s.txt}>{title}</Text>
);

const s = StyleSheet.create({
  txt: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.inkDisabled,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },
});

export default SectionHeader;
```

### `src/components/account/RowItem.tsx`
```tsx
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme';

interface RowItemProps {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  value?: string;
  onPress?: () => void;
  badge?: string;
  badgeBg?: string;
  badgeColor?: string;
  last?: boolean;
}

const RowItem = ({ icon, label, value, onPress, badge, badgeBg, badgeColor, last }: RowItemProps) => (
  <TouchableOpacity
    style={[s.row, !last && s.rowBorder]}
    onPress={onPress}
    activeOpacity={onPress ? 0.7 : 1}
  >
    <View style={s.iconWrap}>
      <MaterialIcons name={icon} size={18} color={colors.primary} />
    </View>
    <Text style={s.label}>{label}</Text>
    {badge && (
      <View style={[s.badge, { backgroundColor: badgeBg ?? colors.surfaceSunken }]}>
        <Text style={[s.badgeTxt, { color: badgeColor ?? colors.inkSubtle }]}>{badge}</Text>
      </View>
    )}
    {value && <Text style={s.value} numberOfLines={1}>{value}</Text>}
    {onPress && <MaterialIcons name="chevron-right" size={20} color={colors.inkDisabled} />}
  </TouchableOpacity>
);

const s = StyleSheet.create({
  row:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, gap: 14, backgroundColor: colors.surface },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  iconWrap:  { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  label:     { flex: 1, fontSize: 15, fontWeight: '500', color: colors.ink },
  value:     { fontSize: 13, color: colors.inkSubtle, maxWidth: 120 },
  badge:     { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  badgeTxt:  { fontSize: 11, fontWeight: '700' },
});

export default RowItem;
```

### `src/components/account/NotifRow.tsx`
```tsx
import React from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { Text } from 'react-native-paper';
import { colors } from '../../theme';

interface NotifRowProps {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  last?: boolean;
}

const NotifRow = ({ label, value, onChange, last }: NotifRowProps) => (
  <View style={[s.row, !last && s.rowBorder]}>
    <Text style={s.label}>{label}</Text>
    <Switch
      value={value}
      onValueChange={onChange}
      trackColor={{ false: colors.border, true: colors.primary }}
      thumbColor={colors.white}
      ios_backgroundColor={colors.border}
    />
  </View>
);

const s = StyleSheet.create({
  row:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 20, backgroundColor: colors.surface },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  label:     { flex: 1, fontSize: 15, fontWeight: '500', color: colors.ink },
});

export default NotifRow;
```

### `src/components/account/DeleteAccountModal.tsx`
```tsx
import React from 'react';
import { ActivityIndicator, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors } from '../../theme';

interface DeleteAccountModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  deleting: boolean;
  labels: { title: string; body: string; cancel: string; confirm: string };
}

const DeleteAccountModal = ({ visible, onClose, onConfirm, deleting, labels }: DeleteAccountModalProps) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={s.overlay}>
      <Animated.View entering={FadeInDown.duration(220)} style={s.card}>
        <View style={s.iconWrap}>
          <MaterialIcons name="delete-forever" size={30} color={colors.error} />
        </View>
        <Text style={s.title}>{labels.title}</Text>
        <Text style={s.body}>{labels.body}</Text>
        <View style={s.actions}>
          <TouchableOpacity style={s.cancelBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={s.cancelTxt}>{labels.cancel}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.deleteBtn} onPress={onConfirm} disabled={deleting} activeOpacity={0.85}>
            {deleting
              ? <ActivityIndicator size="small" color={colors.white} />
              : <Text style={s.deleteTxt}>{labels.confirm}</Text>
            }
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  </Modal>
);

const s = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: 'rgba(15,31,31,0.5)', justifyContent: 'center', padding: 24 },
  card:      { backgroundColor: colors.surface, borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  iconWrap:  { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.error + '12', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title:     { fontSize: 18, fontWeight: '700', color: colors.ink, marginBottom: 8, textAlign: 'center' },
  body:      { fontSize: 14, color: colors.inkMid, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  actions:   { flexDirection: 'row', gap: 12, width: '100%' },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center' },
  cancelTxt: { fontSize: 14, fontWeight: '600', color: colors.inkMid },
  deleteBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, backgroundColor: colors.error, alignItems: 'center' },
  deleteTxt: { fontSize: 14, fontWeight: '700', color: colors.white },
});

export default DeleteAccountModal;
```

### `src/components/account/index.ts`
```ts
export { default as SectionHeader } from './SectionHeader';
export { default as RowItem } from './RowItem';
export { default as NotifRow } from './NotifRow';
export { default as DeleteAccountModal } from './DeleteAccountModal';
```

## Commit
```bash
git add src/components/account/
git commit -m "feat: extract shared account screen components"
```

## Report file
Write your report to: D:/PETER/mobileApp/.superpowers/sdd/task-1-report.md

## Status to return
Return one of: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED
Plus: commits made, one-line test summary, any concerns.
