import React from 'react';
import { 
  StyleSheet, 
  View, 
  FlatList, 
  TouchableOpacity,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, useTheme, Divider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, GuideQuestion } from '../types';
import { spacing, typography, borderRadius } from '../theme';
import { useTranslation } from 'react-i18next';
import { recommendedQuestions } from '../data/recommendedQuestions';
import Animated, { FadeInUp } from 'react-native-reanimated';

type RecommendedQuestionsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const RecommendedQuestionsScreen = () => {
  const theme = useTheme();
  const { colors } = theme;
  const navigation = useNavigation<RecommendedQuestionsScreenNavigationProp>();
  const { t } = useTranslation();

  const handleQuestionPress = (question: GuideQuestion) => {
    // Naviguer vers un écran qui affiche le contenu de la question
    navigation.navigate('QuestionDetail', { questionId: question.id });
  };

  const renderQuestionItem = ({ item, index }: { item: GuideQuestion; index: number }) => (
    <Animated.View entering={FadeInUp.delay(index * 100).duration(400)}>
      <TouchableOpacity 
        style={[styles.questionCard, { backgroundColor: colors.surface }]}
        onPress={() => handleQuestionPress(item)}
      >
        <Text style={[styles.questionTitle, { color: colors.primary }]}>{item.title}</Text>
        <View style={styles.cardFooter}>
          <Text style={[styles.categoryTag, { backgroundColor: colors.primaryContainer, color: colors.onPrimaryContainer }]}>
            {t(`guides.section.${item.categoryId}`)}
          </Text>
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
        </View>
      </TouchableOpacity>
      {index < recommendedQuestions.length - 1 && <Divider style={styles.divider} />}
    </Animated.View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      
      <View style={[styles.header, { borderBottomColor: colors.outlineVariant }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.onSurface }]}>
          {t('guides.recommendedQuestions')}
        </Text>
        <View style={styles.headerRight} />
      </View>

      <FlatList
        data={recommendedQuestions}
        renderItem={renderQuestionItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: 'bold',
  },
  backButton: {
    padding: spacing[2],
  },
  headerRight: {
    width: 40, // Pour équilibrer le header
  },
  listContent: {
    padding: spacing[3],
  },
  questionCard: {
    padding: spacing[3],
    borderRadius: borderRadius.lg,
  },
  questionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing[2],
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[2],
  },
  categoryTag: {
    fontSize: typography.fontSize.xs,
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
    borderRadius: borderRadius.full,
    fontWeight: '500',
  },
  divider: {
    marginVertical: spacing[3],
  },
});

export default RecommendedQuestionsScreen; 