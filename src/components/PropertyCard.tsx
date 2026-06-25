import React, { useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, useWindowDimensions, ImageSourcePropType } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../theme';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import PriceDisplay from './PriceDisplay';
import { Property } from '../types';
import { convertToRwf } from '../utils/currency';
import { Currency } from '../store/preferences';

interface PropertyCardProps {
  property: Property;
  index: number;
  onPress: () => void;
  onFavoritePress?: () => void;
  isFavoriteState?: boolean;
}

const PropertyCard = ({ property, index, onPress, onFavoritePress, isFavoriteState }: PropertyCardProps) => {
  const { width } = useWindowDimensions();
  const imageWidth = width - (spacing[4] * 2);
  const { t } = useTranslation();

  const handleFavoritePress = useCallback((e: any) => {
    e.stopPropagation();
    onFavoritePress?.();
  }, [onFavoritePress]);

  const priceInRwf = property.currency === 'RWF'
    ? property.price
    : convertToRwf(property.price, property.currency as Currency);

  let imageSource: ImageSourcePropType | { uri: string };
  if (property.images && property.images.length > 0) {
    if (typeof property.images[0] === 'string') {
      imageSource = { uri: property.images[0] };
    } else {
      imageSource = property.images[0] as ImageSourcePropType;
    }
  } else {
    imageSource = { uri: 'https://via.placeholder.com/600x400.png?text=Image+non+disponible' };
  }

  const displayLocation = property.location?.address || property.location?.district || property.location?.city || t('common.unknownLocation');
  const currentIsFavorite = isFavoriteState !== undefined ? isFavoriteState : false;

  return (
    <Animated.View
      entering={FadeIn.delay(index * 100).duration(400)}
      style={styles.container}
    >
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel={`${property.title}, ${displayLocation}`}
      >
        {/* Image */}
        <View style={styles.imageContainer}>
          <Image
            source={imageSource}
            style={[styles.image, { width: imageWidth }]}
            resizeMode="cover"
          />

          {/* Bouton favoris */}
          {onFavoritePress && (
            <TouchableOpacity
              style={styles.heartButton}
              onPress={handleFavoritePress}
              accessibilityRole="button"
              accessibilityLabel={currentIsFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              accessibilityHint={currentIsFavorite ? 'Appuyez pour retirer ce logement de vos favoris' : 'Appuyez pour sauvegarder ce logement'}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={currentIsFavorite ? 'heart' : 'heart-outline'}
                size={20}
                color={currentIsFavorite ? colors.error : colors.primary}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Contenu */}
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
              {property.title}
            </Text>
          </View>

          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={13} color={colors.primary} />
            <Text style={styles.location} numberOfLines={1}>
              {displayLocation}
            </Text>
          </View>

          <View style={styles.infoRow}>
            {property.bedrooms !== undefined && (
              <View style={styles.info}>
                <Ionicons name="bed-outline" size={14} color={colors.primary} />
                <Text style={styles.infoText}>{property.bedrooms} {t('property.bedrooms', { count: property.bedrooms })}</Text>
              </View>
            )}
            {property.bathrooms !== undefined && (
              <View style={styles.info}>
                <Ionicons name="water-outline" size={14} color={colors.primary} />
                <Text style={styles.infoText}>{property.bathrooms} {t('property.bathrooms', { count: property.bathrooms })}</Text>
              </View>
            )}
            {(property.surface !== undefined || property.size !== undefined) && (
              <View style={styles.info}>
                <Ionicons name="resize-outline" size={14} color={colors.primary} />
                <Text style={styles.infoText}>{property.size || property.surface} m²</Text>
              </View>
            )}
          </View>

          <View style={styles.priceContainer}>
            <PriceDisplay
              priceInRwf={priceInRwf}
              size="medium"
              isPerNight={false}
              isPerMonth={true}
            />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing[4],
    marginBottom: spacing[4],
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  imageContainer: {
    position: 'relative',
    height: 185,
  },
  image: {
    height: 185,
    borderTopLeftRadius: borderRadius.card,
    borderTopRightRadius: borderRadius.card,
  },
  heartButton: {
    position: 'absolute',
    top: spacing[3],
    right: spacing[3],
    backgroundColor: 'rgba(255,255,255,0.9)',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: spacing[4],
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[1],
  },
  title: {
    flex: 1,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.ink,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  location: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.inkSubtle,
    marginLeft: spacing[1],
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: spacing[3],
    flexWrap: 'wrap',
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing[3],
    marginBottom: spacing[1],
  },
  infoText: {
    fontSize: typography.fontSize.sm,
    color: colors.inkMid,
    marginLeft: spacing[1],
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: spacing[2],
  },
});

export default React.memo(PropertyCard);
