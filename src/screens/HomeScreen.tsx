import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  Image,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  ScrollView,
  ImageBackground,
  useWindowDimensions,
} from 'react-native';
import { Text, Button, useTheme, Searchbar, Chip, Avatar, Surface } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Property } from '../types';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';
import PropertyCard from '../components/PropertyCard';
import GuideCard from '../components/GuideCard';
import { useUserStore } from '../store/user';
import { useSearchStore } from '../store/search';
import { localGuides } from '../data/localGuides';
import { mockListings } from '../data/mockListings';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInUp, FadeIn, SlideInDown } from 'react-native-reanimated';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

// Mock user name - replace with actual user data from store
const getUserFirstName = (fullName: string | undefined): string => {
  if (!fullName) return 'Cher utilisateur'; // Default if no name
  return fullName.split(' ')[0];
};

const HomeScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const theme = useTheme();
  const { user } = useUserStore();
  const { listings, fetchListings } = useSearchStore();
  const { width } = useWindowDimensions();
  const QUICK_ACCESS_BUTTON_SIZE = width / 4.8;
  const [featuredListings, setFeaturedListings] = useState<Property[]>([]);
  const [newGuides, setNewGuides] = useState<typeof localGuides>([]);
  
  useEffect(() => {
    // fetchListings({ limit: 5, featured: true }); // Example: if your store supports this
    setFeaturedListings(mockListings.slice(0, 5)); // Simulate featured
    setNewGuides(localGuides.filter(guide => guide.isNew).slice(0, 5)); // Simulate new guides
  }, []);
  
  const handleViewProperty = (propertyId: string) => {
    navigation.navigate('PropertyDetails', { propertyId });
  };

  const handleViewGuide = (guideId: string) => {
    navigation.navigate('GuideDetail', { guideId });
  };

  const QuickAccessButton = useCallback(({ icon, label, onPress: handlePress, delay }: { icon: keyof typeof MaterialCommunityIcons.glyphMap, label: string, onPress: () => void, delay?: number }) => (
    <Animated.View entering={FadeInUp.delay(delay || 0).duration(500)} style={styles.quickAccessButtonContainer}>
      <TouchableOpacity
        onPress={handlePress}
        style={styles.quickAccessButton}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Surface style={[styles.quickAccessIconWrapper, { backgroundColor: theme.colors.surfaceVariant, width: QUICK_ACCESS_BUTTON_SIZE * 0.7, height: QUICK_ACCESS_BUTTON_SIZE * 0.7 }]}>
          <MaterialCommunityIcons name={icon} size={QUICK_ACCESS_BUTTON_SIZE * 0.4} color={theme.colors.primary} />
        </Surface>
        <Text style={[styles.quickAccessLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  ), [theme, QUICK_ACCESS_BUTTON_SIZE]);
  
  const SectionHeader = ({ title, onViewAll, delay }: { title: string, onViewAll?: () => void, delay?: number }) => (
    <Animated.View entering={FadeInUp.delay(delay || 0).duration(500)} style={styles.sectionHeaderContainer}>
      <Text style={[styles.sectionTitle, {color: theme.colors.onBackground}]}>{title}</Text>
      {onViewAll && (
        <TouchableOpacity onPress={onViewAll}>
          <Text style={[styles.viewAllButton, {color: theme.colors.primary}]}>{t('home.viewAll')}</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, {backgroundColor: theme.colors.background}]}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
      <ScrollView 
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <Animated.View entering={SlideInDown.duration(500)} style={styles.headerSection}>
          <ImageBackground 
            source={require('../assets/images/gisenyi_header.png')} // Replace with a dynamic or better quality header image
            style={styles.headerImageBackground}
            resizeMode="cover"
          >
            <View style={styles.headerOverlay} />
            <View style={styles.headerTextContainer}>
              <Text style={styles.welcomeMessage}>{t('home.welcomeUser', { name: getUserFirstName(user.fullName || user.email || undefined) })}</Text>
              <Text style={styles.subWelcomeMessage}>{t('home.discoverGisenyi')}</Text>
        </View>
          </ImageBackground>
          {/* Search Bar - Positioned absolutely or within the flow */}
          <View style={styles.searchBarContainer}>
             <Searchbar
                placeholder={t('home.searchPlaceholder')}
                value=""
                onChangeText={() => {}}
                onFocus={() => navigation.navigate('Search')} // Navigate to SearchScreen on focus
                style={[styles.searchBar, {backgroundColor: theme.colors.elevation.level3}]}
                inputStyle={{color: theme.colors.onSurface}}
                placeholderTextColor={theme.colors.onSurfaceVariant}
                iconColor={theme.colors.primary}
             />
          </View>
        </Animated.View>

        {/* Quick Access Buttons */}
        <View style={styles.quickAccessGrid}>
          <QuickAccessButton icon="magnify" label={t('home.explore')} onPress={() => navigation.navigate('Search')} delay={100} />
          <QuickAccessButton icon="map-marker-outline" label={t('home.map')} onPress={() => navigation.navigate('MapScreen')} delay={200} />
          <QuickAccessButton icon="heart-outline" label={t('home.favorites')} onPress={() => navigation.navigate('Favorites')} delay={300} />
          <QuickAccessButton icon="bell-outline" label={t('home.alerts')} onPress={() => navigation.navigate('AlertPreferences')} delay={400}/>
        </View>
        
        {/* Featured Listings Section */}
        {featuredListings.length > 0 && (
        <View style={styles.sectionContainer}>
            <SectionHeader title={t('home.featuredListings')} onViewAll={() => navigation.navigate('Search')} delay={500} />
          <FlatList
              listKey="featured-listings"
              horizontal
              data={featuredListings}
              renderItem={({ item, index }) => (
                <Animated.View entering={FadeInUp.delay(index * 100 + 600).duration(500)} style={[styles.listItemContainer, index === 0 && styles.listItemFirst]}>
                    <PropertyCard
                        property={item}
                        index={index}
                        onPress={() => handleViewProperty(item.id)}
                    />
                </Animated.View>
              )}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalListContent}
          />
        </View>
        )}
        
        {/* Nouveautés à Gisenyi Section (Local Guides) */}
        {newGuides.length > 0 && (
          <View style={styles.sectionContainer}>
            <SectionHeader title={t('home.newInGisenyi')} onViewAll={() => navigation.navigate('LocalGuide')} delay={700} />
            <FlatList
              listKey="new-guides"
              horizontal
              data={newGuides}
              renderItem={({ item, index }) => (
                <Animated.View entering={FadeInUp.delay(index * 100 + 800).duration(500)} style={[styles.listItemContainer, index === 0 && styles.listItemFirst]}>
                  <GuideCard guide={item} onPress={() => handleViewGuide(item.id)} />
                </Animated.View>
              )}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalListContent}
            />
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: spacing[4],
  },
  headerSection: {
    marginBottom: spacing[2], // Space between header and quick access
    position: 'relative', // For search bar positioning
  },
  headerImageBackground: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)', // Dark overlay for text contrast
  },
  headerTextContainer: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[5], // Adjust if status bar is translucent
  },
  welcomeMessage: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: spacing[1],
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 2,
  },
  subWelcomeMessage: {
    fontSize: typography.fontSize.base,
    color: colors.gray[200], // Lighter text for subtitle
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 2,
  },
  searchBarContainer: {
    position: 'absolute',
    bottom: -14,
    left: spacing[4],
    right: spacing[4],
    zIndex: 10, // Ensure it floats above header image if needed, but below content that scrolls over it
  },
  searchBar: {
    borderRadius: borderRadius.lg, // Softer radius
    height: 50,
    elevation: 3, // Softer shadow for Paper Searchbar
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  quickAccessGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing[3],
    marginTop: spacing[6], // Increased space due to overlapping search bar
    marginBottom: spacing[4],
  },
  quickAccessButtonContainer: {
    alignItems: 'center',
    flex: 1,
  },
  quickAccessButton: {
    alignItems: 'center',
    padding: spacing[1],
  },
  quickAccessIconWrapper: {
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[1],
    ...shadows.sm,
  },
  quickAccessLabel: {
    fontSize: typography.fontSize.xs,
    textAlign: 'center',
    fontWeight: '500',
  },
  sectionContainer: {
    marginBottom: spacing[4],
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    marginBottom: spacing[3],
  },
  sectionTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: 'bold',
  },
  viewAllButton: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  horizontalListContent: {
    paddingRight: spacing[4],
  },
  listItemContainer: {
    marginRight: spacing[3],
  },
  listItemFirst: {
    marginLeft: spacing[4],
  },
});

export default HomeScreen; 