import React from 'react';
import { StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { colors } from '../../theme';

const SectionHeader = ({ title }: { title: string }) => (
  <Text style={s.txt}>{title}</Text>
);

const s = StyleSheet.create({
  txt: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 12,
  },
});

export default SectionHeader;
