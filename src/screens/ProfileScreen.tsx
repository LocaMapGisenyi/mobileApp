import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
  Platform,
  Text as RNText,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import {
  Avatar,
  Text,
  useTheme,
} from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useUser, useUserActions } from '../store/user';
import { usePreferences } from '../store/preferences';
import { colors, spacing, typography, borderRadius } from '../theme';
import { useTranslation } from 'react-i18next';
import { useSyncLanguage } from '../hooks/useLanguage';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';

type ProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Profile'>;

// Card wrapper component for section items
const SectionCard = ({ children, style = {} }: { children: React.ReactNode; style?: object }) => {
  return (
    <View style={[styles.sectionCard, style]}>
      {children}
    </View>
  );
};

// Item component for action items
const ActionItem = ({
  title,
  icon,
  iconColor,
  onPress,
  comingSoon = false,
  isLast = false,
}: {
  title: string;
  icon: string;
  iconColor?: string;
  onPress: () => void;
  comingSoon?: boolean;
  isLast?: boolean;
}) => {
  return (
    <>
      <TouchableOpacity
        style={[styles.actionItem, comingSoon && styles.actionItemDisabled]}
        onPress={onPress}
        activeOpacity={comingSoon ? 1 : 0.7}
      >
        <View style={styles.actionItemLeft}>
          <MaterialIcons
            name={icon as any}
            size={22}
            color={comingSoon ? colors.inkSubtle : (iconColor || colors.primary)}
            style={styles.actionIcon}
          />
          <Text style={[styles.actionTitle, comingSoon && styles.actionTitleDisabled]}>
            {title}
          </Text>
          {comingSoon && (
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonText}>Bientôt</Text>
            </View>
          )}
        </View>
        <RNText style={styles.chevron}>›</RNText>
      </TouchableOpacity>
      {!isLast && <View style={styles.itemDivider} />}
    </>
  );
};

// Preference item component
const PreferenceItem = ({
  title,
  value,
  icon,
  onPress,
  isLast = false,
}: {
  title: string;
  value: string;
  icon: string;
  onPress: () => void;
  isLast?: boolean;
}) => {
  return (
    <>
      <TouchableOpacity
        style={styles.preferenceItem}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.preferenceItemLeft}>
          <MaterialIcons
            name={icon as any}
            size={22}
            color={colors.primary}
            style={styles.preferenceIcon}
          />
          <Text style={styles.preferenceTitle}>{title}</Text>
        </View>
        <View style={styles.preferenceValueContainer}>
          <Text style={styles.preferenceValue}>{value}</Text>
          <RNText style={styles.chevron}>›</RNText>
        </View>
      </TouchableOpacity>
      {!isLast && <View style={styles.itemDivider} />}
    </>
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
  const memberSinceDate = user.isLoggedIn && user.id
    ? new Date(parseInt(user.id.split('-')[1])).toLocaleDateString(preferences.language, { year: 'numeric', month: 'long' })
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
  };

  const getCurrencySymbol = (currencyCode: string) => {
    switch (currencyCode) {
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'RWF': return 'FRw';
      default: return currencyCode;
    }
  };

  const getNotificationStatus = () => {
    return preferences.notifications
      ? t('profile.notificationsEnabled')
      : t('profile.notificationsDisabled');
  };

  // Function to handle language selection directly
  const handleLanguageSelect = () => {
    // Prepare options for the selector
    const options = languageOptions.map(opt => ({
      text: `${opt.icon} ${opt.label}`,
      onPress: async () => {
        await preferences.setLanguage(opt.value as any);
        i18n.changeLanguage(opt.value);
      },
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
      },
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
      { text: t('common.cancel'), style: 'cancel' },
    ];

    // ActionSheetIOS for iOS
    require('react-native').ActionSheetIOS.showActionSheetWithOptions(
      {
        options: buttons.map(b => b.text),
        cancelButtonIndex: buttons.length - 1,
        title,
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
          onPress: opt.onPress,
        })),
        { text: t('common.cancel'), style: 'cancel' },
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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={colors.background}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Header — full-width flush block, no card elevation */}
        <Animated.View entering={FadeIn.duration(400)} style={styles.profileHeader}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            {user.photoURL ? (
              <Avatar.Image
                size={72}
                source={{ uri: user.photoURL }}
              />
            ) : (
              <Avatar.Text
                size={72}
                label={user.fullName ? user.fullName.substring(0, 2).toUpperCase() : 'U'}
                style={styles.avatarText}
                color={colors.white}
              />
            )}
          </View>

          {/* User Info */}
          <View style={styles.userInfoContainer}>
            <Text style={styles.userName}>
              {user.fullName || 'Guest User'}
            </Text>

            <Text style={styles.userEmail}>
              {user.email || 'guest@example.com'}
            </Text>

            <Text style={styles.memberSince}>
              {t('profile.memberSince', { date: memberSinceDate })}
            </Text>

            <TouchableOpacity
              style={styles.editButton}
              onPress={navigateToEditProfile}
              activeOpacity={0.7}
            >
              <MaterialIcons name="edit" size={14} color={colors.primary} style={styles.editButtonIcon} />
              <RNText style={styles.editButtonLabel}>{t('profile.editProfile')}</RNText>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Quick Actions Section */}
        <Animated.View entering={FadeInUp.delay(100).duration(350)} style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>
            {t('profile.actionsTitle')}
          </Text>

          <SectionCard>
            <ActionItem
              title={t('profile.myFavorites')}
              icon="favorite-border"
              onPress={navigateToFavorites}
            />
            <ActionItem
              title={t('profile.myAlerts')}
              icon="notifications-none"
              onPress={navigateToAlerts}
            />
            <ActionItem
              title={t('profile.myGuides') || 'Guides locaux'}
              icon="menu-book"
              onPress={() => {}}
              comingSoon
            />
            <ActionItem
              title={t('profile.viewHistory')}
              icon="history"
              onPress={navigateToHistory}
              isLast
            />
          </SectionCard>
        </Animated.View>

        {/* Preferences Section */}
        <Animated.View entering={FadeInUp.delay(180).duration(350)} style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>
            {t('profile.preferencesTitle')}
          </Text>

          <SectionCard>
            <PreferenceItem
              title={t('profile.language')}
              value={getLanguageDisplayName(preferences.language)}
              icon="language"
              onPress={navigateToLanguageSettings}
            />
            <PreferenceItem
              title={t('profile.currency')}
              value={`${preferences.currency} (${getCurrencySymbol(preferences.currency)})`}
              icon="attach-money"
              onPress={navigateToCurrencySettings}
            />
            <PreferenceItem
              title={t('profile.notifications')}
              value={getNotificationStatus()}
              icon="notifications"
              onPress={toggleNotifications}
              isLast
            />
          </SectionCard>
        </Animated.View>

        {/* App & Info Section */}
        <Animated.View entering={FadeInUp.delay(260).duration(350)} style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>
            {t('profile.appInfoTitle')}
          </Text>

          <SectionCard>
            <ActionItem
              title={t('profile.termsAndConditions')}
              icon="description"
              onPress={showTermsConditions}
            />
            <ActionItem
              title={t('profile.support')}
              icon="support-agent"
              onPress={showSupport}
            />
            <ActionItem
              title={t('profile.aboutLocaMap')}
              icon="info-outline"
              onPress={showAbout}
              isLast
            />
          </SectionCard>
        </Animated.View>

        {/* Logout Button */}
        <Animated.View entering={FadeInUp.delay(340).duration(350)} style={styles.logoutContainer}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.85}
          >
            <MaterialIcons name="logout" size={20} color={colors.white} style={styles.logoutIcon} />
            <RNText style={styles.logoutButtonLabel}>{t('profile.logout')}</RNText>
          </TouchableOpacity>
        </Animated.View>

        {/* Bottom padding — space for floating button + navbar pill */}
        <View style={{ height: 140 }} />
      </ScrollView>

      {/* Floating Become a Host button */}
      <TouchableOpacity
        style={styles.becomeHostButton}
        onPress={navigateToBecomeHost}
        activeOpacity={0.88}
      >
        <MaterialIcons name="add-home" size={20} color={colors.white} style={styles.becomeHostIcon} />
        <RNText style={styles.becomeHostText}>{t('host.become')}</RNText>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // ─── Screen shell ────────────────────────────────────────────────────────────
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 140,
  },

  // ─── Profile header — flush, no elevation ────────────────────────────────────
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing[5],
    paddingTop: spacing[5],
    paddingBottom: spacing[5],
  },
  avatarContainer: {
    marginRight: spacing[4],
  },
  avatarText: {
    backgroundColor: colors.primary,
  },
  userInfoContainer: {
    flex: 1,
  },
  userName: {
    fontSize: typography.fontSize.xl,    // 24px
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: typography.fontSize.sm,   // 13px
    color: colors.inkSubtle,
    marginBottom: 2,
  },
  memberSince: {
    fontSize: typography.fontSize.xs,   // 11px
    color: colors.inkSubtle,
    marginBottom: spacing[3],
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,      // 6px
    paddingVertical: 5,
    paddingHorizontal: spacing[3],
    backgroundColor: colors.surface,
  },
  editButtonIcon: {
    marginRight: 5,
  },
  editButtonLabel: {
    fontSize: typography.fontSize.sm,   // 13px
    color: colors.primary,
    fontWeight: '500',
  },

  // ─── Section layout ──────────────────────────────────────────────────────────
  sectionContainer: {
    marginHorizontal: spacing[4],
    marginTop: spacing[5],
  },
  sectionTitle: {
    fontSize: typography.fontSize.xs,   // 11px
    fontWeight: '700',
    color: colors.inkSubtle,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: spacing[2],
    marginLeft: 2,
  },

  // ─── Section card ────────────────────────────────────────────────────────────
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.card,    // 12px
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },

  // ─── Action item ─────────────────────────────────────────────────────────────
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
  },
  actionItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionIcon: {
    marginRight: spacing[3],
  },
  actionTitle: {
    fontSize: typography.fontSize.base, // 15px
    fontWeight: '500',
    color: colors.ink,
  },
  actionTitleDisabled: {
    color: colors.inkSubtle,
  },
  actionItemDisabled: {
    opacity: 0.75,
  },
  chevron: {
    fontSize: typography.fontSize.lg,  // 20px
    color: colors.inkSubtle,
    lineHeight: 24,
    marginLeft: spacing[2],
  },

  // ─── Item divider (full-width inside card) ───────────────────────────────────
  itemDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 0,
  },

  // ─── Coming soon badge ───────────────────────────────────────────────────────
  comingSoonBadge: {
    marginLeft: spacing[2],
    backgroundColor: colors.surfaceSunken,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
  },
  comingSoonText: {
    fontSize: typography.fontSize.xs,  // 11px
    color: colors.inkSubtle,
    fontWeight: '600',
  },

  // ─── Preference item ─────────────────────────────────────────────────────────
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
  },
  preferenceItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  preferenceIcon: {
    marginRight: spacing[3],
  },
  preferenceTitle: {
    fontSize: typography.fontSize.base, // 15px
    fontWeight: '500',
    color: colors.ink,
  },
  preferenceValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  preferenceValue: {
    fontSize: typography.fontSize.sm,  // 13px
    fontWeight: '600',
    color: colors.primary,
    marginRight: 4,
  },

  // ─── Logout ──────────────────────────────────────────────────────────────────
  logoutContainer: {
    marginHorizontal: spacing[4],
    marginTop: spacing[5],
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error,
    borderRadius: borderRadius.md,      // 6px
    height: 52,
  },
  logoutIcon: {
    marginRight: spacing[2],
  },
  logoutButtonLabel: {
    fontSize: typography.fontSize.base, // 15px
    fontWeight: '700',
    color: colors.white,
  },

  // ─── Floating "Become a Host" pill ───────────────────────────────────────────
  becomeHostButton: {
    position: 'absolute',
    bottom: 110,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: 12,
    paddingHorizontal: 20,
    // Tinted teal shadow per design system
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 10,
  },
  becomeHostIcon: {
    marginRight: spacing[2],
  },
  becomeHostText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: typography.fontSize.sm,  // 13px
  },
});

export default ProfileScreen;
