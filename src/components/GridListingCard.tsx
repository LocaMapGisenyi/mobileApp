import React, { useCallback } from 'react';
import {
  StyleSheet,
  View,
  Image,
  Text,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';

// Badge colors anchored to the brand palette
const BADGE_COLORS = {
  longTerm: '#4a6da7',
  student: '#6a7d5e',
  lake: '#2b87b9',
} as const;
import { ExploreListing } from '../data/exploreListings';

interface GridListingCardProps {
  listing: ExploreListing;
  onPress: (listingId: string) => void;
  index: number;
  displayMode?: 'nightly' | 'monthly';
}

const GridListingCard: React.FC<GridListingCardProps> = ({
  listing,
  onPress,
  index,
  displayMode = 'monthly',
}) => {
  const { width } = useWindowDimensions();
  const cardWidth = (width - spacing[4] * 2 - spacing[3]) / 2;
  // Calcul du prix mensuel (approximatif, en pratique viendrait de l'API)
  const calculateMonthlyPrice = (nightlyPrice: number) => {
    return Math.round(nightlyPrice * 25); // Approximation simple: 25 jours par mois
  };
  
  const formatPrice = () => {
    const price = displayMode === 'monthly' 
      ? calculateMonthlyPrice(listing.price) 
      : listing.price;
    
    return `${price.toLocaleString()} ${listing.currency}`;
  };
  
  // Déterminer l'icône et le texte à afficher pour le badge
  const handlePress = useCallback(() => onPress(listing.id), [listing.id, onPress]);

  const getBadgeInfo = () => {
    if (listing.longTerm) {
      return { icon: 'event', text: 'Long terme', color: BADGE_COLORS.longTerm };
    } else if (listing.forStudents) {
      return { icon: 'school', text: 'Étudiants', color: BADGE_COLORS.student };
    } else if (listing.nearLake) {
      return { icon: 'water-drop', text: 'Vue lac', color: BADGE_COLORS.lake };
    }
    return null;
  };
  
  const badgeInfo = getBadgeInfo();
  
  return (
    <Animated.View
      entering={FadeInDown.delay(100 + index * 100).duration(400)}
      style={[styles.container, { width: cardWidth }]}
    >
      <TouchableOpacity
        style={styles.card}
        onPress={handlePress}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel={`${listing.title}, ${listing.location?.district}`}
      >
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: listing.images[0] }} 
            style={styles.image}
            resizeMode="cover"
          />
          
          <TouchableOpacity
            style={styles.heartButton}
            accessibilityRole="button"
            accessibilityLabel="Ajouter aux favoris"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons name="favorite-border" size={20} color={colors.white} />
          </TouchableOpacity>
          
          {badgeInfo && (
            <View style={[styles.badgeContainer, { backgroundColor: badgeInfo.color }]}>
              <MaterialIcons name={badgeInfo.icon as any} size={12} color={colors.white} />
              <Text style={styles.badgeText}>{badgeInfo.text}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.contentContainer}>
          <View style={styles.topRow}>
            <Text style={styles.location} numberOfLines={1}>
              {listing.location?.district}, {listing.location?.city}
            </Text>
            
            <View style={styles.ratingContainer}>
              <MaterialIcons name="star" size={12} color={colors.black} />
              <Text style={styles.ratingText}>{listing.rating}</Text>
            </View>
          </View>
          
          <Text style={styles.title} numberOfLines={2}>
            {listing.title}
          </Text>
          
          <Text style={styles.propertyType}>
            {listing.type} · {listing.bedrooms} ch. · {listing.size} m²
          </Text>
          
          <View style={styles.priceContainer}>
            <Text style={styles.price}>
              <Text style={styles.priceBold}>{formatPrice()}</Text>
              <Text style={styles.priceUnit}>
                {displayMode === 'monthly' ? '/mois' : '/nuit'}
              </Text>
            </Text>
            
            {listing.furnished && (
              <View style={styles.tagContainer}>
                <MaterialIcons name="chair" size={12} color={colors.primary} />
                <Text style={styles.tagText}>Meublé</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing[4],
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    ...shadows.xs,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 150,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
  },
  heartButton: {
    position: 'absolute',
    top: spacing[2],
    right: spacing[2],
    zIndex: 10,
  },
  badgeContainer: {
    position: 'absolute',
    bottom: spacing[2],
    left: spacing[2],
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  badgeText: {
    fontSize: typography.fontSize.xs,
    color: colors.white,
    fontWeight: '500',
    marginLeft: 4,
  },
  contentContainer: {
    padding: spacing[2],
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  location: {
    fontSize: typography.fontSize.xs,
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
    fontSize: typography.fontSize.xs,
    color: colors.gray[800],
    fontWeight: '500',
    marginLeft: 2,
  },
  title: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.gray[800],
    marginTop: spacing[1],
    height: 36, // Limit to 2 lines
  },
  propertyType: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[600],
    marginTop: spacing[1],
  },
  priceContainer: {
    marginTop: spacing[1],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: typography.fontSize.sm,
  },
  priceBold: {
    fontWeight: '600',
    color: colors.gray[800],
  },
  priceUnit: {
    color: colors.gray[600],
  },
  tagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  tagText: {
    fontSize: typography.fontSize.xs,
    color: colors.primary,
    marginLeft: 2,
  },
});

export default React.memo(GridListingCard); 