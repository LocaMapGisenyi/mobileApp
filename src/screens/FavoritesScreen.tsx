import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  Text,
  TouchableOpacity,
  StatusBar,
  Platform,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../theme';
import { useTranslation } from 'react-i18next';

// Components
import CardLogement from '../components/CardLogement';

// Types
import { RootStackParamList, Property } from '../types';

// State
import { useFavoritesStore } from '../store/favorites';

type FavoritesScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const FavoritesScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<FavoritesScreenNavigationProp>();
  const { favorites, removeFavorite, fetchFavorites, isLoading, error } = useFavoritesStore();
  useEffect(() => { void fetchFavorites(); }, [fetchFavorites]);
  const [removedId, setRemovedId] = useState<string | null>(null);

  const [refreshing, setRefreshing] = useState(false);
  const refresh = async () => {
    setRefreshing(true);
    try { await fetchFavorites(); }
    finally { setRefreshing(false); }
  };

  const handlePropertyPress = (propertyId: string) => {
    navigation.navigate('PropertyDetails', { propertyId });
  };

  const handleRemoveFavorite = async (propertyId: string) => {
    setRemovedId(propertyId);
    try { await removeFavorite(propertyId); }
    finally { setRemovedId(null); }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="heart" size={80} color={colors.primary} />
      </View>

      <Text style={styles.emptyTitle}>
        {t('favorites.noFavorites')}
      </Text>

      <Text style={styles.emptyText}>
        {t('favorites.startBrowsing')}
      </Text>

      <TouchableOpacity
        accessibilityRole="button"
        style={styles.exploreButton}
        onPress={() => navigation.navigate('MainTabs', { screen: 'Explorer' } as any)}
        activeOpacity={0.8}
      >
        <Ionicons name="search" size={18} color={colors.white} style={styles.buttonIcon} />
        <Text style={styles.exploreButtonText}>
          {t('favorites.exploreMore')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderListHeader = () => {
    return (
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {t('favorites.title')}
        </Text>
        <Text style={styles.headerSubtitle}>
          {t('favorites.savedCount', { count: favorites.length })}
        </Text>
      </View>
    );
  };

  const renderItem = ({ item, index }: { item: Property; index: number }) => {

    return (
      <View style={styles.cardContainer}>
        <CardLogement
          logement={item}
          index={index}
          onPress={(id) => handlePropertyPress(id)}
        />
        <TouchableOpacity
          style={styles.removeButton}
          accessibilityRole="button" accessibilityLabel="Retirer des favoris"
          accessibilityState={{ disabled: removedId === item.id, busy: removedId === item.id }}
          disabled={removedId === item.id}
          onPress={() => handleRemoveFavorite(item.id)}
          activeOpacity={0.9}
        >
          <Ionicons name="heart" size={22} color={colors.white} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      {error && <Text accessibilityRole="alert">{error}</Text>}
      <StatusBar
        barStyle="dark-content"
        backgroundColor={colors.white}
      />

      <FlatList
        data={favorites}
        refreshing={refreshing}
        onRefresh={() => void refresh()}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.listContent, favorites.length === 0 && { flexGrow: 1 }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={isLoading || refreshing
          ? (!refreshing ? <ActivityIndicator color={colors.primary} size="large" accessibilityLabel="Chargement des favoris" /> : null)
          : renderEmptyState}
        initialNumToRender={5}
        maxToRenderPerBatch={10}
        windowSize={10}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%', maxWidth: 960, alignSelf: 'center',
    flex: 1,
    backgroundColor: colors.white,
  },
  listContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[6],
  },
  header: {
    marginTop: spacing[6],
    marginBottom: spacing[5],
  },
  headerTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.gray[800],
    marginBottom: spacing[2],
  },
  headerSubtitle: {
    fontSize: typography.fontSize.base,
    color: colors.gray[500],
  },
  cardContainer: {
    marginBottom: spacing[4],
    position: 'relative',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.2)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.8,
        shadowRadius: 2,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  removeButton: {
    position: 'absolute',
    top: spacing[3],
    right: spacing[3],
    backgroundColor: colors.primary,
    width: 44,
    height: 44,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.3)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.8,
        shadowRadius: 2,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[6],
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.1)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.8,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  emptyTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '600',
    color: colors.gray[800],
    marginBottom: spacing[3],
    textAlign: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: colors.gray[500],
    textAlign: 'center',
    marginBottom: spacing[8],
    maxWidth: '100%',
    lineHeight: 22,
  },
  exploreButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.2)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.8,
        shadowRadius: 2,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  buttonIcon: {
    marginRight: spacing[2],
  },
  exploreButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
});

export default FavoritesScreen;
