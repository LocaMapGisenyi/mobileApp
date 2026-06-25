import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Image } from 'react-native';
import { Text, Button, Divider, Snackbar, IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import SocialLoginButton from '../components/SocialLoginButton';
import FormField from '../components/FormField';
import SimpleAnimatedView from '../components/SimpleAnimatedView';
import { useUserPreferences } from '../store/userPreferences';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type AuthScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Auth'>;

const AuthScreen = () => {
  const navigation = useNavigation<AuthScreenNavigationProp>();
  const { preferences, setUserPreferences } = useUserPreferences();
  const { t } = useTranslation();

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  
  // Validation errors
  const [errors, setErrors] = useState({
    email: '',
    password: '',
  });
  
  // UI state
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = (): boolean => {
    let isValid = true;
    const newErrors = {
      email: '',
      password: '',
    };

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = t('auth.emailRequired');
      isValid = false;
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = t('auth.invalidEmail');
      isValid = false;
    }

    // Validate password
    if (!formData.password) {
      newErrors.password = t('auth.passwordRequired');
      isValid = false;
    } else if (formData.password.length < 6) {
      newErrors.password = t('auth.passwordTooShort');
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSocialLogin = (provider: 'google' | 'facebook') => {
    // Simulate social login
    setIsLoading(true);
    
    setTimeout(() => {
      // Mock successful login
      setUserPreferences({
        fullName: provider === 'google' ? 'User Google' : 'User Facebook',
        email: provider === 'google' ? 'user.google@gmail.com' : 'user.facebook@facebook.com',
        language: preferences.language,
        currency: preferences.currency,
        isLoggedIn: true,
        authProvider: provider,
      });

      // Show success message
      setSnackbarMessage(t('auth.loginSuccess'));
      setSnackbarVisible(true);
      setIsLoading(false);

      // Navigate to home or preference carousel screen after a short delay
      setTimeout(() => {
        if (preferences.hasCompletedOnboarding) {
          navigation.reset({
            index: 0,
            routes: [{ name: 'MainTabs' }],
          });
        } else {
          navigation.navigate('PreferenceCarousel');
        }
      }, 1000);
    }, 1500);
  };

  const handleLogin = () => {
    if (validateForm()) {
      setIsLoading(true);
      
      // Simulate API call
      setTimeout(() => {
        // Save to store
        setUserPreferences({
          fullName: 'User Name', // Would be from API in real app
          email: formData.email,
          language: preferences.language,
          currency: preferences.currency,
          isLoggedIn: true,
          authProvider: 'manual',
        });

        // Show success message
        setSnackbarMessage(t('auth.loginSuccess'));
        setSnackbarVisible(true);
        setIsLoading(false);

        // Navigate to home screen or preference carousel after a short delay
        setTimeout(() => {
          if (preferences.hasCompletedOnboarding) {
            navigation.reset({
              index: 0,
              routes: [{ name: 'MainTabs' }],
            });
          } else {
            navigation.navigate('PreferenceCarousel');
          }
        }, 1000);
      }, 1500);
    }
  };

  const navigateToRegister = () => {
    // Register is in the Auth sub-navigator
    // navigation.navigate('Register'); // Use Auth navigator if needed
  };

  const navigateToForgotPassword = () => {
    // ResetPassword is in the Auth sub-navigator
    // navigation.navigate('ResetPassword'); // Not accessible directly from RootStack
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoidingView}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <SimpleAnimatedView animation="fadeIn" duration={800}>
          <Image
            source={require('../assets/images/house-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>{t('auth.login')}</Text>
          <Text style={styles.subtitle}>
            {t('auth.loginSubtitle')}
          </Text>
        </SimpleAnimatedView>

        {/* Login form */}
        <SimpleAnimatedView animation="slideInRight" delay={600} style={styles.form}>
          <FormField
            label={t('auth.email')}
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            error={errors.email}
            keyboardType="email-address"
            placeholder={t('auth.emailPlaceholder')}
          />

          <FormField
            label={t('auth.password')}
            value={formData.password}
            onChangeText={(text) => setFormData({ ...formData, password: text })}
            error={errors.password}
            secureTextEntry
            placeholder={t('auth.passwordPlaceholder')}
          />

          <TouchableOpacity
            onPress={navigateToForgotPassword}
            style={styles.forgotPasswordContainer}
          >
            <Text style={styles.forgotPasswordText}>{t('auth.forgotPassword')}</Text>
          </TouchableOpacity>

          <SimpleAnimatedView animation="slideInUp" delay={800}>
            <Button
              mode="contained"
              onPress={handleLogin}
              style={styles.loginButton}
              labelStyle={styles.buttonLabel}
              loading={isLoading}
              disabled={isLoading}
            >
              {t('auth.login')}
            </Button>
          </SimpleAnimatedView>
        </SimpleAnimatedView>

        <SimpleAnimatedView animation="fadeIn" delay={400}>
          <View style={styles.dividerContainer}>
            <Divider style={styles.divider} />
            <Text style={styles.dividerText}>{t('common.or')}</Text>
            <Divider style={styles.divider} />
          </View>
        </SimpleAnimatedView>

        {/* Social login buttons */}
        <SimpleAnimatedView animation="slideInLeft" delay={200} style={styles.socialButtons}>
          <SocialLoginButton
            provider="google"
            onPress={() => handleSocialLogin('google')}
          />
          <SocialLoginButton
            provider="facebook"
            onPress={() => handleSocialLogin('facebook')}
          />
        </SimpleAnimatedView>

        <SimpleAnimatedView animation="fadeIn" delay={1000}>
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>{t('auth.dontHaveAccount')}</Text>
            <TouchableOpacity onPress={navigateToRegister}>
              <Text style={styles.registerLink}>{t('auth.register')}</Text>
            </TouchableOpacity>
          </View>
        </SimpleAnimatedView>
      </ScrollView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={styles.snackbar}
      >
        {snackbarMessage}
      </Snackbar>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
    justifyContent: 'center',
    minHeight: '100%',
  },
  logo: {
    width: 60,
    height: 60,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF5A5F',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#717171',
    textAlign: 'center',
    marginBottom: 36,
  },
  form: {
    marginBottom: 24,
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginTop: 4,
    marginBottom: 16,
  },
  forgotPasswordText: {
    color: '#484848',
    fontSize: 14,
  },
  socialButtons: {
    marginBottom: 24,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#717171',
    fontWeight: '500',
  },
  loginButton: {
    marginTop: 8,
    backgroundColor: '#FF5A5F',
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    paddingVertical: 4,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  registerText: {
    fontSize: 14,
    color: '#484848',
  },
  registerLink: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF5A5F',
    marginLeft: 6,
  },
  snackbar: {
    backgroundColor: '#323232',
  },
});

export default AuthScreen; 