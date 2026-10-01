import ContentSkeleton from '../components/ContentSkeleton';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme';
import type { RootStackParamList } from '../types';
import { useSearchStore } from '../store/search';
import { useFavoritesStore } from '../store/favorites';
import { useUserStore } from '../store/user';
import SearchFiltersModal from '../components/SearchFiltersModal';
import ListingCard from '../components/ListingCard';
import AppLogo from '../components/AppLogo';

const categories = [
  { id: 'all', key: 'all', icon: 'apps' },
  { id: 'lake_view', key: 'lake', icon: 'water' },
  { id: 'furnished', key: 'furnished', icon: 'chair' },
  { id: 'villa', key: 'villas', icon: 'villa' },
  { id: 'apartment', key: 'apartments', icon: 'apartment' },
  { id: 'new', key: 'new', icon: 'schedule' },
] as const;

export default function ExplorerScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width } = useWindowDimensions();
  const columns = width >= 1050 ? 3 : width >= 700 ? 2 : 1;
  const user = useUserStore(s => s.user);
  const {
    filteredListings,
    filters,
    isLoading,
    error,
    hasMore,
    showFiltersModal,
    fetchListings,
    loadMore,
    setQuery,
    setFilters,
    applyFilters,
    resetFilters,
    toggleFiltersModal,
  } = useSearchStore();
  const { isFavorite, toggleSave, error: favoriteError } = useFavoritesStore();
  const [search, setSearch] = useState(filters.query);
  const category = filters.createdAfter
    ? 'new'
    : filters.amenities?.includes('lake_view')
      ? 'lake_view'
      : filters.amenities?.includes('furnished')
        ? 'furnished'
        : filters.propertyType?.length === 1 &&
            ['villa', 'apartment'].includes(filters.propertyType[0])
          ? filters.propertyType[0]
          : 'all';
  useEffect(() => {
    setSearch(filters.query);
  }, [filters.query]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      void fetchListings();
      void useFavoritesStore.getState().fetchFavorites();
    }, [fetchListings]),
  );
  const refresh = async () => {
    setRefreshing(true);
    try {
      await fetchListings();
    } finally {
      setRefreshing(false);
    }
  };
  const chooseCategory = (id: string) => {
    setFilters({
      ...filters,
      propertyType: ['villa', 'apartment'].includes(id) ? [id] : undefined,
      amenities: ['lake_view', 'furnished'].includes(id) ? [id] : undefined,
      createdAfter: id === 'new' ? new Date(Date.now() - 30 * 86400000).toISOString() : undefined,
    });
    applyFilters();
  };
  const reset = () => {
    setSearch('');
    resetFilters();
  };
  const initials =
    user.fullName
      ?.split(' ')
      .filter(Boolean)
      .map(n => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'L';
  const header = (
    <View>
      <View style={s.intro}>
        <Text accessibilityRole="header" style={s.heading}>
          {t('pro.exploreTitle')}
        </Text>
        <Text style={s.subtitle}>{t('pro.exploreSubtitle')}</Text>
      </View>
      <View style={s.searchRow}>
        <View style={[s.searchField, searchFocused && s.searchFocused]}>
          <MaterialIcons name="search" size={22} color={colors.primary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('explore.searchPlaceholder')}
            placeholderTextColor={colors.inkSubtle}
            accessibilityLabel={t('search.title')}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            onSubmitEditing={() => setQuery(search)}
            returnKeyType="search"
            style={s.input}
          />
          <Pressable
            onPress={() => setQuery(search)}
            accessibilityRole="button"
            accessibilityLabel={t('common.search')}
            style={({ pressed }) => [s.searchSubmit, pressed && s.pressed]}
          >
            <MaterialIcons name="arrow-forward" size={23} color={colors.onAccent} />
          </Pressable>
        </View>
        <Pressable
          onPress={toggleFiltersModal}
          accessibilityRole="button"
          accessibilityLabel={t('search.filters')}
          style={({ pressed }) => [s.filterButton, pressed && s.pressed]}
        >
          <MaterialIcons name="tune" size={23} color={colors.ink} />
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.categories}
      >
        {categories.map(item => (
          <Pressable
            key={item.id}
            onPress={() => chooseCategory(item.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: category === item.id }}
            style={({ pressed }) => [
              s.category,
              category === item.id && s.categoryActive,
              pressed && s.pressed,
            ]}
          >
            <MaterialIcons
              name={item.icon}
              size={24}
              color={category === item.id ? colors.primary : colors.inkSubtle}
            />
            <Text style={[s.categoryLabel, category === item.id && s.categoryLabelActive]}>
              {t(`explore.categories.${item.key}`)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={s.resultsRow}>
        <View style={s.resultsSummary}>
          <Text accessibilityRole="header" style={s.results}>
            {t('design.homes')}
          </Text>
          <Text style={s.count}>{t('design.resultCount', { count: filteredListings.length })}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('MapScreen')}
          style={({ pressed }) => [s.mapButton, pressed && s.pressed]}
        >
          <MaterialIcons name="map" size={19} color={colors.ink} />
          <Text style={s.mapLabel}>{t('map.title')}</Text>
        </Pressable>
      </View>
      {!!(error || favoriteError) && (
        <View style={s.error}>
          <Text accessibilityRole="alert" style={s.errorText}>
            {error || favoriteError}
          </Text>
          <Pressable
            onPress={() => void fetchListings()}
            accessibilityRole="button"
            style={s.retry}
          >
            <Text style={s.retryText}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={s.screen}>
      <View style={s.topBar}>
        <View style={s.topInner}>
          <View style={s.brand}>
            <AppLogo size={64} />
            <View style={s.placeBlock}>
              <Text style={s.city}>Gisenyi</Text>
              <Text style={s.country}>Rwanda</Text>
            </View>
          </View>
          <Pressable
            onPress={() => navigation.navigate('Profile')}
            accessibilityRole="button"
            accessibilityLabel={t('profile.myProfile')}
            style={s.avatar}
          >
            {user.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={s.avatarImage} />
            ) : (
              <Text style={s.initials}>{initials}</Text>
            )}
          </Pressable>
        </View>
      </View>
      <FlatList
        key={columns}
        data={filteredListings}
        numColumns={columns}
        keyExtractor={item => item.id}
        style={s.list}
        contentContainerStyle={s.listContent}
        ListHeaderComponent={header}
        columnWrapperStyle={columns > 1 ? s.columns : undefined}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshing={refreshing}
        onRefresh={() => void refresh()}
        renderItem={({ item }) => (
          <View style={{ width: `${100 / columns}%`, paddingHorizontal: 8, paddingBottom: 28 }}>
            <ListingCard
              property={item}
              favorite={isFavorite(item.id)}
              onFavorite={() => void toggleSave(item)}
              onPress={() => navigation.navigate('PropertyDetails', { propertyId: item.id })}
            />
          </View>
        )}
        ListEmptyComponent={
          isLoading ? (
            !refreshing ? (
              <ContentSkeleton variant="cards" columns={columns} count={columns * 2} style={{ paddingHorizontal: 8 }} />
            ) : null
          ) : !error ? (
            <View style={s.empty}>
              <MaterialIcons name="search-off" size={42} color={colors.primary} />
              <Text style={s.emptyTitle}>{t('explore.noResults')}</Text>
              <Text style={s.emptyText}>{t('explore.tryDifferent')}</Text>
              <Pressable onPress={reset} accessibilityRole="button" style={s.reset}>
                <Text style={s.resetText}>{t('explore.resetFilters')}</Text>
              </Pressable>
            </View>
          ) : null
        }
        ListFooterComponent={
          hasMore && filteredListings.length > 0 ? (
            <Pressable
              disabled={isLoading}
              onPress={() => void loadMore()}
              accessibilityRole="button"
              style={s.loadMore}
            >
              {isLoading && !refreshing ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={s.retryText}>{t('explore.loadMore')}</Text>
              )}
            </Pressable>
          ) : null
        }
      />

      <SearchFiltersModal visible={showFiltersModal} onDismiss={toggleFiltersModal} />
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  topBar: {
    backgroundColor: colors.surface,
  },
  topInner: {
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 6,
  },
  brand: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  placeBlock: { borderLeftWidth: 1, borderLeftColor: colors.border, paddingLeft: 14, gap: 2 },
  city: { fontSize: 15, fontWeight: '600', color: colors.ink },
  country: { fontSize: 12, color: colors.inkSubtle },
  avatar: {
    height: 44,
    width: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: 44, height: 44 },
  initials: { fontWeight: '700', color: colors.primaryDark, fontSize: 16 },
  list: { flex: 1 },
  listContent: {
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  columns: { alignItems: 'stretch' },
  intro: { paddingHorizontal: 8, paddingTop: 16, paddingBottom: 22, gap: 8 },
  heading: {
    fontSize: 27,
    lineHeight: 34,
    fontWeight: '700',
    color: colors.ink,
    maxWidth: 580,
    letterSpacing: -0.5,
  },
  subtitle: { fontSize: 15, lineHeight: 23, color: colors.inkSubtle },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 8 },
  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingLeft: 14,
    paddingRight: 5,
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  searchFocused: { borderColor: colors.primary, borderWidth: 2, paddingLeft: 13, paddingRight: 4 },
  input: { flex: 1, minWidth: 0, fontSize: 15, color: colors.ink, paddingVertical: 14 },
  searchSubmit: {
    width: 44,
    height: 44,
    borderRadius: 9,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButton: {
    width: 54,
    height: 56,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderMid,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categories: { gap: 20, paddingHorizontal: 8, paddingTop: 24, paddingBottom: 24 },
  category: {
    minHeight: 66,
    minWidth: 58,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 2,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  categoryActive: { borderBottomColor: colors.primary },
  categoryLabel: { fontSize: 12, fontWeight: '500', color: colors.inkSubtle },
  categoryLabelActive: { color: colors.primaryDark, fontWeight: '700' },
  resultsRow: {
    paddingHorizontal: 8,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  results: { fontSize: 21, fontWeight: '700', color: colors.ink },
  resultsSummary: { flex: 1, gap: 4 },
  count: { fontSize: 14, color: colors.inkSubtle },
  error: { margin: 8, padding: 16, backgroundColor: '#FFF0ED', borderRadius: 12 },
  errorText: { color: colors.error, fontSize: 15, lineHeight: 22 },
  retry: { minHeight: 44, justifyContent: 'center' },
  retryText: { color: colors.primaryDark, fontSize: 15, fontWeight: '600' },
  empty: { padding: 28, gap: 12, alignItems: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: colors.ink, textAlign: 'center' },
  emptyText: {
    fontSize: 15,
    lineHeight: 23,
    color: colors.inkSubtle,
    textAlign: 'center',
    maxWidth: 380,
  },
  reset: {
    minHeight: 48,
    paddingHorizontal: 20,
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    marginTop: 4,
  },
  resetText: { color: colors.primaryDark, fontWeight: '600', fontSize: 15 },
  skeleton: { margin: 8, gap: 14 },
  skeletonImage: {
    aspectRatio: 1.55,
    maxHeight: 280,
    borderRadius: 16,
    backgroundColor: colors.border,
  },
  skeletonLine: { width: '75%', height: 18, backgroundColor: colors.border, borderRadius: 4 },
  loadMore: { minHeight: 52, alignItems: 'center', justifyContent: 'center', margin: 12 },
  mapButton: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderMid,
    borderRadius: 10,
  },
  mapLabel: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  pressed: { opacity: 0.8 },
});
