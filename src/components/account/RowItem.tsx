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
