import React, { useEffect, useState, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  FlatList, 
  TouchableOpacity, 
  StatusBar,
  Dimensions,
  RefreshControl,
  ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Text,
  Button,
  Chip,
  Appbar,
  ActivityIndicator,
  useTheme,
  FAB
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSavedStore } from '../store/saved';
import CardLogement from '../components/CardLogement';
import { RootStackParamList, Property } from '../types';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');
const NUM_COLUMNS_THRESHOLD = 600; // Width threshold to switch to 2 columns

const SavedScreen = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { colors } = theme;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  
  const { 
    savedItems, 
    lastSorted, 
    isLoading, 
    sortBy, 
    removeSaved 
  } = useSavedStore();
  
  const [refreshing, setRefreshing] = useState(false);
  const [numColumns, setNumColumns] = useState(width > NUM_COLUMNS_THRESHOLD ? 2 : 1);
  
  // Update numColumns when dimension changes
  useEffect(() => {
    const updateLayout = () => {
      setNumColumns(Dimensions.get('window').width > NUM_COLUMNS_THRESHOLD ? 2 : 1);
    };
    
    const subscription = Dimensions.addEventListener('change', updateLayout);
    return () => subscription?.remove();
  }, []);
  
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    // Simulate data refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);
  
  const navigateToPropertyDetails = useCallback((propertyId: string) => {
    navigation.navigate('PropertyDetails', { propertyId });
  }, [navigation]);
  
  const navigateToExplore = useCallback(() => {
    if (navigation.getParent()?.getState().routeNames.includes('Explore')) {
      navigation.getParent()?.navigate('Explore');
    } else {
      // Fallback if direct tab navigation isn't possible
      navigation.navigate('Home');
    }
  }, [navigation]);
  
  const renderPropertyCard = ({ item, index }: { item: Property; index: number }) => (
    <View style={[
      styles.cardWrapper,
      { width: numColumns === 1 ? '100%' : '50%' }
    ]}>
      <CardLogement 
        logement={item} 
        index={index} 
        onPress={navigateToPropertyDetails}
      />
    </View>
  );
  
  const renderSortChips = () => (
    <View style={styles.sortChipsContainer}>
      <Chip
        selected={lastSorted === 'dateAdded'}
        onPress={() => sortBy('dateAdded')}
        style={[
          styles.sortChip,
          lastSorted === 'dateAdded' ? { backgroundColor: colors.primaryContainer } : null
        ]}
        textStyle={
          lastSorted === 'dateAdded' 
            ? { color: colors.onPrimaryContainer, fontWeight: 'bold' } 
            : { color: colors.onSurfaceVariant }
        }
        icon="clock-outline"
      >
        {t('saved.sort.date')}
      </Chip>
      
      <Chip
        selected={lastSorted === 'price'}
        onPress={() => sortBy('price')}
        style={[
          styles.sortChip,
          lastSorted === 'price' ? { backgroundColor: colors.primaryContainer } : null
        ]}
        textStyle={
          lastSorted === 'price' 
            ? { color: colors.onPrimaryContainer, fontWeight: 'bold' } 
            : { color: colors.onSurfaceVariant }
        }
        icon="cash-outline"
      >
        {t('saved.sort.price')}
      </Chip>
      
      <Chip
        selected={lastSorted === 'type'}
        onPress={() => sortBy('type')}
        style={[
          styles.sortChip,
          lastSorted === 'type' ? { backgroundColor: colors.primaryContainer } : null
        ]}
        textStyle={
          lastSorted === 'type' 
            ? { color: colors.onPrimaryContainer, fontWeight: 'bold' } 
            : { color: colors.onSurfaceVariant }
        }
        icon="home-outline"
      >
        {t('saved.sort.type')}
      </Chip>
    </View>
  );
  
  const renderEmptyState = () => (
    <Animated.View 
      entering={FadeIn.duration(400)}
      style={styles.emptyStateContainer}
    >
      <ImageBackground 
        source={{ uri: 'https://a0.muscache.com/im/pictures/d727f355-3f10-44b5-9750-d1efca2438fc.jpg' }} 
        style={styles.emptyStateImage}
        imageStyle={{ borderRadius: 120 }}
        resizeMode="cover"
      >
        <View style={styles.emptyStateImageOverlay} />
      </ImageBackground>
      
      <Text 
        variant="headlineMedium" 
        style={[styles.emptyStateTitle, { color: colors.onSurface }]}
      >
        {t('saved.emptyTitle')}
      </Text>
      
      <Text 
        variant="bodyLarge" 
        style={[styles.emptyStateSubtitle, { color: colors.onSurfaceVariant }]}
      >
        {t('saved.empty')}
      </Text>
      
      <Button
        mode="contained"
        onPress={() => navigation.navigate('MainTabs', { screen: 'Explorer' } as any)}
        style={[styles.exploreButton, { backgroundColor: colors.primary }]}
        labelStyle={{ color: colors.onPrimary }}
        icon="compass"
      >
        {t('saved.explore')}
      </Button>
    </Animated.View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      
      <Appbar.Header style={{ backgroundColor: colors.surface }}>
        <Appbar.Content title={t('saved.title')} titleStyle={{ fontWeight: 'bold' }} />
        {savedItems.length > 0 && (
          <Appbar.Action 
            icon="filter-variant" 
            onPress={() => {/* Optional filter dialog */}} 
            color={colors.primary}
          />
        )}
      </Appbar.Header>
      
      {savedItems.length > 0 && renderSortChips()}
      
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator animating size="large" color={colors.primary} />
      </View>
      ) : savedItems.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={savedItems}
          renderItem={renderPropertyCard}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          key={numColumns.toString()} // Important: Re-render FlatList when columns change
          contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListFooterComponent={
            <View style={styles.footerContainer}>
              <Text 
                variant="bodyMedium" 
                style={{ color: colors.onSurfaceVariant, textAlign: 'center' }}
              >
                {t('saved.footerText')}
              </Text>
              <Button
                mode="outlined"
                onPress={() => navigation.navigate('MainTabs', { screen: 'Explorer' } as any)}
                style={[styles.footerButton, { borderColor: colors.primary }]}
                labelStyle={{ color: colors.primary }}
              >
                {t('saved.exploreMore')}
              </Button>
            </View>
          }
        />
      )}
      
      {savedItems.length > 0 && (
        <FAB
          icon="map-marker"
          style={[styles.fab, { backgroundColor: colors.primary }]}
          color={colors.onPrimary}
          onPress={() => navigation.navigate('Map')} // Navigate to map view of saved items
          label={t('saved.viewOnMap')}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortChipsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  sortChip: {
    marginRight: 8,
  },
  listContainer: {
    padding: 8,
    paddingBottom: 80, // Space for FAB
  },
  cardWrapper: {
    padding: 8,
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyStateImage: {
    width: 240,
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    overflow: 'hidden',
  },
  emptyStateImageOverlay: {
    backgroundColor: 'rgba(0,0,0,0.1)', 
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 120,
  },
  emptyStateTitle: {
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  emptyStateSubtitle: {
    marginBottom: 32,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  exploreButton: {
    paddingHorizontal: 24,
    borderRadius: 30,
  },
  footerContainer: {
    padding: 24,
    alignItems: 'center',
  },
  footerButton: {
    marginTop: 16,
    paddingHorizontal: 16,
    borderRadius: 30,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 16,
    borderRadius: 28,
  },
});

export default SavedScreen; 