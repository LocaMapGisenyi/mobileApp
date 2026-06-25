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
import Animated, { FadeInUp, FadeOut } from 'react-native-reanimated';
import { colors, shadows, typography, borderRadius, spacing } from '../theme';
import { Property } from '../types';

interface MapPreviewCardProps {
  property: Property;
  onClose: () => void;
  onViewDetails: (propertyId: string) => void;
}

const { width } = Dimensions.get('window');

const MapPreviewCard: React.FC<MapPreviewCardProps> = ({ 
  property, 
  onClose, 
  onViewDetails 
}) => {
  const formatPrice = () => {
    return `${property.price.toLocaleString()} ${property.currency}`;
  };

  return (
    <Animated.View 
      entering={FadeInUp.duration(400)}
      exiting={FadeOut.duration(200)}
      style={styles.container}
    >
      <TouchableOpacity 
        style={styles.closeButton}
        onPress={onClose}
      >
        <Ionicons name="close" size={20} color={colors.gray[700]} />
      </TouchableOpacity>

      <View style={styles.cardContent}>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: property.images[0] as string }}
            style={styles.image}
            resizeMode="cover"
          />
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.location}>
            {property.location?.district || property.location?.city}
          </Text>
          
          <Text style={styles.title} numberOfLines={1}>
            {property.title}
          </Text>
          
          <View style={styles.detailsRow}>
            <Text style={styles.price}>{formatPrice()}</Text>
            {property.bedrooms && (
              <Text style={styles.details}>
                · {property.bedrooms} ch. {property.bathrooms && `· ${property.bathrooms} sdb`}
              </Text>
            )}
          </View>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.viewButton}
        onPress={() => onViewDetails(property.id)}
      >
        <Text style={styles.viewButtonText}>Voir détails</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.white} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    ...shadows.lg,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  cardContent: {
    flexDirection: 'row',
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginRight: spacing[3],
  },
  image: {
    width: '100%',
    height: '100%',
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  location: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[600],
    marginBottom: 2,
  },
  title: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.gray[800],
    marginBottom: 4,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  price: {
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
    color: colors.gray[800],
  },
  details: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    marginLeft: 4,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing[2],
    marginTop: spacing[3],
    borderRadius: borderRadius.full,
  },
  viewButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.white,
    marginRight: 4,
  },
});

export default MapPreviewCard; 