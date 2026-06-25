import React from 'react';
import { StyleSheet, View, Image, TouchableOpacity } from 'react-native';
import { Card, Text, Chip, useTheme } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { Property } from '../types';
import { usePreferences } from '../store/preferences';
import Animated, { FadeInRight } from 'react-native-reanimated';

interface CardLogementProps {
  logement: Property;
  index: number;
  onPress: (id: string) => void;
}

const CardLogement = ({ logement, index, onPress }: CardLogementProps) => {
  const theme = useTheme();
  const { currency } = usePreferences();
  
  // Conversion du prix selon la devise choisie (démonstration simplifiée)
  const formatPrice = (price: number, originalCurrency: string) => {
    let convertedPrice = price;
    let symbol = '';
    
    // Simuler la conversion de devise
    if (originalCurrency !== currency) {
      // Taux de conversion simulés
      const rates = {
        RWF: { USD: 0.00085, EUR: 0.00079 },
        USD: { RWF: 1176.47, EUR: 0.93 },
        EUR: { RWF: 1265.82, USD: 1.07 }
      };
      
      // Convertir depuis la devise originale vers la devise choisie
      const ratesTyped = rates as Record<string, Record<string, number>>;
      if (originalCurrency in ratesTyped && currency in (ratesTyped[originalCurrency] || {})) {
        const rate = ratesTyped[originalCurrency][currency];
        convertedPrice = Math.round(price * rate);
      }
    }
    
    // Symbole de la devise
    switch (currency) {
      case 'RWF':
        symbol = 'FRw';
        break;
      case 'USD':
        symbol = '$';
        break;
      case 'EUR':
        symbol = '€';
        break;
    }
    
    // Format du prix selon la devise
    return currency === 'RWF' 
      ? `${convertedPrice.toLocaleString()} ${symbol}`
      : `${symbol}${convertedPrice.toLocaleString()}`;
  };

  // Afficher max 2 commodités
  const renderAmenities = () => {
    if (!logement.amenities || logement.amenities.length === 0) return null;
    
    return (
      <View style={styles.amenitiesContainer}>
        {logement.amenities.slice(0, 2).map((amenity, i) => (
          <Chip
            key={i}
            style={styles.amenityChip}
            textStyle={styles.amenityText}
            icon={props => getAmenityIcon(amenity, props.size)}
          >
            {amenity}
          </Chip>
        ))}
        {logement.amenities.length > 2 && (
          <Chip
            style={styles.amenityChip}
            textStyle={styles.amenityText}
            icon="dots-horizontal"
          >
            +{logement.amenities.length - 2}
          </Chip>
        )}
      </View>
    );
  };

  const getAmenityIcon = (amenity: string, size = 16) => {
    const amenityLower = amenity.toLowerCase();
    
    if (amenityLower.includes('wifi')) 
      return <MaterialIcons name="wifi" size={size} color="#6366F1" />;
    if (amenityLower.includes('parking')) 
      return <MaterialIcons name="local-parking" size={size} color="#6366F1" />;
    if (amenityLower.includes('eau chaude')) 
      return <MaterialIcons name="water-drop" size={size} color="#6366F1" />;
      
    return <MaterialIcons name="check-circle" size={size} color="#6366F1" />;
  };

  return (
    <Animated.View 
      entering={FadeInRight.delay(index * 100).duration(400)}
      style={styles.container}
    >
      <Card
        style={styles.card}
        onPress={() => onPress(logement.id)}
      >
        <Image
          source={typeof logement.images[0] === 'number' 
            ? logement.images[0] 
            : { uri: logement.images[0] }}
          style={styles.image}
          resizeMode="cover"
        />
        
        <View style={styles.content}>
          <Text numberOfLines={1} style={styles.title}>{logement.title}</Text>
          
          <View style={styles.priceLocationContainer}>
            <Text style={styles.price}>
              {formatPrice(logement.price, logement.currency)}<Text style={styles.month}>/mois</Text>
            </Text>
            
            <View style={styles.locationContainer}>
              <MaterialIcons name="place" size={16} color="#6366F1" />
              <Text style={styles.location}>{logement.location?.city}</Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.feature}>
              <MaterialIcons name="king-bed" size={18} color="#6366F1" />
              <Text style={styles.featureText}>{logement.bedrooms}</Text>
            </View>
            
            <View style={styles.feature}>
              <MaterialIcons name="bathtub" size={18} color="#6366F1" />
              <Text style={styles.featureText}>{logement.bathrooms}</Text>
            </View>
            
            <View style={styles.feature}>
              <MaterialIcons name="straighten" size={18} color="#6366F1" />
              <Text style={styles.featureText}>{logement.size} m²</Text>
            </View>
          </View>
          
          {renderAmenities()}
        </View>
      </Card>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  card: {
    borderRadius: 12,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 150,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#999999',
  },
  priceLocationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6366F1',
  },
  month: {
    fontSize: 14,
    fontWeight: 'normal',
    color: '#999999',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  location: {
    fontSize: 14,
    color: '#777777',
    marginLeft: 4,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  featureText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#555555',
  },
  amenitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityChip: {
    backgroundColor: '#222222',
    height: 36,
  },
  amenityText: {
    color: '#6366F1',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  viewButtonText: {
    color: '#fff',
    marginRight: 4,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default CardLogement; 