import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Image, FlatList, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Searchbar, Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, Property } from '../types';
import { useSearchStore } from '../store/search';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import FavoriteButton from '../components/FavoriteButton';
import { useFavoritesStore } from '../store/favorites';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';

type SearchScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Search'>;

interface CategoryItem {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const SearchScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<SearchScreenNavigationProp>();
  const { listings, fetchListings, isLoading, error, setQuery, filters, hasMore, loadMore } = useSearchStore();
  const { addFavorite, removeFavorite, isFavorite, error: favoriteError } = useFavoritesStore();

  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    void fetchListings();
    void useFavoritesStore.getState().fetchFavorites();
  }, []);

  const handleViewProperty = (propertyId: string) => {
    navigation.navigate('PropertyDetails', { propertyId });
  };

  const handleFavoriteToggle = (property: Property) => {
    if (isFavorite(property.id)) {
      removeFavorite(property.id);
    } else {
      addFavorite(property);
    }
  };

  // Categories avec icônes
  const categories: CategoryItem[] = [
    { id: 'all', name: t('explore.categories.all'), icon: 'home-outline' },
    { id: 'apartment', name: t('property.types.apartment'), icon: 'business-outline' },
    { id: 'house', name: t('property.types.house'), icon: 'home' },
    { id: 'studio', name: t('property.types.studio'), icon: 'bed-outline' },
    { id: 'villa', name: t('property.types.villa'), icon: 'water-outline' },
  ];

  const renderCategoryItem = ({ item, index }: { item: CategoryItem; index: number }) => (
    <Animated.View
      style={styles.categoryItemContainer}
    >
      <TouchableOpacity
        style={[
          styles.categoryItem,
          selectedCategory === item.id && styles.selectedCategoryItem
        ]}
        onPress={() => { setSelectedCategory(item.id); useSearchStore.getState().setFilters({ propertyType: item.id === 'all' ? undefined : [item.id] }); void fetchListings(); }}
      >
        <Ionicons
          name={item.icon}
          size={24}
          color={selectedCategory === item.id ? colors.black : colors.gray[600]}
        />
      </TouchableOpacity>
      <Text
        style={[
          styles.categoryLabel,
          selectedCategory === item.id && styles.selectedCategoryLabel
        ]}
      >
        {item.name}
      </Text>
    </Animated.View>
  );

  const handleCreateAlertPress = () => {
    navigation.navigate('AlertPreferences');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <View style={styles.container}>
        {/* Barre de recherche */}
        <Animated.View
          style={styles.searchContainer}
        >
          <Searchbar
            placeholder={t('search.startSearch')}
            value={filters.query}
            onChangeText={setQuery}
            iconColor={colors.gray[700]}
            inputStyle={styles.searchInput}
            style={styles.searchBar}
            elevation={0}
            onIconPress={() => {}}
            clearIcon={() => null}
          />
          <TouchableOpacity
            style={styles.alertButton}
            onPress={handleCreateAlertPress}
          >
            <Ionicons name="notifications-outline" size={20} color={colors.gray[700]} />
          </TouchableOpacity>
          <LanguageSwitcher style={styles.languageButton} />
        </Animated.View>

        {/* Catégories */}
        <Animated.View>
          <FlatList
            data={categories}
            renderItem={renderCategoryItem}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
          />
        </Animated.View>

        {/* Tag "tous les frais compris" */}
        <Animated.View
          style={styles.tagContainer}
        >
          <View style={styles.pricingTag}>
            <Ionicons name="pricetag" size={14} color={colors.primary} />
            <Text style={styles.pricingTagText}>{t('property.perMonth')}</Text>
          </View>
        </Animated.View>

        {/* Liste des propriétés */}
        <ScrollView
          style={styles.propertiesContainer}
          showsVerticalScrollIndicator={false}
        >
          {(error || favoriteError) && <Text accessibilityRole="alert" onPress={() => { void fetchListings(); }}>{error || favoriteError} — {t('common.retry')}</Text>}
          {isLoading && listings.length === 0 && <ActivityIndicator style={{ marginVertical: 24 }} color={colors.primary} accessibilityLabel="Recherche des logements" />}
          {!isLoading && !error && listings.length === 0 && <Text>{t('explore.noResults')}</Text>}
          {listings.map((property, index) => (
            <Animated.View
              key={property.id}
              style={styles.propertyCardContainer}
            >
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => handleViewProperty(property.id)}
              >
                <Image
                  source={{ uri: property.images[0] as string }}
                  style={styles.propertyImage}
                  resizeMode="cover"
                />

                <View style={styles.heartButton}>
                  <FavoriteButton
                    propertyId={property.id}
                    onPress={() => handleFavoriteToggle(property)}
                    showBackground={false}
                    size={22}
                  />
                </View>

                <View style={styles.propertyDetails}>
                  <View style={styles.locationRatingRow}>
                    <Text style={styles.locationText}>{property.location?.district || property.location?.city}, Rwanda</Text>
                    <View style={styles.ratingContainer}>
                      <Ionicons name="star" size={14} color={colors.black} />
                      <Text style={styles.ratingText}>{property.rating ?? '—'}</Text>
                    </View>
                  </View>

                  <View style={styles.priceContainer}>
                    <Text style={styles.priceText}>
                      <Text style={styles.priceBold}>{property.price} {property.currency}</Text>
                      <Text style={styles.priceUnit}> {t('property.perMonth')}</Text>
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}
          {hasMore && listings.length > 0 && <Button loading={isLoading} disabled={isLoading} onPress={() => { void loadMore(); }}>{t('explore.loadMore')}</Button>}
        </ScrollView>


      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.white,
  },
  container: {
    width: '100%', maxWidth: 960, alignSelf: 'center',
    flex: 1,
    backgroundColor: colors.white,
  },
  searchContainer: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchBar: {
    borderRadius: borderRadius.searchBar,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray[200],
    height: 54,
    flex: 1,
  },
  searchInput: {
    fontSize: typography.fontSize.base,
  },
  alertButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing[2],
    borderWidth: 1,
    borderColor: colors.gray[200],
    ...shadows.sm,
  },
  languageButton: {
    marginLeft: spacing[2],
  },
  categoryItemContainer: {
    alignItems: 'center',
    marginHorizontal: spacing[2],
  },
  categoryItem: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[1],
  },
  selectedCategoryItem: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.black,
  },
  categoryLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[600],
  },
  selectedCategoryLabel: {
    color: colors.black,
    fontWeight: '500',
  },
  categoriesContainer: {
    paddingHorizontal: spacing[2],
    paddingBottom: spacing[2],
  },
  tagContainer: {
    paddingHorizontal: spacing[4],
    marginBottom: spacing[2],
  },
  pricingTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pricingTagText: {
    fontSize: typography.fontSize.sm,
    marginLeft: spacing[1],
    color: colors.gray[800],
  },
  propertiesContainer: {
    flex: 1,
    paddingHorizontal: spacing[4],
  },
  propertyCardContainer: {
    marginBottom: spacing[4],
  },
  propertyImage: {
    width: '100%',
    height: 300,
    borderRadius: borderRadius.lg,
  },
  featuredBadge: {
    position: 'absolute',
    top: spacing[2],
    left: spacing[2],
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  featuredBadgeText: {
    color: colors.white,
    fontSize: typography.fontSize.xs,
    marginLeft: spacing[1],
  },
  heartButton: {
    position: 'absolute',
    top: spacing[2],
    right: spacing[2],
    zIndex: 1,
  },
  propertyDetails: {
    marginTop: spacing[2],
  },
  locationRatingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationText: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: colors.gray[800],
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    marginLeft: 4,
  },
  distanceText: {
    color: colors.gray[600],
    fontSize: typography.fontSize.sm,
    marginTop: 2,
  },
  dateText: {
    color: colors.gray[600],
    fontSize: typography.fontSize.sm,
    marginTop: 2,
  },
  priceContainer: {
    marginTop: spacing[1],
  },
  priceText: {
    fontSize: typography.fontSize.base,
  },
  priceBold: {
    fontWeight: '600',
  },
  priceUnit: {
    fontWeight: 'normal',
  },
  snackbar: {
    backgroundColor: colors.primary,
    marginBottom: spacing[2],
  },
  snackbarContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  snackbarIcon: {
    marginRight: spacing[2],
  },
  snackbarText: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
  },
});

export default SearchScreen;
