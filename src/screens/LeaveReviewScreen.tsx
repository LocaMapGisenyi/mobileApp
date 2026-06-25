import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, StatusBar, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button, TextInput as PaperTextInput, Divider, Chip, HelperText, Snackbar, useTheme, Avatar, ActivityIndicator } from 'react-native-paper';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors as themeColors, spacing, typography, borderRadius, shadows } from '../theme';
import { RootStackParamList, Review } from '../types';
import RatingStars from '../components/RatingStars';
import useReviewsStore from '../store/reviews';
import { useUserStore } from '../store/user';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

// Types des props
type LeaveReviewScreenRouteProp = RouteProp<RootStackParamList, 'LeaveReview'>;
type LeaveReviewNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const MAX_COMMENT_LENGTH = 500;

const LeaveReviewScreen = () => {
  const navigation = useNavigation<LeaveReviewNavigationProp>();
  const route = useRoute<LeaveReviewScreenRouteProp>();
  const { propertyId, propertyTitle, ownerId, ownerName } = route.params;
  const { t } = useTranslation();
  const theme = useTheme();
  const { colors } = theme;
  
  const { addReview } = useReviewsStore();
  const { user } = useUserStore();
  
  // États locaux
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [ownerRating, setOwnerRating] = useState(0);
  const [ownerFeedback, setOwnerFeedback] = useState('');
  const [includeOwnerReview, setIncludeOwnerReview] = useState(false);
  const [stayDuration, setStayDuration] = useState<'short term' | 'long term'>('short term');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessSnackbar, setShowSuccessSnackbar] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const handleRatingChange = (newRating: number) => {
    setRating(newRating);
    if (validationError) setValidationError(null);
  };
  
  const handleCommentChange = (text: string) => {
    if (text.length <= MAX_COMMENT_LENGTH) {
      setComment(text);
    }
    if (validationError) setValidationError(null);
  };
  
  const validateForm = () => {
    if (rating === 0) {
      setValidationError(t('reviews.errorRatingRequired'));
      return false;
    }
    if (comment.trim().length < 10) {
      setValidationError(t('reviews.errorCommentTooShort', { minLength: 10 }));
      return false;
    }
    setValidationError(null);
    return true;
  };
  
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newReviewData: Omit<Review, 'id' | 'date'> = {
        propertyId,
      authorId: user.id || 'anonymous_user',
      authorName: user.fullName || t('reviews.anonymousUser'),
      authorAvatar: user.photoURL || undefined,
        rating,
      comment: comment.trim(),
        isVerified: true,
    };
    
    addReview(newReviewData);
      setIsSubmitting(false);
    setShowSuccessSnackbar(true);
      
      setTimeout(() => {
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.replace('PropertyDetails', { propertyId });
      }
      }, 2000);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.outlineVariant }]}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.onSurface }]}>{t('reviews.leaveReviewTitle')}</Text>
        <View style={styles.iconButton} />
      </View>
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeInUp.duration(400)} style={styles.contentContainer}>
            {/* Property Info */}
            <View style={styles.propertyInfoCard}>
              <Text style={[styles.propertyTitle, {color: colors.onSurface}]}>{propertyTitle}</Text>
              <Text style={[styles.subPropertyTitle, {color: colors.onSurfaceVariant}]}>
                {t('reviews.reviewingAs')} {user.fullName ? ` ${user.fullName}` : t('reviews.anonymousUser')}
                </Text>
              {user.fullName && (
                <View style={styles.verifiedBadge}>
                  <MaterialCommunityIcons name="check-decagram" size={16} color={colors.primary} />
                  <Text style={[styles.verifiedText, {color: colors.primary}]}>{t('reviews.verifiedTenant')}</Text>
                </View>
              )}
            </View>
            
            {/* Rating Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.onSurfaceVariant }]}>{t('reviews.yourRating')}</Text>
              <View style={styles.ratingStarsContainer}>
                <RatingStars
                  rating={rating}
                  size={36}
                  onRatingChange={handleRatingChange}
                  color={colors.primary}
                  precision="full"
                />
              </View>
            </View>
          
            {/* Comment Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.onSurfaceVariant }]}>{t('reviews.yourComment')}</Text>
              <PaperTextInput
                multiline
                value={comment}
                onChangeText={handleCommentChange}
                placeholder={t('reviews.commentPlaceholder') || ''}
                style={[styles.commentInput, { backgroundColor: colors.surfaceVariant }]}
                outlineStyle={styles.textInputOutline}
                activeOutlineColor={colors.primary}
                maxLength={MAX_COMMENT_LENGTH}
                numberOfLines={6}
              />
              <View style={styles.charCountContainer}>
                <HelperText type={validationError ? 'error' : 'info'} visible={true}>
                  {validationError ? validationError : `${comment.length}/${MAX_COMMENT_LENGTH} ${t('reviews.characters')}`}
                </HelperText>
              </View>
            </View>
            
            {/* Submit Button */}
            <Animated.View entering={FadeInUp.delay(200).duration(500)} style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={isSubmitting}
              disabled={isSubmitting}
                style={[styles.submitButton, { backgroundColor: colors.primary }]}
                labelStyle={styles.submitButtonText}
                icon={() => isSubmitting ? <ActivityIndicator color={colors.onPrimary} size="small" /> : <Ionicons name="send" size={18} color={colors.onPrimary} />}
            >
                {isSubmitting ? t('reviews.submitting') : t('reviews.sendReview')}
            </Button>
            </Animated.View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
      
      <Snackbar
        visible={showSuccessSnackbar}
        onDismiss={() => setShowSuccessSnackbar(false)}
        duration={1800}
        style={{ backgroundColor: colors.primaryContainer }}
      >
        <Text style={{color: colors.onPrimaryContainer}}>{t('reviews.thankYouMessage')}</Text>
      </Snackbar>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
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
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    textAlign: 'center',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing[4],
  },
  contentContainer: {
    width: '100%',
  },
  propertyInfoCard: {
    backgroundColor: themeColors.gray[50],
    borderRadius: borderRadius.md,
    padding: spacing[3],
    marginBottom: spacing[4],
    alignItems: 'center',
    ...shadows.sm,
  },
  propertyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: spacing[1],
  },
  subPropertyTitle: {
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.primary + '20',
    paddingHorizontal: spacing[2],
  },
  verifiedText: {
    fontSize: typography.fontSize.sm,
    fontWeight: 'bold',
    marginLeft: spacing[1],
  },
  section: {
    marginBottom: spacing[4],
  },
  sectionLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: 'bold',
    marginBottom: spacing[2],
  },
  ratingStarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentInput: {
    height: 120,
    padding: spacing[2],
  },
  textInputOutline: {
    borderWidth: 1,
    borderColor: themeColors.outline,
  },
  charCountContainer: {
    alignItems: 'flex-end',
  },
  buttonContainer: {
    alignItems: 'center',
  },
  submitButton: {
    padding: spacing[3],
  },
  submitButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: 'bold',
  },
});

export default LeaveReviewScreen; 