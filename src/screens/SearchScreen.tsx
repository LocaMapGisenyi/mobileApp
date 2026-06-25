import React, { useState, useEffect, useMemo } from 'react';
import { 
  StyleSheet, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  FlatList, 
  StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Searchbar, Chip, useTheme, Snackbar } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, Property } from '../types';
import { useSearchStore } from '../store/search';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';
import PropertyCard from '../components/PropertyCard';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import FavoriteButton from '../components/FavoriteButton';
import { useFavoritesStore } from '../store/favorites';
import { useAlertsStore } from '../store/alerts';
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
  const theme = useTheme();
  const { listings, fetchListings, isLoading } = useSearchStore();
  const { addFavorite, removeFavorite, isFavorite } = useFavoritesStore();
  const { alerts, notificationsEnabled } = useAlertsStore();
  
  const [selectedCategory, setSelectedCategory] = useState('vue');
  const [alertVisible, setAlertVisible] = useState(false);
  const [matchedProperty, setMatchedProperty] = useState<Property | null>(null);
  
  useEffect(() => {
    fetchListings();
  }, []);

  // Vérifier si un logement correspond aux critères d'alerte
  useEffect(() => {
    if (!notificationsEnabled || alerts.length === 0 || !listings.length) return;
    
    // Simuler un délai pour découvrir un nouveau logement correspondant aux alertes
    const timer = setTimeout(() => {
      const enabledAlerts = alerts.filter(alert => alert.enabled);
      if (!enabledAlerts.length) return;
      
      // Vérifier chaque logement avec les critères d'alerte
      for (const property of listings) {
        for (const alert of enabledAlerts) {
          const criteria = alert.criteria;
          let match = true;
          
          // Vérifier le type de propriété
          if (criteria.propertyTypes && criteria.propertyTypes.length > 0) {
            if (!property.type || !criteria.propertyTypes.includes(property.type as any)) {
              match = false;
            }
          }
          
          // Vérifier la plage de prix
          if (criteria.minPrice && property.price < criteria.minPrice) {
            match = false;
          }
          if (criteria.maxPrice && property.price > criteria.maxPrice) {
            match = false;
          }
          
          // Vérifier le nombre de chambres
          if (criteria.minBedrooms && (!property.bedrooms || property.bedrooms < criteria.minBedrooms)) {
            match = false;
          }
          if (criteria.maxBedrooms && (!property.bedrooms || property.bedrooms > criteria.maxBedrooms)) {
            match = false;
          }
          
          // Si tout correspond, afficher l'alerte avec ce logement
          if (match) {
            setMatchedProperty(property);
            setAlertVisible(true);
            return; // Sortir après la première correspondance
          }
        }
      }
    }, 2000); // Délai de 2 secondes pour simuler la découverte
    
    return () => clearTimeout(timer);
  }, [listings, alerts, notificationsEnabled]);

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
    { id: 'vue', name: t('search.categories.view'), icon: 'image-outline' },
    { id: 'design', name: t('search.categories.design'), icon: 'home' },
    { id: 'chambres', name: t('search.categories.bedrooms'), icon: 'bed-outline' },
    { id: 'lac', name: t('search.categories.lake'), icon: 'water-outline' },
    { id: 'iles', name: t('search.categories.islands'), icon: 'map-outline' },
  ];

  const renderCategoryItem = ({ item, index }: { item: CategoryItem; index: number }) => (
    <Animated.View 
      entering={FadeIn.delay(index * 100)} 
      style={styles.categoryItemContainer}
    >
      <TouchableOpacity
        style={[
          styles.categoryItem,
          selectedCategory === item.id && styles.selectedCategoryItem
        ]}
        onPress={() => setSelectedCategory(item.id)}
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
          entering={FadeIn.duration(300)}
          style={styles.searchContainer}
        >
          <Searchbar
            placeholder={t('search.startSearch')}
            value=""
            onChangeText={() => {}}
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
        <Animated.View entering={FadeIn.duration(300).delay(100)}>
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
          entering={FadeIn.duration(300).delay(200)}
          style={styles.tagContainer}
        >
          <View style={styles.pricingTag}>
            <Ionicons name="pricetag" size={14} color={colors.primary} />
            <Text style={styles.pricingTagText}>{t('search.priceIncludesAllFees')}</Text>
          </View>
        </Animated.View>

        {/* Liste des propriétés */}
        <ScrollView 
          style={styles.propertiesContainer}
          showsVerticalScrollIndicator={false}
        >
          {listings.map((property, index) => (
            <Animated.View 
              key={property.id}
              entering={FadeInDown.delay(300 + index * 100)}
              style={styles.propertyCardContainer}
            >
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => handleViewProperty(property.id)}
              >
                <View style={styles.featuredBadge}>
                  <Ionicons name="trophy" size={15} color={colors.white} />
                  <Text style={styles.featuredBadgeText}>{t('search.travelersChoice')}</Text>
                </View>
                
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
                      <Text style={styles.ratingText}>{property.rating || 4.5}</Text>
                    </View>
                  </View>
                  
                  <Text style={styles.distanceText}>{t('search.distance', { distance: 5 })}</Text>
                  <Text style={styles.dateText}>{t('search.dates', { start: '11', end: '16', month: t('search.months.june') })}</Text>
                  
                  <View style={styles.priceContainer}>
                    <Text style={styles.priceText}>
                      <Text style={styles.priceBold}>{property.price} {property.currency}</Text>
                      <Text style={styles.priceUnit}> {t('property.perNight')}</Text>
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </ScrollView>
        
        {/* Snackbar pour les alertes */}
        <Snackbar
          visible={alertVisible}
          onDismiss={() => setAlertVisible(false)}
          duration={5000}
          action={{
            label: t('common.view'),
            onPress: () => {
              if (matchedProperty) {
                navigation.navigate('PropertyDetails', { propertyId: matchedProperty.id });
              }
            },
          }}
          style={styles.snackbar}
        >
          <View style={styles.snackbarContent}>
            <Ionicons name="notifications" size={20} color={colors.white} style={styles.snackbarIcon} />
            <Text style={styles.snackbarText}>
              {t('alerts.newMatchingProperty')}
            </Text>
          </View>
        </Snackbar>
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