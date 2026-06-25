import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Text, useTheme, Surface } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';

interface AmenityTagProps {
  label: string;
  icon?: string;
  style?: ViewStyle;
}

const getIconName = (amenity: string): string => {
  const amenityLower = amenity.toLowerCase();
  
  if (amenityLower.includes('wifi')) return 'wifi';
  if (amenityLower.includes('parking')) return 'local-parking';
  if (amenityLower.includes('meublé')) return 'weekend';
  if (amenityLower.includes('sécurité')) return 'security';
  if (amenityLower.includes('piscine')) return 'pool';
  if (amenityLower.includes('jardin')) return 'grass';
  if (amenityLower.includes('climatisation') || amenityLower.includes('clim')) return 'ac-unit';
  if (amenityLower.includes('balcon')) return 'balcony';
  if (amenityLower.includes('terrasse')) return 'deck';
  if (amenityLower.includes('chauffage')) return 'whatshot';
  if (amenityLower.includes('eau chaude')) return 'opacity';
  if (amenityLower.includes('cuisine')) return 'kitchen';
  if (amenityLower.includes('télé') || amenityLower.includes('tv')) return 'tv';
  if (amenityLower.includes('lave')) return 'local-laundry-service';
  
  return 'check-circle';
};

const AmenityTag: React.FC<AmenityTagProps> = ({ 
  label, 
  icon,
  style 
}) => {
  const theme = useTheme();
  const iconName = icon || getIconName(label);

  return (
    <Surface style={[styles.surface, style]}>
      <View style={[styles.container, { borderColor: theme.colors.primary }]}>
        <MaterialIcons name={iconName as any} size={18} color={theme.colors.primary} />
        <Text style={[styles.label, { color: theme.colors.primary }]}>
          {label}
        </Text>
      </View>
    </Surface>
  );
};

const styles = StyleSheet.create({
  surface: {
    marginRight: 8,
    marginBottom: 8,
    borderRadius: 8,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F0F8FF',
    borderWidth: 1,
  },
  label: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default AmenityTag; 