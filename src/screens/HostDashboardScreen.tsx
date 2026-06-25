import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, {
  FadeInDown,
  useSharedValue,
  withTiming,
  withDelay,
  Easing,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing } from '../theme';
import { RootStackParamList } from '../types';
import { useUserStore } from '../store/user';
import { hostService, DashboardSummary, PendingRequest } from '../services/api';
import HostListingsScreen from './HostListingsScreen';
import HostMessagesScreen from './HostMessagesScreen';
import HostProfileScreen from './HostProfileScreen';
import HostCalendarScreen from './HostCalendarScreen';

type Nav = NativeStackNavigationProp<RootStackParamList, 'HostDashboard'>;

// ─── Occupancy bar (animated width) ──────────────────────────────────────────
const OccupancyBar = ({ occupied, total }: { occupied: number; total: number }) => {
  const ratio = total > 0 ? occupied / total : 0;
  const barProgress = useSharedValue(0);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (containerWidth > 0) {
      barProgress.value = withDelay(
        400,
        withTiming(ratio, { duration: 1100, easing: Easing.out(Easing.cubic) }),
      );
    }
  }, [containerWidth, ratio]);

  const animStyle = useAnimatedStyle(() => ({
    width: barProgress.value * containerWidth,
  }));

  return (
    <View
      style={barS.track}
      onLayout={e => setContainerWidth(e.nativeEvent.layout.width)}
    >
      <Animated.View style={[barS.fill, animStyle]} />
    </View>
  );
};

const barS = StyleSheet.create({
  track: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    flex: 1,
  },
  fill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatFC = (n: number | undefined | null) =>
  (typeof n === 'number' ? n : 0).toLocaleString('fr-FR') + ' FC';

const getFormattedDate = () => {
  const str = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// ─── Component ────────────────────────────────────────────────────────────────
const HostDashboardScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const fullName = useUserStore(s => s.user.fullName);
  const firstName = fullName?.split(' ')[0] ?? 'Hôte';

  const [activeTab, setActiveTab] = useState('today');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      setError(null);
      const [sum, requests] = await Promise.all([
        hostService.getDashboardSummary(),
        hostService.getPendingRequests(),
      ]);
      setSummary({
        pendingRequests:      sum?.pendingRequests      ?? 0,
        checkInsToday:        sum?.checkInsToday        ?? 0,
        checkOutsToday:       sum?.checkOutsToday       ?? 0,
        occupancyNights:      sum?.occupancyNights      ?? 0,
        occupancyTotal:       sum?.occupancyTotal       ?? 30,
        revenueMonth:         sum?.revenueMonth         ?? 0,
        revenuePending:       sum?.revenuePending       ?? 0,
        currency:             sum?.currency             ?? 'CDF',
        unreadNotifications:  sum?.unreadNotifications  ?? 0,
      });
      setPendingRequests(Array.isArray(requests) ? requests : []);
    } catch {
      setError('Impossible de charger le tableau de bord');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  }, [loadDashboard]);

  const handleAccept = async (id: string) => {
    setPendingRequests(prev => prev.filter(r => r.id !== id));
    try { await hostService.acceptRequest(id); } catch { /* rollback possible */ }
  };

  const handleDecline = async (id: string) => {
    setPendingRequests(prev => prev.filter(r => r.id !== id));
    try { await hostService.declineRequest(id); } catch { /* rollback possible */ }
  };

  const HOST_TABS = [
    { id: 'today',    icon: 'home' as const,               label: 'Accueil' },
    { id: 'calendar', icon: 'calendar-today' as const,     label: 'Calendrier' },
    { id: 'listings', icon: 'featured-play-list' as const, label: 'Annonces' },
    { id: 'messages', icon: 'chat-bubble-outline' as const, label: 'Messages' },
    { id: 'profile',  icon: 'person-outline' as const,     label: 'Profil' },
  ] as const;

  // ── Today tab ──────────────────────────────────────────────────────────────
  const renderToday = () => {
    if (loading) {
      return (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    if (error) {
      return (
        <View style={s.centered}>
          <MaterialIcons name="cloud-off" size={40} color={colors.inkDisabled} />
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={loadDashboard} activeOpacity={0.8}>
            <Text style={s.retryTxt}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.scrollContent, { paddingTop: insets.top + 20 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* ── Greeting ── */}
        <Animated.View entering={FadeInDown.duration(360)} style={s.header}>
          <View style={s.headerLeft}>
            <View style={s.avatarCircle}>
              <Text style={s.avatarInitial}>{firstName.charAt(0).toUpperCase()}</Text>
            </View>
            <View>
              <Text style={s.greetingName}>Bonjour, {firstName}</Text>
              <Text style={s.greetingDate}>{getFormattedDate()}</Text>
            </View>
          </View>
          <TouchableOpacity style={s.bell} activeOpacity={0.7}>
            <MaterialIcons name="notifications-none" size={24} color={colors.ink} />
            {(summary?.unreadNotifications ?? 0) > 0 && (
              <View style={s.bellBadge}>
                <Text style={s.bellBadgeTxt}>
                  {(summary!.unreadNotifications > 5)
                    ? '5+'
                    : String(summary!.unreadNotifications)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* ── Actions requises ── */}
        <Animated.View entering={FadeInDown.delay(80).duration(360)} style={s.section}>
          {pendingRequests.length > 0 ? (
            <>
              <View style={s.sectionHeaderRow}>
                <MaterialIcons name="warning" size={13} color={colors.warning} />
                <Text style={[s.sectionLabel, { color: colors.warning, marginLeft: 5 }]}>
                  ACTIONS REQUISES ({pendingRequests.length})
                </Text>
              </View>

              {pendingRequests.map((req, i) =>
                req.type === 'reservation' ? (
                  <Animated.View
                    key={req.id}
                    entering={FadeInDown.delay(140 + i * 60).duration(300)}
                  >
                    <View style={s.card}>
                      <View style={s.cardHeader}>
                        <MaterialIcons name="event-note" size={14} color={colors.primary} />
                        <Text style={s.cardTitle}>Demande de réservation</Text>
                        {req.hoursAgo >= 12 && (
                          <View style={s.slaBadge}>
                            <Text style={s.slaTxt}>Répond lentement</Text>
                          </View>
                        )}
                      </View>
                      <Text style={s.cardPrimary}>{req.propertyTitle}</Text>
                      <Text style={s.cardMeta}>
                        {req.guestName}
                        {req.checkIn && req.checkOut
                          ? ` · ${req.checkIn} — ${req.checkOut}`
                          : null}
                      </Text>
                      {typeof req.amount === 'number' && (
                        <Text style={s.cardAmount}>{formatFC(req.amount)}</Text>
                      )}
                      <View style={s.cardActions}>
                        <TouchableOpacity
                          style={s.declineBtn}
                          onPress={() => handleDecline(req.id)}
                          activeOpacity={0.8}
                        >
                          <Text style={s.declineTxt}>Refuser</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={s.acceptBtn}
                          onPress={() => handleAccept(req.id)}
                          activeOpacity={0.8}
                        >
                          <Text style={s.acceptTxt}>Accepter</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </Animated.View>
                ) : (
                  <Animated.View
                    key={req.id}
                    entering={FadeInDown.delay(140 + i * 60).duration(300)}
                  >
                    <View style={s.card}>
                      <View style={s.cardHeader}>
                        <MaterialIcons name="chat-bubble-outline" size={14} color={colors.primary} />
                        <Text style={s.cardTitle}>Message sans réponse</Text>
                        {req.hoursAgo >= 12 && (
                          <View style={[s.slaBadge, { backgroundColor: colors.error + '18' }]}>
                            <Text style={[s.slaTxt, { color: colors.error }]}>Urgent</Text>
                          </View>
                        )}
                      </View>
                      <Text style={s.cardMeta}>
                        {req.guestName} · Il y a {req.hoursAgo}h
                      </Text>
                      {req.preview && (
                        <Text style={s.cardPreview} numberOfLines={2}>{req.preview}</Text>
                      )}
                      <TouchableOpacity
                        style={s.replyBtn}
                        onPress={() => handleDecline(req.id)}
                        activeOpacity={0.8}
                      >
                        <Text style={s.replyTxt}>Répondre</Text>
                        <MaterialIcons name="arrow-forward" size={13} color={colors.primary} />
                      </TouchableOpacity>
                    </View>
                  </Animated.View>
                ),
              )}
            </>
          ) : (
            <View style={s.emptyActions}>
              <MaterialIcons name="check-circle-outline" size={28} color={colors.success} />
              <Text style={s.emptyTitle}>Tout est tranquille</Text>
              <Text style={s.emptySubtitle}>Aucune action requise pour l'instant</Text>
            </View>
          )}
        </Animated.View>

        {/* ── KPIs du jour ── */}
        {summary && (
          <Animated.View entering={FadeInDown.delay(200).duration(360)} style={s.section}>
            <Text style={s.sectionLabel}>AUJOURD'HUI</Text>

            <View style={s.kpiRow}>
              <View style={s.kpiChip}>
                <MaterialIcons name="login" size={18} color={colors.primary} />
                <Text style={s.kpiValue}>{summary.checkInsToday}</Text>
                <Text style={s.kpiLabel}>Arrivées</Text>
              </View>
              <View style={[s.kpiChip, { marginLeft: 12 }]}>
                <MaterialIcons name="logout" size={18} color={colors.inkSubtle} />
                <Text style={s.kpiValue}>{summary.checkOutsToday}</Text>
                <Text style={s.kpiLabel}>Départs</Text>
              </View>
            </View>

            <View style={s.occupancyCard}>
              <View style={s.occupancyLabelRow}>
                <Text style={s.occupancyLabel}>Nuits occupées ce mois</Text>
                <Text style={s.occupancyCount}>
                  {summary.occupancyNights}/{summary.occupancyTotal}
                  {'  '}
                  <Text style={s.occupancyPct}>
                    ({Math.round((summary.occupancyNights / (summary.occupancyTotal || 1)) * 100)}%)
                  </Text>
                </Text>
              </View>
              <OccupancyBar
                occupied={summary.occupancyNights}
                total={summary.occupancyTotal}
              />
            </View>
          </Animated.View>
        )}

        {/* ── Revenus ── */}
        {summary && (
          <Animated.View entering={FadeInDown.delay(300).duration(360)} style={s.section}>
            <Text style={s.sectionLabel}>REVENUS</Text>
            <View style={s.revenueCard}>
              <View style={s.revenueRow}>
                <Text style={s.revenueLbl}>Ce mois</Text>
                <Text style={s.revenueAmt}>{formatFC(summary.revenueMonth)}</Text>
              </View>
              <View style={s.revenueDivider} />
              <View style={s.revenueRow}>
                <View>
                  <Text style={s.revenueLbl}>En attente</Text>
                  <Text style={[s.revenueAmt, s.revenueAmtPending]}>
                    {formatFC(summary.revenuePending)}
                  </Text>
                </View>
                <TouchableOpacity style={s.detailsBtn} activeOpacity={0.8}>
                  <Text style={s.detailsTxt}>Détails</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        )}

        <View style={{ height: 110 }} />
      </ScrollView>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'listings':  return <HostListingsScreen />;
      case 'messages':  return <HostMessagesScreen />;
      case 'profile':   return <HostProfileScreen />;
      case 'calendar':  return <HostCalendarScreen />;
      default:          return renderToday();
    }
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      {renderContent()}

      {/* Floating pill nav */}
      <View
        style={[s.navWrapper, { bottom: Math.max(insets.bottom + 8, 16) }]}
        pointerEvents="box-none"
      >
        <View style={s.navBar}>
          {HOST_TABS.map(tab => {
            const active = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={s.navItem}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={tab.label}
              >
                <MaterialIcons
                  name={tab.icon}
                  size={24}
                  color={active ? colors.primary : colors.inkDisabled}
                />
                <Text style={[s.navLabel, active && s.navLabelActive]}>
                  {tab.label}
                </Text>
                {active && <View style={s.navDot} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 32,
  },
  errorText: {
    fontSize: 14,
    color: colors.inkSubtle,
    textAlign: 'center',
  },
  retryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  retryTxt: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  greetingName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.3,
  },
  greetingDate: {
    fontSize: 12,
    color: colors.inkSubtle,
    marginTop: 1,
  },
  bell: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: colors.error,
    borderRadius: 7,
    minWidth: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  bellBadgeTxt: {
    color: colors.white,
    fontSize: 8,
    fontWeight: '700',
  },

  // Sections
  section: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.inkDisabled,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },

  // Action cards
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 5,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink,
    flex: 1,
  },
  slaBadge: {
    backgroundColor: colors.warning + '22',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  slaTxt: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.warning,
  },
  cardPrimary: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: 3,
  },
  cardMeta: {
    fontSize: 12,
    color: colors.inkSubtle,
    marginBottom: 4,
  },
  cardAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 12,
  },
  cardPreview: {
    fontSize: 12,
    color: colors.inkMid,
    lineHeight: 17,
    marginBottom: 10,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  declineBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  declineTxt: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.inkMid,
  },
  acceptBtn: {
    flex: 2,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  acceptTxt: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white,
  },
  replyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
  },
  replyTxt: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },

  // Empty actions
  emptyActions: {
    alignItems: 'center',
    paddingVertical: 28,
    backgroundColor: colors.surfaceSunken,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.inkSubtle,
  },

  // KPI chips
  kpiRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  kpiChip: {
    flex: 1,
    backgroundColor: colors.surfaceSunken,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    paddingVertical: 14,
    gap: 4,
  },
  kpiValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.ink,
    lineHeight: 32,
  },
  kpiLabel: {
    fontSize: 11,
    color: colors.inkSubtle,
  },

  // Occupancy
  occupancyCard: {
    backgroundColor: colors.surfaceSunken,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  occupancyLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  occupancyLabel: {
    fontSize: 13,
    color: colors.inkMid,
    fontWeight: '500',
  },
  occupancyCount: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  occupancyPct: {
    fontWeight: '500',
    color: colors.inkSubtle,
  },

  // Revenue
  revenueCard: {
    backgroundColor: colors.surfaceSunken,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  revenueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  revenueDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 16,
  },
  revenueLbl: {
    fontSize: 12,
    color: colors.inkSubtle,
    marginBottom: 4,
  },
  revenueAmt: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.5,
  },
  revenueAmtPending: {
    color: colors.primary,
  },
  detailsBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  detailsTxt: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },

  // Nav
  navWrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  navBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 28,
    paddingHorizontal: 8,
    paddingVertical: 10,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
      },
      android: { elevation: 10 },
    }),
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    gap: 2,
  },
  navLabel: {
    fontSize: 9,
    color: colors.inkDisabled,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  navLabelActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  navDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginTop: 1,
  },
});

export default HostDashboardScreen;
