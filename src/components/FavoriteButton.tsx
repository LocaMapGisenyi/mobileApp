import React, { useEffect } from 'react';
import { 
  StyleSheet, 
  TouchableOpacity,
  ViewStyle 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  Easing
} from 'react-native-reanimated';
import { colors, shadows } from '../theme';
import { useFavoritesStore } from '../store/favorites';

interface FavoriteButtonProps {
  propertyId: string;
  size?: number;
  style?: ViewStyle;
  onPress?: () => void;
  showBackground?: boolean;
}

const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  propertyId,
  size = 24,
  style,
  onPress,
  showBackground = true
}) => {
  const { isFavorite } = useFavoritesStore();
  const favorited = isFavorite(propertyId);
  
  // Animation values
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  
  // Update animation when favorite status changes
  useEffect(() => {
    // Scale up then down with spring animation
    scale.value = withSpring(1.3, { damping: 5 }, () => {
      scale.value = withSpring(1);
    });
    
    // Fade out then in for color change
    opacity.value = withTiming(0.8, { duration: 100, easing: Easing.ease }, () => {
      opacity.value = withTiming(1, { duration: 100 });
    });
  }, [favorited]);
  
  // Animated styles
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  
  return (
    <TouchableOpacity
      style={[showBackground && styles.container, style]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={favorited ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      accessibilityHint={favorited ? 'Appuyez pour retirer ce logement de vos favoris' : 'Appuyez pour sauvegarder ce logement'}
      accessibilityState={{ selected: favorited }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Animated.View style={animatedStyle}>
        <Ionicons
          name={favorited ? 'heart' : 'heart-outline'}
          size={size}
          color={favorited ? colors.primary : colors.gray[700]}
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  }
});

export default FavoriteButton; 