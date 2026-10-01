import ContentSkeleton from '../components/ContentSkeleton';
import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  Text,
  TouchableOpacity,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { useTranslation } from 'react-i18next';

// Components
import ListingCard from '../components/ListingCard';

// Types
import { RootStackParamList, Property } from '../types';

// State
import { useFavoritesStore } from '../store/favorites';

type FavoritesScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const FavoritesScreen: React.FC = () => {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const columns = width >= 1050 ? 3 : width >= 700 ? 2 : 1;
  const navigation = useNavigation<FavoritesScreenNavigationProp>();
  const { favorites, removeFavorite, fetchFavorites, isLoading, error } = useFavoritesStore();
  useEffect(() => {
    void fetchFavorites();
  }, [fetchFavorites]);
  const [removedId, setRemovedId] = useState<string | null>(null);

  const [refreshing, setRefreshing] = useState(false);
  const refresh = async () => {
    setRefreshing(true);
    try {
      await fetchFavorites();
    } finally {
      setRefreshing(false);
    }
  };

  const handlePropertyPress = (propertyId: string) => {
    navigation.navigate('PropertyDetails', { propertyId });
  };

  const handleRemoveFavorite = async (propertyId: string) => {
    setRemovedId(propertyId);
    try {
      await removeFavorite(propertyId);
    } finally {
      setRemovedId(null);
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="heart-outline" size={34} color={colors.primary} />
      </View>

      <Text style={styles.emptyTitle}>{t('favorites.noFavorites')}</Text>

      <Text style={styles.emptyText}>{t('favorites.startBrowsing')}</Text>

      <TouchableOpacity
        accessibilityRole="button"
        style={styles.exploreButton}
        onPress={() => navigation.navigate('MainTabs', { screen: 'Explorer' } as any)}
        activeOpacity={0.8}
      >
        <Ionicons name="search" size={18} color={colors.onAccent} style={styles.buttonIcon} />
        <Text style={styles.exploreButtonText}>{t('favorites.exploreMore')}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderListHeader = () => {
    return (
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.headerTitle}>
          {t('favorites.title')}
        </Text>
        <Text style={styles.headerSubtitle}>
          {t('favorites.savedCount', { count: favorites.length })}
        </Text>
      </View>
    );
  };

  const renderItem = ({ item }: { item: Property }) => {
    return (
      <View style={{ width: `${100 / columns}%`, paddingHorizontal: 8, paddingBottom: 28 }}>
        <ListingCard
          property={item}
          favorite
          favoritePending={removedId === item.id}
          onPress={() => handlePropertyPress(item.id)}
          onFavorite={() => void handleRemoveFavorite(item.id)}
        />
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      {error && <Text accessibilityRole="alert">{error}</Text>}
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      <FlatList
        key={columns}
        numColumns={columns}
        data={favorites}
        refreshing={refreshing}
        onRefresh={() => void refresh()}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.listContent, favorites.length === 0 && { flexGrow: 1 }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={
          isLoading || refreshing ? (
            !refreshing ? (
              <ContentSkeleton variant="cards" columns={columns} count={columns * 2} style={{ paddingHorizontal: 8 }} />
            ) : null
          ) : (
            renderEmptyState
          )
        }
        initialNumToRender={5}
        maxToRenderPerBatch={10}
        windowSize={10}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
    flex: 1,
    backgroundColor: colors.surface,
  },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  header: { paddingHorizontal: 8, marginTop: 24, marginBottom: 24 },
  headerTitle: {
    fontSize: 28,
    lineHeight: 35,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 8,
  },
  headerSubtitle: { fontSize: 15, lineHeight: 22, color: colors.inkSubtle },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    lineHeight: 29,
    fontWeight: '600',
    textAlign: 'center',
    color: colors.ink,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
    color: colors.inkSubtle,
    maxWidth: 340,
    marginBottom: 28,
  },
  exploreButton: {
    minHeight: 50,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: { marginRight: 8 },
  exploreButtonText: { fontSize: 15, fontWeight: '600', color: colors.onAccent },
});
export default FavoritesScreen;
