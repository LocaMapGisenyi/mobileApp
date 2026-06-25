import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform, 
  StatusBar,
  Image,
  Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Text, 
  Button, 
  TextInput, 
  Avatar, 
  Snackbar,
  Divider
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useUser, useUserActions } from '../store/user';
import { usePreferences, Language, Currency } from '../store/preferences';
import { colors, spacing, typography, borderRadius } from '../theme';
import { useTranslation } from 'react-i18next';
import SelectInput from '../components/SelectInput';
import SwitchInput from '../components/SwitchInput';
import Animated, { 
  FadeIn, 
  FadeInUp, 
  SlideInUp,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing
} from 'react-native-reanimated';

type EditProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'EditProfile'>;

// Ajout de la constante pour les dimensions de l'écran
const { width, height } = Dimensions.get('window');

const EditProfileScreen = () => {
  const navigation = useNavigation<EditProfileScreenNavigationProp>();
  const { t, i18n } = useTranslation();
  
  // Animation values
  const headerHeight = useSharedValue(0);
  const saveButtonScale = useSharedValue(1);
  
  // Get user data and preferences
  const user = useUser();
  const { updateUserData } = useUserActions();
  const { 
    language, 
    currency, 
    notifications, 
    setLanguage, 
    setCurrency, 
    setNotifications 
  } = usePreferences();
  
  // Local form state
  const [formData, setFormData] = useState({
    fullName: user.fullName || '',
    email: user.email || '',
    phoneNumber: user.phoneNumber || '',
    language,
    currency,
    notifications,
  });
  
  const [errors, setErrors] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
  });
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Languages and currencies options
  const languageOptions = [
    { value: 'fr', label: t('languages.fr'), icon: '🇫🇷' },
    { value: 'en', label: t('languages.en'), icon: '🇬🇧' },
    { value: 'rw', label: t('languages.rw'), icon: '🇷🇼' },
    { value: 'sw', label: t('languages.sw'), icon: '🇹🇿' },
  ];
  
  const currencyOptions = [
    { value: 'RWF', label: t('currencies.RWF'), icon: 'FRw' },
    { value: 'USD', label: t('currencies.USD'), icon: '$' },
    { value: 'EUR', label: t('currencies.EUR'), icon: '€' },
  ];
  
  useEffect(() => {
    StatusBar.setBarStyle('dark-content');
    
    // Animation on component mount
    headerHeight.value = withTiming(60, {
      duration: 500,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
    
    return () => {
      StatusBar.setBarStyle('dark-content');
    };
  }, []);
  
  // Validate form
  const validateForm = () => {
    const newErrors = {
      fullName: '',
      email: '',
      phoneNumber: '',
    };
    let isValid = true;
    
    // Validate name
    if (!formData.fullName.trim()) {
      newErrors.fullName = t('errors.requiredField');
      isValid = false;
    }
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = t('errors.requiredField');
      isValid = false;
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = t('errors.invalidEmail');
      isValid = false;
    }
    
    // Validate phone (optional)
    if (formData.phoneNumber && !/^\+?[0-9\s\-\(\)]{8,15}$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = t('errors.invalidPhone');
      isValid = false;
    }
    
    setErrors(newErrors);
    return isValid;
  };
  
  // Save form data
  const handleSave = async () => {
    if (!validateForm()) return;
    
    // Animate button on press
    saveButtonScale.value = withTiming(0.95, { duration: 100 });
    setTimeout(() => {
      saveButtonScale.value = withTiming(1, { duration: 100 });
    }, 100);
    
    setLoading(true);
    
    try {
      // Update user data
      await updateUserData({
        fullName: formData.fullName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
      });
      
      // Update preferences
      if (formData.language !== language) {
        await setLanguage(formData.language as Language);
        i18n.changeLanguage(formData.language);
      }
      
      if (formData.currency !== currency) {
        await setCurrency(formData.currency as Currency);
      }
      
      if (formData.notifications !== notifications) {
        await setNotifications(formData.notifications);
      }
      
      // Show success message
      setSuccessMessage(t('profile.profileUpdated'));
      setShowSuccess(true);
      
      // Navigate back after short delay
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (error) {
      console.error('Error updating profile:', error);
      setSuccessMessage(t('errors.generic'));
      setShowSuccess(true);
    } finally {
      setLoading(false);
    }
  };
  
  // Open language selector
  const handleLanguageSelect = () => {
    // Display language selection UI
    const options = languageOptions.map(opt => ({
      text: `${opt.icon} ${opt.label}`,
      onPress: () => setFormData({ ...formData, language: opt.value as Language })
    }));
    
    Platform.OS === 'ios' 
      ? showIOSActionSheet(t('preferences.chooseLanguage'), options)
      : showAndroidOptionDialog(t('preferences.chooseLanguage'), options);
  };
  
  // Open currency selector
  const handleCurrencySelect = () => {
    const options = currencyOptions.map(opt => ({
      text: `${opt.icon} ${opt.label}`,
      onPress: () => setFormData({ ...formData, currency: opt.value as Currency })
    }));
    
    Platform.OS === 'ios'
      ? showIOSActionSheet(t('preferences.chooseCurrency'), options)
      : showAndroidOptionDialog(t('preferences.chooseCurrency'), options);
  };
  
  // Helper functions for selection UI
  const showIOSActionSheet = (title: string, options: Array<{ text: string, onPress: () => void }>) => {
    const buttons = [
      ...options.map(opt => ({ text: opt.text, onPress: opt.onPress })),
      { text: t('common.cancel'), style: 'cancel' }
    ];
    
    // @ts-ignore - ActionSheetIOS is not typed in React Native
    require('react-native').ActionSheetIOS.showActionSheetWithOptions(
      {
        options: buttons.map(b => b.text),
        cancelButtonIndex: buttons.length - 1,
        title
      },
      (buttonIndex: number) => {
        if (buttonIndex !== buttons.length - 1) {
          const btn = buttons[buttonIndex] as { text: string; onPress: () => void };
          btn.onPress();
        }
      }
    );
  };
  
  const showAndroidOptionDialog = (title: string, options: Array<{ text: string, onPress: () => void }>) => {
    require('react-native').Alert.alert(
      title,
      '',
      [
        ...options.map(opt => ({
          text: opt.text,
          onPress: opt.onPress
        })),
        { text: t('common.cancel'), style: 'cancel' }
      ],
      { cancelable: true }
    );
  };
  
  // Animated styles
  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      height: headerHeight.value,
      opacity: headerHeight.value / 60,
    };
  });
  
  const saveButtonAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: saveButtonScale.value }],
    };
  });
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <View style={styles.container}>
        <Animated.View style={[styles.header, headerAnimatedStyle]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={colors.gray[800]} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('profile.editProfile')}</Text>
          <View style={styles.placeholder} />
        </Animated.View>
        
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
          style={styles.keyboardAvoidingView}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={true}
          >
            {/* Profile photo */}
            <Animated.View 
              entering={FadeIn.duration(500)}
              style={styles.avatarContainer}
            >
              {user.photoURL ? (
                <Avatar.Image
                  size={80}
                  source={{ uri: user.photoURL }}
                  style={styles.avatar}
                />
              ) : (
                <View style={[styles.avatar, styles.defaultAvatar]}>
                  <Ionicons name="person" size={50} color={colors.gray[400]} />
                </View>
              )}
              <TouchableOpacity 
                style={styles.editAvatarButton}
                activeOpacity={0.8}
              >
                <Ionicons name="camera" size={18} color={colors.white} />
              </TouchableOpacity>
            </Animated.View>
            
            {/* Personal information */}
            <Animated.View 
              entering={FadeInUp.delay(200).duration(500)}
              style={styles.section}
            >
              <Text style={styles.sectionTitle}>{t('profile.personalInfo')}</Text>
              
              <TextInput
                label={t('profile.fullName')}
                value={formData.fullName}
                onChangeText={(text) => setFormData({ ...formData, fullName: text })}
                style={styles.input}
                mode="outlined"
                outlineColor={errors.fullName ? colors.error : colors.gray[200]}
                activeOutlineColor={colors.secondary}
                error={!!errors.fullName}
                left={<TextInput.Icon icon="account" size={24} color={colors.gray[400]} />}
              />
              {errors.fullName ? (
                <Text style={styles.errorText}>{errors.fullName}</Text>
              ) : null}
              
              <TextInput
                label={t('profile.email')}
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                style={styles.input}
                mode="outlined"
                outlineColor={errors.email ? colors.error : colors.gray[200]}
                activeOutlineColor={colors.secondary}
                keyboardType="email-address"
                autoCapitalize="none"
                error={!!errors.email}
                left={<TextInput.Icon icon="email" size={24} color={colors.gray[400]} />}
              />
              {errors.email ? (
                <Text style={styles.errorText}>{errors.email}</Text>
              ) : null}
              
              <TextInput
                label={t('profile.phoneNumber')}
                value={formData.phoneNumber}
                onChangeText={(text) => setFormData({ ...formData, phoneNumber: text })}
                style={styles.input}
                mode="outlined"
                outlineColor={errors.phoneNumber ? colors.error : colors.gray[200]}
                activeOutlineColor={colors.secondary}
                keyboardType="phone-pad"
                error={!!errors.phoneNumber}
                left={<TextInput.Icon icon="phone" size={24} color={colors.gray[400]} />}
              />
              {errors.phoneNumber ? (
                <Text style={styles.errorText}>{errors.phoneNumber}</Text>
              ) : null}
            </Animated.View>
            
            <Divider style={styles.divider} />
            
            {/* Preferences */}
            <Animated.View 
              entering={FadeInUp.delay(400).duration(500)}
              style={styles.section}
            >
              <Text style={styles.sectionTitle}>{t('preferences.title')}</Text>
              
              <SelectInput
                label={t('preferences.language')}
                value={formData.language}
                options={languageOptions}
                onSelect={handleLanguageSelect}
                style={styles.selectInput}
              />
              
              <SelectInput
                label={t('preferences.currency')}
                value={formData.currency}
                options={currencyOptions}
                onSelect={handleCurrencySelect}
                style={styles.selectInput}
              />
              
              <SwitchInput
                label={t('preferences.notifications')}
                description={t('preferences.notificationsDescription')}
                value={formData.notifications}
                onValueChange={(value) => setFormData({ ...formData, notifications: value })}
                icon="notifications-outline"
                style={styles.switchInput}
              />
            </Animated.View>
            
            {/* Save button */}
            <Animated.View 
              entering={FadeInDown.delay(600).duration(500)}
              style={saveButtonAnimatedStyle}
            >
              <Button
                mode="contained"
                onPress={handleSave}
                loading={loading}
                disabled={loading}
                style={styles.saveButton}
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
                icon="content-save"
              >
                {t('common.save')}
              </Button>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
        
        <Snackbar
          visible={showSuccess}
          onDismiss={() => setShowSuccess(false)}
          duration={2000}
          style={[
            styles.snackbar,
            successMessage === t('errors.generic') ? styles.errorSnackbar : styles.successSnackbar
          ]}
        >
          {successMessage}
        </Snackbar>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.white,
  },
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
    paddingHorizontal: spacing[4],
    backgroundColor: colors.white,
    ...Platform.select({
      android: {
        elevation: 2,
      },
    }),
  },
  backButton: {
    padding: spacing[2],
    borderRadius: 20,
  },
  placeholder: {
    width: 40,
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.gray[800],
    marginBottom: spacing[2],
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[3],
    paddingBottom: spacing[12],
  },
  avatarContainer: {
    alignItems: 'center',
    marginTop: spacing[2],
    marginBottom: spacing[4],
    position: 'relative',
  },
  avatar: {
    backgroundColor: colors.gray[100],
  },
  defaultAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: '38%',
    backgroundColor: colors.primary,
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.white,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.2)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.8,
        shadowRadius: 2,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  section: {
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    marginBottom: spacing[3],
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.1)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.6,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sectionTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.gray[800],
    marginBottom: spacing[3],
  },
  input: {
    marginBottom: spacing[2],
    backgroundColor: colors.gray[100],
    fontSize: Math.min(typography.fontSize.base, width * 0.04),
  },
  errorText: {
    color: colors.error,
    fontSize: typography.fontSize.sm,
    marginTop: -spacing[1],
    marginBottom: spacing[2],
    marginLeft: spacing[1],
  },
  selectInput: {
    marginBottom: spacing[2],
  },
  switchInput: {
    marginTop: spacing[2],
  },
  divider: {
    marginVertical: spacing[3],
    backgroundColor: colors.gray[200],
  },
  saveButton: {
    marginTop: spacing[3],
    marginBottom: Platform.OS === 'ios' ? spacing[8] : spacing[4],
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.2)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.8,
        shadowRadius: 2,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  buttonContent: {
    height: 52,
  },
  buttonLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: colors.white,
  },
  snackbar: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    borderRadius: borderRadius.lg,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.2)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.8,
        shadowRadius: 2,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  successSnackbar: {
    backgroundColor: colors.success,
  },
  errorSnackbar: {
    backgroundColor: colors.error,
  },
});

export default EditProfileScreen; 