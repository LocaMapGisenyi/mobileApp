import React from 'react';
import { StyleSheet, View, Image } from 'react-native';
import { Card, Text, Chip } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { Property } from '../types';
import { colors } from '../theme';

interface CardLogementProps {
  logement: Property;
  index: number;
  onPress: (id: string) => void;
}

const CardLogement = ({ logement, onPress }: CardLogementProps) => {

  const formatPrice = (price: number, originalCurrency: string) => `${price.toLocaleString()} ${originalCurrency}`;

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
      return <MaterialIcons name="wifi" size={size} color={colors.primary} />;
    if (amenityLower.includes('parking'))
      return <MaterialIcons name="local-parking" size={size} color={colors.primary} />;
    if (amenityLower.includes('eau chaude'))
      return <MaterialIcons name="water-drop" size={size} color={colors.primary} />;

    return <MaterialIcons name="check-circle" size={size} color={colors.primary} />;
  };

  return (
    <View
      style={styles.container}
    >
      <Card
        style={styles.card}
        onPress={() => onPress(logement.id)}
      >
        <Image
          source={logement.images[0] ? { uri: logement.images[0] } : require('../assets/images/house-logo.png')}
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
              <MaterialIcons name="place" size={16} color={colors.primary} />
              <Text style={styles.location}>{logement.location?.city}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.feature}>
              <MaterialIcons name="king-bed" size={18} color={colors.primary} />
              <Text style={styles.featureText}>{logement.bedrooms}</Text>
            </View>

            <View style={styles.feature}>
              <MaterialIcons name="bathtub" size={18} color={colors.primary} />
              <Text style={styles.featureText}>{logement.bathrooms}</Text>
            </View>

            {!!logement.size && <View style={styles.feature}>
              <MaterialIcons name="straighten" size={18} color={colors.primary} />
              <Text style={styles.featureText}>{logement.size} m²</Text>
            </View>}
          </View>

          {renderAmenities()}
        </View>
      </Card>
    </View>
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
    color: colors.ink,
  },
  priceLocationContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  month: {
    fontSize: 14,
    fontWeight: 'normal',
    color: colors.inkSubtle,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  location: {
    fontSize: 14,
    color: colors.inkSubtle,
    marginLeft: 4,
  },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 8,
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
    color: colors.inkMid,
  },
  amenitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityChip: {
    backgroundColor: colors.primaryLight,
    height: 36,
  },
  amenityText: {
    color: colors.primary,
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
