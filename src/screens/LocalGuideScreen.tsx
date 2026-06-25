import React, { useState, useEffect, useMemo } from 'react';
import { 
  StyleSheet, 
  View, 
  ScrollView, 
  TextInput as RNTextInput, 
  TouchableOpacity, 
  StatusBar, 
  RefreshControl,
  Platform,
  Dimensions,
  SectionList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Searchbar, Divider, useTheme, ActivityIndicator, Chip, Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { RootStackParamList, GuideCategory, Guide } from '../types';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';
import GuideCard from '../components/GuideCard';
import { guideCategories, localGuides } from '../data/localGuides';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInUp } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const LocalGuideScreen = () => {
  const theme = useTheme();
  const { colors } = theme;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { t } = useTranslation();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  
  useEffect(() => {
    setTimeout(() => setIsLoading(false), 500);
  }, []);
  
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setActiveCategory(null);
  };
  
  const onRefresh = () => {
    setRefreshing(true);
    setIsLoading(true);
    setSearchQuery('');
    setActiveCategory(null);
    setTimeout(() => {
      setRefreshing(false);
      setIsLoading(false);
    }, 1000);
  };
  
  const sectionsData = useMemo(() => {
    let filteredGuides = localGuides;
    
    if (searchQuery && searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      filteredGuides = localGuides.filter(
        guide =>
          guide.title.toLowerCase().includes(lowerQuery) ||
          guide.summary.toLowerCase().includes(lowerQuery) ||
          guide.content.toLowerCase().includes(lowerQuery)
      );
    } else if (activeCategory) {
      filteredGuides = localGuides.filter(guide => guide.categoryId === activeCategory);
    }
    
    return guideCategories
      .map(category => ({
        title: t(`guides.section.${category.id}`, category.title),
        icon: category.icon,
        data: filteredGuides.filter(guide => guide.categoryId === category.id),
        categoryId: category.id
      }))
      .filter(section => section.data.length > 0);
  }, [searchQuery, activeCategory, t]);
  
  const renderGuideCard = ({ item, index }: { item: Guide; index: number }) => (
    <Animated.View entering={FadeInUp.delay(index * 100).duration(400)}>
      <GuideCard
        guide={item}
        size='large'
        style={styles.guideCard}
      />
    </Animated.View>
  );
  
  const renderSectionHeader = ({ section }: { section: { title: string; icon: string; categoryId: string } }) => (
    <View style={styles.sectionHeaderContainer}>
      <View style={styles.sectionHeaderContent}>
        {section.icon && (
          <MaterialCommunityIcons 
            name={section.icon as any}
            size={26} 
            color={colors.primary} 
            style={styles.sectionIcon} 
          />
        )}
        <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>{section.title}</Text>
      </View>     
    </View>
  );
  
  const renderCategoryChips = () => (
    <View>
      {/* Main category tabs */}
      <View style={styles.mainTabsContainer}>
        <TouchableOpacity 
          style={[
            styles.mainTabButton, 
            !activeCategory ? styles.activeMainTab : null,
            { backgroundColor: !activeCategory ? '#FF5A5F' : colors.surfaceVariant }
          ]}
          onPress={() => setActiveCategory(null)}
        >
          <Ionicons 
            name="checkmark-circle" 
            size={20} 
            color={!activeCategory ? 'white' : colors.onSurfaceVariant} 
          />
          <Text 
            style={[
              styles.mainTabText, 
              { color: !activeCategory ? 'white' : colors.onSurfaceVariant }
            ]}
          >
            {t('guides.allCategories')}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.mainTabButton, 
            { backgroundColor: colors.surfaceVariant }
          ]}
          onPress={() => {
            // Navigation vers les questions recommandées
            try {
              // Filtrer les guides qui ont des parties question/réponse
              // Pour le moment, utilisons les guides déjà créés pour faire fonctionner la navigation
              if (localGuides.length > 0) {
                // Sélectionnons le premier guide comme exemple
                navigation.navigate('GuideDetail', { guideId: localGuides[0].id });
              } else {
                // Fallback au cas où il n'y a pas de guides
                alert(t('guides.noRecommendedQuestionsAvailable'));
              }
            } catch (error) {
              console.error('Navigation error:', error);
            }
          }}
        >
          <Ionicons 
            name="home" 
            size={20} 
            color={colors.onSurfaceVariant} 
          />
          <Text 
            style={[
              styles.mainTabText, 
              { color: colors.onSurfaceVariant }
            ]}
          >
            {t('guides.recommendedQuestions')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Category chips scrolling row */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={styles.chipsContainer}
      >
        {guideCategories.map(category => (
          <Chip 
            key={category.id}
            icon={() => <MaterialCommunityIcons 
                          name={(category.icon) as any} 
                          size={18} 
                          color={activeCategory === category.id ? colors.onPrimary : colors.primary} 
                        />}
            style={[
              styles.chip, 
              activeCategory === category.id 
                ? {backgroundColor: colors.primary} 
                : {backgroundColor: colors.surface}
            ]}
            textStyle={[
              styles.chipText, 
              activeCategory === category.id 
                ? {color: colors.onPrimary} 
                : {color: colors.primary}
            ]}
            onPress={() => setActiveCategory(category.id)} 
            selected={activeCategory === category.id}
          >
            {t(`guides.section.${category.id}`, category.title)}
          </Chip>
        ))}
      </ScrollView>
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator animating={true} size="large" color={colors.primary} />
        <Text style={[styles.loadingText, {color: colors.onSurfaceVariant}]}>{t('common.loading')}</Text>
      </View>
    );
  }
  
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      
      <View style={[styles.header, { borderBottomColor: colors.outlineVariant }]}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.onSurface }]}>{t('guides.title')}</Text>
        <View style={styles.iconButton} />
      </View>
      
      <View style={[styles.searchBarContainer, {backgroundColor: colors.background}]}>
        <Searchbar
          placeholder={t('guides.searchPlaceholder')}
          onChangeText={handleSearch}
          value={searchQuery}
          style={styles.searchBar}
          inputStyle={{ fontSize: typography.fontSize.sm, color: '#333333' }}
          iconColor={colors.onSurfaceVariant || '#717171'}
        />
      </View>
      
      {!searchQuery && renderCategoryChips()}
      
      {sectionsData.length === 0 ? (
        <View style={[styles.centered, styles.noResultsContainer, {backgroundColor: colors.background}]}>
          <Ionicons name="sad-outline" size={60} color={colors.onSurfaceDisabled} />
          <Text style={[styles.noResultsText, {color: colors.onSurfaceVariant}]}>
            {searchQuery && searchQuery.trim() 
              ? t('guides.noSearchResults', { query: searchQuery })
              : t('guides.noGuidesInCategory')}
          </Text>
          {searchQuery && searchQuery.trim() && <Button onPress={() => handleSearch('')} mode="outlined">{t('guides.clearSearch')}</Button>}
        </View>
      ) : (
        <SectionList
          sections={sectionsData}
          keyExtractor={(item) => item.id}
          renderItem={renderGuideCard}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.sectionListContent}
        showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
              tintColor={colors.primary}
              title={refreshing ? t('common.refreshing') : undefined}
              titleColor={colors.onSurfaceVariant}
            />
          }
          ListFooterComponent={<View style={{height: 20}} />}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  loadingText: {
    marginTop: spacing[2],
    fontSize: typography.fontSize.base,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
  },
  iconButton: {
    padding: spacing[2],
    width: 48,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: 'bold',
  },
  searchBarContainer: {
    padding: spacing[3],
    paddingBottom: spacing[2],
  },
  searchBar: {
    borderRadius: borderRadius.lg,
  },
  searchInput: {
    fontSize: typography.fontSize.base,
  },
  chipsContainer: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  chip: {
    marginRight: spacing[2],   
  },
  chipText: {
    fontSize: typography.fontSize.sm,
  },
  sectionListContent: {
    paddingHorizontal: spacing[3],
    paddingBottom: spacing[4],
  },
  sectionHeaderContainer: {
    paddingTop: spacing[4],
    paddingBottom: spacing[3],
    backgroundColor: 'transparent',
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    marginRight: spacing[2],
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: 'bold',
    flex: 1,
  },
  guideCard: {
    width: width - (spacing[3] * 2),
    marginLeft: 0,
    marginRight: 0,
    marginBottom: spacing[3],
  },
  noResultsContainer: {
    paddingBottom: spacing[8],
  },
  noResultsText: {
    marginTop: spacing[3],
    fontSize: typography.fontSize.base,
    textAlign: 'center',
    lineHeight: typography.lineHeight.base,
    marginBottom: spacing[3],
  },
  mainTabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    alignItems: 'center',
  },
  mainTabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: 30,
    marginRight: spacing[2],
  },
  activeMainTab: {
    backgroundColor: '#FF5A5F',
  },
  mainTabText: {
    fontSize: typography.fontSize.sm,
    marginLeft: spacing[1],
    fontWeight: '500',
  },
});

export default LocalGuideScreen; 