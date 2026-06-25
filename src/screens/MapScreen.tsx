import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Image,
  Dimensions,
  FlatList,
  Platform
} from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Property } from '../types';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import BottomSheet from '@gorhom/bottom-sheet';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';
import Animated, { FadeIn, FadeInUp, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';

// Components
import PriceMarker from '../components/PriceMarker';
import MapPreviewCard from '../components/MapPreviewCard';
import MapScreenHeader from '../components/MapScreenHeader';
import SearchFiltersModal from '../components/SearchFiltersModal';

// Types and Data
import { mockListings } from '../data/mockListings';
import { useSearchStore } from '../store/search';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.8;
const CARD_HEIGHT = 160;
const CARD_SPACING = 16;

type MapScreenNavigationProp = BottomTabNavigationProp<RootStackParamList>;

// Initial region (Gisenyi, Rwanda)
const INITIAL_REGION: Region = {
  latitude: -1.7028,
  longitude: 29.2567,
  latitudeDelta: 0.025,
  longitudeDelta: 0.025,
};

const MapScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<MapScreenNavigationProp>();
  const theme = useTheme();
  const mapRef = useRef<MapView>(null);
  const bottomSheetRef = useRef<any>(null);
  const flatListRef = useRef<FlatList>(null);
  const { toggleFiltersModal, showFiltersModal } = useSearchStore();
  
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [region, setRegion] = useState<Region>(INITIAL_REGION);
  const [visibleListings, setVisibleListings] = useState<Property[]>(mockListings);
  const [showList, setShowList] = useState(true);
  
  // Dummy function to simulate when map region changes (for counting visible listings)
  const handleRegionChangeComplete = (newRegion: Region) => {
    setRegion(newRegion);
    
    // This would normally filter listings based on visible map region
    // For now, we'll just use all mock listings
    setVisibleListings(mockListings);
  };
  
  // Handle marker press
  const handleMarkerPress = (propertyId: string) => {
    const property = mockListings.find(item => item.id === propertyId);
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

  // Rendu des marqueurs
  const renderMarker = (item: Property) => (
    <Marker
      key={item.id}
      coordinate={item.location?.coordinates || { latitude: 0, longitude: 0 }}
      onPress={() => handleMarkerPress(item.id)}
    >
      <View style={[
        styles.markerContainer,
        selectedProperty?.id === item.id && styles.selectedMarker
      ]}>
        <Text style={styles.markerText}>
          {item.price} {item.currency}
        </Text>
      </View>
    </Marker>
  );

  // Rendu des cartes de propriété
  const renderPropertyCard = ({ item, index }: { item: Property; index: number }) => (
    <Animated.View
      entering={FadeInUp.delay(index * 100).duration(400)}
      style={[
        styles.card,
        selectedProperty?.id === item.id && styles.selectedCard
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => handleViewDetails(item.id)}
        style={styles.cardTouchable}
      >
        <Image
          source={{ uri: item.images[0] }}
          style={styles.cardImage}
          resizeMode="cover"
        />
        
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLocation}>{item.location?.district}</Text>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={14} color={colors.black} />
              <Text style={styles.ratingText}>{item.rating}</Text>
            </View>
          </View>
          
          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
          
          <View style={styles.priceContainer}>
            <Text style={styles.priceText}>
              <Text style={styles.priceBold}>{item.price} {item.currency}</Text>
              <Text style={styles.priceUnit}> {t('property.perNight')}</Text>
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Map View */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={INITIAL_REGION}
        onRegionChangeComplete={handleRegionChangeComplete}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={false}
        showsBuildings={true}
        showsTraffic={false}
        showsIndoors={false}
        toolbarEnabled={false}
      >
        {/* Price Markers */}
        {mockListings.map(listing => (
          listing.location.coordinates && (
            <PriceMarker
              key={listing.id}
              id={listing.id}
              price={listing.price}
              currency={listing.currency}
              coordinate={listing.location.coordinates}
              isSelected={selectedProperty?.id === listing.id}
              onPress={handleMarkerPress}
            />
          )
        ))}
      </MapView>
      
      {/* Header */}
      <MapScreenHeader 
        onBackPress={handleBackPress}
        onFilterPress={handleFilterPress}
        listingsCount={visibleListings.length}
      />
      
      {/* Center Map Button */}
      <TouchableOpacity 
        style={styles.centerButton}
        onPress={handleCenterMap}
      >
        <Ionicons name="location" size={22} color={colors.gray[800]} />
      </TouchableOpacity>
      
      {/* List View Button */}
      <TouchableOpacity 
        style={styles.listButton}
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
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  centerButton: {
    position: 'absolute',
    bottom: 120,
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
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  markerContainer: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: spacing[2],
    paddingHorizontal: spacing[3],
    borderWidth: 1,
    borderColor: colors.gray[200],
    ...shadows.sm,
  },
  selectedMarker: {
    backgroundColor: colors.primary,
    borderColor: colors.white,
  },
  markerText: {
    color: colors.black,
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    marginHorizontal: CARD_SPACING / 2,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.white,
    ...shadows.md,
    overflow: 'hidden',
  },
  selectedCard: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  cardTouchable: {
    flex: 1,
    flexDirection: 'row',
  },
  cardImage: {
    width: CARD_HEIGHT - 20,
    height: CARD_HEIGHT - 20,
    margin: 10,
    borderRadius: borderRadius.md,
  },
  cardContent: {
    flex: 1,
    padding: spacing[3],
    justifyContent: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[1],
  },
  cardLocation: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.gray[700],
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: typography.fontSize.sm,
    color: colors.black,
    marginLeft: 2,
  },
  cardTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: colors.black,
    marginBottom: spacing[3],
  },
  priceContainer: {
    marginTop: 'auto',
  },
  priceText: {
    fontSize: typography.fontSize.base,
    color: colors.black,
  },
  priceBold: {
    fontWeight: '600',
  },
  priceUnit: {
    fontWeight: 'normal',
  },
});

export default MapScreen; 