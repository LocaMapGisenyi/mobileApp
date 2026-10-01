import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Text,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';

import { AuthStackParamList } from '../navigation/AuthNavigator';
import TextInputField from '../components/TextInputField';
import AuthLayout from '../components/AuthLayout';
import { useUserStore } from '../store/user';
import { colors } from '../theme';

type RegisterNav = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Field stagger delays — each row enters 50ms after the previous

const RegisterScreen = () => {
  const navigation = useNavigation<RegisterNav>();
  const { t } = useTranslation();
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

  const touch = (field: keyof typeof touched) => setTouched(prev => ({ ...prev, [field]: true }));

  const fieldError = {
    fullName: touched.fullName && !fullName.trim() ? t('errors.requiredField') : '',
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
    if (registering.current) return;
    if (!validate()) return;
    registering.current = true;
    setLoading(true);
    setApiError('');
    try {
      await register({ fullName: fullName.trim(), email: email.trim(), password });
      setShowSuccess(true);
      // Supabase can require email verification; the navigator follows actual session state.
    } catch (err) {
      setApiError(err instanceof Error ? err.message : t('errors.generic'));
    } finally {
      registering.current = false;
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      compact
      title={t('pro.registerTitle')}
      subtitle={t('pro.registerSubtitle')}
      onBack={() => navigation.goBack()}
    >
      <TextInputField
        label={t('auth.fullName')}
        value={fullName}
        onChangeText={v => {
          setFullName(v);
          touch('fullName');
        }}
        onBlur={() => touch('fullName')}
        error={fieldError.fullName}
        touched={touched.fullName}
        icon="account-outline"
        autoCapitalize="words"
        autoComplete="name"
        placeholder={t('auth.fullNamePlaceholder')}
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => emailRef.current?.focus()}
        editable={!loading}
      />
      <TextInputField
        ref={emailRef}
        label={t('auth.email')}
        value={email}
        onChangeText={v => {
          setEmail(v);
          touch('email');
        }}
        onBlur={() => touch('email')}
        error={fieldError.email}
        touched={touched.email}
        icon="email-outline"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        placeholder={t('auth.emailPlaceholder')}
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => passwordRef.current?.focus()}
        editable={!loading}
      />
      <TextInputField
        ref={passwordRef}
        label={t('auth.password')}
        value={password}
        onChangeText={v => {
          setPassword(v);
          touch('password');
        }}
        onBlur={() => touch('password')}
        error={fieldError.password}
        touched={touched.password}
        icon="lock-outline"
        secureTextEntry
        placeholder={t('auth.passwordPlaceholder')}
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => confirmRef.current?.focus()}
        editable={!loading}
      />
      <TextInputField
        ref={confirmRef}
        label={t('auth.confirmPassword')}
        value={confirmPassword}
        onChangeText={v => {
          setConfirmPassword(v);
          touch('confirmPassword');
        }}
        onBlur={() => touch('confirmPassword')}
        error={fieldError.confirmPassword}
        touched={touched.confirmPassword}
        icon="lock-check-outline"
        secureTextEntry
        placeholder={t('auth.confirmPasswordPlaceholder')}
        returnKeyType="done"
        onSubmitEditing={() => void handleRegister()}
        editable={!loading}
      />
      {!!apiError && (
        <View style={styles.notice}>
          <MaterialIcons name="error-outline" size={18} color={colors.error} />
          <Text accessibilityRole="alert" style={styles.error}>
            {apiError}
          </Text>
        </View>
      )}
      {showSuccess && (
        <View style={[styles.notice, styles.success]}>
          <MaterialIcons name="check-circle-outline" size={20} color={colors.primary} />
          <Text accessibilityRole="alert" style={styles.successText}>
            {t(
              useUserStore.getState().user.isLoggedIn ? 'auth.accountCreated' : 'pro.confirmEmail',
            )}
          </Text>
        </View>
      )}
      <TouchableOpacity
        style={[styles.submit, loading && styles.disabled]}
        onPress={() => void handleRegister()}
        disabled={loading}
        accessibilityRole="button"
        accessibilityState={{ disabled: loading, busy: loading }}
        activeOpacity={0.82}
      >
        {loading ? (
          <ActivityIndicator color={colors.onAccent} />
        ) : (
          <Text style={styles.submitText}>{t('auth.register')}</Text>
        )}
      </TouchableOpacity>
      <View style={styles.loginRow}>
        <Text style={styles.loginText}>{t('auth.alreadyHaveAccount')}</Text>
        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => navigation.navigate('Login')}
          accessibilityRole="button"
        >
          <Text style={styles.linkText}>{t('auth.login')}</Text>
        </TouchableOpacity>
      </View>
    </AuthLayout>
  );
};
const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#FFF0ED',
    marginBottom: 16,
  },
  error: { flex: 1, color: colors.error, fontSize: 14, lineHeight: 21 },
  success: { backgroundColor: colors.primaryLight },
  successText: { flex: 1, color: colors.primaryDark, fontSize: 14, lineHeight: 21 },
  submit: {
    marginTop: 8,
    minHeight: 54,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 10,
  },
  submitText: { color: colors.onAccent, fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.6 },
  loginRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
  },
  loginText: { color: colors.inkSubtle, fontSize: 14 },
  loginLink: { minHeight: 44, justifyContent: 'center' },
  linkText: { color: colors.primaryDark, fontSize: 14, fontWeight: '600' },
});
export default RegisterScreen;
