import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../navigation/AuthNavigator';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useUserStore } from '../store/user';
import { colors } from '../theme';
import TextInputField from '../components/TextInputField';

export default function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList, 'Login'>>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const login = useUserStore(s => s.actions.login);
  const passwordRef = useRef<TextInput>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const sending=useRef(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);
  const submit = async () => {
    if(sending.current)return;
    setTouched(true);
    if (!email.trim() || !password.trim()) {
      setError(t('errors.requiredField'));
      return;
    }
    sending.current=true; setLoading(true);
    setError('');
    try {
      await login(email.trim(), password);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('errors.invalidCredentials'));
    } finally {
      sending.current=false;
      setLoading(false);
    }
  };
  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          s.scroll,
          { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 },
        ]}
      >
        <View style={s.content}>
          <View style={s.brand}>
            <View style={s.mark}>
              <MaterialIcons name="roofing" size={32} color={colors.onAccent} />
            </View>
            <Text style={s.wordmark}>
              Loca<Text style={s.green}>Map</Text>
            </Text>
          </View>
          <View style={s.headingBlock}>
            <Text accessibilityRole="header" style={s.heading}>
              {t('auth.login')}
            </Text>
            <Text style={s.subtitle}>{t('auth.loginSubtitle')}</Text>
          </View>
          <View style={s.form}>
            <TextInputField
              label={t('auth.email')}
              value={email}
              onChangeText={setEmail}
              icon="email-outline"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              returnKeyType="next"
              placeholder={t('auth.emailPlaceholder')}
              touched={touched}
              error={touched && !email.trim() ? t('errors.requiredField') : ''}
              onSubmitEditing={() => passwordRef.current?.focus()}
              editable={!loading}
            />
            <TextInputField
              ref={passwordRef}
              label={t('auth.password')}
              value={password}
              onChangeText={setPassword}
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
                <Text accessibilityRole="alert" style={s.errorText}>
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
          <View style={s.location}>
            <MaterialIcons name="place" size={18} color={colors.primary} />
            <Text style={s.locationText}>{t('explore.locationGisenyi')}</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 },
  content: { width: '100%', maxWidth: 460, alignSelf: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 36 },
  mark: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: { fontSize: 30, fontWeight: '800', color: colors.ink, letterSpacing: -0.6 },
  green: { color: colors.primary },
  headingBlock: { gap: 10, marginBottom: 28 },
  heading: { fontSize: 30, lineHeight: 38, fontWeight: '700', color: colors.ink },
  subtitle: { fontSize: 16, lineHeight: 24, color: colors.inkSubtle },
  form: { gap: 2 },
  forgot: { minHeight: 44, alignSelf: 'flex-end', justifyContent: 'center', marginBottom: 12 },
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
  location: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },
  locationText: { fontSize: 13, color: colors.inkSubtle },
});
