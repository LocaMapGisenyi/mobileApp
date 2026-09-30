import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Text,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import Animated from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';

import { AuthStackParamList } from '../navigation/AuthNavigator';
import TextInputField from '../components/TextInputField';
import { useUserStore } from '../store/user';
import { colors, borderRadius, spacing, typography } from '../theme';

type RegisterNav = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Field stagger delays — each row enters 50ms after the previous

const RegisterScreen = () => {
  const navigation = useNavigation<RegisterNav>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const register = useUserStore(s => s.actions.register);

  const registering = useRef(false);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [touched, setTouched] = useState({
    fullName: false,
    email: false,
    password: false,
    confirmPassword: false,
  });

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const touch = (field: keyof typeof touched) =>
    setTouched(prev => ({ ...prev, [field]: true }));

  const fieldError = {
    fullName: touched.fullName && !fullName.trim()
      ? t('errors.requiredField')
      : '',
    email: touched.email
      ? !email.trim()
        ? t('errors.requiredField')
        : !EMAIL_RE.test(email)
        ? t('errors.invalidEmail')
        : ''
      : '',
    password: touched.password
      ? !password
        ? t('errors.requiredField')
        : password.length < 6
        ? t('errors.weakPassword')
        : ''
      : '',
    confirmPassword: touched.confirmPassword
      ? !confirmPassword
        ? t('errors.requiredField')
        : confirmPassword !== password
        ? t('errors.passwordMismatch')
        : ''
      : '',
  };

  const validate = (): boolean => {
    setTouched({ fullName: true, email: true, password: true, confirmPassword: true });
    return (
      !!fullName.trim() &&
      EMAIL_RE.test(email) &&
      password.length >= 6 &&
      password === confirmPassword
    );
  };

  const handleRegister = async () => {
    if(registering.current)return;
    if (!validate()) return;
    registering.current=true;
    setLoading(true);
    setApiError('');
    try {
      await register({ fullName: fullName.trim(), email: email.trim(), password });
      setShowSuccess(true);
      // Supabase can require email verification; the navigator follows actual session state.
    } catch (err) {
      setApiError(err instanceof Error ? err.message : t('errors.generic'));
    } finally {
      registering.current=false;
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── Top zone — fixed 220 px deep background ── */}
      <Animated.View style={styles.topZone}>
        <Text style={{ fontSize: 26, fontWeight: '800', color: colors.ink }}>Loca<Text style={{ color: colors.primary }}>Map</Text></Text>
      </Animated.View>

      {/* ── White card form zone ── */}
      <KeyboardAvoidingView
        style={styles.cardFlex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.card}>
          {/* Back button sits inside the card, top-left */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons name="arrow-back" size={20} color={colors.ink} />
          </TouchableOpacity>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + 32 },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Heading */}
            <Animated.Text
              style={styles.heading}
            >
              {t('auth.createAccount')}
            </Animated.Text>

            {/* Fields — staggered entry */}
            <Animated.View>
              <TextInputField
                label={t('auth.fullName')}
                value={fullName}
                onChangeText={v => { setFullName(v); touch('fullName'); }}
                onBlur={() => touch('fullName')}
                error={fieldError.fullName}
                touched={touched.fullName}
                icon="account-outline"
                autoCapitalize="words"
                returnKeyType="next"
                placeholder={t('auth.fullNamePlaceholder')}
                onSubmitEditing={() => emailRef.current?.focus()}
                blurOnSubmit={false}
              />
            </Animated.View>

            <Animated.View>
              <TextInputField
                ref={emailRef}
                label={t('auth.email')}
                value={email}
                onChangeText={v => { setEmail(v); touch('email'); }}
                onBlur={() => touch('email')}
                error={fieldError.email}
                touched={touched.email}
                icon="email-outline"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                returnKeyType="next"
                placeholder={t('auth.emailPlaceholder')}
                onSubmitEditing={() => passwordRef.current?.focus()}
                blurOnSubmit={false}
              />
            </Animated.View>

            <Animated.View>
              <TextInputField
                ref={passwordRef}
                label={t('auth.password')}
                value={password}
                onChangeText={v => { setPassword(v); touch('password'); }}
                onBlur={() => touch('password')}
                error={fieldError.password}
                touched={touched.password}
                icon="lock-outline"
                secureTextEntry
                returnKeyType="next"
                placeholder={t('auth.passwordPlaceholder')}
                onSubmitEditing={() => confirmRef.current?.focus()}
                blurOnSubmit={false}
              />
            </Animated.View>

            <Animated.View>
              <TextInputField
                ref={confirmRef}
                label={t('auth.confirmPassword')}
                value={confirmPassword}
                onChangeText={v => { setConfirmPassword(v); touch('confirmPassword'); }}
                onBlur={() => touch('confirmPassword')}
                error={fieldError.confirmPassword}
                touched={touched.confirmPassword}
                icon="lock-check-outline"
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleRegister}
                placeholder={t('auth.confirmPasswordPlaceholder')}
              />
            </Animated.View>

            {/* API error banner */}
            {apiError ? (
              <Animated.View
                style={styles.apiBanner}
              >
                <MaterialIcons name="error-outline" size={16} color={colors.error} />
                <Text style={styles.apiBannerText}>{apiError}</Text>
              </Animated.View>
            ) : null}

            {/* Submit */}
            <Animated.View>
              <TouchableOpacity
                style={[styles.submitBtn, loading && styles.submitBtnLoading]}
                onPress={handleRegister}
                disabled={loading}
                accessibilityRole="button"
                activeOpacity={0.82}
              >
                {loading ? (
                  <ActivityIndicator color={colors.onAccent} size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>{t('auth.register')}</Text>
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* Already have account */}
            <Animated.View
              style={styles.loginRow}
            >
              <Text style={styles.loginRowText}>{t('auth.alreadyHaveAccount')}</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Login')}
                accessibilityRole="button"
              >
                <Text style={styles.loginRowLink}>{t('auth.login')}</Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* Success banner — absolutely positioned, appears after register */}
      {showSuccess ? (
        <Animated.View
          style={[styles.successBanner, { bottom: insets.bottom + 24 }]}
          pointerEvents="none"
        >
          <MaterialIcons name="check-circle" size={18} color={colors.white} />
          <Text style={styles.successBannerText}>{useUserStore.getState().user.isLoggedIn ? t('auth.accountCreated') : 'Consultez votre email pour confirmer votre compte, puis connectez-vous.'}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1, backgroundColor: colors.background,
  },

  // ── Top zone ────────────────────────────────────────────────────────────────
  topZone: {
    minHeight: 92, paddingTop: 24, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center',
  },
  lottie: {
    width: 160,
    height: 160,
  },

  // ── White card ───────────────────────────────────────────────────────────────
  cardFlex: {
    flex: 1,
  },
  card: {
    flex: 1, backgroundColor: colors.background,
  },

  // ── Back button ──────────────────────────────────────────────────────────────
  backBtn: {
    position: 'absolute',
    top: 16,
    left: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F4EF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Scroll ───────────────────────────────────────────────────────────────────
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    width: '100%', maxWidth: 520, alignSelf: 'center', paddingTop: 68, paddingHorizontal: 24,
  },

  // ── Heading ──────────────────────────────────────────────────────────────────
  heading: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: colors.ink,
    marginBottom: spacing[5],
    letterSpacing: -0.3,
  },

  // ── API error banner ─────────────────────────────────────────────────────────
  apiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F0',
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    marginBottom: spacing[4],
    gap: spacing[2],
  },
  apiBannerText: {
    fontSize: typography.fontSize.sm,
    color: colors.error,
    flex: 1,
  },

  // ── Submit button ────────────────────────────────────────────────────────────
  submitBtn: {
    minHeight: 54, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginTop: 8, marginBottom: 20,
  },
  submitBtnLoading: {
    opacity: 0.75,
  },
  submitBtnText: {
    fontSize: 16, fontWeight: '700', color: colors.onAccent,
  },

  // ── Login row ────────────────────────────────────────────────────────────────
  loginRow: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  loginRowText: {
    fontSize: typography.fontSize.sm,
    color: colors.inkSubtle,
  },
  loginRowLink: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: '700',
  },

  // ── Success banner ───────────────────────────────────────────────────────────
  successBanner: {
    position: 'absolute',
    left: 20,
    right: 20,
    backgroundColor: '#467434',
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing[5],
    gap: spacing[2],
    // Tinted shadow so it lifts against the white card
    shadowColor: '#467434',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 6,
  },
  successBannerText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.white,
  },
});

export default RegisterScreen;
