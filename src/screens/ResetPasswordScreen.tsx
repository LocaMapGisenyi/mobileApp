import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import LottieView from 'lottie-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInUp, FadeOut } from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AuthNavigator';
import { colors } from '../theme';
import TextInputField from '../components/TextInputField';
import { authService } from '../services/api/auth.service';

type ResetPasswordNav = NativeStackNavigationProp<AuthStackParamList, 'ResetPassword'>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ResetPasswordScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<ResetPasswordNav>();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [fieldError, setFieldError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const validateEmail = (): boolean => {
    if (!email.trim()) {
      setFieldError(t('auth.emailRequired'));
      return false;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setFieldError(t('auth.invalidEmail'));
      return false;
    }
    setFieldError('');
    return true;
  };

  const handleReset = async () => {
    setTouched(true);
    if (!validateEmail()) return;
    setSubmitError('');
    setLoading(true);
    try {
      await authService.forgotPassword(email.trim());
      setEmailSent(true);
      // Defer play until after state update so LottieView is mounted with speed=1
      setTimeout(() => lottieRef.current?.play(), 50);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* ─── Hero zone ───────────────────────────────────────────────────── */}
      <View style={[styles.hero, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={[styles.backBtn, { top: insets.top + 12 }]}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons name="arrow-back" size={20} color={colors.white} />
        </TouchableOpacity>

        <LottieView
          source={require('../assets/lottie/reset.json')}
          autoPlay
          loop
          style={styles.lottie}
          resizeMode="contain"
        />

        <Animated.Text style={styles.heroTitle} entering={FadeInUp.duration(500)}>
          {t('auth.forgotPassword')}
        </Animated.Text>
      </View>

      {/* ─── Form / success sheet ─────────────────────────────────────────── */}
      <ScrollView
        style={styles.sheet}
        contentContainerStyle={[
          styles.sheetContent,
          { paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {!emailSent ? (
          <Animated.View
            key="form"
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(300)}
          >
            <Animated.Text style={styles.subtitle} entering={FadeInUp.duration(400).delay(80)}>
              {t('auth.resetPasswordInstructions')}
            </Animated.Text>

            <Animated.View entering={FadeInUp.duration(400).delay(140)}>
              <TextInputField
                label={t('auth.email')}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setTouched(true);
                  if (fieldError) setFieldError('');
                  if (submitError) setSubmitError('');
                }}
                error={fieldError}
                touched={touched}
                icon="email-outline"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleReset}
                placeholder={t('auth.emailPlaceholder')}
              />
            </Animated.View>

            {submitError ? (
              <Animated.View
                style={styles.errorBanner}
                entering={FadeIn.duration(200)}
              >
                <MaterialIcons name="error-outline" size={16} color={colors.error} />
                <Text style={styles.errorBannerText}>{submitError}</Text>
              </Animated.View>
            ) : null}

            <Animated.View entering={FadeInUp.duration(400).delay(200)}>
              <TouchableOpacity
                style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                onPress={handleReset}
                disabled={loading}
                activeOpacity={0.82}
                accessibilityRole="button"
              >
                {loading ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>{t('auth.sendResetLink')}</Text>
                )}
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        ) : (
          <Animated.View
            key="success"
            style={styles.successContainer}
            entering={FadeIn.duration(400)}
          >
            <Animated.Text style={styles.successTitle} entering={FadeInUp.duration(500)}>
              {t('auth.emailSentTitle')}
            </Animated.Text>

            <Animated.Text
              style={styles.successSubtitle}
              entering={FadeInUp.duration(500).delay(80)}
            >
              {t('auth.emailSentSubtitle')}
            </Animated.Text>

            <Animated.View
              style={{ width: '100%' }}
              entering={FadeInUp.duration(500).delay(160)}
            >
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={() => navigation.navigate('Login')}
                activeOpacity={0.82}
                accessibilityRole="button"
              >
                <Text style={styles.submitBtnText}>{t('auth.backToLogin')}</Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A2E2E',
  },
  hero: {
    height: 260,
    backgroundColor: '#0A2E2E',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  backBtn: {
    position: 'absolute',
    left: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lottie: {
    width: 120,
    height: 120,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  sheet: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  sheetContent: {
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  subtitle: {
    fontSize: 15,
    color: '#5A7878',
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF1EC',
    borderWidth: 1,
    borderColor: '#F3C5B0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#C1440E',
    lineHeight: 18,
  },
  submitBtn: {
    height: 52,
    borderRadius: 10,
    backgroundColor: '#0D6E6E',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    width: '100%',
  },
  submitBtnDisabled: {
    opacity: 0.65,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  successContainer: {
    alignItems: 'center',
    paddingTop: 12,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0F1F1F',
    textAlign: 'center',
    marginBottom: 12,
  },
  successSubtitle: {
    fontSize: 15,
    color: '#5A7878',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 8,
  },
});

export default ResetPasswordScreen;
