import React from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert, 
  SafeAreaView, 
  StatusBar, 
  Image,
  Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { 
  Avatar, 
  Text, 
  Button, 
  Divider, 
  Surface, 
  useTheme
} from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useUser, useUserActions } from '../store/user';
import { usePreferences } from '../store/preferences';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';
import { useTranslation } from 'react-i18next';
import { useSyncLanguage } from '../hooks/useLanguage';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';

type ProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Profile'>;

// Card wrapper component for section items
const SectionCard = ({ children, style = {} }: { children: React.ReactNode; style?: object }) => {
  const theme = useTheme();
  return (
    <Surface 
      style={[
        styles.sectionCard, 
        { backgroundColor: theme.colors.surface },
        style
      ]}
      elevation={1}
    >
      {children}
    </Surface>
  );
};

// Item component for action items
const ActionItem = ({ title, icon, iconColor, onPress, comingSoon = false }: {
  title: string;
  icon: string;
  iconColor?: string;
  onPress: () => void;
  comingSoon?: boolean;
}) => {
  const theme = useTheme();

  return (
    <TouchableOpacity
      style={[styles.actionItem, comingSoon && styles.actionItemDisabled]}
      onPress={onPress}
      activeOpacity={comingSoon ? 1 : 0.7}
    >
      <View style={styles.actionItemLeft}>
        <MaterialIcons
          name={icon as any}
          size={24}
          color={comingSoon ? theme.colors.onSurfaceVariant : (iconColor || theme.colors.primary)}
          style={styles.actionIcon}
        />
        <Text style={[styles.actionTitle, { color: comingSoon ? theme.colors.onSurfaceVariant : theme.colors.onSurface }]}>
          {title}
        </Text>
        {comingSoon && (
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>Bientôt</Text>
          </View>
        )}
      </View>
      <MaterialIcons
        name="chevron-right"
        size={24}
        color={theme.colors.onSurfaceVariant}
      />
    </TouchableOpacity>
  );
};

// Preference item component
const PreferenceItem = ({ title, value, icon, onPress }: { title: string; value: string; icon: string; onPress: () => void }) => {
  const theme = useTheme();
  
  return (
    <TouchableOpacity 
      style={styles.preferenceItem} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.preferenceItemLeft}>
        <MaterialIcons 
          name={icon as any} 
          size={24} 
          color={theme.colors.primary} 
          style={styles.preferenceIcon} 
        />
        <Text style={[styles.preferenceTitle, { color: theme.colors.onSurface }]}>
          {title}
        </Text>
      </View>
      <View style={styles.preferenceValueContainer}>
        <Text style={[styles.preferenceValue, { color: theme.colors.onSurfaceVariant }]}>
          {value}
        </Text>
        <MaterialIcons 
          name="chevron-right" 
          size={20} 
          color={theme.colors.onSurfaceVariant} 
        />
      </View>
    </TouchableOpacity>
  );
};

const ProfileScreen = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const theme = useTheme();
  const user = useUser();
  const { logout } = useUserActions();
  const preferences = usePreferences();
  const { t, i18n } = useTranslation();
  
  // Synchroniser la langue
  useSyncLanguage();

  // Calculate member since date from user id
  const memberSinceDate = user.isLoggedIn && user.id ? 
    new Date(parseInt(user.id.split('-')[1])).toLocaleDateString(preferences.language, { year: 'numeric', month: 'long' }) 
    : 'August 2024'; // Fallback date for demo

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

  // Navigate to edit profile screen
  const navigateToEditProfile = () => {
    navigation.navigate('EditProfile');
  };

  // Navigate to favorites screen
  const navigateToFavorites = () => {
    navigation.navigate('Favorites');
  };

  // Navigate to alerts preferences screen
  const navigateToAlerts = () => {
    navigation.navigate('AlertPreferences');
  };

  // Navigate to local guides screen
  const navigateToGuides = () => {
    navigation.navigate('LocalGuide');
  };

  // Navigate to viewed properties history (placeholder)
  const navigateToHistory = () => {
    // Placeholder - this screen might not exist yet
    Alert.alert('Coming Soon', 'This feature will be available in a future update.');
  };

  // Show terms and conditions (placeholder)
  const showTermsConditions = () => {
    // Placeholder for terms and conditions
    Alert.alert('Terms and Conditions', 'This will show the terms and conditions in a future update.');
  };
  
  // Show support screen (placeholder)
  const showSupport = () => {
    Alert.alert('Support', 'This will show the support screen in a future update.');
  };
  
  // Show about screen (placeholder)
  const showAbout = () => {
    Alert.alert('About LocaMap', 'This will show information about LocaMap in a future update.');
  };

  // Navigate to become host screen
  const navigateToBecomeHost = () => {
    // Navigate to the HostDashboard screen
    navigation.navigate('HostDashboard');
  };

  // Handle logout
  const handleLogout = () => {
    Alert.alert(
      t('profile.logoutConfirmTitle'),
      t('profile.logoutConfirmMessage'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('profile.logout'),
          style: 'destructive',
          onPress: async () => {
    await logout();
            await preferences.resetPreferences(); // Reset preferences on logout
          },
        },
      ]
    );
  };

  // Helper functions to get display names
  const getLanguageDisplayName = (langCode: string) => {
    return t(`languages.${langCode}`);
  }

  const getCurrencySymbol = (currencyCode: string) => {
    switch(currencyCode) {
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'RWF': return 'FRw';
      default: return currencyCode;
    }
  }

  const getNotificationStatus = () => {
    return preferences.notifications 
      ? t('profile.notificationsEnabled') 
      : t('profile.notificationsDisabled');
  }

  // Function to handle language selection directly
  const handleLanguageSelect = () => {
    // Prepare options for the selector
    const options = languageOptions.map(opt => ({
      text: `${opt.icon} ${opt.label}`,
      onPress: async () => {
        await preferences.setLanguage(opt.value as any);
        i18n.changeLanguage(opt.value);
      }
    }));
    
    // Show language selector
    Platform.OS === 'ios' 
      ? showIOSActionSheet(t('preferences.chooseLanguage'), options)
      : showAndroidOptionDialog(t('preferences.chooseLanguage'), options);
  };
  
  // Function to handle currency selection directly
  const handleCurrencySelect = () => {
    // Prepare options for the selector
    const options = currencyOptions.map(opt => ({
      text: `${opt.icon} ${opt.label}`,
      onPress: async () => {
        await preferences.setCurrency(opt.value as any);
      }
    }));
    
    // Show currency selector
    Platform.OS === 'ios'
      ? showIOSActionSheet(t('preferences.chooseCurrency'), options)
      : showAndroidOptionDialog(t('preferences.chooseCurrency'), options);
  };
  
  // Helper functions for selectors
  const showIOSActionSheet = (title: string, options: Array<{ text: string; onPress: () => void }>) => {
    const buttons = [
      ...options.map(opt => ({ text: opt.text, onPress: opt.onPress })),
      { text: t('common.cancel'), style: 'cancel' }
    ];
    
    // ActionSheetIOS for iOS
    require('react-native').ActionSheetIOS.showActionSheetWithOptions(
      {
        options: buttons.map(b => b.text),
        cancelButtonIndex: buttons.length - 1,
        title
      },
      (buttonIndex: number) => {
        if (buttonIndex !== buttons.length - 1 && buttonIndex >= 0) {
          const btn = buttons[buttonIndex] as { text: string; onPress: () => void };
          btn.onPress();
        }
      }
    );
  };
  
  const showAndroidOptionDialog = (title: string, options: Array<{ text: string; onPress: () => void }>) => {
    // Alert.alert for Android
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

  // Update preference functions
  const navigateToLanguageSettings = () => {
    // Use direct selection instead of navigation
    handleLanguageSelect();
  };

  const navigateToCurrencySettings = () => {
    // Use direct selection instead of navigation
    handleCurrencySelect();
  };

  const toggleNotifications = async () => {
    await preferences.setNotifications(!preferences.notifications);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Header Section */}
        <Animated.View entering={FadeIn.duration(500)} style={styles.headerContainer}>
          <SectionCard style={styles.profileHeader}>
            {/* User Avatar */}
            <View style={styles.avatarContainer}>
          {user.photoURL ? (
            <Avatar.Image
                  size={90}
              source={{ uri: user.photoURL }}
              style={styles.avatar}
            />
          ) : (
                <Avatar.Text 
                  size={90} 
                  label={user.fullName ? user.fullName.substring(0, 2).toUpperCase() : 'U'} 
                  style={[styles.avatar, { backgroundColor: theme.colors.primary }]} 
                  color={theme.colors.surface}
                />
              )}
            </View>
            
            {/* User Info */}
            <View style={styles.userInfoContainer}>
              <Text style={[styles.userName, { color: theme.colors.onSurface }]}>
                {user.fullName || 'Guest User'}
              </Text>
              
              <Text style={[styles.userEmail, { color: theme.colors.onSurfaceVariant }]}>
                {user.email || 'guest@example.com'}
              </Text>
              
              <Text style={[styles.memberSince, { color: theme.colors.onSurfaceVariant }]}>
                {t('profile.memberSince', { date: memberSinceDate })}
              </Text>
          
          <Button
            mode="outlined"
            onPress={navigateToEditProfile}
            style={styles.editButton}
            labelStyle={styles.editButtonLabel}
                icon={() => <MaterialIcons name="edit" size={16} color={theme.colors.primary} />}
          >
            {t('profile.editProfile')}
          </Button>
        </View>
          </SectionCard>
        </Animated.View>
        
        {/* Quick Actions Section */}
        <Animated.View entering={FadeInUp.delay(100).duration(400)} style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
            {t('profile.actionsTitle')}
          </Text>
          
          <SectionCard>
            <ActionItem 
              title={t('profile.myFavorites')} 
              icon="favorite-border" 
              onPress={navigateToFavorites} 
            />
            <Divider style={styles.divider} />
            
            <ActionItem 
              title={t('profile.myAlerts')} 
              icon="notifications-none" 
              onPress={navigateToAlerts} 
            />
            <Divider style={styles.divider} />
            
            <ActionItem
              title={t('profile.myGuides') || 'Guides locaux'}
              icon="menu-book"
              onPress={() => {}}
              comingSoon
            />
        <Divider style={styles.divider} />
        
            <ActionItem 
              title={t('profile.viewHistory')} 
              icon="history" 
              onPress={navigateToHistory} 
            />
          </SectionCard>
        </Animated.View>
        
        {/* Preferences Section */}
        <Animated.View entering={FadeInUp.delay(200).duration(400)} style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
            {t('profile.preferencesTitle')}
          </Text>
        
          <SectionCard>
            <PreferenceItem 
              title={t('profile.language')} 
              value={getLanguageDisplayName(preferences.language)} 
              icon="language" 
              onPress={navigateToLanguageSettings}
            />
            <Divider style={styles.divider} />
            
            <PreferenceItem 
              title={t('profile.currency')} 
              value={`${preferences.currency} (${getCurrencySymbol(preferences.currency)})`} 
              icon="attach-money" 
              onPress={navigateToCurrencySettings}
            />
        <Divider style={styles.divider} />
        
            <PreferenceItem 
              title={t('profile.notifications')} 
              value={getNotificationStatus()} 
              icon="notifications" 
              onPress={toggleNotifications}
            />
          </SectionCard>
        </Animated.View>
        
        {/* App & Info Section */}
        <Animated.View entering={FadeInUp.delay(300).duration(400)} style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
            {t('profile.appInfoTitle')}
          </Text>
          
          <SectionCard>
            <ActionItem 
              title={t('profile.termsAndConditions')} 
              icon="description" 
              onPress={showTermsConditions} 
            />
            <Divider style={styles.divider} />
            
            <ActionItem 
              title={t('profile.support')} 
              icon="support-agent" 
              onPress={showSupport} 
            />
            <Divider style={styles.divider} />
            
            <ActionItem 
              title={t('profile.aboutLocaMap')} 
              icon="info-outline" 
              onPress={showAbout} 
            />
          </SectionCard>
        </Animated.View>
        
        {/* Logout Button */}
        <Animated.View entering={FadeInUp.delay(400).duration(400)} style={styles.logoutContainer}>
          <Button
            mode="contained"
            onPress={handleLogout}
            style={[styles.logoutButton, { backgroundColor: theme.colors.error }]}
            labelStyle={styles.logoutButtonLabel}
            icon={() => <MaterialIcons name="logout" size={20} color="white" />}
          >
            {t('profile.logout')}
          </Button>
        </Animated.View>
        
        {/* Bottom padding */}
        <View style={{ height: 90 }} />
      </ScrollView>

      {/* Floating Become a Host Button */}
      <TouchableOpacity
        style={[styles.becomeHostButton, { backgroundColor: colors.primary }]}
        onPress={navigateToBecomeHost}
        activeOpacity={0.9}
      >
        <MaterialIcons name="add-home" size={20} color={colors.white} style={styles.becomeHostIcon} />
        <Text style={styles.becomeHostText}>{t('host.become')}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: spacing[2],
  },
  headerContainer: {
    marginHorizontal: spacing[4],
    marginBottom: spacing[3],
  },
  profileHeader: {
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: spacing[4],
  },
  avatar: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  userInfoContainer: {
    flex: 1,
  },
  userName: {
    fontSize: typography.fontSize.xl,
    fontWeight: '600',
    marginBottom: spacing[1],
  },
  userEmail: {
    fontSize: typography.fontSize.sm,
    marginBottom: spacing[1],
  },
  memberSince: {
    fontSize: typography.fontSize.xs,
    marginBottom: spacing[2],
  },
  editButton: {
    alignSelf: 'flex-start',
    borderRadius: borderRadius.md,
    marginTop: spacing[1],
  },
  editButtonLabel: {
    fontSize: typography.fontSize.sm,
  },
  sectionContainer: {
    marginHorizontal: spacing[4],
    marginBottom: spacing[3],
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: spacing[2],
    marginLeft: spacing[1],
  },
  sectionCard: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
  },
  actionItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    marginRight: spacing[3],
  },
  actionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
  },
  actionItemDisabled: {
    opacity: 0.7,
  },
  comingSoonBadge: {
    marginLeft: spacing[2],
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
  },
  comingSoonText: {
    fontSize: typography.fontSize.xs,
    color: colors.white,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginHorizontal: spacing[4],
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
  },
  preferenceItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  preferenceIcon: {
    marginRight: spacing[3],
  },
  preferenceTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
  },
  preferenceValue: {
    fontSize: typography.fontSize.sm,
  },
  preferenceValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editPreferencesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
    marginTop: spacing[1],
  },
  logoutContainer: {
    marginHorizontal: spacing[4],
    marginTop: spacing[2],
  },
  logoutButton: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing[1],
  },
  logoutButtonLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  // Floating Button Styles
  becomeHostButton: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    zIndex: 999,
  },
  becomeHostIcon: {
    marginRight: 8,
  },
  becomeHostText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
});

export default ProfileScreen; 