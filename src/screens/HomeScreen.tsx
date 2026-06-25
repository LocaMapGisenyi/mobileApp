import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  Image,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  ImageBackground,
  useWindowDimensions,
  TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button, useTheme, Searchbar, Chip, Avatar, Surface } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Property } from '../types';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';
import PropertyCard from '../components/PropertyCard';
import { useUserStore } from '../store/user';
import { useSearchStore } from '../store/search';
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

  useEffect(() => {
    setFeaturedListings([]);
  }, []);

  const handleViewProperty = (propertyId: string) => {
    navigation.navigate('PropertyDetails', { propertyId });
  };


  const QuickAccessButton = useCallback(
    ({
      icon,
      label,
      onPress: handlePress,
      delay,
    }: {
      icon: keyof typeof MaterialCommunityIcons.glyphMap;
      label: string;
      onPress: () => void;
      delay?: number;
    }) => (
      <Animated.View
        entering={FadeInUp.delay(delay || 0).duration(500)}
        style={styles.quickAccessButtonContainer}
      >
        <TouchableOpacity
          onPress={handlePress}
          style={styles.quickAccessButton}
          accessibilityRole="button"
          accessibilityLabel={label}
        >
          <View style={styles.quickAccessIconWrapper}>
            <MaterialCommunityIcons
              name={icon}
              size={22}
              color={colors.primary}
            />
          </View>
          <Text style={styles.quickAccessLabel}>{label}</Text>
        </TouchableOpacity>
      </Animated.View>
    ),
    [],
  );

  const SectionHeader = ({
    title,
    onViewAll,
    delay,
  }: {
    title: string;
    onViewAll?: () => void;
    delay?: number;
  }) => (
    <Animated.View
      entering={FadeInUp.delay(delay || 0).duration(500)}
      style={styles.sectionHeaderContainer}
    >
      <Text style={styles.sectionTitle}>{title}</Text>
      {onViewAll && (
        <TouchableOpacity onPress={onViewAll}>
          <Text style={styles.viewAllButton}>{t('home.viewAll')}</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surfaceSunken} />
      <ScrollView
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header Section ── */}
        <Animated.View entering={SlideInDown.duration(500)} style={styles.headerSection}>
          {/* Logo */}
          <Text style={styles.logoText}>LocaMap</Text>

          {/* Greeting */}
          <Text style={styles.greetingText}>
            {t('home.welcomeUser', {
              name: getUserFirstName(user.fullName || user.email || undefined),
            })}
          </Text>

          {/* Subtitle */}
          <Text style={styles.subtitleText}>{t('home.discoverGisenyi')}</Text>

          {/* Search bar — inline flow, no absolute positioning */}
          <TouchableOpacity
            style={styles.searchBar}
            onPress={() => navigation.navigate('Search')}
            accessibilityRole="search"
            activeOpacity={0.85}
          >
            <Ionicons name="search-outline" size={20} color={colors.primary} style={styles.searchIcon} />
            <Text style={styles.searchPlaceholder}>{t('home.searchPlaceholder')}</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* ── Quick Access Row ── */}
        <View style={styles.quickAccessGrid}>
          <QuickAccessButton
            icon="magnify"
            label={t('home.explore')}
            onPress={() => navigation.navigate('Search')}
            delay={100}
          />
          <QuickAccessButton
            icon="map-marker-outline"
            label={t('home.map')}
            onPress={() => navigation.navigate('MapScreen')}
            delay={200}
          />
          <QuickAccessButton
            icon="heart-outline"
            label={t('home.favorites')}
            onPress={() => navigation.navigate('Favorites')}
            delay={300}
          />
          <QuickAccessButton
            icon="bell-outline"
            label={t('home.alerts')}
            onPress={() => navigation.navigate('AlertPreferences')}
            delay={400}
          />
        </View>

        {/* ── Featured Listings Section ── */}
        {featuredListings.length > 0 && (
          <View style={styles.sectionContainer}>
            <SectionHeader
              title={t('home.featuredListings')}
              onViewAll={() => navigation.navigate('Search')}
              delay={500}
            />
            <FlatList
              horizontal
              data={featuredListings}
              renderItem={({ item, index }) => (
                <Animated.View
                  entering={FadeInUp.delay(index * 100 + 600).duration(500)}
                  style={[
                    styles.listItemContainer,
                    index === 0 && styles.listItemFirst,
                  ]}
                >
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

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // ── Safe area & scroll ──────────────────────────────────────────────────────
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollViewContent: {
    paddingBottom: 120,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  headerSection: {
    backgroundColor: colors.surfaceSunken,
    paddingTop: spacing[6],        // 24
    paddingHorizontal: spacing[5], // 20
    paddingBottom: spacing[5],     // 20
  },
  logoText: {
    fontSize: typography.fontSize.xl, // 24
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing[4],       // 16
  },
  greetingText: {
    fontSize: typography.fontSize['2xl'], // 28
    fontWeight: '700',
    color: colors.ink,
    marginBottom: spacing[1],       // 4
  },
  subtitleText: {
    fontSize: typography.fontSize.base, // 15
    color: colors.inkSubtle,
    marginBottom: spacing[4],       // 16
  },

  // ── Search bar ──────────────────────────────────────────────────────────────
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.searchBar, // 28
    height: 52,
    paddingHorizontal: spacing[4],  // 16
  },
  searchIcon: {
    marginRight: spacing[2],        // 8
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: typography.fontSize.base, // 15
    color: colors.inkDisabled,
  },

  // ── Quick Access ─────────────────────────────────────────────────────────────
  quickAccessGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing[3],  // 12
    paddingVertical: spacing[5],    // 20
    backgroundColor: colors.background,
  },
  quickAccessButtonContainer: {
    alignItems: 'center',
    flex: 1,
  },
  quickAccessButton: {
    alignItems: 'center',
    paddingVertical: spacing[1],    // 4
  },
  quickAccessIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.lg,  // 12
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[2],       // 8
  },
  quickAccessLabel: {
    fontSize: typography.fontSize.xs, // 11
    color: colors.inkSubtle,
    textAlign: 'center',
    fontWeight: '500',
  },

  // ── Section headers ──────────────────────────────────────────────────────────
  sectionContainer: {
    marginBottom: spacing[4],       // 16
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[5],  // 20
    marginBottom: spacing[3],       // 12
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg, // 20
    fontWeight: '700',
    color: colors.ink,
  },
  viewAllButton: {
    fontSize: typography.fontSize.sm, // 13
    color: colors.primary,
    textDecorationLine: 'underline',
  },

  // ── Horizontal list items ─────────────────────────────────────────────────────
  horizontalListContent: {
    paddingRight: spacing[5],       // 20
  },
  listItemContainer: {
    width: 280,
    marginRight: spacing[3],        // 12
  },
  listItemFirst: {
    marginLeft: spacing[5],         // 20
  },
});

export default HomeScreen;
