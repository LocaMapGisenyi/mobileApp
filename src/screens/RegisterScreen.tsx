import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Text, Button, Snackbar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AuthNavigator';
import TextInputField from '../components/TextInputField';
import { useUserStore } from '../store/user';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme';

type RegisterScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

const RegisterScreen = () => {
  const navigation = useNavigation<RegisterScreenNavigationProp>();
  const register = useUserStore(s => s.actions.register);
  const { t } = useTranslation();

  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  
  // UI state
  const [errors, setErrors] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [touched, setTouched] = useState({
    fullName: false,
    email: false,
    password: false,
    confirmPassword: false,
  });

  // Validation
  const validateForm = () => {
    let isValid = true;
    const newErrors = {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    };
    
    // Name validation
    if (!formData.fullName.trim()) {
      newErrors.fullName = t('errors.requiredField');
      isValid = false;
    }
    
    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = t('errors.requiredField');
      isValid = false;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = t('errors.invalidEmail');
        isValid = false;
      }
    }
    
    // Password validation
    if (!formData.password) {
      newErrors.password = t('errors.requiredField');
      isValid = false;
    } else if (formData.password.length < 6) {
      newErrors.password = t('errors.weakPassword');
      isValid = false;
    }
    
    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = t('errors.requiredField');
      isValid = false;
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t('errors.passwordMismatch');
      isValid = false;
    }
    
    setErrors(newErrors);
    return isValid;
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  // Form submission
  const handleRegister = () => {
    if (!validateForm()) return;
    
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      // Mock registration sans backend
      useUserStore.setState(state => ({
        user: {
          ...state.user,
          id: 'mock-user-new',
          fullName: formData.fullName,
          email: formData.email,
          phoneNumber: null,
          photoURL: null,
          authProvider: 'manual',
          isLoggedIn: true,
          hasCompletedOnboarding: false,
          token: 'mock-token-new',
        },
      }));

      setLoading(false);
      setSnackbarMessage(t('auth.accountCreated') || 'Compte créé !');
      setSnackbarVisible(true);

      setTimeout(() => {
        navigation.navigate('PreferenceCarousel');
      }, 1000);
    }, 1500);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        
        <Animated.View entering={FadeInDown.duration(800)}>
          <Text style={styles.title}>{t('auth.createAccount')}</Text>
          <Text style={styles.subtitle}>
            {t('auth.joinUsText')}
          </Text>
          <View style={styles.registrationIcon}>
            <Ionicons name="home-outline" size={64} color={colors.primary} />
          </View>
        </Animated.View>

        <Animated.View 
          style={styles.formContainer}
          entering={FadeInDown.duration(800).delay(200)}
        >
          <TextInputField
            label={t('auth.fullName')}
            value={formData.fullName}
            onChangeText={(text) => handleInputChange('fullName', text)}
            error={errors.fullName}
            touched={touched.fullName}
            icon="account-outline"
            autoCapitalize="words"
            returnKeyType="next"
            placeholder={t('auth.fullNamePlaceholder')}
          />
          
          <TextInputField
            label={t('auth.email')}
            value={formData.email}
            onChangeText={(text) => handleInputChange('email', text)}
            error={errors.email}
            touched={touched.email}
            icon="email-outline"
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="next"
            placeholder={t('auth.emailPlaceholder')}
          />
          
          <TextInputField
            label={t('auth.password')}
            value={formData.password}
            onChangeText={(text) => handleInputChange('password', text)}
            error={errors.password}
            touched={touched.password}
            icon="lock-outline"
            secureTextEntry
            returnKeyType="next"
            placeholder={t('auth.passwordPlaceholder')}
          />
          
          <TextInputField
            label={t('auth.confirmPassword')}
            value={formData.confirmPassword}
            onChangeText={(text) => handleInputChange('confirmPassword', text)}
            error={errors.confirmPassword}
            touched={touched.confirmPassword}
            icon="lock-check-outline"
            secureTextEntry
            returnKeyType="done"
            placeholder={t('auth.confirmPasswordPlaceholder')}
          />
          
          <Animated.View entering={FadeInDown.duration(800).delay(400)}>
            <Button
              mode="contained"
              onPress={handleRegister}
              style={styles.registerButton}
              contentStyle={styles.buttonContent}
              loading={loading}
              disabled={loading}
            >
              {t('auth.register')}
            </Button>
          </Animated.View>
          
          <Animated.View 
            style={styles.loginContainer}
            entering={FadeInDown.duration(800).delay(500)}
          >
            <Text style={styles.loginText}>{t('auth.alreadyHaveAccount')}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>{t('auth.login')}</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
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
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  backButton: {
    marginBottom: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceSunken,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.ink,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.inkSubtle,
    marginBottom: 32,
  },
  formContainer: {
    marginBottom: 24,
  },
  registerButton: {
    borderRadius: 6,
    marginTop: 24,
    marginBottom: 24,
    backgroundColor: colors.primary,
  },
  buttonContent: {
    height: 52,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loginText: {
    color: colors.inkSubtle,
    marginRight: 4,
  },
  loginLink: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  snackbar: {
    backgroundColor: colors.ink,
  },
  registrationIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
    marginVertical: 16,
  },
});

export default RegisterScreen; 