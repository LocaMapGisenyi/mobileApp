import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList, Property } from '../types';
import { Ionicons } from '@expo/vector-icons';
import PropertyMap, { PropertyMapHandle, Region } from '../components/PropertyMap';
import { colors, shadows } from '../theme';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

// Components
import MapPreviewCard from '../components/MapPreviewCard';
import MapScreenHeader from '../components/MapScreenHeader';
import SearchFiltersModal from '../components/SearchFiltersModal';

// Types and Data
import { useSearchStore } from '../store/search';

type MapScreenNavigationProp = BottomTabNavigationProp<RootStackParamList>;

// Initial region (Gisenyi, Rwanda)
const INITIAL_REGION: Region = {
  latitude: -1.7028,
  longitude: 29.2567,
  latitudeDelta: 0.025,
  longitudeDelta: 0.025,
};

const MapScreen: React.FC = () => {
  const navigation = useNavigation<MapScreenNavigationProp>();
  const mapRef = useRef<PropertyMapHandle>(null);
  const { toggleFiltersModal, showFiltersModal, filteredListings: listings, fetchListings } = useSearchStore();

  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [region, setRegion] = useState<Region>(INITIAL_REGION);
  const visibleListings = listings.filter(property => {
    const point = property.location.coordinates;
    return point && Math.abs(point.latitude - region.latitude) <= region.latitudeDelta / 2
      && Math.abs(point.longitude - region.longitude) <= region.longitudeDelta / 2;
  });

  useEffect(() => { if (!listings.length) void fetchListings(); }, [fetchListings]);

  const handleRegionChangeComplete = (newRegion: Region) => {
    setRegion(newRegion);

  };

  // Handle marker press
  const handleMarkerPress = (propertyId: string) => {
    const property = listings.find(item => item.id === propertyId);
    if (property && property.location.coordinates) {
      setSelectedProperty(property);

      // Center the map on the selected property with animation
      mapRef.current?.animateToRegion({
        latitude: property.location.coordinates.latitude,
        longitude: property.location.coordinates.longitude,
        latitudeDelta: region.latitudeDelta / 1.5,
        longitudeDelta: region.longitudeDelta / 1.5,
      }, 500);
    }
  };

  // Handle card close
  const handleCardClose = () => {
    setSelectedProperty(null);
  };

  // Handle view details navigation
  const handleViewDetails = (propertyId: string) => {
    navigation.navigate('PropertyDetails', { propertyId });
  };

  // Go back to search/list view
  const handleBackPress = () => {
    navigation.goBack();
  };

  // Open filter modal
  const handleFilterPress = () => {
    toggleFiltersModal();
  };

  // Navigate to list view
  const handleGoToList = () => {
    navigation.navigate('Search');
  };

  // Center map on Gisenyi
  const handleCenterMap = () => {
    mapRef.current?.animateToRegion(INITIAL_REGION, 500);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <MapScreenHeader
        onBackPress={handleBackPress}
        onFilterPress={handleFilterPress}
        listingsCount={visibleListings.length}
      />

      <View style={styles.mapFrame}>
        {/* Map View */}
        <PropertyMap
          ref={mapRef}
          style={styles.map}
          initialRegion={INITIAL_REGION}
          onRegionChangeComplete={handleRegionChangeComplete}
          markers={listings.flatMap(listing => listing.location.coordinates ? [{
            id: listing.id,
            ...listing.location.coordinates,
            title: listing.title,
            label: listing.currency === 'USD' ? `$${listing.price}` : `${listing.price} ${listing.currency}`,
            selected: selectedProperty?.id === listing.id,
          }] : [])}
          onMarkerPress={handleMarkerPress}
        />

        {/* Center Map Button */}
        <TouchableOpacity
          style={styles.centerButton}
          accessibilityRole="button" accessibilityLabel="Recentrer la carte"
          onPress={handleCenterMap}
        >
          <Ionicons name="location" size={22} color={colors.gray[800]} />
        </TouchableOpacity>

        {/* List View Button */}
        <TouchableOpacity
          style={styles.listButton}
          accessibilityRole="button" accessibilityLabel="Voir la liste des logements"
          onPress={handleGoToList}
        >
          <Ionicons name="list" size={22} color={colors.white} />
        </TouchableOpacity>

        {/* Property Preview Card */}
        {selectedProperty && (
          <MapPreviewCard
            property={selectedProperty}
            onClose={handleCardClose}
            onViewDetails={handleViewDetails}
          />
        )}

      </View>
      {/* Filters Modal */}
      <SearchFiltersModal
        visible={showFiltersModal}
        onDismiss={toggleFiltersModal}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  mapFrame: { flex: 1 },
  map: {
    flex: 1,
    width: '100%',
  },
  centerButton: {
    position: 'absolute',
    top: 16,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  listButton: {
    position: 'absolute',
    top: 72,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
});

export default MapScreen;
