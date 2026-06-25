import React from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ImageBackground 
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';

interface EditorialCardProps {
  title: string;
  description: string;
  image: string;
  onPress: () => void;
  index: number;
}

const EditorialCard: React.FC<EditorialCardProps> = ({ 
  title, 
  description, 
  image, 
  onPress,
  index
}) => {
  return (
    <Animated.View 
      entering={FadeIn.delay(300 + index * 100).duration(400)}
      style={styles.container}
    >
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        activeOpacity={0.9}
      >
        <ImageBackground
          source={{ uri: image }}
          style={styles.imageBackground}
          imageStyle={styles.image}
        >
          <View style={[styles.gradient, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
            <View style={styles.contentContainer}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.description} numberOfLines={2}>
                {description}
              </Text>
            </View>
          </View>
        </ImageBackground>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing[4],
  },
  card: {
    height: 160,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  imageBackground: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  image: {
    borderRadius: borderRadius.lg,
  },
  gradient: {
    paddingTop: 80,
    paddingBottom: spacing[4],
    paddingHorizontal: spacing[4],
  },
  contentContainer: {
    justifyContent: 'flex-end',
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.white,
    marginBottom: spacing[1],
  },
  description: {
    fontSize: typography.fontSize.sm,
    color: colors.white,
    opacity: 0.9,
  },
});

export default EditorialCard; 