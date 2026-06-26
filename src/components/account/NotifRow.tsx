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
