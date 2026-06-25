import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Linking, Share, Platform, StatusBar, SafeAreaView, Image, FlatList, Dimensions } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { Text, Button, Chip, ActivityIndicator, IconButton, Divider, Surface, useTheme, SegmentedButtons } from 'react-native-paper';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInUp, FadeInDown, SlideInUp, SlideInDown } from 'react-native-reanimated';
import MapView, { Marker } from 'react-native-maps';
import { useTranslation } from 'react-i18next';

// Hooks et composants personnalisés
import useListingById from '../hooks/useListingById';
import { usePreferences } from '../store/preferences';
import ImageCarousel from '../components/ImageCarousel';
import AmenityTag from '../components/AmenityTag';
import SectionTitle from '../components/SectionTitle';
import FavoriteButton from '../components/FavoriteButton';
import { useFavoritesStore } from '../store/favorites';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';
import useReviewsStore from '../store/reviews';
import ReviewCard from '../components/ReviewCard';
import RatingStars from '../components/RatingStars';

// Images mockées pour le carousel
const mockImages = [
  'https://images.unsplash.com/photo-1574362848149-11496d93a7c7',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750',
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2',
];

type LogementDetailRouteProp = RouteProp<RootStackParamList, 'PropertyDetails'>;
type LogementDetailNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const screenWidth = Dimensions.get('window').width;

const mockPropertyDetails = {
  id: '1',
  title: 'Villa moderne avec vue sur le lac Kivu',
  description: 'Cette belle villa entièrement rénovée offre une vue imprenable sur le lac Kivu et les montagnes environnantes. Située dans un quartier calme et sécurisé à seulement 5 minutes en voiture du centre-ville de Gisenyi, cette propriété combine parfaitement le confort moderne et la tranquillité.',
  price: 120000,
  currency: 'RWF',
  location: {
    address: '123 Avenue du Lac, Gisenyi',
    city: 'Gisenyi',
    district: 'Rubavu',
    coordinates: {
      latitude: -1.7011,
      longitude: 29.2569,
    },
  },
  details: {
    bedrooms: 3,
    bathrooms: 2,
    size: 150, // en m²
    furnished: true,
    yearBuilt: 2019,
  },
  amenities: [
    'wifi',
    'parking',
    'garden',
    'securityGuard',
    'waterTank',
    'generator',
    'ac',
    'kitchen',
    'tv',
  ],
  images: [
    'https://a0.muscache.com/im/pictures/miso/Hosting-826494959841460145/original/d0e6368d-bab0-4394-9947-a5662e6fcd81.jpeg',
    'https://a0.muscache.com/im/pictures/miso/Hosting-826494959841460145/original/e0dc0e2c-8100-4fbf-b860-1d1ead7c687a.jpeg',
    'https://a0.muscache.com/im/pictures/miso/Hosting-826494959841460145/original/8f0ba3bc-44ec-4388-bbb4-b9b12f073975.jpeg',
    'https://a0.muscache.com/im/pictures/miso/Hosting-826494959841460145/original/de5eaaf1-ce0b-4703-b67d-9bbdeecb1e7b.jpeg',
  ],
  owner: {
    id: 'owner1',
    name: 'Jean-Pierre Habimana',
    photo: 'https://randomuser.me/api/portraits/men/32.jpg',
    phone: '+250 78 123 4567',
    email: 'jp.habimana@example.com',
    responseRate: 95,
    responseTime: 'En quelques heures',
    memberSince: '2018',
  },
  reviews: {
    average: 4.8,
    total: 24,
  },
};

// Map des amenités pour les icônes et les traductions
const amenityIcons: Record<string, { icon: string; label: string }> = {
  wifi: { icon: 'wifi', label: 'amenities.wifi' },
  parking: { icon: 'car', label: 'amenities.parking' },
  garden: { icon: 'leaf', label: 'amenities.garden' },
  securityGuard: { icon: 'shield-checkmark', label: 'amenities.security' },
  waterTank: { icon: 'water', label: 'amenities.waterTank' },
  generator: { icon: 'flash', label: 'amenities.generator' },
  ac: { icon: 'snow', label: 'amenities.ac' },
  kitchen: { icon: 'restaurant', label: 'amenities.kitchen' },
  tv: { icon: 'tv', label: 'amenities.tv' },
};

const LogementDetailScreen = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<LogementDetailNavigationProp>();
  const route = useRoute<LogementDetailRouteProp>();
  const { propertyId } = route.params;
  const { currency } = usePreferences();
  const { addFavorite, removeFavorite, isFavorite } = useFavoritesStore();
  const { getAverageRating, getReviewsForProperty, getSortedReviews } = useReviewsStore();
  
  // États locaux
  const [priceMode, setPriceMode] = useState('monthly'); // 'nightly' ou 'monthly'
  
  // États pour les avis
  const [reviewSortOrder, setReviewSortOrder] = useState<'recent' | 'highest' | 'lowest'>('recent');
  const [showAllReviews, setShowAllReviews] = useState(false);
  
  // Récupération des données du logement
  const { listing, isLoading, error } = useListingById(propertyId);
  
  // Gestion des favoris
  const handleFavoriteToggle = () => {
    if (!listing) return;
    
    if (isFavorite(propertyId)) {
      removeFavorite(propertyId);
    } else {
      addFavorite(listing);
    }
  };

  // Formatage du prix avec la devise choisie
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

  // Calcul du prix mensuel (pour l'exemple - dans un cas réel, cela viendrait de l'API)
  const calculateMonthlyPrice = (nightlyPrice: number) => {
    return Math.round(nightlyPrice * 25); // Approximation
  };

  // Partager l'annonce
  const handleShare = async () => {
    if (!listing) return;
    
    try {
      await Share.share({
        title: listing.title,
        message: t('property.shareMessage', { 
          title: listing.title,
          price: `${formatPrice(listing.price, listing.currency)}/${priceMode === 'monthly' ? 'mois' : 'nuit'} - LocaMap`,
        }),
      });
    } catch (error) {
      console.error('Erreur lors du partage:', error);
    }
  };

  // Contacter le propriétaire
  const handleContact = () => {
    if (!listing?.owner) return;
    
    // Navigate to the NewMessage screen to contact the owner
    navigation.navigate('NewMessage', {
      propertyId: listing.id,
      propertyTitle: listing.title,
      ownerId: listing.owner.id,
      ownerName: listing.owner.name,
      ownerAvatar: listing.owner.avatar || 'https://a0.muscache.com/defaults/user_pic-50x50.png?v=3'
    });
  };

  // Ouvrir la position sur la carte
  const handleViewOnMap = () => {
    // Navigation vers MapScreen
    navigation.navigate('MapScreen');
  };

  // Récupérer les avis pour ce logement
  const propertyReviews = getSortedReviews(propertyId, reviewSortOrder);
  const averageRating = getAverageRating(propertyId);
  
  // Fonction pour aller à l'écran de publication d'avis
  const handleLeaveReview = () => {
    if (!listing) return;
    
    navigation.navigate('LeaveReview', {
      propertyId: listing.id,
      propertyTitle: listing.title,
      ownerId: listing.owner?.id || 'unknown',
      ownerName: listing.owner?.name || 'Propriétaire',
    });
  };
  
  // Filtrer les avis à afficher (limité ou tous)
  const displayedReviews = showAllReviews 
    ? propertyReviews 
    : propertyReviews.slice(0, 3);

  // Indicateur de chargement
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  // Gestion des erreurs
  if (error || !listing) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={64} color="#e57373" />
        <Text style={styles.errorText}>{error || t('common.unknownError')}</Text>
        <Button 
          mode="contained" 
          onPress={() => navigation.goBack()}
          style={{ marginTop: 20 }}
        >
          {t('common.back')}
        </Button>
      </View>
    );
  }

  // Déterminer si le logement est adapté pour certains types de locataires
  const isSuitableForStudents = (listing.amenities || []).some(a =>
    a.toLowerCase().includes('bureau') ||
    a.toLowerCase().includes('wifi') ||
    a.toLowerCase().includes('étude')
  );

  const isLongTermFriendly = (listing.size || 0) >= 40 && (listing.bedrooms || 0) >= 1;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
      {/* Header avec bouton retour */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.gray[800]} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerActionButton}
            onPress={handleShare}
          >
            <Ionicons name="share-outline" size={22} color={colors.gray[800]} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerActionButton}>
            <FavoriteButton
              propertyId={propertyId}
              onPress={handleFavoriteToggle}
              size={22}
              showBackground={false}
            />
          </TouchableOpacity>
        </View>
      </View>
      
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Carousel d'images */}
        <View style={styles.carouselContainer}>
          <ImageCarousel 
            images={listing.images.length > 0 ? mockImages : []} 
            height={280}
          />
          
          {/* Badge disponibilité */}
          <Animated.View 
            entering={SlideInUp ? SlideInUp.duration(400).delay(200) : undefined}
            style={styles.availabilityBadgeContainer}
          >
            <Surface style={[
              styles.availabilityBadge, 
              { 
                backgroundColor: listing.available 
                  ? '#e6f7ed' 
                  : '#ffeded',
                borderColor: listing.available 
                  ? '#4acf8c' 
                  : '#f27272' 
              }
            ]}>
              <MaterialIcons 
                name={listing.available ? "check-circle" : "cancel"} 
                size={18} 
                color={listing.available ? '#4acf8c' : '#f27272'} 
              />
              <Text style={[
                styles.availabilityText,
                { color: listing.available ? '#1f9d58' : '#d42e2e' }
              ]}>
                {listing.available ? t('property.available') : t('property.unavailable')}
              </Text>
            </Surface>
          </Animated.View>
        </View>

        {/* Informations principales */}
        <Animated.View 
          entering={FadeInUp ? FadeInUp.duration(400) : undefined}
          style={styles.mainInfoContainer}
        >
          <Text style={styles.title}>{listing.title}</Text>
          
          <View style={styles.locationRow}>
            <MaterialIcons name="place" size={20} color={colors.gray[600]} />
            <Text style={styles.location}>
              {listing.location?.district ? `${listing.location?.district}, ` : ''}
              {listing.location?.city}
            </Text>
          </View>
          
          {/* Type de logement et contrat */}
          <View style={styles.contractTypeContainer}>
            <Chip 
              style={styles.typeChip} 
              textStyle={styles.typeChipText}
            >
              {listing.type || 'Logement'}
            </Chip>
            
            <Chip 
              style={[styles.typeChip, styles.contractChip]} 
              textStyle={styles.typeChipText}
              icon="calendar-range"
            >
              Court et long terme
            </Chip>
          </View>
          
          {/* Options de prix (nuit/mois) */}
          <View style={styles.priceOptionsContainer}>
            <SegmentedButtons
              value={priceMode}
              onValueChange={setPriceMode}
              buttons={[
                { value: 'nightly', label: t('property.perNight') },
                { value: 'monthly', label: t('property.perMonth') }
              ]}
              style={styles.segmentedButtons}
            />
          </View>
          
          {/* Affichage du prix */}
          <View style={styles.priceContainer}>
            <Text style={styles.price}>
              {priceMode === 'nightly' 
                ? formatPrice(listing.price, listing.currency)
                : formatPrice(calculateMonthlyPrice(listing.price), listing.currency)}
              <Text style={styles.priceUnit}>
                {priceMode === 'nightly' ? '/nuit' : '/mois'}
              </Text>
            </Text>
          </View>
          
          {/* Badges pour les types de séjour adaptés */}
          <View style={styles.suitableForContainer}>
            {isLongTermFriendly && (
              <View style={styles.suitableBadge}>
                <MaterialIcons name="home" size={16} color={colors.primary} />
                <Text style={styles.suitableText}>{t('property.suitableLongTerm')}</Text>
              </View>
            )}
            
            {isSuitableForStudents && (
              <View style={styles.suitableBadge}>
                <MaterialIcons name="school" size={16} color={colors.primary} />
                <Text style={styles.suitableText}>{t('property.suitableStudents')}</Text>
              </View>
            )}
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <MaterialIcons name="king-bed" size={22} color={colors.primary} />
              <Text style={styles.infoText}>
                {listing.bedrooms || 0} {(listing.bedrooms || 0) > 1 ? t('property.bedroomsPlural') : t('property.bedroomsSingular')}
              </Text>
            </View>
            
            <View style={styles.infoItem}>
              <MaterialIcons name="bathtub" size={22} color={colors.primary} />
              <Text style={styles.infoText}>
                {listing.bathrooms || 0} {(listing.bathrooms || 0) > 1 ? t('property.bathroomsPlural') : t('property.bathroomsSingular')}
              </Text>
            </View>
            
            <View style={styles.infoItem}>
              <MaterialIcons name="straighten" size={22} color={colors.primary} />
              <Text style={styles.infoText}>{listing.size} m²</Text>
            </View>
          </View>
        </Animated.View>

        <Divider style={styles.divider} />

        {/* Description */}
        <Animated.View 
          entering={FadeInUp ? FadeInUp.duration(400).delay(100) : undefined}
          style={styles.section}
        >
          <SectionTitle 
            title={t('property.description')} 
            icon="info-outline"
          />
          
          <Text style={styles.description}>{listing.description}</Text>
        </Animated.View>

        <Divider style={styles.divider} />

        {/* Conditions de location */}
        <Animated.View 
          entering={FadeInUp ? FadeInUp.duration(400).delay(150) : undefined}
          style={styles.section}
        >
          <SectionTitle 
            title={t('property.contract')} 
            icon="description"
          />
          
          <View style={styles.contractDetailsContainer}>
            <View style={styles.contractDetailItem}>
              <MaterialIcons name="timer" size={20} color={colors.primary} />
              <View>
                <Text style={styles.contractDetailTitle}>{t('property.contract.minDuration')}</Text>
                <Text style={styles.contractDetailText}>{t('property.contract.oneMonthRecommended')}</Text>
              </View>
            </View>
            
            <View style={styles.contractDetailItem}>
              <MaterialIcons name="account-balance-wallet" size={20} color={colors.primary} />
              <View>
                <Text style={styles.contractDetailTitle}>{t('property.contract.deposit')}</Text>
                <Text style={styles.contractDetailText}>{formatPrice(listing.price * 2, listing.currency)}</Text>
              </View>
            </View>
            
            <View style={styles.contractDetailItem}>
              <MaterialIcons name="event-available" size={20} color={colors.primary} />
              <View>
                <Text style={styles.contractDetailTitle}>{t('property.contract.notice')}</Text>
                <Text style={styles.contractDetailText}>{t('property.contract.noticeDetails')}</Text>
              </View>
            </View>
            
            <View style={styles.contractDetailItem}>
              <MaterialIcons name="attach-money" size={20} color={colors.primary} />
              <View>
                <Text style={styles.contractDetailTitle}>{t('property.contract.included')}</Text>
                <Text style={styles.contractDetailText}>{t('property.contract.utilities')}</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        <Divider style={styles.divider} />

        {/* Commodités */}
        <Animated.View 
          entering={FadeInUp ? FadeInUp.duration(400).delay(200) : undefined}
          style={styles.section}
        >
          <SectionTitle 
            title={t('property.amenities')} 
            icon="hotel-class"
          />
          
          <View style={styles.amenitiesContainer}>
            {(listing.amenities || []).map((amenity, index) => (
              <AmenityTag key={index} label={amenity} />
            ))}
          </View>
        </Animated.View>

        <Divider style={styles.divider} />

        {/* Localisation sur la carte */}
        {listing.location?.coordinates && (
          <Animated.View 
            entering={FadeInUp ? FadeInUp.duration(400).delay(300) : undefined}
            style={styles.section}
          >
            <SectionTitle 
              title={t('property.location')} 
              icon="place"
            />
            
            <View style={styles.mapContainer}>
              <View style={styles.mapWrapper}>
                <MapView
                  style={styles.map}
                  initialRegion={{
                    latitude: listing.location?.coordinates.latitude,
                    longitude: listing.location?.coordinates.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                  zoomEnabled={false}
                  rotateEnabled={false}
                  scrollEnabled={false}
                >
                  <Marker
                    coordinate={{
                      latitude: listing.location?.coordinates.latitude,
                      longitude: listing.location?.coordinates.longitude,
                    }}
                    title={listing.title}
                    description={listing.location?.address}
                  />
                </MapView>
              </View>
              
              <TouchableOpacity 
                style={styles.viewOnMapButton}
                onPress={handleViewOnMap}
              >
                <Text style={styles.viewOnMapText}>{t('property.viewOnMap')}</Text>
                <MaterialIcons name="arrow-forward" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        <Divider style={styles.divider} />

        {/* Services à proximité */}
        <Animated.View 
          entering={FadeInUp ? FadeInUp.duration(400).delay(350) : undefined}
          style={styles.section}
        >
          <SectionTitle 
            title={t('property.nearbyServices')} 
            icon="location-city"
          />
          
          <View style={styles.nearbyServicesContainer}>
            <View style={styles.nearbyService}>
              <MaterialIcons name="school" size={18} color={colors.gray[700]} />
              <Text style={styles.nearbyServiceText}>{t('property.nearby.university', { distance: 500 })}</Text>
            </View>
            
            <View style={styles.nearbyService}>
              <MaterialIcons name="shopping-cart" size={18} color={colors.gray[700]} />
              <Text style={styles.nearbyServiceText}>{t('property.nearby.market', { distance: 800 })}</Text>
            </View>
            
            <View style={styles.nearbyService}>
              <MaterialIcons name="local-hospital" size={18} color={colors.gray[700]} />
              <Text style={styles.nearbyServiceText}>{t('property.nearby.hospital', { distance: 1200 })}</Text>
            </View>
            
            <View style={styles.nearbyService}>
              <MaterialIcons name="restaurant" size={18} color={colors.gray[700]} />
              <Text style={styles.nearbyServiceText}>{t('property.nearby.restaurants', { distance: 300 })}</Text>
            </View>
          </View>
        </Animated.View>

        <Divider style={styles.divider} />

        {/* Informations pratiques */}
        <Animated.View 
          entering={FadeInUp ? FadeInUp.duration(400).delay(400) : undefined}
          style={styles.section}
        >
          <SectionTitle 
            title={t('property.practicalInfo')} 
            icon="info"
          />
          
          <View style={styles.infoSection}>
            <View style={styles.infoItem}>
              <MaterialIcons name="calendar-today" size={20} color={colors.primary} />
              <Text style={styles.infoText}>{t('property.availableSince', { date: new Date(listing.createdAt).toLocaleDateString() })}</Text>
            </View>
            
            <View style={styles.infoItem}>
              <MaterialIcons name="access-time" size={20} color={colors.primary} />
              <Text style={styles.infoText}>Type de bail: flexible</Text>
            </View>
            
            <View style={styles.infoItem}>
              <MaterialIcons name="people" size={20} color={colors.primary} />
              <Text style={styles.infoText}>{t('property.occupancy', { max: (listing.bedrooms || 0) * 2 })}</Text>
            </View>
          </View>
        </Animated.View>

        <Divider style={styles.divider} />

        {/* Coordonnées du propriétaire */}
        <Animated.View 
          entering={FadeInUp ? FadeInUp.duration(400).delay(500) : undefined}
          style={styles.section}
        >
          <SectionTitle 
            title={t('property.host')} 
            icon="person"
          />
          
          <View style={styles.ownerCard}>
            <View style={styles.ownerInfo}>
              <View style={styles.ownerIconContainer}>
                <MaterialIcons name="person" size={24} color={colors.white} />
              </View>
              <View>
                <Text style={styles.ownerName}>{listing.owner?.name}</Text>
                <Text style={styles.ownerContact}>
                  {listing.owner?.phone}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        <Divider style={styles.divider} />

        {/* Section des avis */}
        <Animated.View 
          entering={FadeInUp ? FadeInUp.duration(400).delay(450) : undefined}
          style={styles.section}
        >
          <SectionTitle 
            title={t('reviews.title')} 
            icon="star"
          />
          
          {propertyReviews.length > 0 ? (
            <View style={styles.reviewsContainer}>
              {/* En-tête avec note moyenne et filtres */}
              <View style={styles.reviewsHeader}>
                <View style={styles.ratingOverview}>
                  <Text style={styles.averageRating}>{averageRating.toFixed(1)}</Text>
                  <RatingStars 
                    rating={averageRating} 
                    size={18} 
                    disabled={true}
                    color="#FFB100"
                  />
                  <Text style={styles.reviewCount}>
                    ({propertyReviews.length} avis)
                  </Text>
                </View>
                
                {/* Sélecteur de tri */}
                {propertyReviews.length > 1 && (
                  <View style={styles.sortContainer}>
                    <Text style={styles.sortLabel}>{t('reviews.sortBy')}: </Text>
                    <TouchableOpacity
                      style={styles.sortButton}
                      onPress={() => {
                        // Cycle entre les options de tri
                        const orders: ('recent' | 'highest' | 'lowest')[] = ['recent', 'highest', 'lowest'];
                        const currentIndex = orders.indexOf(reviewSortOrder);
                        const nextIndex = (currentIndex + 1) % orders.length;
                        setReviewSortOrder(orders[nextIndex]);
                      }}
                    >
                      <Text style={styles.sortButtonText}>
                        {reviewSortOrder === 'recent' ? t('reviews.sortRecent') : 
                         reviewSortOrder === 'highest' ? t('reviews.sortHighest') : 
                         t('reviews.sortLowest')}
                      </Text>
                      <Ionicons name="chevron-down" size={14} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              
              {/* Liste des avis */}
              <View style={styles.reviewsList}>
                {displayedReviews.map((review, index) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    style={{ marginBottom: spacing[3] }}
                  />
                ))}
                
                {/* Bouton pour voir plus d'avis */}
                {propertyReviews.length > 3 && !showAllReviews && (
                  <TouchableOpacity
                    style={styles.showMoreButton}
                    onPress={() => setShowAllReviews(true)}
                  >
                    <Text style={styles.showMoreText}>
                      {t('reviews.seeAll', { count: propertyReviews.length })}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color={colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
              
              {/* Bouton pour ajouter un avis */}
              <Button
                mode="outlined"
                icon="star-outline"
                onPress={handleLeaveReview}
                style={styles.leaveReviewButton}
                textColor={colors.primary}
              >
                {t('reviews.writeReview')}
              </Button>
            </View>
          ) : (
            <View style={styles.noReviewsContainer}>
              <Text style={styles.noReviewsText}>
                {t('reviews.noReviews')}
              </Text>
              <Button
                mode="contained"
                icon="star-outline"
                onPress={handleLeaveReview}
                style={styles.firstReviewButton}
                buttonColor={colors.primary}
              >
                {t('reviews.writeReview')}
              </Button>
            </View>
          )}
        </Animated.View>
        
        {/* Espace pour le bouton fixed en bas */}
        <View style={{ height: 80 }} />
      </ScrollView>
      
      {/* Boutons de contact */}
      <Animated.View 
        entering={FadeInUp ? FadeInUp.duration(400).delay(300) : undefined}
        style={styles.footerContainer}
      >
        <View style={styles.contactContainer}>
          <Button 
            mode="contained" 
            icon="message-text-outline"
            style={styles.contactButton}
            contentStyle={styles.contactButtonContent}
            buttonColor={colors.primary}
            onPress={handleContact}
          >
            {t('property.contactOwner')}
          </Button>
          
          {listing.owner?.phone && (
            <Button 
              mode="outlined" 
              icon="phone"
              style={[styles.contactButton, styles.callButton]}
              contentStyle={styles.contactButtonContent}
              textColor={colors.primary}
              onPress={() => Linking.openURL(`tel:${listing.owner?.phone}`)}
            >
              {t('property.call')}
            </Button>
          )}
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 + spacing[2] : spacing[2],
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing[2],
    ...shadows.sm,
  },
  carouselContainer: {
    position: 'relative',
  },
  scrollContent: {
    paddingBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.gray[600],
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.white,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.gray[600],
    textAlign: 'center',
  },
  availabilityBadgeContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    zIndex: 10,
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  availabilityText: {
    marginLeft: 6,
    fontWeight: 'bold',
    fontSize: 14,
  },
  mainInfoContainer: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: 'bold',
    color: colors.gray[800],
    marginBottom: spacing[2],
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  location: {
    fontSize: typography.fontSize.base,
    color: colors.gray[600],
    marginLeft: 4,
  },
  contractTypeContainer: {
    flexDirection: 'row',
    marginBottom: spacing[3],
    flexWrap: 'wrap',
  },
  typeChip: {
    backgroundColor: colors.primary + '20',
    marginRight: spacing[2],
    marginBottom: spacing[2],
  },
  contractChip: {
    backgroundColor: colors.gray[200],
  },
  typeChipText: { 
    color: colors.primary,
    fontWeight: '600',
  },
  priceOptionsContainer: {
    marginBottom: spacing[3],
  },
  segmentedButtons: {
    backgroundColor: colors.white,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  price: {
    fontSize: typography.fontSize.xl,
    fontWeight: 'bold',
    color: colors.primary,
  },
  priceUnit: {
    fontSize: typography.fontSize.base,
    fontWeight: 'normal',
    color: colors.gray[600],
  },
  suitableForContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing[3],
  },
  suitableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[100],
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
    borderRadius: borderRadius.full,
    marginRight: spacing[2],
    marginBottom: spacing[2],
  },
  suitableText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[800],
    marginLeft: 6,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  infoText: {
    marginLeft: 8,
    fontSize: typography.fontSize.sm,
    color: colors.gray[700],
  },
  divider: {
    marginVertical: spacing[4],
  },
  section: {
    paddingHorizontal: spacing[4],
  },
  description: {
    fontSize: typography.fontSize.base,
    lineHeight: 24,
    color: colors.gray[700],
  },
  contractDetailsContainer: {
    marginTop: spacing[2],
  },
  contractDetailItem: {
    flexDirection: 'row',
    marginBottom: spacing[3],
  },
  contractDetailTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.gray[800],
    marginLeft: spacing[2],
  },
  contractDetailText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    marginLeft: spacing[2],
    marginTop: 2,
  },
  amenitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  nearbyServicesContainer: {
    marginTop: spacing[2],
  },
  nearbyService: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  nearbyServiceText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[700],
    marginLeft: spacing[2],
  },
  mapContainer: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  mapWrapper: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  map: {
    height: 180,
    borderRadius: borderRadius.lg,
  },
  viewOnMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
    backgroundColor: colors.gray[100],
  },
  viewOnMapText: {
    marginRight: 8,
    fontWeight: '500',
    color: colors.primary,
  },
  infoSection: {
    gap: spacing[3],
  },
  ownerCard: {
    padding: spacing[4],
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.lg,
  },
  ownerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ownerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  ownerName: {
    fontSize: typography.fontSize.lg,
    fontWeight: 'bold',
    color: colors.gray[800],
    marginBottom: 4,
  },
  ownerContact: {
    fontSize: typography.fontSize.base,
    color: colors.gray[600],
  },
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  contactContainer: {
    flexDirection: 'row',
  },
  contactButton: {
    flex: 1,
    borderRadius: borderRadius.full,
  },
  contactButtonContent: {
    paddingVertical: spacing[1],
  },
  callButton: {
    marginLeft: 12,
    borderColor: colors.primary,
  },
  reviewsContainer: {
    marginTop: spacing[2],
  },
  reviewsHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing[4],
  },
  ratingOverview: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  averageRating: {
    fontSize: typography.fontSize.xl,
    fontWeight: 'bold',
    color: colors.gray[800],
    marginRight: spacing[2],
  },
  reviewCount: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    marginLeft: spacing[2],
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[600],
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing[1],
  },
  sortButtonText: {
    fontSize: typography.fontSize.xs,
    color: colors.primary,
    fontWeight: '500',
    marginRight: 2,
  },
  reviewsList: {
    marginBottom: spacing[4],
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[2],
  },
  showMoreText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: '500',
    marginRight: spacing[1],
  },
  leaveReviewButton: {
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    marginVertical: spacing[2],
  },
  noReviewsContainer: {
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.md,
    padding: spacing[4],
    alignItems: 'center',
  },
  noReviewsText: {
    fontSize: typography.fontSize.base,
    color: colors.gray[600],
    textAlign: 'center',
    marginBottom: spacing[3],
  },
  firstReviewButton: {
    borderRadius: borderRadius.md,
  },
});

export default LogementDetailScreen; 