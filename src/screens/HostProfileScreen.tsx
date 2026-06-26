import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme';
import { RootStackParamList } from '../types';
import { useUserStore } from '../store/user';
import { hostService } from '../services/api';
import api from '../services/api/config';
import HostReferralScreen from './HostReferralScreen';
import HostResourcesScreen from './HostResourcesScreen';
import HostSupportScreen from './HostSupportScreen';
import HostLegalScreen from './HostLegalScreen';
import HostCoHostScreen from './HostCoHostScreen';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// ─── Types ────────────────────────────────────────────────────────────────────
interface HostProfile {
  isSuperHost: boolean;
  superHostSince: string | null;
  responseRate: number | null;
  responseTimeMinutes: number | null;
  completedStays: number;
  avgRating: number | null;
  cancellationRate: number | null;
  accountStatus: 'ok' | 'action_required';
  unreadNotifications: number;
}

type BadgeVariant = 'standard' | 'superhost' | 'issue';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getInitials = (fullName: string | null): string => {
  if (!fullName) return 'H';
  const parts = fullName.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const getBadgeVariant = (profile: HostProfile | null): BadgeVariant => {
  if (!profile) return 'standard';
  if (profile.accountStatus === 'action_required') return 'issue';
  if (profile.isSuperHost) return 'superhost';
  return 'standard';
};

const BADGE_COLORS: Record<BadgeVariant, { border: string; bg: string; text: string }> = {
  standard:  { border: colors.primary,   bg: colors.primaryLight, text: colors.primary },
  superhost: { border: '#B8860B',         bg: '#FFF8E1',           text: '#B8860B' },
  issue:     { border: colors.error,      bg: colors.error + '14', text: colors.error },
};

const formatResponseTime = (minutes: number | null): string => {
  if (minutes == null) return '—';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  return h === 1 ? '1h' : `${h}h`;
};

// ─── SuperHost criteria row ───────────────────────────────────────────────────
const CriteriaRow = ({
  label,
  value,
  target,
  met,
}: {
  label: string;
  value: string;
  target: string;
  met: boolean;
}) => {
  const { t } = useTranslation();
  return (
    <View style={cr.row}>
      <MaterialIcons
        name={met ? 'check-circle' : 'radio-button-unchecked'}
        size={16}
        color={met ? colors.success : colors.inkDisabled}
      />
      <View style={{ flex: 1 }}>
        <Text style={cr.label}>{label}</Text>
        <Text style={cr.target}>{t('hostProfile.target')} {target}</Text>
      </View>
      <Text style={[cr.value, met && cr.valueMet]}>{value}</Text>
    </View>
  );
};
const cr = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.border },
  label:    { fontSize: 13, fontWeight: '600', color: colors.ink },
  target:   { fontSize: 11, color: colors.inkSubtle, marginTop: 1 },
  value:    { fontSize: 13, fontWeight: '700', color: colors.inkSubtle },
  valueMet: { color: colors.success },
});

// ─── Menu item ────────────────────────────────────────────────────────────────
const MenuItem = ({
  icon,
  label,
  onPress,
  badge,
  danger,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  onPress: () => void;
  badge?: number;
  danger?: boolean;
}) => (
  <TouchableOpacity style={mi.row} onPress={onPress} activeOpacity={0.7}>
    <View style={[mi.iconWrap, danger && mi.iconWrapDanger]}>
      <MaterialIcons name={icon} size={20} color={danger ? colors.error : colors.primary} />
    </View>
    <Text style={[mi.label, danger && mi.labelDanger]}>{label}</Text>
    {badge != null && badge > 0 ? (
      <View style={mi.badge}>
        <Text style={mi.badgeTxt}>{badge > 99 ? '99+' : badge}</Text>
      </View>
    ) : (
      <MaterialIcons name="chevron-right" size={20} color={colors.inkDisabled} />
    )}
  </TouchableOpacity>
);
const mi = StyleSheet.create({
  row:           { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, gap: 14 },
  iconWrap:      { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  iconWrapDanger:{ backgroundColor: colors.error + '12' },
  label:         { flex: 1, fontSize: 15, fontWeight: '500', color: colors.ink },
  labelDanger:   { color: colors.error },
  badge:         { backgroundColor: colors.primary, borderRadius: 9, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeTxt:      { fontSize: 10, fontWeight: '700', color: colors.white },
});

// ─── Screen ───────────────────────────────────────────────────────────────────
const HostProfileScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { user, actions } = useUserStore();
  const { t } = useTranslation();

  const [profile, setProfile] = useState<HostProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [switchingMode, setSwitchingMode] = useState(false);
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [referralVisible, setReferralVisible] = useState(false);
  const [resourcesVisible, setResourcesVisible] = useState(false);
  const [supportVisible, setSupportVisible] = useState(false);
  const [legalVisible, setLegalVisible] = useState(false);
  const [cohostVisible, setCohostVisible] = useState(false);

  // ── Load profile stats ─────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [stats, notifs] = await Promise.all([
          hostService.getOverview(),
          api.get('/host/notifications').catch(() => ({ items: [] })),
        ]);
        setProfile({
          isSuperHost:           false,
          superHostSince:        null,
          responseRate:          null,
          responseTimeMinutes:   null,
          completedStays:        stats?.totalBookings ?? 0,
          avgRating:             stats?.averageRating ?? null,
          cancellationRate:      null,
          accountStatus:         'ok',
          unreadNotifications:   Array.isArray((notifs as any)?.items)
                                   ? (notifs as any).items.length
                                   : 0,
        });
      } catch {
        setProfile(null);
      } finally {
        setLoadingProfile(false);
      }
    })();
  }, []);

  // ── Switch to guest mode ───────────────────────────────────────────────────
  const handleSwitchMode = async () => {
    setSwitchingMode(true);
    try {
      await api.post('/auth/switch-mode', { mode: 'GUEST' }).catch(() => {});
      navigation.navigate('MainTabs');
    } finally {
      setSwitchingMode(false);
    }
  };

  // ── Logout ─────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await actions.logout();
    } finally {
      setLoggingOut(false);
      setLogoutVisible(false);
    }
  };

  const initials = getInitials(user.fullName);
  const variant  = getBadgeVariant(profile);
  const badge    = BADGE_COLORS[variant];

  // SuperHost criteria
  const criteria = profile
    ? [
        {
          label:  t('hostProfile.completedStays'),
          value:  String(profile.completedStays),
          target: '≥ 10',
          met:    profile.completedStays >= 10,
        },
        {
          label:  t('hostProfile.responseRate'),
          value:  profile.responseRate != null ? `${profile.responseRate}%` : '—',
          target: '≥ 90%',
          met:    (profile.responseRate ?? 0) >= 90,
        },
        {
          label:  t('hostProfile.avgRating'),
          value:  profile.avgRating != null ? profile.avgRating.toFixed(1) + '/5' : '—',
          target: '≥ 4.8 / 5',
          met:    (profile.avgRating ?? 0) >= 4.8,
        },
        {
          label:  t('hostProfile.cancellationRate'),
          value:  profile.cancellationRate != null ? `${profile.cancellationRate}%` : '—',
          target: '≤ 1%',
          met:    (profile.cancellationRate ?? 100) <= 1,
        },
      ]
    : [];

  const metCount = criteria.filter(c => c.met).length;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>{t('hostProfile.title')}</Text>
        <TouchableOpacity style={s.bellBtn} activeOpacity={0.7}>
          <MaterialIcons name="notifications-none" size={24} color={colors.ink} />
          {(profile?.unreadNotifications ?? 0) > 0 && (
            <View style={s.bellBadge}>
              <Text style={s.bellBadgeTxt}>
                {(profile!.unreadNotifications > 9) ? '9+' : profile!.unreadNotifications}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingBottom: Math.max(insets.bottom + 90, 110) }]}
      >
        {/* Avatar + name */}
        <Animated.View entering={FadeInDown.duration(340)} style={s.profileCard}>
          <View style={[s.avatar, { borderColor: badge.border, backgroundColor: badge.bg }]}>
            <Text style={[s.avatarTxt, { color: badge.text }]}>{initials}</Text>
          </View>
          <View style={s.profileInfo}>
            <Text style={s.profileName}>{user.fullName ?? 'Hôte'}</Text>
            <Text style={s.profileEmail}>{user.email ?? '—'}</Text>
            {variant === 'superhost' && (
              <View style={[s.superhostBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                <MaterialIcons name="star" size={12} color={badge.text} />
                <Text style={[s.superhostBadgeTxt, { color: badge.text }]}>{t('hostProfile.superhost')}</Text>
              </View>
            )}
            {variant === 'issue' && (
              <View style={[s.superhostBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                <MaterialIcons name="warning" size={12} color={badge.text} />
                <Text style={[s.superhostBadgeTxt, { color: badge.text }]}>{t('hostProfile.actionRequired')}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={s.editBtn}
            onPress={() => navigation.navigate('EditProfile')}
            activeOpacity={0.8}
          >
            <MaterialIcons name="edit" size={16} color={colors.primary} />
          </TouchableOpacity>
        </Animated.View>

        {/* Stats rapides */}
        {!loadingProfile && profile && (
          <Animated.View entering={FadeInDown.delay(60).duration(320)} style={s.statsRow}>
            <View style={s.statChip}>
              <Text style={s.statVal}>
                {profile.responseRate != null ? `${profile.responseRate}%` : '—'}
              </Text>
              <Text style={s.statLbl}>{t('hostProfile.responseRate')}</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statChip}>
              <Text style={s.statVal}>{formatResponseTime(profile.responseTimeMinutes)}</Text>
              <Text style={s.statLbl}>{t('hostProfile.responseTime')}</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statChip}>
              <Text style={s.statVal}>
                {profile.avgRating != null ? profile.avgRating.toFixed(1) : '—'}
              </Text>
              <Text style={s.statLbl}>{t('hostProfile.avgRating')}</Text>
            </View>
          </Animated.View>
        )}
        {loadingProfile && (
          <View style={s.statsLoading}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}

        {/* SuperHôte card */}
        <Animated.View entering={FadeInDown.delay(100).duration(320)} style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>{t('hostProfile.superhostProgress')}</Text>
            <Text style={s.sectionPill}>{metCount}/4 critères</Text>
          </View>
          {profile ? (
            <>
              <View style={s.criteriaProgress}>
                <View style={s.criteriaTrack}>
                  <View style={[s.criteriaFill, { width: `${(metCount / 4) * 100}%` as any }]} />
                </View>
              </View>
              {criteria.map((c, i) => (
                <CriteriaRow key={i} {...c} />
              ))}
              {metCount === 4 && !profile.isSuperHost && (
                <Text style={s.superhostHint}>
                  {t('hostProfile.criteriaAllMet')}
                </Text>
              )}
            </>
          ) : (
            <Text style={s.noDataTxt}>{t('hostProfile.noData')}</Text>
          )}
        </Animated.View>

        {/* Menu */}
        <Animated.View entering={FadeInDown.delay(140).duration(320)} style={s.menuSection}>
          <MenuItem
            icon="add-home"
            label={t('hostProfile.createListing')}
            onPress={() => navigation.navigate('CreateListing')}
          />
          <MenuItem
            icon="group"
            label={t('hostProfile.manageCoHosts')}
            onPress={() => setCohostVisible(true)}
          />
          <View style={s.menuDivider} />
          <MenuItem
            icon="settings"
            label={t('hostProfile.settings')}
            onPress={() => navigation.navigate('EditProfile')}
          />
          <MenuItem
            icon="menu-book"
            label={t('hostProfile.training')}
            onPress={() => setResourcesVisible(true)}
          />
          <MenuItem
            icon="support-agent"
            label={t('hostProfile.support')}
            onPress={() => setSupportVisible(true)}
          />
          <MenuItem
            icon="gavel"
            label={t('hostProfile.legal')}
            onPress={() => setLegalVisible(true)}
          />
          <MenuItem
            icon="people-outline"
            label={t('hostProfile.referral')}
            onPress={() => setReferralVisible(true)}
          />
        </Animated.View>

        {/* Switch mode */}
        <Animated.View entering={FadeInDown.delay(180).duration(320)} style={s.switchWrap}>
          <TouchableOpacity
            style={s.switchBtn}
            onPress={handleSwitchMode}
            disabled={switchingMode}
            activeOpacity={0.85}
          >
            {switchingMode ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <MaterialIcons name="swap-horiz" size={20} color={colors.white} />
                <Text style={s.switchTxt}>{t('hostProfile.switchGuest')}</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Logout */}
        <Animated.View entering={FadeInDown.delay(200).duration(320)} style={s.logoutWrap}>
          <TouchableOpacity
            style={s.logoutBtn}
            onPress={() => setLogoutVisible(true)}
            activeOpacity={0.8}
          >
            <MaterialIcons name="logout" size={18} color={colors.error} />
            <Text style={s.logoutTxt}>{t('hostProfile.logout')}</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {/* Logout confirmation modal */}
      <Modal
        visible={logoutVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutVisible(false)}
      >
        <View style={s.modalOverlay}>
          <Animated.View entering={FadeInDown.duration(220)} style={s.modalCard}>
            <View style={s.modalIconWrap}>
              <MaterialIcons name="logout" size={28} color={colors.error} />
            </View>
            <Text style={s.modalTitle}>{t('hostProfile.logoutTitle')}</Text>
            <Text style={s.modalBody}>
              {t('hostProfile.logoutBody')}
            </Text>
            <View style={s.modalActions}>
              <TouchableOpacity
                style={s.modalCancelBtn}
                onPress={() => setLogoutVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={s.modalCancelTxt}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.modalConfirmBtn}
                onPress={handleLogout}
                disabled={loggingOut}
                activeOpacity={0.85}
              >
                {loggingOut
                  ? <ActivityIndicator size="small" color={colors.white} />
                  : <Text style={s.modalConfirmTxt}>{t('hostProfile.logout')}</Text>
                }
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Co-hôtes modal */}
      <Modal
        visible={cohostVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCohostVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={refModalS.bar}>
            <TouchableOpacity
              style={refModalS.closeBtn}
              onPress={() => setCohostVisible(false)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="close" size={22} color={colors.ink} />
            </TouchableOpacity>
          </View>
          <HostCoHostScreen />
        </View>
      </Modal>

      {/* Legal fullscreen modal */}
      <Modal
        visible={legalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setLegalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={refModalS.bar}>
            <TouchableOpacity
              style={refModalS.closeBtn}
              onPress={() => setLegalVisible(false)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="close" size={22} color={colors.ink} />
            </TouchableOpacity>
          </View>
          <HostLegalScreen />
        </View>
      </Modal>

      {/* Support fullscreen modal */}
      <Modal
        visible={supportVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSupportVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={refModalS.bar}>
            <TouchableOpacity
              style={refModalS.closeBtn}
              onPress={() => setSupportVisible(false)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="close" size={22} color={colors.ink} />
            </TouchableOpacity>
          </View>
          <HostSupportScreen />
        </View>
      </Modal>

      {/* Resources fullscreen modal */}
      <Modal
        visible={resourcesVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setResourcesVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={refModalS.bar}>
            <TouchableOpacity
              style={refModalS.closeBtn}
              onPress={() => setResourcesVisible(false)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="close" size={22} color={colors.ink} />
            </TouchableOpacity>
          </View>
          <HostResourcesScreen />
        </View>
      </Modal>

      {/* Referral fullscreen modal */}
      <Modal
        visible={referralVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setReferralVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          {/* Close bar */}
          <View style={refModalS.bar}>
            <TouchableOpacity
              style={refModalS.closeBtn}
              onPress={() => setReferralVisible(false)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="close" size={22} color={colors.ink} />
            </TouchableOpacity>
          </View>
          <HostReferralScreen />
        </View>
      </Modal>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: 20 },

  // Header
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: colors.ink, letterSpacing: -0.4 },
  bellBtn:     { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  bellBadge:   { position: 'absolute', top: 6, right: 6, width: 14, height: 14, borderRadius: 7, backgroundColor: colors.error, borderWidth: 1.5, borderColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  bellBadgeTxt:{ fontSize: 7, fontWeight: '700', color: colors.white },

  // Profile card
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 14, ...Platform.select({ ios: { shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 }, android: { elevation: 2 } }) },
  avatar:      { width: 56, height: 56, borderRadius: 28, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  avatarTxt:   { fontSize: 20, fontWeight: '800' },
  profileInfo: { flex: 1, gap: 2 },
  profileName: { fontSize: 16, fontWeight: '700', color: colors.ink },
  profileEmail:{ fontSize: 12, color: colors.inkSubtle },
  superhostBadge:  { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, alignSelf: 'flex-start', marginTop: 4 },
  superhostBadgeTxt:{ fontSize: 10, fontWeight: '700' },
  editBtn:     { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },

  // Stats
  statsRow:    { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 14, paddingVertical: 14 },
  statsLoading:{ height: 70, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  statChip:    { flex: 1, alignItems: 'center', gap: 2 },
  statVal:     { fontSize: 18, fontWeight: '700', color: colors.ink },
  statLbl:     { fontSize: 10, color: colors.inkSubtle, textAlign: 'center' },
  statDivider: { width: 1, height: 32, backgroundColor: colors.border },

  // SuperHost section
  section:          { backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 14 },
  sectionHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle:     { fontSize: 15, fontWeight: '700', color: colors.ink },
  sectionPill:      { fontSize: 12, fontWeight: '700', color: colors.primary, backgroundColor: colors.primaryLight, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  criteriaProgress: { marginBottom: 12 },
  criteriaTrack:    { height: 5, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' },
  criteriaFill:     { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  superhostHint:    { fontSize: 12, color: colors.success, marginTop: 10, lineHeight: 17 },
  noDataTxt:        { fontSize: 13, color: colors.inkSubtle },

  // Menu
  menuSection:  { backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 14 },
  menuDivider:  { height: 1, backgroundColor: colors.border, marginHorizontal: 20 },

  // Switch mode
  switchWrap: { marginBottom: 10 },
  switchBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.ink, borderRadius: 12, paddingVertical: 15 },
  switchTxt:  { fontSize: 15, fontWeight: '700', color: colors.white },

  // Logout
  logoutWrap: { marginBottom: 20 },
  logoutBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 14, borderWidth: 1.5, borderColor: colors.error + '44', backgroundColor: colors.error + '08' },
  logoutTxt:  { fontSize: 15, fontWeight: '600', color: colors.error },

  // Modal
  modalOverlay:   { flex: 1, backgroundColor: 'rgba(15,31,31,0.5)', justifyContent: 'center', padding: 24 },
  modalCard:      { backgroundColor: colors.surface, borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  modalIconWrap:  { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.error + '12', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  modalTitle:     { fontSize: 18, fontWeight: '700', color: colors.ink, marginBottom: 8, textAlign: 'center' },
  modalBody:      { fontSize: 14, color: colors.inkMid, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  modalActions:   { flexDirection: 'row', gap: 12, width: '100%' },
  modalCancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center' },
  modalCancelTxt: { fontSize: 14, fontWeight: '600', color: colors.inkMid },
  modalConfirmBtn:{ flex: 1, paddingVertical: 13, borderRadius: 10, backgroundColor: colors.error, alignItems: 'center' },
  modalConfirmTxt:{ fontSize: 14, fontWeight: '700', color: colors.white },
});

const refModalS = StyleSheet.create({
  bar:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
});

export default HostProfileScreen;
