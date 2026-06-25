import React from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
import { Marker } from 'react-native-maps';
import Animated, { FadeIn } from 'react-native-reanimated';
import { colors, shadows, typography, borderRadius } from '../theme';

interface PriceMarkerProps {
  id: string;
  price: number;
  currency: string;
  coordinate: {
    latitude: number;
    longitude: number;
  };
  isSelected?: boolean;
  onPress: (id: string) => void;
}

const PriceMarker: React.FC<PriceMarkerProps> = ({ 
  id,
  price,
  currency,
  coordinate,
  isSelected = false,
  onPress
}) => {
  const formattedPrice = currency === 'USD' 
    ? `$${price}` 
    : `${price} ${currency}`;

  return (
    <Marker
      identifier={id}
      coordinate={coordinate}
      onPress={() => onPress(id)}
      tracksViewChanges={false}
    >
      <Animated.View entering={FadeIn.duration(400)}>
        <View style={[
          styles.container,
          isSelected && styles.selected
        ]}>
          <Text style={[
            styles.priceText,
            isSelected && styles.selectedText
          ]}>
            {formattedPrice}
          </Text>
        </View>
        {isSelected && (
          <View style={styles.pointer} />
        )}
      </Animated.View>
    </Marker>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 6,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  selected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    transform: [{ scale: 1.1 }],
    zIndex: 1,
  },
  priceText: {
    color: colors.gray[800],
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  selectedText: {
    color: colors.white,
  },
  pointer: {
    width: 10,
    height: 10,
    backgroundColor: colors.primary,
    alignSelf: 'center',
    marginTop: -5,
    transform: [{ rotate: '45deg' }],
    zIndex: -1,
  },
});

export default PriceMarker; 