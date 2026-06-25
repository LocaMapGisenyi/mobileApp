import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, 
  View, 
  FlatList, 
  Text, 
  TouchableOpacity, 
  SafeAreaView,
  StatusBar,
  Platform,
  Dimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  FadeIn, 
  FadeOut, 
  SlideInRight, 
  SlideOutLeft,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { colors, spacing, typography, borderRadius } from '../theme';
import { useTranslation } from 'react-i18next';

// Components
import CardLogement from '../components/CardLogement';
import FavoriteButton from '../components/FavoriteButton';

// Types
import { RootStackParamList, Property } from '../types';

// State
import { useFavoritesStore } from '../store/favorites';

type FavoritesScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const FavoritesScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<FavoritesScreenNavigationProp>();
  const { favorites, removeFavorite } = useFavoritesStore();
  const [removedId, setRemovedId] = useState<string | null>(null);
  
  // Animation values
  const headerOpacity = useSharedValue(0);
  const listOpacity = useSharedValue(0);
  
  useEffect(() => {
    // Animate header and list when component mounts
    headerOpacity.value = withTiming(1, { duration: 600 });
    listOpacity.value = withTiming(1, { duration: 800 });
    
    return () => {
      headerOpacity.value = withTiming(0, { duration: 300 });
      listOpacity.value = withTiming(0, { duration: 300 });
    };
  }, []);
  
  const handlePropertyPress = (propertyId: string) => {
    navigation.navigate('PropertyDetails', { propertyId });
  };
  
  const handleRemoveFavorite = (propertyId: string) => {
    setRemovedId(propertyId);
    
    // Delay actual removal to allow animation to complete
    setTimeout(() => {
      removeFavorite(propertyId);
      setRemovedId(null);
    }, 500);
  };
  
  const renderEmptyState = () => (
    <Animated.View 
      entering={FadeIn.duration(600)}
      style={styles.emptyContainer}
    >
      <Animated.View 
        entering={FadeIn.delay(200).duration(800)}
        style={styles.emptyIconContainer}
      >
        <Ionicons name="heart" size={80} color={colors.error} />
      </Animated.View>
      
      <Animated.Text 
        entering={FadeIn.delay(400).duration(800)}
        style={styles.emptyTitle}
      >
        {t('favorites.noFavorites')}
      </Animated.Text>
      
      <Animated.Text 
        entering={FadeIn.delay(600).duration(800)}
        style={styles.emptyText}
      >
        {t('favorites.startBrowsing')}
      </Animated.Text>
      
      <AnimatedTouchable 
        entering={FadeIn.delay(800).duration(800)}
        style={styles.exploreButton}
        onPress={() => navigation.navigate('MainTabs', { screen: 'Explorer' } as any)}
        activeOpacity={0.8}
      >
        <Ionicons name="search" size={18} color={colors.white} style={styles.buttonIcon} />
        <Text style={styles.exploreButtonText}>
          {t('favorites.exploreMore')}
        </Text>
      </AnimatedTouchable>
    </Animated.View>
  );
  
  const renderListHeader = () => {
    const animatedHeaderStyle = useAnimatedStyle(() => {
      return {
        opacity: headerOpacity.value,
        transform: [{ translateY: withSpring(headerOpacity.value * 0) }]
      };
    });
    
    return (
      <Animated.View style={[styles.header, animatedHeaderStyle]}>
        <Text style={styles.headerTitle}>
          {t('favorites.title')}
        </Text>
        <Text style={styles.headerSubtitle}>
          {favorites.length} {t('favorites.savedCount', { count: favorites.length })}
        </Text>
      </Animated.View>
    );
  };
  
  const renderItem = ({ item, index }: { item: Property; index: number }) => {
    const isRemoving = item.id === removedId;
    
    return (
      <Animated.View
        layout={Layout.springify()}
        entering={SlideInRight.delay(index * 100).duration(400)}
        exiting={isRemoving ? SlideOutLeft.duration(500) : undefined}
        style={styles.cardContainer}
      >
        <CardLogement
          logement={item}
          index={index}
          onPress={(id) => handlePropertyPress(id)}
        />
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveFavorite(item.id)}
          activeOpacity={0.9}
        >
          <Ionicons name="heart" size={22} color={colors.white} />
        </TouchableOpacity>
      </Animated.View>
    );
  };
  
  const animatedListStyle = useAnimatedStyle(() => {
    return {
      opacity: listOpacity.value,
    };
  });
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor={colors.white}
      />
      
      {favorites.length > 0 ? (
        <Animated.FlatList
          data={favorites}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderListHeader}
          style={animatedListStyle}
          initialNumToRender={5}
          maxToRenderPerBatch={10}
          windowSize={10}
        />
      ) : (
        renderEmptyState()
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
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
    backgroundColor: colors.error,
    width: 36,
    height: 36,
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
    maxWidth: width * 0.8,
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