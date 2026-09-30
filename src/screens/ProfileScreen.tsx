import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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
  Portal,
  Dialog,
  Button,
  useTheme,
} from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useUser, useUserActions, useUserStore } from '../store/user';
import { usePreferences } from '../store/preferences';
import { colors, spacing, typography, borderRadius } from '../theme';
import { useTranslation } from 'react-i18next';
import { useSyncLanguage } from '../hooks/useLanguage';
import Animated from 'react-native-reanimated';

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
        accessibilityRole="button"
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
        accessibilityRole="button"
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
  const createdAt = useUserStore(state => state.authUser?.created_at);
  const memberSinceDate = createdAt ? new Date(createdAt).toLocaleDateString(preferences.language, { year: 'numeric', month: 'long' }) : '—';

  // Languages and currencies options
  const languageOptions = [
    { value: 'fr', label: t('languages.fr'), icon: '🇫🇷' },
    { value: 'en', label: t('languages.en'), icon: '🇬🇧' },
    { value: 'rw', label: t('languages.rw'), icon: '🇷🇼' },
    { value: 'sw', label: t('languages.sw'), icon: '🇹🇿' },
  ];

  const currencyOptions = [
    { value: 'RWF', label: t('currencies.RWF'), icon: 'FRw' },
  ];

  // Navigate to edit profile screen
  const navigateToEditProfile = () => {
    navigation.navigate('GuestAccount');
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

  const navigateToHistory = () => navigation.navigate('RecentlyViewed');
  const showTermsConditions = () => navigation.navigate('Legal');
  const showSupport = () => navigation.navigate('Support');
  const showAbout = () => navigation.navigate('About');

  // Navigate to become host screen
  const navigateToBecomeHost = () => {
    navigation.navigate('HostOnboarding');
  };

  // Handle logout
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);
  const handleLogout = () => setLogoutVisible(true);
  const confirmLogout = async () => {
    setLogoutPending(true);
    try {
      await logout();
      await preferences.resetPreferences();
    } finally {
      setLogoutPending(false);
      setLogoutVisible(false);
    }
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
    if (Platform.OS === 'ios') showIOSActionSheet(t('preferences.chooseLanguage'), options);
    else showAndroidOptionDialog(t('preferences.chooseLanguage'), options);
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
    if (Platform.OS === 'ios') showIOSActionSheet(t('preferences.chooseCurrency'), options);
    else showAndroidOptionDialog(t('preferences.chooseCurrency'), options);
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
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={colors.background}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Header — full-width flush block, no card elevation */}
        <Animated.View style={styles.profileHeader}>
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
        accessibilityRole="button"
              style={styles.editButton}
              onPress={navigateToEditProfile}
              activeOpacity={0.7}
            >
              <MaterialIcons name="edit" size={14} color={colors.primary} style={styles.editButtonIcon} />
              <RNText style={styles.editButtonLabel}>{t('profile.editProfile')}</RNText>
            </TouchableOpacity>
          </View>
        </Animated.View>

      {/* Become a Host action stays in the scrollable content. */}
      <TouchableOpacity
        accessibilityRole="button"
        style={styles.becomeHostButton}
        onPress={navigateToBecomeHost}
        activeOpacity={0.88}
      >
        <MaterialIcons name="add-home" size={20} color={colors.onAccent} style={styles.becomeHostIcon} />
        <RNText style={styles.becomeHostText}>{t('host.become')}</RNText>
      </TouchableOpacity>

        {/* Quick Actions Section */}
        <Animated.View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>
            {t('profile.actionsTitle')}
          </Text>

          <SectionCard>
            <ActionItem title={t('bookingFlow.myStays', 'Mes séjours')} icon="event" onPress={() => navigation.navigate('Bookings')} />
            <ActionItem title={t('preferences.notifications', 'Notifications')} icon="notifications" onPress={() => navigation.navigate('Notifications')} />
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
              onPress={navigateToGuides}
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
        <Animated.View style={styles.sectionContainer}>
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
              value={t('guestAccount.title', 'Paramètres du compte')}
              icon="notifications"
              onPress={() => navigation.navigate('GuestAccount')}
              isLast
            />
          </SectionCard>
        </Animated.View>

        {/* App & Info Section */}
        <Animated.View style={styles.sectionContainer}>
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
        <Animated.View style={styles.logoutContainer}>
          <TouchableOpacity
        accessibilityRole="button"
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.85}
          >
            <MaterialIcons name="logout" size={20} color={colors.inkSubtle} style={styles.logoutIcon} />
            <RNText style={styles.logoutButtonLabel}>{t('profile.logout')}</RNText>
          </TouchableOpacity>
        </Animated.View>



      </ScrollView>
      <Portal>
        <Dialog visible={logoutVisible} dismissable={!logoutPending} onDismiss={() => setLogoutVisible(false)}>
          <Dialog.Title>{t('profile.logoutConfirmTitle')}</Dialog.Title>
          <Dialog.Content><Text>{t('profile.logoutConfirmMessage')}</Text></Dialog.Content>
          <Dialog.Actions>
            <Button disabled={logoutPending} onPress={() => setLogoutVisible(false)}>{t('common.cancel')}</Button>
            <Button disabled={logoutPending} onPress={() => void confirmLogout()}>{t('profile.logout')}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
    width: '100%', maxWidth: 760, alignSelf: 'center', paddingBottom: 32,
  },

  // ─── Profile header — flush, no elevation ────────────────────────────────────
  profileHeader: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 24, marginHorizontal: 16, marginTop: 20, borderRadius: 16, gap: 4,
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
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.button,
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
    fontSize: 18, fontWeight: '700', color: colors.ink, marginBottom: 12, marginLeft: 2,
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
    fontSize: 16, lineHeight: 23, fontWeight: '500', color: colors.ink, flexShrink: 1,
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
    fontSize: 16, lineHeight: 23, fontWeight: '500', color: colors.ink, flexShrink: 1,
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderMid, backgroundColor: colors.surface, borderRadius: 12, minHeight: 50,
  },
  logoutIcon: {
    marginRight: spacing[2],
  },
  logoutButtonLabel: {
    fontSize: 15, fontWeight: '600', color: colors.inkMid,
  },

  // ─── "Become a Host" pill ───────────────────────────────────────────
  becomeHostButton: {
    marginHorizontal: 16, marginTop: 16, minHeight: 52, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20,
  },
  becomeHostIcon: {
    marginRight: spacing[2],
  },
  becomeHostText: {
    color: colors.onAccent, fontWeight: '700', fontSize: 16, flexShrink: 1,
  },
});

export default ProfileScreen;
