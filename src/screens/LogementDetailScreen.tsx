import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Linking, Share, Platform, StatusBar, Image, FlatList, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

type LogementDetailRouteProp = RouteProp<RootStackParamList, 'PropertyDetails'>;
type LogementDetailNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const screenWidth = Dimensions.get('window').width;

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
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header avec bouton retour */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerActionButton}
            onPress={handleShare}
          >
            <Ionicons name="share-outline" size={22} color={colors.ink} />
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
            images={listing.images.length > 0 ? listing.images : []}
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
            <MaterialIcons name="place" size={18} color={colors.primary} />
            <Text style={styles.location}>
              {listing.location?.district ? `${listing.location?.district}, ` : ''}
              {listing.location?.city}
            </Text>
          </View>

          {/* Type de logement et contrat */}
          <View style={styles.contractTypeContainer}>
            <View style={styles.typeChip}>
              <Text style={styles.typeChipText}>
                {listing.type || 'Logement'}
              </Text>
            </View>

            <View style={[styles.typeChip, styles.contractChip]}>
              <MaterialIcons name="date-range" size={12} color={colors.inkMid} style={{ marginRight: 4 }} />
              <Text style={styles.typeChipText}>
                Court et long terme
              </Text>
            </View>
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
            </Text>
            <Text style={styles.priceUnit}>
              {priceMode === 'nightly' ? '/nuit' : '/mois'}
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

        {/* Description */}
        <Animated.View
          entering={FadeInUp ? FadeInUp.duration(400).delay(100) : undefined}
          style={styles.section}
        >
          <View style={styles.sectionSeparator} />
          <SectionTitle
            title={t('property.description')}
            icon="info-outline"
          />

          <Text style={styles.description}>{listing.description}</Text>
        </Animated.View>

        {/* Conditions de location */}
        <Animated.View
          entering={FadeInUp ? FadeInUp.duration(400).delay(150) : undefined}
          style={styles.section}
        >
          <View style={styles.sectionSeparator} />
          <SectionTitle
            title={t('property.contract.title')}
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

        {/* Commodités */}
        <Animated.View
          entering={FadeInUp ? FadeInUp.duration(400).delay(200) : undefined}
          style={styles.section}
        >
          <View style={styles.sectionSeparator} />
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

        {/* Localisation sur la carte */}
        {listing.location?.coordinates && (
          <Animated.View
            entering={FadeInUp ? FadeInUp.duration(400).delay(300) : undefined}
            style={styles.section}
          >
            <View style={styles.sectionSeparator} />
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

        {/* Services à proximité */}
        <Animated.View
          entering={FadeInUp ? FadeInUp.duration(400).delay(350) : undefined}
          style={styles.section}
        >
          <View style={styles.sectionSeparator} />
          <SectionTitle
            title={t('property.nearbyServices')}
            icon="location-city"
          />

          <View style={styles.nearbyServicesContainer}>
            <View style={styles.nearbyService}>
              <MaterialIcons name="school" size={18} color={colors.inkSubtle} />
              <Text style={styles.nearbyServiceText}>{t('property.nearby.university', { distance: 500 })}</Text>
            </View>

            <View style={styles.nearbyService}>
              <MaterialIcons name="shopping-cart" size={18} color={colors.inkSubtle} />
              <Text style={styles.nearbyServiceText}>{t('property.nearby.market', { distance: 800 })}</Text>
            </View>

            <View style={styles.nearbyService}>
              <MaterialIcons name="local-hospital" size={18} color={colors.inkSubtle} />
              <Text style={styles.nearbyServiceText}>{t('property.nearby.hospital', { distance: 1200 })}</Text>
            </View>

            <View style={styles.nearbyService}>
              <MaterialIcons name="restaurant" size={18} color={colors.inkSubtle} />
              <Text style={styles.nearbyServiceText}>{t('property.nearby.restaurants', { distance: 300 })}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Informations pratiques */}
        <Animated.View
          entering={FadeInUp ? FadeInUp.duration(400).delay(400) : undefined}
          style={styles.section}
        >
          <View style={styles.sectionSeparator} />
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
              <Text style={styles.infoText}>{t('property.leaseType')}</Text>
            </View>

            <View style={styles.infoItem}>
              <MaterialIcons name="people" size={20} color={colors.primary} />
              <Text style={styles.infoText}>{t('property.occupancy', { max: (listing.bedrooms || 0) * 2 })}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Coordonnées du propriétaire */}
        <Animated.View
          entering={FadeInUp ? FadeInUp.duration(400).delay(500) : undefined}
          style={styles.section}
        >
          <View style={styles.sectionSeparator} />
          <SectionTitle
            title={t('property.host')}
            icon="person"
          />

          <View style={styles.ownerCard}>
            <View style={styles.ownerInfo}>
              <View style={styles.ownerIconContainer}>
                <MaterialIcons name="person" size={24} color={colors.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ownerName}>{listing.owner?.name}</Text>
                <Text style={styles.ownerContact}>
                  {listing.owner?.phone}
                </Text>
              </View>
              <TouchableOpacity style={styles.contactOwnerButton} onPress={handleContact}>
                <Text style={styles.contactOwnerButtonText}>Contacter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* Section des avis */}
        <Animated.View
          entering={FadeInUp ? FadeInUp.duration(400).delay(450) : undefined}
          style={styles.section}
        >
          <View style={styles.sectionSeparator} />
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
          <TouchableOpacity
            style={styles.contactButton}
            onPress={handleContact}
            activeOpacity={0.85}
          >
            <MaterialIcons name="message" size={18} color={colors.white} style={{ marginRight: 8 }} />
            <Text style={styles.contactButtonText}>{t('property.contactOwner')}</Text>
          </TouchableOpacity>

          {listing.owner?.phone && (
            <TouchableOpacity
              style={styles.callButton}
              onPress={() => Linking.openURL(`tel:${listing.owner?.phone}`)}
              activeOpacity={0.85}
            >
              <MaterialIcons name="phone" size={18} color={colors.inkMid} style={{ marginRight: 8 }} />
              <Text style={styles.callButtonText}>{t('property.call')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerActionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing[2],
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
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.inkSubtle,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.inkSubtle,
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
    backgroundColor: colors.surface,
    paddingHorizontal: spacing[5],
    paddingTop: spacing[5],
    paddingBottom: spacing[4],
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: colors.ink,
    marginBottom: spacing[2],
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  location: {
    fontSize: typography.fontSize.base,
    color: colors.inkSubtle,
    marginLeft: 4,
  },
  contractTypeContainer: {
    flexDirection: 'row',
    marginBottom: spacing[3],
    flexWrap: 'wrap',
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSunken,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    marginRight: spacing[2],
    marginBottom: spacing[2],
  },
  contractChip: {
    // inherits typeChip styles
  },
  typeChipText: {
    fontSize: typography.fontSize.xs,
    color: colors.inkMid,
    fontWeight: '600',
  },
  priceOptionsContainer: {
    marginBottom: spacing[3],
  },
  segmentedButtons: {
    backgroundColor: colors.surface,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing[3],
  },
  price: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.primary,
  },
  priceUnit: {
    fontSize: typography.fontSize.sm,
    fontWeight: '400',
    color: colors.inkSubtle,
    marginLeft: 4,
  },
  suitableForContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing[3],
  },
  suitableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSunken,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
    borderRadius: borderRadius.full,
    marginRight: spacing[2],
    marginBottom: spacing[2],
  },
  suitableText: {
    fontSize: typography.fontSize.sm,
    color: colors.inkMid,
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
    color: colors.inkMid,
  },
  sectionSeparator: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing[4],
  },
  section: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    backgroundColor: colors.surface,
  },
  description: {
    fontSize: typography.fontSize.base,
    lineHeight: 24,
    color: colors.inkMid,
    marginBottom: spacing[4],
  },
  contractDetailsContainer: {
    marginTop: spacing[2],
    marginBottom: spacing[4],
  },
  contractDetailItem: {
    flexDirection: 'row',
    marginBottom: spacing[3],
  },
  contractDetailTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.ink,
    marginLeft: spacing[2],
  },
  contractDetailText: {
    fontSize: typography.fontSize.sm,
    color: colors.inkSubtle,
    marginLeft: spacing[2],
    marginTop: 2,
  },
  amenitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  nearbyServicesContainer: {
    marginTop: spacing[2],
    marginBottom: spacing[4],
  },
  nearbyService: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  nearbyServiceText: {
    fontSize: typography.fontSize.sm,
    color: colors.inkMid,
    marginLeft: spacing[2],
  },
  mapContainer: {
    borderRadius: borderRadius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing[4],
  },
  mapWrapper: {
    borderTopLeftRadius: borderRadius.card,
    borderTopRightRadius: borderRadius.card,
    overflow: 'hidden',
  },
  map: {
    height: 180,
  },
  viewOnMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
    backgroundColor: colors.surfaceSunken,
  },
  viewOnMapText: {
    marginRight: 8,
    fontWeight: '500',
    color: colors.primary,
    fontSize: typography.fontSize.sm,
  },
  infoSection: {
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  ownerCard: {
    padding: spacing[4],
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.card,
    marginBottom: spacing[4],
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
    fontWeight: '600',
    color: colors.ink,
    marginBottom: 4,
  },
  ownerContact: {
    fontSize: typography.fontSize.base,
    color: colors.inkSubtle,
  },
  contactOwnerButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  contactOwnerButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  contactContainer: {
    flexDirection: 'row',
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    height: 52,
  },
  contactButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    height: 52,
    paddingHorizontal: spacing[4],
  },
  callButtonText: {
    color: colors.inkMid,
    fontSize: typography.fontSize.base,
    fontWeight: '500',
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
    color: colors.ink,
    marginRight: spacing[2],
  },
  reviewCount: {
    fontSize: typography.fontSize.sm,
    color: colors.inkSubtle,
    marginLeft: spacing[2],
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.inkSubtle,
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
    marginBottom: spacing[4],
  },
  noReviewsContainer: {
    backgroundColor: colors.surfaceSunken,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing[4],
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  noReviewsText: {
    fontSize: typography.fontSize.base,
    color: colors.inkSubtle,
    textAlign: 'center',
    marginBottom: spacing[3],
  },
  firstReviewButton: {
    borderRadius: borderRadius.md,
  },
});

export default LogementDetailScreen;
