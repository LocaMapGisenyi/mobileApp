import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  StatusBar, 
  Share
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Divider, IconButton, useTheme, ActivityIndicator } from 'react-native-paper';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, GuideQuestion } from '../types';
import { spacing, typography, borderRadius, shadows } from '../theme';
import { useTranslation } from 'react-i18next';
import { recommendedQuestions } from '../data/recommendedQuestions';
import Animated, { FadeIn } from 'react-native-reanimated';

// Type pour la route
type QuestionDetailRouteProp = RouteProp<RootStackParamList, 'QuestionDetail'>;
type QuestionDetailNavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Fonction utilitaire pour analyser le contenu markdown simple
const parseContentSections = (content: string) => {
  if (!content) return [];
  
  const lines = content.split('\n');
  const sections = [];
  let currentSection = { type: '', content: '' };
  
  for (const line of lines) {
    if (!line) continue; // Skip empty lines
    
    // Headings
    if (line.startsWith('# ')) {
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
    // Lists
    else if (line.startsWith('- ')) {
      if (currentSection.type !== 'list') {
        if (currentSection.content && currentSection.type !== '') sections.push({ ...currentSection });
        currentSection = { type: 'list', content: line.replace('- ', '• ') + '\n' };
      } else {
        currentSection.content += line.replace('- ', '• ') + '\n';
      }
    }
    // Paragraphs
    else if (line.trim() !== '') {
      if (currentSection.type !== 'paragraph') {
        if (currentSection.content && currentSection.type !== '') sections.push({ ...currentSection });
        currentSection = { type: 'paragraph', content: line + '\n' };
      } else {
        currentSection.content += line + '\n';
      }
    }
    // Empty lines - end section for lists and paragraphs
    else if (line.trim() === '' && (currentSection.type === 'list' || currentSection.type === 'paragraph')) {
      sections.push({ ...currentSection });
      currentSection = { type: '', content: '' };
    }
  }
  
  // Add the last section if needed
  if (currentSection.content && currentSection.type !== '') {
    sections.push({ ...currentSection });
  }
  
  return sections.map(s => ({...s, content: s.content.trim()}));
};

const QuestionDetailScreen = () => {
  const navigation = useNavigation<QuestionDetailNavigationProp>();
  const route = useRoute<QuestionDetailRouteProp>();
  const { questionId } = route.params;
  const { t } = useTranslation();
  const theme = useTheme();
  const { colors } = theme;
  
  const [question, setQuestion] = useState<GuideQuestion | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  
  // Récupérer la question
  useEffect(() => {
    setIsLoading(true);
    const foundQuestion = recommendedQuestions.find(q => q.id === questionId);
    
    // Simulate API delay
    const timer = setTimeout(() => {
      setQuestion(foundQuestion);
      setIsLoading(false);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [questionId]);
  
  // Partager la question
  const handleShare = async () => {
    if (!question) return;
    
    try {
      await Share.share({
        title: `LocaMap: ${question.title}`,
        message: `${question.title}\n\nDécouvert sur LocaMap, l'application pour découvrir Gisenyi.`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };
  
  // Navigation retour
  const handleGoBack = () => {
    navigation.goBack();
  };
  
  // Afficher un indicateur de chargement
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.centeredContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.onSurfaceVariant }]}>
          {t('common.loading')}
        </Text>
      </SafeAreaView>
    );
  }
  
  // Si la question n'existe pas
  if (!question) {
    return (
      <SafeAreaView style={[styles.centeredContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={[styles.errorText, { color: colors.onSurface }]}>
          {t('guideDetail.guideNotFound')}
        </Text>
        <TouchableOpacity 
          onPress={handleGoBack}
          style={[styles.backButton, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.backButtonText, { color: colors.onPrimary }]}>
            {t('guideDetail.backToGuides')}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }
  
  // Analyser le contenu en sections
  const contentSections = parseContentSections(question.content);
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      
      <View style={[styles.header, { borderBottomColor: colors.outlineVariant }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Ionicons name="arrow-back" size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text 
          style={[styles.headerTitle, { color: colors.onSurface }]} 
          numberOfLines={1}
        >
          {t(`guides.section.${question.categoryId}`)}
        </Text>
        <IconButton 
          icon="share-variant-outline" 
          size={24} 
          onPress={handleShare} 
          iconColor={colors.onSurface}
        />
      </View>
      
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(500)}>
          <Text style={[styles.questionTitle, { color: colors.primary }]}>
            {question.title}
          </Text>
        </Animated.View>
        
        <Divider style={styles.divider} />
        
        <View style={styles.contentContainer}>
          {contentSections.map((section, index) => {
            const key = `section-${question.id}-${index}`;
            const animationDelay = 100 + (index * 50);
            
            switch(section.type) {
              case 'h1':
                return (
                  <Animated.Text 
                    entering={FadeIn.duration(400).delay(animationDelay)} 
                    key={key} 
                    style={[styles.h1, { color: colors.onSurface }]}
                  >
                    {section.content}
                  </Animated.Text>
                );
              case 'h2':
                return (
                  <Animated.Text 
                    entering={FadeIn.duration(400).delay(animationDelay)} 
                    key={key} 
                    style={[styles.h2, { color: colors.onSurface }]}
                  >
                    {section.content}
                  </Animated.Text>
                );
              case 'h3':
                return (
                  <Animated.Text 
                    entering={FadeIn.duration(400).delay(animationDelay)} 
                    key={key} 
                    style={[styles.h3, { color: colors.onSurface }]}
                  >
                    {section.content}
                  </Animated.Text>
                );
              case 'list':
                return (
                  <Animated.View 
                    entering={FadeIn.duration(400).delay(animationDelay)} 
                    key={key} 
                    style={styles.listContainer}
                  >
                    {section.content.split('\n').map((item, i) => (
                      item ? (
                        <Text 
                          key={`${key}-item-${i}`} 
                          style={[styles.listItem, { color: colors.onSurfaceVariant }]}
                        >
                          {item}
                        </Text>
                      ) : null
                    ))}
                  </Animated.View>
                );
              case 'paragraph':
              default:
                return (
                  <Animated.Text 
                    entering={FadeIn.duration(400).delay(animationDelay)} 
                    key={key} 
                    style={[styles.paragraph, { color: colors.onSurfaceVariant }]}
                  >
                    {section.content}
                  </Animated.Text>
                );
            }
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  loadingText: {
    marginTop: spacing[3],
    fontSize: typography.fontSize.base,
  },
  errorText: {
    marginTop: spacing[3],
    fontSize: typography.fontSize.lg,
    textAlign: 'center',
    marginBottom: spacing[4],
    fontWeight: '500',
  },
  backButton: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.md,
    ...shadows.sm,
  },
  backButtonText: {
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  questionTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: spacing[4],
  },
  contentContainer: {
    marginBottom: spacing[4],
  },
  h1: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: 'bold',
    marginTop: spacing[4],
    marginBottom: spacing[3],
  },
  h2: {
    fontSize: typography.fontSize.xl,
    fontWeight: 'bold',
    marginTop: spacing[3],
    marginBottom: spacing[2],
  },
  h3: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    marginTop: spacing[3],
    marginBottom: spacing[2],
  },
  paragraph: {
    fontSize: typography.fontSize.base,
    lineHeight: typography.lineHeight.relaxed,
    marginBottom: spacing[3],
  },
  listContainer: {
    marginBottom: spacing[3],
  },
  listItem: {
    fontSize: typography.fontSize.base,
    lineHeight: typography.lineHeight.relaxed,
    marginBottom: spacing[1],
    paddingLeft: spacing[1],
  },
});

export default QuestionDetailScreen; 