import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../navigation/AuthNavigator';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useUserStore } from '../store/user';
import { colors } from '../theme';
import TextInputField from '../components/TextInputField';
import AuthLayout from '../components/AuthLayout';
import { loginErrorKey } from '../utils/loginError';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList, 'Login'>>();
  const { t } = useTranslation();
  const login = useUserStore(s => s.actions.login);
  const passwordRef = useRef<TextInput>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const sending = useRef(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);
  const emailError = touched
    ? !email.trim()
      ? t('errors.requiredField')
      : !EMAIL_RE.test(email.trim())
        ? t('errors.invalidEmail')
        : ''
    : '';
  const submit = async () => {
    if (sending.current) return;
    setTouched(true);
    setError('');
    if (!EMAIL_RE.test(email.trim()) || !password.trim()) return;
    Keyboard.dismiss();
    sending.current = true;
    setLoading(true);
    setError('');
    try {
      await login(email.trim(), password);
    } catch (failure) {
      setError(t(loginErrorKey(failure)));
    } finally {
      sending.current = false;
      setLoading(false);
    }
  };
  return (
    <AuthLayout title={t('pro.loginTitle')} subtitle={t('pro.loginSubtitle')}>
      <View style={s.form}>
        <TextInputField
          label={t('auth.email')}
          value={email}
          onChangeText={value => {
            setEmail(value);
            setError('');
          }}
          icon="email-outline"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          returnKeyType="next"
          placeholder={t('auth.emailPlaceholder')}
          touched={touched}
          error={emailError}
          onSubmitEditing={() => passwordRef.current?.focus()}
          editable={!loading}
        />
        <TextInputField
          ref={passwordRef}
          label={t('auth.password')}
          value={password}
          onChangeText={value => {
            setPassword(value);
            setError('');
          }}
          icon="lock-outline"
          secureTextEntry
          returnKeyType="done"
          onSubmitEditing={() => void submit()}
          placeholder={t('auth.passwordPlaceholder')}
          touched={touched}
          error={touched && !password.trim() ? t('errors.requiredField') : ''}
          editable={!loading}
        />
        <Pressable
          onPress={() => navigation.navigate('ResetPassword')}
          accessibilityRole="button"
          style={s.forgot}
        >
          <Text style={s.link}>{t('auth.forgotPassword')}</Text>
        </Pressable>
        {!!error && (
          <View style={s.error}>
            <MaterialIcons name="error-outline" size={20} color={colors.error} />
            <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={s.errorText}>
              {error}
            </Text>
          </View>
        )}
        <Pressable
          disabled={loading}
          accessibilityRole="button"
          accessibilityState={{ disabled: loading, busy: loading }}
          onPress={() => void submit()}
          style={({ pressed }) => [s.submit, pressed && s.pressed, loading && s.disabled]}
        >
          {loading ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <>
              <Text style={s.submitText}>{t('auth.login')}</Text>
              <MaterialIcons name="arrow-forward" size={21} color={colors.onAccent} />
            </>
          )}
        </Pressable>
      </View>
      <View style={s.register}>
        <Text style={s.subtitle}>{t('auth.noAccount')}</Text>
        <Pressable
          onPress={() => navigation.navigate('Register')}
          accessibilityRole="button"
          style={s.registerButton}
        >
          <Text style={s.link}>{t('auth.register')}</Text>
        </Pressable>
      </View>
    </AuthLayout>
  );
}
const s = StyleSheet.create({
  subtitle: { fontSize: 16, lineHeight: 24, color: colors.inkSubtle },
  form: { gap: 2 },
  forgot: { minHeight: 44, alignSelf: 'flex-end', justifyContent: 'center', marginBottom: 16 },
  link: { fontSize: 15, fontWeight: '600', color: colors.primaryDark },
  error: {
    padding: 14,
    backgroundColor: '#FFF0ED',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  errorText: { flex: 1, fontSize: 14, lineHeight: 21, color: colors.error },
  submit: {
    backgroundColor: colors.accent,
    minHeight: 54,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: { color: colors.onAccent, fontSize: 16, fontWeight: '700' },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.6 },
  register: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 8,
    marginTop: 20,
  },
  registerButton: { minHeight: 44, justifyContent: 'center' },
});
