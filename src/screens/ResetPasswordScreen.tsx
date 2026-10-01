import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AuthNavigator';
import { colors } from '../theme';
import AuthLayout from '../components/AuthLayout';
import TextInputField from '../components/TextInputField';
import { authService } from '../services/api/auth.service';

type ResetPasswordNav = NativeStackNavigationProp<AuthStackParamList, 'ResetPassword'>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ResetPasswordScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<ResetPasswordNav>();
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
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      compact
      title={t(emailSent ? 'auth.emailSentTitle' : 'auth.forgotPassword')}
      subtitle={t(emailSent ? 'auth.emailSentSubtitle' : 'auth.resetPasswordInstructions')}
      onBack={() => navigation.goBack()}
    >
      {!emailSent ? (
        <>
          <TextInputField
            label={t('auth.email')}
            value={email}
            onChangeText={text => {
              setEmail(text);
              setTouched(true);
              setFieldError('');
              setSubmitError('');
            }}
            error={fieldError}
            touched={touched}
            icon="email-outline"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            returnKeyType="done"
            onSubmitEditing={() => void handleReset()}
            editable={!loading}
            placeholder={t('auth.emailPlaceholder')}
          />
          {!!submitError && (
            <View style={styles.error}>
              <MaterialIcons name="error-outline" size={18} color={colors.error} />
              <Text accessibilityRole="alert" style={styles.errorText}>
                {submitError}
              </Text>
            </View>
          )}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ disabled: loading, busy: loading }}
            style={[styles.button, loading && styles.disabled]}
            disabled={loading}
            onPress={() => void handleReset()}
            activeOpacity={0.82}
          >
            {loading ? (
              <ActivityIndicator color={colors.onAccent} />
            ) : (
              <Text style={styles.buttonText}>{t('auth.sendResetLink')}</Text>
            )}
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.button}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.buttonText}>{t('auth.backToLogin')}</Text>
        </TouchableOpacity>
      )}
    </AuthLayout>
  );
};
const styles = StyleSheet.create({
  button: {
    minHeight: 54,
    padding: 14,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: colors.onAccent,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  disabled: { opacity: 0.6 },
  error: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#FFF0ED',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  errorText: { flex: 1, fontSize: 14, lineHeight: 21, color: colors.error },
});
export default ResetPasswordScreen;
