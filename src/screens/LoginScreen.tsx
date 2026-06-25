import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AuthNavigator';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../store/user';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, spacing, typography, borderRadius } from '../theme';
import { useTranslation } from 'react-i18next';
import TextInputField from '../components/TextInputField';

type LoginScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

const LoginScreen = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const { t } = useTranslation();
  const setOnboardingCompleted = useUserStore(s => s.actions.setOnboardingCompleted);
  const setUser = useUserStore(s => s.actions);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  // Mock login — bypasse l'API, fonctionne sans backend
  const handleLogin = async () => {
    setEmailTouched(true);
    setPasswordTouched(true);

    if (!email.trim()) {
      setError(t('errors.requiredField') || 'Email requis');
      return;
    }
    if (!password.trim()) {
      setError(t('errors.requiredField') || 'Mot de passe requis');
      return;
    }

    setLoading(true);
    setError('');

    // Simulation d'un délai réseau
    await new Promise(r => setTimeout(r, 800));

    // Connexion locale sans backend
    useUserStore.setState(state => ({
      user: {
        ...state.user,
        id: 'mock-user-1',
        fullName: 'Utilisateur LocaMap',
        email: email.trim(),
        phoneNumber: null,
        photoURL: null,
        authProvider: 'manual',
        isLoggedIn: true,
        hasCompletedOnboarding: true,
        token: 'mock-token',
      },
    }));

    setLoading(false);
  };

  const handleSocialLogin = (provider: string) => {
    // Mock social login
    useUserStore.setState(state => ({
      user: {
        ...state.user,
        id: 'mock-social-1',
        fullName: `Utilisateur ${provider}`,
        email: `user@${provider.toLowerCase()}.com`,
        phoneNumber: null,
        photoURL: null,
        authProvider: provider.toLowerCase() as any,
        isLoggedIn: true,
        hasCompletedOnboarding: true,
        token: `mock-${provider}-token`,
      },
    }));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Header bar */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('auth.login') || 'Connexion'}</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero / Logo section */}
          <Animated.View entering={FadeInDown.delay(60).duration(400)} style={styles.heroSection}>
            <Text style={styles.appName}>LocaMap</Text>
            <Text style={styles.appSubtitle}>Trouvez votre logement à Gisenyi</Text>
            <View style={styles.heroAccentLine} />
          </Animated.View>

          {/* Form section */}
          <View style={styles.formContainer}>
            {/* Email field */}
            <Animated.View entering={FadeInDown.delay(160).duration(400)}>
              <TextInputField
                label={t('auth.email') || 'Email'}
                value={email}
                onChangeText={setEmail}
                icon="email-outline"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                returnKeyType="next"
                placeholder="votre@email.com"
                touched={emailTouched}
                error={emailTouched && !email.trim() ? (t('errors.requiredField') || 'Requis') : ''}
              />
            </Animated.View>

            {/* Password field */}
            <Animated.View entering={FadeInDown.delay(220).duration(400)}>
              <TextInputField
                label={t('auth.password') || 'Mot de passe'}
                value={password}
                onChangeText={setPassword}
                icon="lock-outline"
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                placeholder="••••••••"
                touched={passwordTouched}
                error={passwordTouched && !password.trim() ? (t('errors.requiredField') || 'Requis') : ''}
              />
            </Animated.View>

            {/* Forgot password */}
            <Animated.View entering={FadeInDown.delay(270).duration(400)}>
              <TouchableOpacity
                style={styles.forgotPassword}
                onPress={() => navigation.navigate('ResetPassword')}
                accessibilityRole="button"
              >
                <Text style={styles.forgotPasswordText}>
                  {t('auth.forgotPassword') || 'Mot de passe oublié ?'}
                </Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Error message */}
            {error ? (
              <Animated.View entering={FadeInDown.duration(250)} style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </Animated.View>
            ) : null}

            {/* Login button */}
            <Animated.View entering={FadeInDown.delay(320).duration(400)}>
              <Button
                mode="contained"
                onPress={handleLogin}
                loading={loading}
                disabled={loading}
                style={styles.loginButton}
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
                buttonColor={colors.primary}
              >
                {t('auth.login') || 'Se connecter'}
              </Button>
            </Animated.View>

            {/* Divider */}
            <Animated.View entering={FadeInDown.delay(400).duration(400)} style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>{t('common.or') || 'ou'}</Text>
              <View style={styles.divider} />
            </Animated.View>

            {/* Social buttons */}
            <Animated.View entering={FadeInDown.delay(460).duration(400)} style={styles.socialButtonsContainer}>
              <TouchableOpacity
                style={[styles.socialButton, { backgroundColor: colors.google }]}
                onPress={() => handleSocialLogin('Google')}
                accessibilityRole="button"
                accessibilityLabel="Continuer avec Google"
              >
                <Ionicons name="logo-google" size={20} color={colors.white} />
                <Text style={styles.socialButtonText}>
                  {t('auth.continueWithGoogle') || 'Continuer avec Google'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.socialButton, { backgroundColor: colors.facebook }]}
                onPress={() => handleSocialLogin('Facebook')}
                accessibilityRole="button"
                accessibilityLabel="Continuer avec Facebook"
              >
                <Ionicons name="logo-facebook" size={20} color={colors.white} />
                <Text style={styles.socialButtonText}>
                  {t('auth.continueWithFacebook') || 'Continuer avec Facebook'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.socialButton, { backgroundColor: colors.apple }]}
                onPress={() => handleSocialLogin('Apple')}
                accessibilityRole="button"
                accessibilityLabel="Continuer avec Apple"
              >
                <Ionicons name="logo-apple" size={20} color={colors.white} />
                <Text style={styles.socialButtonText}>
                  {t('auth.continueWithApple') || 'Continuer avec Apple'}
                </Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Register link */}
            <Animated.View entering={FadeInDown.delay(540).duration(400)} style={styles.registerContainer}>
              <Text style={styles.registerText}>
                {t('auth.noAccount') || 'Pas encore de compte ?'}
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Register')}
                accessibilityRole="button"
              >
                <Text style={styles.registerLink}>
                  {' '}{t('auth.register') || "S'inscrire"}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },

  // ─── Header bar ───────────────────────────────────────────────────────────────
  header: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.ink,
  },

  // ─── Scroll ───────────────────────────────────────────────────────────────────
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 120,
  },

  // ─── Hero section ─────────────────────────────────────────────────────────────
  heroSection: {
    backgroundColor: colors.surfaceSunken,
    paddingVertical: 40,
    paddingHorizontal: spacing[5],
    alignItems: 'center',
  },
  appName: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: typography.fontSize.base,
    color: colors.inkSubtle,
    textAlign: 'center',
    marginTop: spacing[2],
  },
  heroAccentLine: {
    width: 40,
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    marginTop: 12,
    alignSelf: 'center',
  },

  // ─── Form ─────────────────────────────────────────────────────────────────────
  formContainer: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[6],
  },

  // ─── Forgot password ──────────────────────────────────────────────────────────
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: spacing[5],
    marginTop: -spacing[2],
  },
  forgotPasswordText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: '500',
  },

  // ─── Error container ──────────────────────────────────────────────────────────
  errorContainer: {
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
  errorText: {
    fontSize: typography.fontSize.sm,
    color: colors.error,
    flex: 1,
  },

  // ─── Login button ─────────────────────────────────────────────────────────────
  loginButton: {
    borderRadius: borderRadius.md,
    marginBottom: spacing[5],
  },
  buttonContent: {
    height: 52,
  },
  buttonLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    color: colors.white,
  },

  // ─── Divider ──────────────────────────────────────────────────────────────────
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[5],
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    paddingHorizontal: spacing[3],
    fontSize: typography.fontSize.sm,
    color: colors.inkSubtle,
  },

  // ─── Social buttons ───────────────────────────────────────────────────────────
  socialButtonsContainer: {
    gap: spacing[3],
    marginBottom: spacing[6],
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    height: 50,
    gap: spacing[3],
  },
  socialButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.white,
  },

  // ─── Register link ────────────────────────────────────────────────────────────
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    fontSize: typography.fontSize.sm,
    color: colors.inkSubtle,
  },
  registerLink: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: '700',
  },
});

export default LoginScreen;
