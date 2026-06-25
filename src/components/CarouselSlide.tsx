import React from 'react';
import { StyleSheet, View, Text, Dimensions, Image, ImageSourcePropType } from 'react-native';
import { Switch, TouchableRipple } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';

const { width } = Dimensions.get('window');

interface OptionItem {
  key: string;
  label: string;
  value: string | boolean;
  icon?: string;
}

interface CarouselSlideProps {
  title: string;
  description: string;
  illustration: ImageSourcePropType;
  options?: OptionItem[];
  selectedValue?: string | boolean;
  onSelect?: (value: string | boolean) => void;
  type: 'radio' | 'switch';
  index: number;
}

const AnimatedTouchableRipple = Animated.createAnimatedComponent(TouchableRipple);

const CarouselSlide = ({
  title,
  description,
  illustration,
  options = [],
  selectedValue,
  onSelect,
  type,
  index,
}: CarouselSlideProps) => {
  return (
    <View style={styles.container}>
      <Animated.View 
        style={styles.illustrationContainer} 
        entering={FadeIn.delay(200 * index).duration(600)}
      >
        <Image source={illustration} style={styles.illustration} />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(100 * index).duration(800).springify()}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </Animated.View>

      <Animated.View 
        style={styles.optionsContainer}
        entering={FadeInDown.delay(300 * index).duration(800).springify()}
      >
        {options.map((option, i) => (
          type === 'radio' ? (
            <AnimatedTouchableRipple
              key={option.key}
              style={[
                styles.optionItem,
                selectedValue === option.value && styles.selectedOptionItem,
              ]}
              onPress={() => onSelect && onSelect(option.value)}
              rippleColor="rgba(255, 56, 92, 0.1)"
              entering={FadeInDown.delay(100 * i + 400).duration(800).springify()}
            >
              <View style={styles.optionContent}>
                {option.icon && (
                  <Ionicons
                    name={option.icon as any}
                    size={24}
                    color={selectedValue === option.value ? colors.primary : colors.gray[500]}
                    style={styles.optionIcon}
                  />
                )}
                <Text style={[
                  styles.optionLabel,
                  selectedValue === option.value && styles.selectedOptionLabel,
                ]}>
                  {option.label}
                </Text>
                <View style={[
                  styles.radioCircle,
                  selectedValue === option.value && styles.selectedRadioCircle,
                ]}>
                  {selectedValue === option.value && <View style={styles.radioInnerCircle} />}
                </View>
              </View>
            </AnimatedTouchableRipple>
          ) : (
            <Animated.View
              key={option.key}
              style={styles.switchContainer}
              entering={FadeInDown.delay(100 * i + 400).duration(800).springify()}
            >
              <View style={styles.switchLabelContainer}>
                {option.icon && (
                  <Ionicons
                    name={option.icon as any}
                    size={24}
                    color={selectedValue ? colors.primary : colors.gray[500]}
                    style={styles.optionIcon}
                  />
                )}
                <Text style={styles.switchLabel}>{option.label}</Text>
              </View>
              <Switch
                value={selectedValue === true}
                onValueChange={(value) => onSelect && onSelect(value)}
                color={colors.primary}
              />
            </Animated.View>
          )
        ))}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width,
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[5],
    justifyContent: 'flex-start',
  },
  illustrationContainer: {
    alignItems: 'center',
    marginBottom: spacing[6],
    height: 200,
  },
  illustration: {
    width: '80%',
    height: '100%',
    resizeMode: 'contain',
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: colors.gray[800],
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  description: {
    fontSize: typography.fontSize.base,
    color: colors.gray[600],
    textAlign: 'center',
    marginBottom: spacing[8],
    paddingHorizontal: spacing[6],
  },
  optionsContainer: {
    marginTop: spacing[2],
  },
  optionItem: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
    borderWidth: 1,
    borderColor: colors.gray[200],
    ...shadows.xs,
  },
  selectedOptionItem: {
    backgroundColor: 'rgba(255, 56, 92, 0.05)',
    borderColor: colors.primary,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIcon: {
    marginRight: spacing[3],
  },
  optionLabel: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.gray[800],
    fontWeight: '500',
  },
  selectedOptionLabel: {
    color: colors.primary,
    fontWeight: '600',
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.gray[400],
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedRadioCircle: {
    borderColor: colors.primary,
  },
  radioInnerCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
    borderWidth: 1,
    borderColor: colors.gray[200],
    ...shadows.xs,
  },
  switchLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: typography.fontSize.base,
    color: colors.gray[800],
    fontWeight: '500',
  },
});

export default CarouselSlide; 