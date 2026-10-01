import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { colors, spacing, typography } from '../theme';

interface SectionTitleProps {
  title: string;
  subtitle?: string;
  actionText?: string;
  onActionPress?: () => void;
  delay?: number;
  icon?: string;
}

const SectionTitle: React.FC<SectionTitleProps> = ({
  title,
  subtitle,
  actionText,
  onActionPress,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        {actionText && onActionPress && (
          <TouchableOpacity
            accessibilityRole="button"
            onPress={onActionPress}
            style={{ minHeight: 44, justifyContent: 'center' }}
          >
            <Text style={styles.actionText}>{actionText}</Text>
          </TouchableOpacity>
        )}
      </View>

      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing[3],
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    flexShrink: 1,
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.gray[800],
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    marginTop: spacing[1],
  },
  actionText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.primary,
  },
});

export default SectionTitle;
