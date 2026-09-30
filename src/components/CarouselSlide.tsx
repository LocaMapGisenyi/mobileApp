import React from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { Switch } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

interface OptionItem {
  key: string;
  label: string;
  value: string | boolean;
  icon?: string;
}
interface Props {
  title: string;
  description: string;
  options?: OptionItem[];
  selectedValue?: string | boolean;
  onSelect?: (value: string | boolean) => void;
  type: 'radio' | 'switch';
  index: number;
}
export default function CarouselSlide({
  title,
  description,
  options = [],
  selectedValue,
  onSelect,
  type,
  index,
}: Props) {
  return (
    <ScrollView
      style={s.scroll}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={s.symbol}>
        <Ionicons
          name={index === 0 ? 'language' : index === 1 ? 'cash-outline' : 'notifications-outline'}
          size={32}
          color={colors.primary}
        />
      </View>
      <Text accessibilityRole="header" style={s.title}>
        {title}
      </Text>
      <Text style={s.description}>{description}</Text>
      <View style={s.options}>
        {options.map(option =>
          type === 'radio' ? (
            <Pressable
              key={option.key}
              onPress={() => onSelect?.(option.value)}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityState={{ checked: selectedValue === option.value }}
              style={({ pressed }) => [
                s.option,
                selectedValue === option.value && s.selected,
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={s.label}>{option.label}</Text>
              <View style={[s.radio, selectedValue === option.value && s.radioSelected]}>
                {selectedValue === option.value && <View style={s.radioDot} />}
              </View>
            </Pressable>
          ) : (
            <View key={option.key} style={s.option}>
              <Text style={s.label}>{option.label}</Text>
              <Switch
                accessibilityLabel={option.label}
                value={selectedValue === true}
                onValueChange={value => onSelect?.(value)}
                color={colors.primary}
              />
            </View>
          ),
        )}
      </View>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  scroll: { flex: 1, width: '100%' },
  content: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 44,
    paddingBottom: 24,
  },
  symbol: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  title: { fontSize: 28, lineHeight: 35, fontWeight: '700', color: colors.ink, marginBottom: 12 },
  description: { fontSize: 16, lineHeight: 24, color: colors.inkSubtle, marginBottom: 28 },
  options: { gap: 12 },
  option: {
    minHeight: 60,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.borderMid,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  selected: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  label: { flex: 1, fontSize: 16, lineHeight: 23, fontWeight: '500', color: colors.ink },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.inkSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
});
