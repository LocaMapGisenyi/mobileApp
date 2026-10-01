import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Text as RNText,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { Avatar, Button, Dialog, Portal, Text } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useUser, useUserActions, useUserStore } from '../store/user';
import { usePreferences, type Language } from '../store/preferences';
import { colors, spacing, typography, borderRadius } from '../theme';
import { useTranslation } from 'react-i18next';
import { useSyncLanguage } from '../hooks/useLanguage';
import Animated from 'react-native-reanimated';
import LogoutDialog from '../components/LogoutDialog';
import AccountProfileEditor from './AccountProfileEditor';
import { supabase } from '../lib/supabase';

type ProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Profile'>;

// Card wrapper component for section items
const SectionCard = ({ children, style = {} }: { children: React.ReactNode; style?: object }) => {
  return <View style={[styles.sectionCard, style]}>{children}</View>;
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
            color={comingSoon ? colors.inkSubtle : iconColor || colors.primary}
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
  const user = useUser();
  const { logout } = useUserActions();
  const preferences = usePreferences();
  const { t } = useTranslation();
  const [hostAccess, setHostAccess] = useState<{ id: string; allowed: boolean } | null>(null);
  const hasHostAccess = hostAccess?.id === user.id && hostAccess?.allowed === true;
  const checkingHostAccess = hostAccess?.id !== user.id;
  useFocusEffect(useCallback(() => {
    let active = true;
    const id = user.id;
    if (id) void supabase.from('profiles').select('is_host,kyc_status').eq('id', id).maybeSingle()
      .then(({ data, error }) => { if (active) setHostAccess({ id, allowed: !error && data?.is_host === true && data.kyc_status === 'VERIFIED' }); }, () => { if (active) setHostAccess({ id, allowed: false }); });
    return () => { active = false; };
  }, [user.id]));

  // Synchroniser la langue
  useSyncLanguage();

  // Calculate member since date from user id
  const createdAt = useUserStore(state => state.authUser?.created_at);
  const memberSinceDate = createdAt
    ? new Date(createdAt).toLocaleDateString(preferences.language, {
        year: 'numeric',
        month: 'long',
      })
    : '—';

  // Languages and currencies options
  const languageOptions = [
    { value: 'fr', label: t('languages.fr'), icon: '🇫🇷' },
    { value: 'en', label: t('languages.en'), icon: '🇬🇧' },
    { value: 'rw', label: t('languages.rw'), icon: '🇷🇼' },
    { value: 'sw', label: t('languages.sw'), icon: '🇹🇿' },
  ];

  const currencyOptions = [{ value: 'RWF', label: t('currencies.RWF'), icon: 'FRw' }];

  const [profileEditorVisible, setProfileEditorVisible] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const navigateToEditProfile = () => { setProfileSaved(false); setProfileEditorVisible(true); };

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
    if (hasHostAccess) navigation.navigate('HostDashboard');
    else navigation.navigate('HostOnboarding');
  };

  // Handle logout
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const logoutInFlight = useRef(false);
  const handleLogout = () => {
    setLogoutError('');
    setLogoutVisible(true);
  };
  const confirmLogout = async () => {
    if (logoutInFlight.current) return;
    logoutInFlight.current = true;
    setLogoutError('');
    setLogoutPending(true);
    try {
      await logout();
      await preferences.resetPreferences();
      setLogoutVisible(false);
    } catch {
      setLogoutError(t('profile.logoutError'));
    } finally {
      logoutInFlight.current = false;
      setLogoutPending(false);
    }
  };

  // Helper functions to get display names
  const getLanguageDisplayName = (langCode: string) => {
    return t(`languages.${langCode}`);
  };

  const getCurrencySymbol = (currencyCode: string) => {
    switch (currencyCode) {
      case 'USD':
        return '$';
      case 'EUR':
        return '€';
      case 'RWF':
        return 'FRw';
      default:
        return currencyCode;
    }
  };

  const [preferencePicker, setPreferencePicker] = useState<'language' | 'currency'>('language');
  const [preferenceVisible, setPreferenceVisible] = useState(false);
  const [preferenceBusy, setPreferenceBusy] = useState(false);
  const [preferenceError, setPreferenceError] = useState(false);
  const preferencePending = useRef(false);
  const navigateToLanguageSettings = () => { setPreferenceError(false); setPreferencePicker('language'); setPreferenceVisible(true); };
  const navigateToCurrencySettings = () => { setPreferenceError(false); setPreferencePicker('currency'); setPreferenceVisible(true); };
  const selectPreference = async (value: string) => {
    if (preferencePending.current) return;
    preferencePending.current = true; setPreferenceBusy(true); setPreferenceError(false);
    try {
      if (preferencePicker === 'language') await preferences.setLanguage(value as Language);
      else await preferences.setCurrency('RWF');
      setPreferenceVisible(false);
    } catch { setPreferenceError(true); }
    finally { preferencePending.current = false; setPreferenceBusy(false); }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <AccountProfileEditor visible={profileEditorVisible} onClose={() => setProfileEditorVisible(false)} onSaved={() => setProfileSaved(true)} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text accessibilityRole="header" style={styles.pageTitle}>
          {t('pro.profileTitle')}
        </Text>
        {profileSaved && <Text accessibilityRole="alert" style={{ color: colors.primary, marginBottom: 16 }}>{t('profileEditor.saved')}</Text>}
        {/* Profile Header — full-width flush block, no card elevation */}
        <Animated.View style={styles.profileHeader}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            {user.photoURL ? (
              <Avatar.Image size={64} source={{ uri: user.photoURL }} />
            ) : (
              <Avatar.Text
                size={64}
                label={user.fullName ? user.fullName.substring(0, 2).toUpperCase() : 'U'}
                style={styles.avatarText}
                color={colors.primaryDark}
              />
            )}
          </View>

          {/* User Info */}
          <View style={styles.userInfoContainer}>
            <Text style={styles.userName}>{user.fullName || 'Guest User'}</Text>

            <Text style={styles.userEmail} numberOfLines={1}>
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
              <MaterialIcons
                name="edit"
                size={14}
                color={colors.primary}
                style={styles.editButtonIcon}
              />
              <RNText style={styles.editButtonLabel}>{t('profile.editProfile')}</RNText>
            </TouchableOpacity>
          </View>
        </Animated.View>

        <View style={styles.quickActions}>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => navigation.navigate('Bookings')}
            style={styles.quickAction}
            activeOpacity={0.75}
          >
            <MaterialIcons name="event-note" size={24} color={colors.primary} />
            <RNText style={styles.quickTitle}>{t('bookingFlow.myStays')}</RNText>
            <MaterialIcons
              name="arrow-forward"
              size={18}
              color={colors.inkSubtle}
              style={styles.quickArrow}
            />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={navigateToFavorites}
            style={styles.quickAction}
            activeOpacity={0.75}
          >
            <MaterialIcons name="favorite-border" size={24} color={colors.primary} />
            <RNText style={styles.quickTitle}>{t('profile.myFavorites')}</RNText>
            <MaterialIcons
              name="arrow-forward"
              size={18}
              color={colors.inkSubtle}
              style={styles.quickArrow}
            />
          </TouchableOpacity>
        </View>

        {/* Become a Host action stays in the scrollable content. */}
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.becomeHostButton}
          onPress={navigateToBecomeHost}
          activeOpacity={0.88}
        >
          <View style={styles.hostIcon}>
            <MaterialIcons name="add-home" size={25} color={colors.primary} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <RNText style={styles.becomeHostText}>{t(checkingHostAccess ? 'hostFlow.menu.title' : hasHostAccess ? 'hostFlow.menu.hostMode' : 'host.become')}</RNText>
            <RNText style={styles.hostSubtitle}>{t(hasHostAccess || checkingHostAccess ? 'hostFlow.menu.subtitle' : 'pro.hostInvitation')}</RNText>
          </View>
          <MaterialIcons name="chevron-right" size={22} color={colors.inkSubtle} />
        </TouchableOpacity>

        {/* Quick Actions Section */}
        <Animated.View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>{t('profile.actionsTitle')}</Text>

          <SectionCard>
            <ActionItem
              title={t('preferences.notifications', 'Notifications')}
              icon="notifications"
              onPress={() => navigation.navigate('Notifications')}
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
          <Text style={styles.sectionTitle}>{t('profile.preferencesTitle')}</Text>

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
              title={t('profileEditor.accountSettings')}
              value=""
              icon="manage-accounts"
              onPress={() => navigation.navigate('GuestAccount')}
              isLast
            />
          </SectionCard>
        </Animated.View>

        {/* App & Info Section */}
        <Animated.View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>{t('profile.appInfoTitle')}</Text>

          <SectionCard>
            <ActionItem
              title={t('profile.termsAndConditions')}
              icon="description"
              onPress={showTermsConditions}
            />
            <ActionItem title={t('profile.support')} icon="support-agent" onPress={showSupport} />
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
            <MaterialIcons
              name="logout"
              size={20}
              color={colors.inkSubtle}
              style={styles.logoutIcon}
            />
            <RNText style={styles.logoutButtonLabel}>{t('profile.logout')}</RNText>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
      <Portal><Dialog visible={preferenceVisible} dismissable={!preferenceBusy} onDismiss={() => { if (!preferenceBusy) setPreferenceVisible(false); }}
        style={{ backgroundColor: colors.surface, maxWidth: 460, width: '90%', alignSelf: 'center', marginHorizontal: 0 }}>
        <Dialog.Title>{t(preferencePicker === 'language' ? 'preferences.chooseLanguage' : 'preferences.chooseCurrency')}</Dialog.Title>
        <Dialog.Content>
          {(preferencePicker === 'language' ? languageOptions : currencyOptions).map(option => <TouchableOpacity key={option.value}
            accessibilityRole="radio" accessibilityLabel={option.label} accessibilityState={{ checked: option.value === (preferencePicker === 'language' ? preferences.language : preferences.currency), disabled: preferenceBusy }}
            disabled={preferenceBusy} onPress={() => void selectPreference(option.value)} style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <MaterialIcons name={option.value === (preferencePicker === 'language' ? preferences.language : preferences.currency) ? 'radio-button-checked' : 'radio-button-unchecked'} size={22} color={colors.primary} />
            <Text style={{ fontSize: 16 }}>{option.label}</Text>
          </TouchableOpacity>)}
          {preferenceError && <Text accessibilityRole="alert" style={{ color: colors.error }}>{t('profileEditor.actionError')}</Text>}
        </Dialog.Content>
        <Dialog.Actions><Button disabled={preferenceBusy} loading={preferenceBusy} onPress={() => setPreferenceVisible(false)}>{t('common.cancel')}</Button></Dialog.Actions>
      </Dialog></Portal>
      <LogoutDialog
        visible={logoutVisible}
        busy={logoutPending}
        error={logoutError}
        onCancel={() => {
          if (!logoutInFlight.current) setLogoutVisible(false);
        }}
        onConfirm={() => void confirmLogout()}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // ─── Screen shell ────────────────────────────────────────────────────────────
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scrollContent: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingBottom: 32,
  },

  // ─── Profile header — flush, no elevation ────────────────────────────────────
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 20,
    marginHorizontal: 24,
    gap: 4,
  },
  avatarContainer: {
    marginRight: spacing[4],
  },
  avatarText: {
    backgroundColor: colors.primaryLight,
  },
  userInfoContainer: {
    flex: 1,
  },
  userName: {
    fontSize: 21,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: typography.fontSize.sm, // 13px
    color: colors.inkSubtle,
    marginBottom: 2,
  },
  memberSince: {
    fontSize: typography.fontSize.xs, // 11px
    color: colors.inkSubtle,
    marginBottom: spacing[3],
  },
  editButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 5,
  },
  editButtonIcon: {
    marginRight: 5,
  },
  editButtonLabel: {
    fontSize: typography.fontSize.sm, // 13px
    color: colors.primary,
    fontWeight: '500',
  },

  // ─── Section layout ──────────────────────────────────────────────────────────
  sectionContainer: {
    marginHorizontal: 24,
    marginTop: 28,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 8,
  },

  // ─── Section card ────────────────────────────────────────────────────────────
  sectionCard: {
    backgroundColor: colors.surface,
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
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '500',
    color: colors.ink,
    flexShrink: 1,
  },
  actionTitleDisabled: {
    color: colors.inkSubtle,
  },
  actionItemDisabled: {
    opacity: 0.75,
  },
  chevron: {
    fontSize: typography.fontSize.lg, // 20px
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
    fontSize: typography.fontSize.xs, // 11px
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
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '500',
    color: colors.ink,
    flexShrink: 1,
  },
  preferenceValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '52%',
  },
  preferenceValue: {
    flexShrink: 1,
    textAlign: 'right',
    fontSize: typography.fontSize.sm, // 13px
    fontWeight: '600',
    color: colors.inkSubtle,
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
    borderWidth: 1,
    borderColor: colors.borderMid,
    backgroundColor: colors.surface,
    borderRadius: 12,
    minHeight: 50,
  },
  logoutIcon: {
    marginRight: spacing[2],
  },
  logoutButtonLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.inkMid,
  },

  // ─── "Become a Host" pill ───────────────────────────────────────────
  becomeHostButton: {
    marginHorizontal: 24,
    marginTop: 20,
    minHeight: 88,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingVertical: 18,
  },
  becomeHostIcon: {
    marginRight: spacing[2],
  },
  becomeHostText: {
    color: colors.ink,
    fontWeight: '600',
    fontSize: 16,
    flexShrink: 1,
  },
  pageTitle: {
    fontSize: 28,
    lineHeight: 35,
    fontWeight: '700',
    color: colors.ink,
    marginHorizontal: 24,
    marginTop: 24,
    marginBottom: 4,
  },
  quickActions: { flexDirection: 'row', gap: 12, marginHorizontal: 24, marginTop: 4 },
  quickAction: {
    flex: 1,
    minHeight: 112,
    padding: 16,
    backgroundColor: colors.background,
    borderRadius: 12,
    gap: 14,
  },
  quickTitle: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
    color: colors.ink,
    paddingRight: 16,
  },
  quickArrow: { position: 'absolute', top: 20, right: 14 },
  hostIcon: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
  },
  hostSubtitle: { fontSize: 13, lineHeight: 20, color: colors.inkSubtle },
});

export default ProfileScreen;
