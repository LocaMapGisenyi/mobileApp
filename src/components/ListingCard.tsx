import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Image from './ResilientImage';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { Property } from '../types';
import { colors, borderRadius } from '../theme';

interface Props {
  property: Property;
  favorite: boolean;
  onPress: () => void;
  onFavorite: () => void;
}
export default function ListingCard({ property, favorite, onPress, onFavorite }: Props) {
  const { t } = useTranslation();
  const image = property.images?.[0];
  return (
    <View style={s.card}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={property.title}
        style={({ pressed }) => [s.main, pressed && s.pressed]}
      >
        <Image
          source={image ? { uri: image } : require('../assets/images/house-logo.png')}
          style={s.image}
          resizeMode={image ? 'cover' : 'contain'}
        />
        <View style={s.content}>
          <View style={s.locationRow}>
            <Text style={s.location} numberOfLines={1}>
              {property.location?.district || property.location?.city}
            </Text>
            {!!property.rating && (
              <View style={s.rating}>
                <MaterialIcons name="star" size={16} color={colors.primary} />
                <Text style={s.ratingText}>{property.rating.toFixed(1)}</Text>
              </View>
            )}
          </View>
          <Text style={s.title} numberOfLines={2}>
            {property.title}
          </Text>
          <Text style={s.details}>
            {t('design.bedrooms', { count: property.bedrooms })}
            {property.size ? ` · ${property.size} m²` : ''}
          </Text>
          <View style={s.priceRow}>
            <Text style={s.price}>
              {property.price.toLocaleString()} {property.currency}
            </Text>
            <Text style={s.period}>{t('property.perMonth')}</Text>
          </View>
        </View>
      </Pressable>
      <Pressable
        onPress={onFavorite}
        accessibilityRole="button"
        accessibilityLabel={t(favorite ? 'design.removeFavorite' : 'design.addFavorite')}
        accessibilityState={{ selected: favorite }}
        style={({ pressed }) => [s.favorite, pressed && s.pressed]}
      >
        <MaterialIcons
          name={favorite ? 'favorite' : 'favorite-border'}
          size={23}
          color={favorite ? colors.primary : colors.ink}
        />
      </Pressable>
    </View>
  );
}
const s = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  main: { flex: 1 },
  pressed: { opacity: 0.8 },
  image: { width: '100%', aspectRatio: 1.55, backgroundColor: colors.surfaceSunken },
  content: { padding: 16, gap: 6 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  location: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.inkSubtle },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  title: { color: colors.ink, fontSize: 19, lineHeight: 25, fontWeight: '700' },
  details: { fontSize: 14, lineHeight: 21, color: colors.inkSubtle },
  priceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    columnGap: 6,
    marginTop: 8,
  },
  price: { color: colors.primaryDark, fontSize: 20, fontWeight: '700' },
  period: { fontSize: 14, color: colors.inkSubtle },
  favorite: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
