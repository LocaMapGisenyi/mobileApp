import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  ScrollView, 
  ImageBackground,
  TouchableOpacity, 
  Share, 
  Platform, 
  StatusBar, 
  SafeAreaView,
  Dimensions,
  Image
} from 'react-native';
import { Text, Button, ActivityIndicator, Divider, IconButton, Surface } from 'react-native-paper';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { localGuides, Guide } from '../data/localGuides';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';
import Animated, { FadeIn, SlideInRight, useAnimatedScrollHandler, useSharedValue, useAnimatedStyle, interpolate, Extrapolation } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useUserStore } from '../store/user';

// Type des props pour la route
type GuideDetailRouteProp = RouteProp<RootStackParamList, 'GuideDetail'>;
type GuideDetailNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const HEADER_MAX_HEIGHT = Dimensions.get('window').height * 0.4;
const HEADER_MIN_HEIGHT = Platform.OS === 'ios' ? 90 : 70 + (StatusBar.currentHeight || 0);
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

// Fonction utilitaire pour analyser le contenu et le diviser en sections
const parseContentSections = (content: string) => {
  if (!content) return []; // Retourner un tableau vide si content est undefined ou vide
  
  const lines = content.split('\n');
  const sections = [];
  let currentSection = { type: '', content: '' };
  
  // Enhanced to identify callouts like [INFO], [TIP], [AVOID]
  const calloutRegex = /^[(INFO|TIP|AVOID)](.*)/;

  for (const line of lines) {
    if (!line) continue; // Skip undefined or null lines
    
    const calloutMatch = line.match(calloutRegex);

    if (calloutMatch && calloutMatch[2]) {
      if (currentSection.content && currentSection.type !== '') sections.push({ ...currentSection });
      sections.push({ type: calloutMatch[1].toLowerCase() as 'info' | 'tip' | 'avoid', content: calloutMatch[2].trim() });
      currentSection = { type: '', content: '' }; // Reset after a callout
    }
    // Titres
    else if (line.startsWith('# ')) {
      if (currentSection.content && currentSection.type !== '') sections.push({ ...currentSection });
      currentSection = { type: 'h1', content: line.replace('# ', '') };
      sections.push({ ...currentSection });
      currentSection = { type: '', content: '' };
    } 
    else if (line.startsWith('## ')) {
      if (currentSection.content && currentSection.type !== '') sections.push({ ...currentSection });
      currentSection = { type: 'h2', content: line.replace('## ', '') };
      sections.push({ ...currentSection });
      currentSection = { type: '', content: '' };
    } 
    else if (line.startsWith('### ')) {
      if (currentSection.content && currentSection.type !== '') sections.push({ ...currentSection });
      currentSection = { type: 'h3', content: line.replace('### ', '') };
      sections.push({ ...currentSection });
      currentSection = { type: '', content: '' };
    }
    // Listes
    else if (line.startsWith('- ')) {
      if (currentSection.type !== 'list') {
        if (currentSection.content && currentSection.type !== '') sections.push({ ...currentSection });
        currentSection = { type: 'list', content: line.replace('- ', '• ') + '\n' };
      } else {
        currentSection.content += line.replace('- ', '• ') + '\n';
      }
    }
    // Paragraphes
    else if (line.trim() !== '') {
      if (currentSection.type !== 'paragraph' && currentSection.type !== 'list') { // ensure list continues
        if (currentSection.content && currentSection.type !== '') sections.push({ ...currentSection });
        currentSection = { type: 'paragraph', content: line + '\n' };
      } else {
         if ((currentSection.type as string) === '') currentSection.type = 'paragraph'; // Start new paragraph if empty
        currentSection.content += (currentSection.type === 'paragraph' && !currentSection.content.endsWith('\n\n') && currentSection.content !== '') ? ' ' : '' + line + '\n';
      }
    }
    // Lignes vides - fin de section pour listes et paragraphes
    else if (line.trim() === '' && (currentSection.type === 'list' || currentSection.type === 'paragraph') && currentSection.content) {
      sections.push({ ...currentSection });
      currentSection = { type: '', content: '' };
    }
  }
  
  // Ajouter la dernière section si nécessaire
  if (currentSection.content && currentSection.type !== '') {
    sections.push({ ...currentSection });
  }
  
  return sections.map(s => ({...s, content: s.content ? s.content.trim() : ''}));
};

const GuideDetailScreen = () => {
  const navigation = useNavigation<GuideDetailNavigationProp>();
  const route = useRoute<GuideDetailRouteProp>();
  const { guideId } = route.params;
  const { t, i18n } = useTranslation();
  const scrollViewRef = useRef<any>(null);
  const scrollY = useSharedValue(0);

  // États
  const [guide, setGuide] = useState<Guide | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [isLiked, setIsLiked] = useState(false); // Bonus: Like state

  // Simuler la récupération du guide
  useEffect(() => {
    setIsLoading(true);
    const foundGuide = localGuides.find(g => g.id === guideId);
    // Simulate API delay
    const timer = setTimeout(() => {
      setGuide(foundGuide);
      setIsLoading(false);
      // TODO: Load liked state from a store
    }, 500);
    return () => clearTimeout(timer);
  }, [guideId]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      try {
        scrollY.value = event.contentOffset.y;
        // Utiliser un état React plutôt qu'une mise à jour dans l'animation pour plus de stabilité
        if (event.contentOffset.y > Dimensions.get('window').height * 0.5) {
          if (!showScrollToTop) setShowScrollToTop(true);
        } else {
          if (showScrollToTop) setShowScrollToTop(false);
        }
      } catch (error) {
        console.log('Scroll error:', error);
      }
    },
  });

  const scrollToTop = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };
  
  // Gérer le partage du guide
  const handleShare = async () => {
    if (!guide) return;
    try {
      const title = guide.title || t('guides.title');
      const summary = guide.summary || '';
      
      await Share.share({
        title: t('guides.shareTitle', { title }),
        message: t('guides.shareMessage', { 
          title, 
          summary, 
          interpolation: { escapeValue: false } 
        }),
        url: 'https://locamap.com/guides/' + guide.id // Replace with actual URL if available
      });
    } catch (error) {
      console.error(t('guides.shareError'), error);
    }
  };

  const handleLike = () => { // Bonus: Like handler
    setIsLiked(!isLiked);
    // TODO: Save to a store
    if (!guide) return;
    
    console.log(isLiked 
      ? t('guides.unliked', {title: guide.title || ''}) 
      : t('guides.liked', {title: guide.title || ''}));
  };
  
  // Navigation retour
  const handleGoBack = () => {
    navigation.goBack();
  };
  
  const headerAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
      [1, 1, 0],
      Extrapolation.CLAMP
    );
    return {
      opacity,
    };
  });

  const stickyHeaderAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
      [0, 1],
      Extrapolation.CLAMP
    );
     const translateY = interpolate(
      scrollY.value,
      [0, HEADER_SCROLL_DISTANCE],
      [-30, 0], // Start off-screen and slide down
      Extrapolation.CLAMP
    );
    return {
      opacity,
      transform: [{ translateY }],
    };
  });
  
  // Afficher un indicateur de chargement
  if (isLoading) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </SafeAreaView>
    );
  }
  
  // Si le guide n'existe pas
  if (!guide) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.gray[500]} />
        <Text style={styles.errorText}>
          {t('guideDetail.guideNotFound')}
        </Text>
        <Button 
          mode="contained" 
          onPress={handleGoBack}
          style={styles.backButtonError}
          labelStyle={{color: colors.white}}
        >
          {t('guideDetail.backToGuides')}
        </Button>
      </SafeAreaView>
    );
  }
  
  // Parsons le contenu en sections
  const contentSections = parseContentSections(guide.content);
  
  const Callout = ({type, message}: {type: 'info' | 'tip' | 'avoid', message: string}) => {
    const calloutStyles = {
      info: {
        icon: 'information-outline' as const,
        backgroundColor: '#EFF6FF',
        borderColor: '#93C5FD',
        iconColor: '#1D4ED8',
        textColor: '#1E40AF',
      },
      tip: {
        icon: 'lightbulb-on-outline' as const,
        backgroundColor: '#F0FDF4',
        borderColor: '#86EFAC',
        iconColor: '#15803D',
        textColor: '#166534',
      },
      avoid: {
        icon: 'alert-octagon-outline' as const,
        backgroundColor: '#FFF1F2',
        borderColor: '#FCA5A5',
        iconColor: '#B91C1C',
        textColor: '#991B1B',
      },
    };
    const style = calloutStyles[type];

    return (
      <Animated.View entering={FadeIn.duration(500).delay(200)}>
        <Surface style={[styles.calloutBase, { backgroundColor: style.backgroundColor, borderColor: style.borderColor}]}>
          <MaterialCommunityIcons name={style.icon} size={24} color={style.iconColor} style={styles.calloutIcon} />
          <Text style={[styles.calloutText, {color: style.textColor}]}>{message}</Text>
        </Surface>
      </Animated.View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Sticky Header for Title */}
      <Animated.View style={[styles.stickyHeader, stickyHeaderAnimatedStyle]}>
        <TouchableOpacity onPress={handleGoBack} style={styles.stickyBackButton}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.stickyTitle} numberOfLines={1}>{guide.title}</Text>
        <View style={{width: 40}} />{/* Placeholder for balance */}
      </Animated.View>
      
      <Animated.ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        {/* Image de couverture */}
        <ImageBackground 
          source={{ uri: guide.image }} 
          style={styles.coverImage}
          resizeMode="cover"
        >
          <View style={styles.imageOverlay} />{/* Gradient Overlay */}
          <Animated.View style={[styles.headerContentContainer, headerAnimatedStyle]}>
            <Text style={styles.title}>{guide.title}</Text>
          </Animated.View>
        </ImageBackground>

        {/* Absolute positioned Header Buttons (Back, Share, Like) */}
        <View style={styles.headerButtonsContainer}>
            <TouchableOpacity style={styles.iconButtonBackground} onPress={handleGoBack}>
                <Ionicons name="arrow-back" size={24} color={colors.gray[800]} />
            </TouchableOpacity>
            <View style={{flexDirection: 'row'}}>
                <TouchableOpacity style={[styles.iconButtonBackground, {marginRight: spacing[2]}]} onPress={handleShare}>
                    <Ionicons name="share-outline" size={22} color={colors.gray[800]} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButtonBackground} onPress={handleLike}>
                    <Ionicons name={isLiked ? "heart" : "heart-outline"} size={22} color={isLiked ? colors.primary : colors.gray[800]} />
                </TouchableOpacity>
            </View>
        </View>
        
        {/* Contenu du guide */}
        <View style={styles.contentOuterContainer}>
          {/* Résumé */}
          <Animated.View 
            entering={FadeIn.duration(600).delay(100)}
            style={styles.summaryContainer}
          >
            <Text style={styles.summaryLabel}>{t('guideDetail.summary')}</Text>
            <Text style={styles.summary}>{guide.summary}</Text>
          </Animated.View>
          
          <Divider style={styles.divider} />
          
          {/* Contenu principal */}
          <View style={styles.mainContentContainer}>
            {contentSections.map((section, index) => {
              // Add a unique key for each animated view if sections can change
              const animationKey = `section-${guide.id}-${index}`; 
              const delay = Math.min(index * 30, 300); // Limiter le délai maximum à 300ms
              
              switch(section.type) {
                case 'h1':
                  return (
                    <Animated.Text entering={FadeIn.duration(300).delay(delay)} key={animationKey} style={styles.heading1}>
                      {section.content}
                    </Animated.Text>
                  );
                case 'h2':
                  return (
                    <Animated.Text entering={FadeIn.duration(300).delay(delay)} key={animationKey} style={styles.heading2}>
                      {section.content}
                    </Animated.Text>
                  );
                case 'h3':
                  return (
                    <Animated.Text entering={FadeIn.duration(300).delay(delay)} key={animationKey} style={styles.heading3}>
                      {section.content}
                    </Animated.Text>
                  );
                case 'list':
                  return (
                    <Animated.Text entering={FadeIn.duration(300).delay(delay)} key={animationKey} style={styles.list}>
                      {section.content && section.content.split('\n').map((item, i) => (
                        item && item.trim() ? <Text key={i} style={styles.listItem}>{item.trim()}</Text> : null
                      ))}
                    </Animated.Text>
                  );
                case 'info':
                case 'tip':
                case 'avoid':
                  return <Callout key={animationKey} type={section.type as 'info' | 'tip' | 'avoid'} message={section.content} />;
                case 'paragraph':
                default:
                  return (
                    <Animated.Text entering={FadeIn.duration(300).delay(delay)} key={animationKey} style={styles.paragraph}>
                      {section.content}
                    </Animated.Text>
                  );
              }
            })}
          </View>
        </View>
      </Animated.ScrollView>

      {/* Bouton Scroll to Top */}
      {showScrollToTop && (
        <Animated.View entering={FadeIn} exiting={FadeIn}>
          <TouchableOpacity
            style={styles.scrollToTopButton}
            onPress={scrollToTop}
          >
            <Ionicons name="arrow-up" size={24} color={colors.white} />
          </TouchableOpacity>
        </Animated.View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.white,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
    backgroundColor: colors.white,
  },
  loadingText: {
    marginTop: spacing[3],
    fontSize: typography.fontSize.base,
    color: colors.gray[600],
  },
  errorText: {
    marginTop: spacing[3],
    fontSize: typography.fontSize.base,
    color: colors.gray[700],
    textAlign: 'center',
    marginBottom: spacing[4],
  },
  backButtonError: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[2],
  },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_MIN_HEIGHT,
    backgroundColor: colors.white,
    zIndex: 100, // Ensure it's above other content
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 40 : StatusBar.currentHeight,
    paddingHorizontal: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
    ...shadows.sm,
  },
  stickyBackButton: {
    padding: spacing[1],
  },
  stickyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: 'bold',
    color: colors.gray[800],
    textAlign: 'center',
    flex: 1, // Allows title to take space and center
    marginHorizontal: spacing[2],
  },
  coverImage: {
    width: '100%',
    height: HEADER_MAX_HEIGHT, 
    justifyContent: 'flex-end', // Align title to bottom
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)', // Darker overlay for text visibility
  },
  headerContentContainer: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4], // Space for title from bottom
  },
  headerButtonsContainer: {
    position: 'absolute',
    top: Platform.OS === 'android' ? StatusBar.currentHeight || 0 + spacing[3] : spacing[6], // Adjust for status bar
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    zIndex: 10, // Above image overlay
  },
  iconButtonBackground: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)', // Semi-transparent white
    borderRadius: borderRadius.full,
    padding: spacing[2],
    ...shadows.md,
  },
  title: {
    fontSize: typography.fontSize['3xl'], // Larger title
    fontWeight: 'bold',
    color: colors.white,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    textAlign: 'left',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing[8], // Ensure space for scroll to top button
  },
  contentOuterContainer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl, // Curved top edges for content area
    borderTopRightRadius: borderRadius.xl,
    marginTop: -spacing[4], // Overlap image slightly
    paddingTop: spacing[5], // Padding inside the container
  },
  summaryContainer: {
    paddingHorizontal: spacing[4],
    marginBottom: spacing[4],
  },
  summaryLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.gray[500],
    textTransform: 'uppercase',
    marginBottom: spacing[2],
  },
  summary: {
    fontSize: typography.fontSize.base,
    lineHeight: typography.lineHeight.relaxed,
    color: colors.gray[700],
  },
  divider: {
    marginHorizontal: spacing[4],
    marginVertical: spacing[4],
    backgroundColor: colors.gray[200],
  },
  mainContentContainer: {
    paddingHorizontal: spacing[4],
  },
  heading1: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: 'bold',
    color: colors.gray[800],
    marginTop: spacing[4],
    marginBottom: spacing[3],
  },
  heading2: {
    fontSize: typography.fontSize.xl,
    fontWeight: 'bold',
    color: colors.gray[800],
    marginTop: spacing[3],
    marginBottom: spacing[2],
  },
  heading3: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600', // Semi-bold
    color: colors.gray[800],
    marginTop: spacing[3],
    marginBottom: spacing[2],
  },
  paragraph: {
    fontSize: typography.fontSize.base,
    lineHeight: typography.lineHeight.relaxed,
    color: colors.gray[700], // Slightly lighter than titles
    marginBottom: spacing[3],
    textAlign: 'justify',
  },
  list: {
    marginBottom: spacing[3],
  },
  listItem: {
    fontSize: typography.fontSize.base,
    lineHeight: typography.lineHeight.relaxed,
    color: colors.gray[700],
    marginBottom: spacing[1],
    marginLeft: spacing[2], // Indent list items
  },
  scrollToTopButton: {
    position: 'absolute',
    bottom: spacing[5],
    right: spacing[4],
    backgroundColor: colors.primary,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
    zIndex: 200,
  },
  calloutBase: {
    padding: spacing[3],
    marginVertical: spacing[3],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.sm,
  },
  calloutIcon: {
    marginRight: spacing[3],
  },
  calloutText: {
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.normal,
    flex: 1, // Allow text to wrap
  },
});

export default GuideDetailScreen; 