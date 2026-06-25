import React from 'react';
import { StyleSheet, TouchableOpacity, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';

interface ExploreCategory {
  id: string;
  name: string;
  icon?: string;
  emoji?: string;
}

interface CategoryButtonProps {
  category: ExploreCategory;
  isSelected: boolean;
  onPress: (categoryId: string) => void;
  index: number;
}

const CategoryButton: React.FC<CategoryButtonProps> = ({ 
  category, 
  isSelected, 
  onPress,
  index 
}) => {
  return (
    <Animated.View 
      entering={FadeIn.delay(index * 100).duration(400)}
      style={styles.container}
    >
      <TouchableOpacity
        style={[
          styles.button,
          isSelected && styles.selectedButton
        ]}
        onPress={() => onPress(category.id)}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          {category.emoji ? (
            <Text style={styles.emoji}>{category.emoji}</Text>
          ) : (
            <Ionicons
              name={category.icon as any}
              size={24}
              color={isSelected ? colors.primary : colors.gray[600]}
            />
          )}
        </View>
        
        <Text 
          style={[
            styles.label,
            isSelected && styles.selectedLabel
          ]}
          numberOfLines={2}
        >
          {category.name}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginRight: spacing[4],
    alignItems: 'center',
    width: 70,
  },
  button: {
    alignItems: 'center',
  },
  selectedButton: {
    transform: [{ scale: 1.05 }],
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.gray[200],
    ...shadows.sm,
  },
  emoji: {
    fontSize: 24,
  },
  label: {
    fontSize: typography.fontSize.xs,
    fontWeight: '500',
    color: colors.gray[600],
    textAlign: 'center',
    marginTop: 2,
  },
  selectedLabel: {
    color: colors.primary,
    fontWeight: '600',
  },
});

export default CategoryButton; 