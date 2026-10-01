import { SkeletonScreen } from '../components/ContentSkeleton';
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Linking,
  Share,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { Text, Button, Surface } from 'react-native-paper';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import PropertyMap from '../components/PropertyMap';
import { useTranslation } from 'react-i18next';

// Hooks et composants personnalisés
import { recordViewedProperty } from '../services/history.service';
import useListingById from '../hooks/useListingById';
import ImageCarousel from '../components/ImageCarousel';
import AmenityTag from '../components/AmenityTag';
import SectionTitle from '../components/SectionTitle';
import FavoriteButton from '../components/FavoriteButton';
import { useFavoritesStore } from '../store/favorites';
import { useUserStore } from '../store/user';
import { colors, spacing, typography, borderRadius } from '../theme';
import useReviewsStore from '../store/reviews';
import ReviewCard from '../components/ReviewCard';
import RatingStars from '../components/RatingStars';

type LogementDetailRouteProp = RouteProp<RootStackParamList, 'PropertyDetails'>;
type LogementDetailNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const LogementDetailScreen = () => {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const navigation = useNavigation<LogementDetailNavigationProp>();
  const route = useRoute<LogementDetailRouteProp>();
  const { propertyId } = route.params;
  const userId = useUserStore(state => state.user.id);
  const { addFavorite, removeFavorite, isFavorite } = useFavoritesStore();
  const {
    getAverageRating,
    getSortedReviews,
    fetchReviews,
    error: reviewError,
  } = useReviewsStore();
  const favoriteError = useFavoritesStore(state => state.error);
  useEffect(() => {
    void fetchReviews(propertyId);
    void useFavoritesStore.getState().fetchFavorites();
  }, [propertyId, fetchReviews]);

  // États locaux

  // États pour les avis
  const [reviewSortOrder, setReviewSortOrder] = useState<'recent' | 'highest' | 'lowest'>('recent');
  const [showAllReviews, setShowAllReviews] = useState(false);

  // Récupération des données du logement
  const { listing, isLoading, error } = useListingById(propertyId);
  useEffect(() => {
    if (listing?.id && userId) void recordViewedProperty(listing.id, userId).catch(() => {});
  }, [listing?.id, userId]);

  // Gestion des favoris
  const handleFavoriteToggle = () => {
    if (!listing) return;

    if (isFavorite(propertyId)) {
      removeFavorite(propertyId);
    } else {
      addFavorite(listing);
    }
  };

  const formatPrice = (price: number, originalCurrency: string) =>
    `${price.toLocaleString()} ${originalCurrency}`;

  // Partager l'annonce
  const handleShare = async () => {
    if (!listing) return;

    try {
      await Share.share({
        title: listing.title,
        message: t('property.shareMessage', {
          title: listing.title,
          price: `${formatPrice(listing.price, listing.currency)}/mois - LocaMap`,
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
      ownerAvatar:
        listing.owner.avatar || 'https://a0.muscache.com/defaults/user_pic-50x50.png?v=3',
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
  const displayedReviews = showAllReviews ? propertyReviews : propertyReviews.slice(0, 3);

  // Indicateur de chargement
  if (isLoading) return <SkeletonScreen variant="detail" />;

  // Gestion des erreurs
  if (error || !listing) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={64} color="#e57373" />
        <Text style={styles.errorText}>{error || t('common.unknownError')}</Text>
        <Button mode="contained" onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
          {t('common.back')}
        </Button>
      </View>
    );
  }

  // Déterminer si le logement est adapté pour certains types de locataires
  const isSuitableForStudents = (listing.amenities || []).some(
    a =>
      a.toLowerCase().includes('bureau') ||
      a.toLowerCase().includes('wifi') ||
      a.toLowerCase().includes('étude'),
  );

  const isLongTermFriendly = (listing.size || 0) >= 40 && (listing.bedrooms || 0) >= 1;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header avec bouton retour */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('pro.propertyTitle')}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerActionButton}
            accessibilityRole="button"
            accessibilityLabel={t('property.contactOwner')}
            onPress={handleContact}
          >
            <MaterialIcons name="chat-bubble-outline" size={21} color={colors.ink} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerActionButton}
            accessibilityRole="button"
            accessibilityLabel="Partager ce logement"
            onPress={handleShare}
          >
            <Ionicons name="share-outline" size={22} color={colors.ink} />
          </TouchableOpacity>
          <View style={styles.headerActionButton}>
            <FavoriteButton
              style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
              propertyId={propertyId}
              onPress={handleFavoriteToggle}
              size={22}
              showBackground={false}
            />
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {(reviewError || favoriteError) && (
          <Text accessibilityRole="alert">{reviewError || favoriteError}</Text>
        )}
        {/* Carousel d'images */}
        <View style={styles.carouselContainer}>
          <ImageCarousel
            key={propertyId}
            images={listing.images.length > 0 ? listing.images : []}
            height={Math.min(480, (width - 32) * 0.82)}
          />

          {/* Badge disponibilité */}
          <Animated.View style={styles.availabilityBadgeContainer}>
            <Surface
              elevation={0}
              style={[
                styles.availabilityBadge,
                {
                  backgroundColor: listing.available ? colors.primaryLight : '#ffeded',
                  borderColor: listing.available ? colors.primary : '#f27272',
                },
              ]}
            >
              <MaterialIcons
                name={listing.available ? 'check-circle' : 'cancel'}
                size={18}
                color={listing.available ? colors.primary : '#f27272'}
              />
              <Text
                style={[
                  styles.availabilityText,
                  { color: listing.available ? colors.primaryDark : '#d42e2e' },
                ]}
              >
                {listing.available ? t('property.available') : t('property.unavailable')}
              </Text>
            </Surface>
          </Animated.View>
        </View>

        {/* Informations principales */}
        <Animated.View style={styles.mainInfoContainer}>
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
                {t(`property.types.${listing.type}`, { defaultValue: listing.type || 'Logement' })}
              </Text>
            </View>

            <View style={[styles.typeChip, styles.contractChip]}>
              <MaterialIcons
                name="date-range"
                size={12}
                color={colors.inkMid}
                style={{ marginRight: 4 }}
              />
              <Text style={styles.typeChipText}>{t('pro.monthlyRental')}</Text>
            </View>
          </View>

          {/* Affichage du prix */}
          <View style={styles.priceContainer}>
            <Text style={styles.price}>{formatPrice(listing.price, listing.currency)}</Text>
            <Text style={styles.priceUnit}>{t('property.perMonth')}</Text>
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
                {listing.bedrooms || 0}{' '}
                {(listing.bedrooms || 0) > 1
                  ? t('property.bedroomsPlural')
                  : t('property.bedroomsSingular')}
              </Text>
            </View>

            <View style={styles.infoItem}>
              <MaterialIcons name="bathtub" size={22} color={colors.primary} />
              <Text style={styles.infoText}>
                {listing.bathrooms || 0}{' '}
                {(listing.bathrooms || 0) > 1
                  ? t('property.bathroomsPlural')
                  : t('property.bathroomsSingular')}
              </Text>
            </View>

            {!!listing.size && (
              <View style={styles.infoItem}>
                <MaterialIcons name="straighten" size={22} color={colors.primary} />
                <Text style={styles.infoText}>{listing.size} m²</Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Description */}
        <Animated.View style={styles.section}>
          <View style={styles.sectionSeparator} />
          <SectionTitle title={t('property.description')} icon="info-outline" />

          <Text style={styles.description}>{listing.description}</Text>
        </Animated.View>

        {/* Conditions de location */}
        <Animated.View style={styles.section}>
          <View style={styles.sectionSeparator} />
          <SectionTitle title={t('property.contract.title')} icon="description" />

          <View style={styles.contractDetailsContainer}>
            <View style={styles.contractDetailItem}>
              <MaterialIcons name="timer" size={20} color={colors.primary} />
              <View>
                <Text style={styles.contractDetailTitle}>{t('property.contract.minDuration')}</Text>
                <Text style={styles.contractDetailText}>
                  {t('pro.months', { count: listing.minDurationMonths ?? 1 })}
                </Text>
              </View>
            </View>

            <View style={styles.contractDetailItem}>
              <MaterialIcons name="account-balance-wallet" size={20} color={colors.primary} />
              <View>
                <Text style={styles.contractDetailTitle}>{t('property.contract.deposit')}</Text>
                <Text style={styles.contractDetailText}>
                  {formatPrice(listing.deposit ?? 0, listing.currency)}
                </Text>
              </View>
            </View>

            <View style={styles.contractDetailItem}>
              <MaterialIcons name="event-available" size={20} color={colors.primary} />
              <View>
                <Text style={styles.contractDetailTitle}>{t('property.contract.notice')}</Text>
                <Text style={styles.contractDetailText}>
                  {t('pro.days', { count: listing.noticePeriodDays ?? 30 })}
                </Text>
              </View>
            </View>

            <View style={styles.contractDetailItem}>
              <MaterialIcons name="attach-money" size={20} color={colors.primary} />
              <View>
                <Text style={styles.contractDetailTitle}>{t('property.contract.included')}</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Commodités */}
        <Animated.View style={styles.section}>
          <View style={styles.sectionSeparator} />
          <SectionTitle title={t('property.amenities')} icon="hotel-class" />

          <View style={styles.amenitiesContainer}>
            {(listing.amenities || []).map((amenity, index) => (
              <AmenityTag key={index} label={amenity} />
            ))}
          </View>
        </Animated.View>

        {/* Localisation sur la carte */}
        {listing.location?.coordinates && (
          <Animated.View style={styles.section}>
            <View style={styles.sectionSeparator} />
            <SectionTitle title={t('property.location')} icon="place" />

            <View style={styles.mapContainer}>
              <View style={styles.mapWrapper}>
                <PropertyMap
                  style={styles.map}
                  initialRegion={{
                    latitude: listing.location?.coordinates.latitude,
                    longitude: listing.location?.coordinates.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                  interactive={false}
                  markers={[
                    {
                      id: listing.id,
                      latitude: listing.location.coordinates.latitude,
                      longitude: listing.location.coordinates.longitude,
                      title: listing.title,
                    },
                  ]}
                />
              </View>

              <TouchableOpacity style={styles.viewOnMapButton} onPress={handleViewOnMap}>
                <Text style={styles.viewOnMapText}>{t('property.viewOnMap')}</Text>
                <MaterialIcons name="arrow-forward" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* Informations pratiques */}
        <Animated.View style={styles.section}>
          <View style={styles.sectionSeparator} />
          <SectionTitle title={t('property.practicalInfo')} icon="info" />

          <View style={styles.infoSection}>
            <View style={styles.infoItem}>
              <MaterialIcons name="calendar-today" size={20} color={colors.primary} />
              <Text style={styles.infoText}>
                {t('property.availableSince', {
                  date: new Date(listing.createdAt).toLocaleDateString(),
                })}
              </Text>
            </View>

            <View style={styles.infoItem}>
              <MaterialIcons name="access-time" size={20} color={colors.primary} />
              <Text style={styles.infoText}>{t('property.leaseType')}</Text>
            </View>

            <View style={styles.infoItem}>
              <MaterialIcons name="people" size={20} color={colors.primary} />
              <Text style={styles.infoText}>
                {t('property.occupancy', { max: listing.maxGuests ?? 1 })}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Coordonnées du propriétaire */}
        <Animated.View style={styles.section}>
          <View style={styles.sectionSeparator} />
          <SectionTitle title={t('property.host')} icon="person" />

          <View style={styles.ownerCard}>
            <View style={styles.ownerInfo}>
              <View style={styles.ownerIconContainer}>
                <MaterialIcons name="person" size={24} color={colors.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ownerName}>{listing.owner?.name}</Text>
                {listing.owner?.phone && (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={t('property.call')}
                    onPress={() => Linking.openURL('tel:' + listing.owner?.phone)}
                    style={{ minHeight: 44, justifyContent: 'center' }}
                  >
                    <Text style={styles.ownerContact}>{listing.owner.phone}</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity style={styles.contactOwnerButton} onPress={handleContact}>
                <Text style={styles.contactOwnerButtonText}>{t('property.contactOwner')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* Section des avis */}
        <Animated.View style={styles.section}>
          <View style={styles.sectionSeparator} />
          <SectionTitle title={t('reviews.title')} icon="star" />

          {propertyReviews.length > 0 ? (
            <View style={styles.reviewsContainer}>
              {/* En-tête avec note moyenne et filtres */}
              <View style={styles.reviewsHeader}>
                <View style={styles.ratingOverview}>
                  <Text style={styles.averageRating}>{averageRating.toFixed(1)}</Text>
                  <RatingStars rating={averageRating} size={18} disabled={true} color="#FFB100" />
                  <Text style={styles.reviewCount}>({propertyReviews.length} avis)</Text>
                </View>

                {/* Sélecteur de tri */}
                {propertyReviews.length > 1 && (
                  <View style={styles.sortContainer}>
                    <Text style={styles.sortLabel}>{t('reviews.sortBy')}: </Text>
                    <TouchableOpacity
                      style={styles.sortButton}
                      onPress={() => {
                        // Cycle entre les options de tri
                        const orders: ('recent' | 'highest' | 'lowest')[] = [
                          'recent',
                          'highest',
                          'lowest',
                        ];
                        const currentIndex = orders.indexOf(reviewSortOrder);
                        const nextIndex = (currentIndex + 1) % orders.length;
                        setReviewSortOrder(orders[nextIndex]);
                      }}
                    >
                      <Text style={styles.sortButtonText}>
                        {reviewSortOrder === 'recent'
                          ? t('reviews.sortRecent')
                          : reviewSortOrder === 'highest'
                            ? t('reviews.sortHighest')
                            : t('reviews.sortLowest')}
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
              <Text style={styles.noReviewsText}>{t('reviews.noReviews')}</Text>
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
      </ScrollView>

      <View style={styles.footerContainer}>
        <View style={styles.bookingBar}>
          <View style={styles.bookingPrice}>
            <Text style={styles.bookingAmount}>{formatPrice(listing.price, listing.currency)}</Text>
            <Text style={styles.bookingPeriod}>{t('property.perMonth')}</Text>
          </View>
          <TouchableOpacity
            style={styles.bookingAction}
            accessibilityRole="button"
            activeOpacity={0.82}
            onPress={
              listing.available && listing.owner?.id !== userId
                ? () => navigation.navigate('BookingRequest', { propertyId: listing.id })
                : handleContact
            }
          >
            <Text style={styles.bookingActionText}>
              {t(
                listing.available && listing.owner?.id !== userId
                  ? 'property.requestBooking'
                  : 'property.contactOwner',
              )}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  headerTitle: { flex: 1, marginLeft: 12, fontSize: 16, fontWeight: '600', color: colors.ink },
  bookingBar: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  bookingPrice: { flex: 1, gap: 2 },
  bookingAmount: { fontSize: 18, lineHeight: 24, fontWeight: '700', color: colors.ink },
  bookingPeriod: { fontSize: 12, color: colors.inkSubtle },
  bookingAction: {
    flex: 1.15,
    backgroundColor: colors.accent,
    borderRadius: 10,
    minHeight: 52,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookingActionText: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
    color: colors.onAccent,
    textAlign: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
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
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  scrollContent: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    paddingBottom: 24,
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
    alignSelf: 'flex-start',
    marginHorizontal: 8,
    marginTop: 12,
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  availabilityText: {
    marginLeft: 6,
    fontWeight: '600',
    fontSize: 12,
  },
  mainInfoContainer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 8,
  },
  title: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 8,
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
    flexWrap: 'wrap',
    alignItems: 'baseline',
    paddingVertical: 14,
    marginBottom: 16,
    gap: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  price: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.ink,
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
    flexWrap: 'wrap',
    rowGap: 12,
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
    paddingHorizontal: 24,
    paddingTop: 20,
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
    paddingVertical: 16,
    marginBottom: 16,
  },
  ownerInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
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
    backgroundColor: colors.primaryLight,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 44,
    maxWidth: '100%',
  },
  contactOwnerButtonText: {
    color: colors.primaryDark,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  footerContainer: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 20,
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
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    minHeight: 48,
    padding: 8,
  },
  contactButtonText: {
    flexShrink: 1,
    textAlign: 'center',
    color: colors.primary,
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
    minHeight: 48,
    paddingHorizontal: spacing[3],
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
