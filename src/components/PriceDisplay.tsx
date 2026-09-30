import React from 'react';
import { Text, StyleSheet, StyleProp, TextStyle, ViewStyle, View } from 'react-native';
import { usePreferences } from '../store/preferences';
import { formatPrice } from '../utils/currency';
import { colors, typography } from '../theme';
import { useTranslation } from 'react-i18next';

interface PriceDisplayProps {
  priceInRwf: number;
  style?: StyleProp<TextStyle | ViewStyle>;
  size?: 'small' | 'medium' | 'large';
  showOriginal?: boolean;
  isPerMonth?: boolean;
  isPerNight?: boolean;
}

/**
 * Composant pour afficher un prix avec la devise sélectionnée par l'utilisateur
 */
const PriceDisplay: React.FC<PriceDisplayProps> = ({
  priceInRwf,
  style,
  size = 'medium',
  showOriginal = false,
  isPerMonth = false,
  isPerNight = false,
}) => {
  const currency: string = 'RWF';
  const { t } = useTranslation();

  // Convertir le prix dans la devise sélectionnée
  const convertedPrice = priceInRwf;
  const formattedPrice = formatPrice(convertedPrice, 'RWF');

  // Déterminer les styles en fonction de la taille
  const priceStyle = [
    styles.price,
    size === 'small' && styles.smallPrice,
    size === 'large' && styles.largePrice,
    style,
  ];

  const originalStyle = [
    styles.originalPrice,
    size === 'small' && styles.smallOriginalPrice,
    size === 'large' && styles.largeOriginalPrice,
  ];

  const periodText = isPerMonth
    ? t('property.perMonth')
    : isPerNight
    ? t('property.perNight')
    : '';

  return (
    <View style={styles.container}>
      <Text style={priceStyle}>
        {formattedPrice}
        {periodText && <Text style={styles.periodText}> {periodText}</Text>}
      </Text>

      {showOriginal && currency !== 'RWF' && (
        <Text style={originalStyle}>
          {`${priceInRwf.toLocaleString()} RWF`}
          {periodText && ` ${periodText}`}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
  },
  price: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.gray[800],
  },
  smallPrice: {
    fontSize: typography.fontSize.base,
  },
  largePrice: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
  },
  originalPrice: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    marginTop: 2,
  },
  smallOriginalPrice: {
    fontSize: typography.fontSize.xs,
  },
  largeOriginalPrice: {
    fontSize: typography.fontSize.base,
  },
  periodText: {
    fontWeight: '400',
    color: colors.gray[600],
  },
});

export default PriceDisplay;
