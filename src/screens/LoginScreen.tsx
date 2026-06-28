import React, { useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Text,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AuthNavigator';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../store/user';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { colors, spacing, typography, borderRadius } from '../theme';
import { useTranslation } from 'react-i18next';
import TextInputField from '../components/TextInputField';
import LottieView from 'lottie-react-native';

type LoginNav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

const DEEP = '#0A2E2E';
const SURFACE = '#FFFFFF';
const BG = '#F3F8F8';
const INK = '#0F1F1F';
const INK_SUBTLE = '#5A7878';
const BORDER = '#D0E8E8';
const ERROR = '#C1440E';
const PRIMARY = '#0D6E6E';

const LoginScreen = () => {
  const navigation = useNavigation<LoginNav>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const login = useUserStore(s => s.actions.login);

  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const handleLogin = async () => {
    setEmailTouched(true);
    setPasswordTouched(true);
    if (!email.trim() || !password.trim()) {
      setError(t('errors.requiredField'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  // OAuth not yet configured — stub kept for future wiring
  const handleSocialLogin = (_provider: 'google' | 'facebook') => {};

  return (
    <View style={styles.root}>
      {/* ── Top zone: deep background + Lottie + wordmark ── */}
      <Animated.View
        entering={FadeIn.duration(600)}
        style={[styles.topZone, { paddingTop: insets.top + 8 }]}
      >
        <LottieView
          source={require('../assets/lottie/login.json')}
          autoPlay
          loop
          style={styles.lottie}
        />
        <View style={styles.wordmarkRow}>
          <Text style={styles.wordmark}>LocaMap</Text>
          <Text style={styles.tagline}>{t('auth.loginSubtitle')}</Text>
        </View>
      </Animated.View>

      {/* ── Bottom zone: white form sheet ── */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.kvav}
      >
        <ScrollView
          style={styles.sheet}
          contentContainerStyle={[styles.sheetContent, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Email */}
          <Animated.View entering={FadeInUp.delay(60).duration(400)}>
            <TextInputField
              label={t('auth.email')}
              value={email}
              onChangeText={setEmail}
              icon="email-outline"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              returnKeyType="next"
              placeholder="votre@email.com"
              touched={emailTouched}
              error={emailTouched && !email.trim() ? t('errors.requiredField') : ''}
              onSubmitEditing={() => passwordRef.current?.focus()}
              blurOnSubmit={false}
            />
          </Animated.View>

          {/* Password */}
          <Animated.View entering={FadeInUp.delay(120).duration(400)}>
            <TextInputField
              ref={passwordRef}
              label={t('auth.password')}
              value={password}
              onChangeText={setPassword}
              icon="lock-outline"
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              placeholder="••••••••"
              touched={passwordTouched}
              error={passwordTouched && !password.trim() ? t('errors.requiredField') : ''}
            />
          </Animated.View>

          {/* Forgot password */}
          <Animated.View entering={FadeInUp.delay(180).duration(400)}>
            <TouchableOpacity
              style={styles.forgotRow}
              onPress={() => navigation.navigate('ResetPassword')}
              accessibilityRole="button"
            >
              <Text style={styles.forgotText}>{t('auth.forgotPassword')}</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Error banner */}
          {error ? (
            <Animated.View entering={FadeIn.duration(250)} style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color={ERROR} />
              <Text style={styles.errorText}>{error}</Text>
            </Animated.View>
          ) : null}

          {/* Login button */}
          <Animated.View entering={FadeInUp.delay(240).duration(400)}>
            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.82}
              accessibilityRole="button"
            >
              {loading ? (
                <ActivityIndicator color={SURFACE} size="small" />
              ) : (
                <Text style={styles.primaryBtnLabel}>{t('auth.login')}</Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Divider */}
          <Animated.View entering={FadeInUp.delay(300).duration(400)} style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>{t('common.or')}</Text>
            <View style={styles.dividerLine} />
          </Animated.View>

          {/* Social buttons */}
          <Animated.View entering={FadeInUp.delay(360).duration(400)} style={styles.socialRow}>
            <TouchableOpacity
              style={styles.socialGoogle}
              onPress={() => handleSocialLogin('google')}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel="Google"
            >
              <Ionicons name="logo-google" size={18} color={PRIMARY} />
              <Text style={styles.socialGoogleLabel}>Google</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.socialFacebook}
              onPress={() => handleSocialLogin('facebook')}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel="Facebook"
            >
              <Ionicons name="logo-facebook" size={18} color={SURFACE} />
              <Text style={styles.socialFacebookLabel}>Facebook</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Register link */}
          <Animated.View entering={FadeInUp.delay(420).duration(400)} style={styles.registerRow}>
            <Text style={styles.registerPrompt}>{t('auth.noAccount')}</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Register')}
              accessibilityRole="button"
            >
              <Text style={styles.registerLink}>{t('auth.register')}</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: DEEP,
  },

  // ─── Top zone ────────────────────────────────────────────────────────────────
  topZone: {
    flex: 0.42,
    minHeight: 160,
    backgroundColor: DEEP,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 16,
    overflow: 'hidden',
  },
  lottie: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  wordmarkRow: {
    alignItems: 'center',
    zIndex: 1,
  },
  wordmark: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: '800',
    color: SURFACE,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: typography.fontSize.sm,
    color: 'rgba(255,255,255,0.72)',
    marginTop: 4,
    textAlign: 'center',
  },

  // ─── Bottom sheet ─────────────────────────────────────────────────────────────
  kvav: {
    flex: 1,
  },
  sheet: {
    flex: 1,
    backgroundColor: SURFACE,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  sheetContent: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[6],
  },

  // ─── Forgot password ──────────────────────────────────────────────────────────
  forgotRow: {
    alignSelf: 'flex-end',
    marginTop: -spacing[2],
    marginBottom: spacing[4],
  },
  forgotText: {
    fontSize: typography.fontSize.sm,
    color: PRIMARY,
    fontWeight: '500',
  },

  // ─── Error banner ─────────────────────────────────────────────────────────────
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: '#FFF1F0',
    borderWidth: 1,
    borderColor: ERROR,
    borderRadius: borderRadius.md,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    marginBottom: spacing[4],
  },
  errorText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: ERROR,
  },

  // ─── Primary button ───────────────────────────────────────────────────────────
  primaryBtn: {
    height: 52,
    borderRadius: 10,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[5],
  },
  primaryBtnDisabled: {
    opacity: 0.65,
  },
  primaryBtnLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    color: SURFACE,
    letterSpacing: 0.2,
  },

  // ─── Divider ──────────────────────────────────────────────────────────────────
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: BORDER,
  },
  dividerLabel: {
    paddingHorizontal: spacing[3],
    fontSize: typography.fontSize.sm,
    color: INK_SUBTLE,
  },

  // ─── Social buttons ───────────────────────────────────────────────────────────
  socialRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[5],
  },
  socialGoogle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: PRIMARY,
    backgroundColor: SURFACE,
    gap: spacing[2],
  },
  socialGoogleLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: PRIMARY,
  },
  socialFacebook: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 10,
    backgroundColor: '#1877F2',
    gap: spacing[2],
  },
  socialFacebookLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: SURFACE,
  },

  // ─── Register link ────────────────────────────────────────────────────────────
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  registerPrompt: {
    fontSize: typography.fontSize.sm,
    color: INK_SUBTLE,
  },
  registerLink: {
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
    color: PRIMARY,
  },
});

export default LoginScreen;
