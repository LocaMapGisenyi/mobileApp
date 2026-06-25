import React from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  Dimensions 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';
import { Property } from '../types';
import FavoriteButton from './FavoriteButton';
import { useFavoritesStore } from '../store/favorites';

interface FavoriteCardProps {
  property: Property;
  onPress: (propertyId: string) => void;
  index: number;
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - (spacing[4] * 2);

const FavoriteCard: React.FC<FavoriteCardProps> = ({ 
  property, 
  onPress,
  index 
}) => {
  const { removeFavorite } = useFavoritesStore();
  
  const formatPrice = () => {
    return `${property.price.toLocaleString()} ${property.currency}`;
  };
  
  const handleRemoveFavorite = () => {
    removeFavorite(property.id);
  };
  
  return (
    <Animated.View 
      entering={FadeIn.delay(index * 100).duration(400)}
      style={styles.container}
    >
      <TouchableOpacity
        style={styles.card}
        onPress={() => onPress(property.id)}
        activeOpacity={0.9}
      >
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: property.images[0] as string }}
            style={styles.image}
            resizeMode="cover"
          />
        </View>
        
        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.location} numberOfLines={1}>
              {property.location?.district || property.location?.city}
            </Text>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={14} color={colors.gray[800]} />
              <Text style={styles.ratingText}>{property.rating}</Text>
            </View>
          </View>
          
          <Text style={styles.title} numberOfLines={2}>
            {property.title}
          </Text>
          
          <View style={styles.detailsContainer}>
            <Text style={styles.details}>
              {property.bedrooms} {property.bedrooms && property.bedrooms > 1 ? 'chambres' : 'chambre'} · {property.bathrooms} {property.bathrooms && property.bathrooms > 1 ? 'sdb' : 'sdb'}
            </Text>
          </View>
          
          <View style={styles.footerRow}>
            <Text style={styles.price}>
              <Text style={styles.priceBold}>{formatPrice()}</Text> / nuit
            </Text>
            
            <FavoriteButton 
              propertyId={property.id}
              onPress={handleRemoveFavorite}
              showBackground={false}
            />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    marginBottom: spacing[4],
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  imageContainer: {
    width: '100%',
    height: 180,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  contentContainer: {
    padding: spacing[3],
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[1],
  },
  location: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.gray[700],
    flex: 1,
    marginRight: spacing[1],
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[800],
    fontWeight: '500',
    marginLeft: 4,
  },
  title: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.gray[800],
    marginBottom: spacing[2],
  },
  detailsContainer: {
    marginBottom: spacing[2],
  },
  details: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
  },
  priceBold: {
    fontWeight: '600',
    color: colors.gray[800],
    fontSize: typography.fontSize.base,
  },
});

export default FavoriteCard; 