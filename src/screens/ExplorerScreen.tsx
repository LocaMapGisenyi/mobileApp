import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  useWindowDimensions,
  Platform,
  RefreshControl,
  Image,
} from 'react-native';
import {
  Text,
  useTheme,
  ActivityIndicator,
  Button,
  Card,
  Avatar,
  Divider,
  IconButton,
} from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { Property } from '../types/index';
import SearchFiltersModal from '../components/SearchFiltersModal';
import { useSearchStore, SearchFilters } from '../store/search';
import { useUserStore } from '../store/user';
import { usePreferences } from '../store/preferences';
import { useTranslation } from 'react-i18next';
import { useFavoritesStore } from '../store/favorites';
import Animated, {
  FadeInUp,
  FadeIn,
  FadeInRight,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { colors as themeColors, spacing as themeSpacing, typography as themeTypo, borderRadius as themeBR } from '../theme';

const NUM_COLUMNS_THRESHOLD = 700;
const SEARCH_BAR_HEIGHT = 60;

// Définition des catégories personnalisées
const CUSTOM_CATEGORIES = [
  {
    id: 'all',
    labelKey: 'explore.categories.all',
    icon: 'explore',
    color: themeColors.primary,
  },
  {
    id: 'lake_view',
    labelKey: 'explore.categories.lake',
    icon: 'water',
    color: themeColors.primary,
    amenityFilter: ['Vue sur le lac', 'Lakefront']
  },
  {
    id: 'student',
    labelKey: 'explore.categories.student',
    icon: 'school',
    color: themeColors.primary,
    amenityFilter: ['Pour étudiants', 'Student housing']
  },
  {
    id: 'furnished',
    labelKey: 'explore.categories.furnished',
    icon: 'chair',
    color: themeColors.primary,
    amenityFilter: ['Meublé', 'Furnished']
  },
  {
    id: 'longTerm',
    labelKey: 'explore.categories.longTerm',
    icon: 'event-available',
    color: themeColors.primary,
    amenityFilter: ['Long séjour', 'Long term']
  },
  {
    id: 'villa',
    labelKey: 'explore.categories.villas',
    icon: 'villa',
    color: themeColors.primary,
    propertyType: 'villa'
  },
  {
    id: 'appartement',
    labelKey: 'explore.categories.apartments',
    icon: 'apartment',
    color: themeColors.primary,
    propertyType: 'appartement'
  },
  {
    id: 'new',
    labelKey: 'explore.categories.new',
    icon: 'fiber-new',
    color: themeColors.primary,
    isNew: true
  }
];


const ExplorerScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { t } = useTranslation();
  const { currency } = usePreferences();
  const { addFavorite, removeFavorite, isFavorite } = useFavoritesStore();
  const { width } = useWindowDimensions();

  const {
    listings,
    filteredListings,
    isLoading,
    filters,
    showFiltersModal,
    fetchListings,
    setQuery,
    setFilters,
    applyFilters,
    resetFilters,
    toggleFiltersModal,
  } = useSearchStore();

  const [numColumns, setNumColumns] = useState(width > NUM_COLUMNS_THRESHOLD ? 2 : 1);

  // Update numColumns reactively when width changes (orientation, multi-window)
  useEffect(() => {
    setNumColumns(width > NUM_COLUMNS_THRESHOLD ? 2 : 1);
  }, [width]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchText, setSearchText] = useState('');

  // Animation values for scroll-based effects
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Animated style for the sticky search header
  const searchBarAnimatedStyle = useAnimatedStyle(() => {
    const elevation = interpolate(
      scrollY.value,
      [0, 10],
      [0, 4],
      Extrapolation.CLAMP
    );

    return {
      zIndex: 1000,
      elevation: elevation,
      shadowOpacity: elevation * 0.1,
      shadowOffset: { width: 0, height: elevation * 0.5 },
    };
  });

  const handleFetchListings = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    await fetchListings();
    if (isRefresh) setRefreshing(false);
  }, [fetchListings]);

  useFocusEffect(
    useCallback(() => {
      if (listings.length === 0) {
        handleFetchListings();
      }
    }, [listings.length, handleFetchListings])
  );

  const handleSearch = () => {
    setQuery(searchText);
    setActiveCategory('all');
  };

  const handleCategoryPress = (categoryId: string) => {
    setActiveCategory(categoryId);

    const category = CUSTOM_CATEGORIES.find(cat => cat.id === categoryId);

    if (categoryId === 'all') {
      // Reset filters but keep the search query if any
      const newFilters: Partial<SearchFilters> = {
        ...filters,
        propertyType: undefined,
        amenities: undefined
      };
      setFilters(newFilters);
    } else if (category?.amenityFilter) {
      // Filter by amenities
      setFilters({
        ...filters,
        amenities: category.amenityFilter
      });
    } else if (category?.propertyType) {
      // Filter by property type
      setFilters({
        ...filters,
        propertyType: [category.propertyType]
      });
    } else if (category?.isNew) {
      // Filter for 'new' properties (added in the last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Apply a custom filter for new properties
      // Since our SearchFilters doesn't have dateAddedAfter directly,
      // we'll filter the listings after applying other filters
      setFilters({
        ...filters,
        // We'll handle the date filter in the rendering
      });
    }

    applyFilters();
  };

  const onResetFilters = () => {
    resetFilters();
    setActiveCategory('all');
    setSearchText('');
  };

  // Currency formatter
  const formatCurrency = (price: number, currency: string) => {
    switch (currency) {
      case 'USD':
        return `$${price}`;
      case 'EUR':
        return `€${price}`;
      default:
        return `${price.toLocaleString()} RWF`;
    }
  };

  const renderCategoryItem = ({ item, index }: { item: typeof CUSTOM_CATEGORIES[0]; index: number }) => (
    <Animated.View
      entering={FadeInRight.delay(index * 30).duration(300)}
      style={styles.categoryItem}
    >
      <TouchableOpacity
        onPress={() => handleCategoryPress(item.id)}
        style={[
          styles.categoryButton,
          activeCategory === item.id && styles.activeCategoryButton,
        ]}
        accessibilityRole="button"
        accessibilityLabel={t(item.labelKey)}
        accessibilityState={{ selected: activeCategory === item.id }}
      >
        <MaterialIcons
          name={item.icon as any}
          size={20}
          color={activeCategory === item.id ? themeColors.white : themeColors.inkMid}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      </TouchableOpacity>
      <Text
        style={[
          styles.categoryLabel,
          activeCategory === item.id && styles.activeCategoryLabel,
        ]}
        numberOfLines={1}
      >
        {t(item.labelKey)}
      </Text>
    </Animated.View>
  );

  const renderPropertyCard = ({ item, index }: { item: Property; index: number }) => {
    const currentlyFavorite = isFavorite(item.id);
    const isNew = new Date(item.createdAt).getTime() > Date.now() - (30 * 24 * 60 * 60 * 1000);

    const handleToggleFavorite = () => {
      if (currentlyFavorite) {
        removeFavorite(item.id);
      } else {
        addFavorite(item);
      }
    };

    return (
      <View
        style={[
          styles.cardWrapper,
          { width: numColumns === 1 ? '100%' : '50%' }
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigation.navigate('PropertyDetails', { propertyId: item.id })}
          style={styles.propertyCard}
        >
          <Animated.View
            entering={FadeInUp.delay(index * 50).duration(300)}
            style={styles.imageContainer}
          >
            <Image
              source={{ uri: Array.isArray(item.images) && item.images.length > 0 ?
                item.images[0] : 'https://images.unsplash.com/photo-1544984243-ec57ea16fe25?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80'
              }}
              style={styles.propertyImage}
              resizeMode="cover"
            />
            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={handleToggleFavorite}
              accessibilityRole="button"
              accessibilityLabel={currentlyFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              accessibilityState={{ selected: currentlyFavorite }}
            >
              <MaterialIcons
                name={currentlyFavorite ? 'favorite' : 'favorite-border'}
                size={22}
                color={currentlyFavorite ? themeColors.error : themeColors.white}
              />
            </TouchableOpacity>
            {isNew && (
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>{t('common.new')}</Text>
              </View>
            )}
          </Animated.View>

          <View style={styles.propertyInfo}>
            <View style={styles.ratingRow}>
              <Text style={styles.locationText}>
                {item.location?.district || item.location?.city || ''}
              </Text>
              {item.rating && (
                <View style={styles.ratingContainer}>
                  <MaterialIcons name="star" size={14} color={themeColors.inkMid} />
                  <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
                </View>
              )}
            </View>

            <Text style={styles.titleText} numberOfLines={1}>{item.title}</Text>

            <Text style={styles.detailsText}>
              {item.bedrooms} {t('property.bedrooms')} · {item.bathrooms} {t('property.bathrooms')}
              {item.size ? ` · ${item.size}m²` : ''}
            </Text>

            <View style={styles.priceContainer}>
              <Text style={styles.priceText}>
                <Text style={styles.priceBold}>
                  {formatCurrency(item.price, item.currency)}
                </Text>
                <Text style={styles.priceUnit}> / {t('property.perMonth')}</Text>
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.emptyContent}>
        <MaterialIcons name="search-off" size={56} color={themeColors.inkDisabled} />
        <Text style={styles.emptyTitle}>{t('explore.noResults')}</Text>
        <Text style={styles.emptySubtitle}>{t('explore.tryDifferent')}</Text>
        <Button
          mode="contained"
          onPress={onResetFilters}
          style={styles.resetButton}
          buttonColor={themeColors.primary}
        >
          {t('explore.resetFilters')}
        </Button>
      </Animated.View>
    </View>
  );

  // Filter new items if the "new" category is selected
  const displayedListings = activeCategory === 'new'
    ? filteredListings.filter(
        item => new Date(item.createdAt).getTime() > Date.now() - (30 * 24 * 60 * 60 * 1000)
      )
    : filteredListings;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={themeColors.surface} />

      {/* Sticky Search Bar */}
      <Animated.View style={[styles.searchBarContainer, searchBarAnimatedStyle]}>
        <TouchableOpacity
          style={styles.searchBar}
          activeOpacity={0.9}
          onPress={() => toggleFiltersModal()}
          accessibilityRole="button"
          accessibilityLabel={t('explore.searchPlaceholder')}
          accessibilityHint="Ouvre les filtres de recherche"
        >
          <MaterialIcons name="search" size={22} color={themeColors.inkMid} style={styles.searchIcon} />
          <Text style={styles.searchPlaceholder}>{t('explore.searchPlaceholder')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={toggleFiltersModal}
          accessibilityRole="button"
          accessibilityLabel="Filtres"
          accessibilityHint="Ouvre le panneau de filtres"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons name="tune" size={22} color={themeColors.inkMid} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => navigation.navigate('MapScreen')}
          accessibilityRole="button"
          accessibilityLabel="Voir sur la carte"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons name="map" size={22} color={themeColors.inkMid} />
        </TouchableOpacity>
      </Animated.View>

      {/* Main Content */}
      <Animated.ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => handleFetchListings(true)}
            colors={[themeColors.primary]}
            tintColor={themeColors.primary}
          />
        }
      >
        {/* Categories section */}
        <View style={styles.categoriesSection}>
          <FlatList
            data={CUSTOM_CATEGORIES}
            renderItem={renderCategoryItem}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
          />
        </View>

        {/* Results Count */}
        <View style={styles.resultsCountWrapper}>
          <View style={styles.resultsSeparator} />
          <View style={styles.resultsCountContainer}>
            <Text style={styles.resultsCount}>
              {displayedListings.length} {t('explore.results')}
            </Text>
          </View>
        </View>

        {/* Properties section */}
        <View style={styles.propertiesSection}>
          {isLoading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color={themeColors.primary} />
            </View>
          ) : displayedListings.length === 0 ? (
            renderEmptyState()
          ) : (
            <FlatList
              data={displayedListings}
              renderItem={renderPropertyCard}
              keyExtractor={(item) => item.id}
              numColumns={numColumns}
              key={numColumns}
              scrollEnabled={false}
              columnWrapperStyle={numColumns > 1 ? styles.propertiesGrid : undefined}
              maxToRenderPerBatch={8}
              windowSize={5}
              removeClippedSubviews
            />
          )}
        </View>


      </Animated.ScrollView>

      {/* Map Floating Button */}
      <TouchableOpacity
        style={styles.mapButton}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('MapScreen')}
        accessibilityRole="button"
        accessibilityLabel={t('map.title')}
        accessibilityHint="Ouvre la vue carte des logements"
      >
        <View style={styles.mapButtonInner}>
          <MaterialIcons name="map" size={20} color={themeColors.white} />
          <Text style={styles.mapButtonText}>{t('map.title')}</Text>
        </View>
      </TouchableOpacity>

      {/* Filters Modal */}
      <SearchFiltersModal
        visible={showFiltersModal}
        onDismiss={toggleFiltersModal}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: themeColors.background,
  },

  // ─── Search Bar ───────────────────────────────────────────────────────────
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: themeSpacing[4],
    paddingVertical: themeSpacing[3],
    backgroundColor: themeColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    backgroundColor: themeColors.surfaceSunken,
    borderRadius: themeBR.searchBar,
    paddingHorizontal: themeSpacing[4],
    borderWidth: 1.5,
    borderColor: themeColors.border,
  },
  searchIcon: {
    marginRight: themeSpacing[2],
  },
  searchPlaceholder: {
    color: themeColors.inkSubtle,
    fontSize: themeTypo.fontSize.base,
    flex: 1,
  },
  filterButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: themeSpacing[1],
  },

  // ─── Scroll Container ─────────────────────────────────────────────────────
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 120,
  },

  // ─── Categories ───────────────────────────────────────────────────────────
  categoriesSection: {
    marginTop: themeSpacing[3],
    marginBottom: themeSpacing[2],
  },
  categoriesList: {
    paddingHorizontal: themeSpacing[5],
  },
  categoryItem: {
    alignItems: 'center',
    width: 70,
    marginRight: themeSpacing[4],
  },
  categoryButton: {
    width: 52,
    height: 52,
    borderRadius: themeBR.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: themeSpacing[2],
    backgroundColor: themeColors.surface,
    borderWidth: 1.5,
    borderColor: themeColors.border,
  },
  activeCategoryButton: {
    backgroundColor: themeColors.primary,
    borderColor: themeColors.primary,
  },
  categoryLabel: {
    fontSize: themeTypo.fontSize.xs,
    color: themeColors.inkSubtle,
    textAlign: 'center',
    fontWeight: '400',
  },
  activeCategoryLabel: {
    color: themeColors.primary,
    fontWeight: '600',
  },

  // ─── Results Count ────────────────────────────────────────────────────────
  resultsCountWrapper: {
    marginBottom: themeSpacing[2],
  },
  resultsSeparator: {
    height: 1,
    backgroundColor: themeColors.border,
  },
  resultsCountContainer: {
    paddingHorizontal: themeSpacing[5],
    paddingTop: themeSpacing[3],
  },
  resultsCount: {
    fontSize: themeTypo.fontSize.sm,
    color: themeColors.inkSubtle,
  },

  // ─── Properties ───────────────────────────────────────────────────────────
  propertiesSection: {
    paddingHorizontal: themeSpacing[5],
  },
  propertiesGrid: {
    justifyContent: 'space-between',
  },
  cardWrapper: {
    paddingHorizontal: themeSpacing[1],
    marginBottom: themeSpacing[5],
  },
  propertyCard: {
    overflow: 'hidden',
    borderRadius: themeBR.card,
    backgroundColor: themeColors.surface,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  imageContainer: {
    position: 'relative',
    height: 190,
    borderTopLeftRadius: themeBR.card,
    borderTopRightRadius: themeBR.card,
    overflow: 'hidden',
  },
  propertyImage: {
    width: '100%',
    height: '100%',
  },
  favoriteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(15,31,31,0.35)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: themeColors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: themeBR.md,
  },
  badgeText: {
    fontSize: themeTypo.fontSize.xs,
    fontWeight: '700',
    color: themeColors.white,
    letterSpacing: 0.3,
  },
  propertyInfo: {
    padding: themeSpacing[3],
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: themeSpacing[1],
  },
  locationText: {
    fontSize: themeTypo.fontSize.sm,
    color: themeColors.inkSubtle,
    fontWeight: '500',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: themeTypo.fontSize.sm,
    fontWeight: '500',
    color: themeColors.inkMid,
    marginLeft: 2,
  },
  titleText: {
    fontSize: themeTypo.fontSize.base,
    fontWeight: '600',
    color: themeColors.ink,
    marginBottom: themeSpacing[1],
  },
  detailsText: {
    fontSize: themeTypo.fontSize.xs,
    color: themeColors.inkSubtle,
    lineHeight: 17,
  },
  priceContainer: {
    marginTop: themeSpacing[2],
  },
  priceText: {
    fontSize: themeTypo.fontSize.base,
  },
  priceBold: {
    fontWeight: '700',
    color: themeColors.primary,
  },
  priceUnit: {
    fontWeight: '400',
    color: themeColors.inkSubtle,
    fontSize: themeTypo.fontSize.sm,
  },

  // ─── Empty State ──────────────────────────────────────────────────────────
  emptyContainer: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyContent: {
    alignItems: 'center',
    paddingHorizontal: themeSpacing[6],
  },
  emptyTitle: {
    fontSize: themeTypo.fontSize.md,
    fontWeight: '600',
    color: themeColors.ink,
    marginTop: themeSpacing[4],
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: themeTypo.fontSize.base,
    color: themeColors.inkSubtle,
    textAlign: 'center',
    marginTop: themeSpacing[2],
    marginBottom: themeSpacing[5],
    lineHeight: 22,
  },
  resetButton: {
    borderRadius: themeBR.md,
  },
  loaderContainer: {
    paddingVertical: 48,
    alignItems: 'center',
  },

  // ─── Floating Map Button ─────────────────────────────────────────────────
  mapButton: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    borderRadius: themeBR.full,
    backgroundColor: themeColors.primary,
    shadowColor: themeColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 6,
  },
  mapButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 22,
    gap: 6,
  },
  mapButtonText: {
    color: themeColors.white,
    fontWeight: '600',
    fontSize: themeTypo.fontSize.sm,
  },
});

export default ExplorerScreen;
