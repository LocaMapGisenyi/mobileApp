import ContentSkeleton from '../components/ContentSkeleton';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { colors } from '../theme';
import { HostPage, HostHeader } from '../components/host/HostUI';
import {
  cohostService,
  CoHost,
  CoHostPermissions,
  CoHostCandidate,
  RevenueShareType,
  InviteCoHostPayload,
} from '../services/api';

// ─── Constants ────────────────────────────────────────────────────────────────
const DEFAULT_PERMISSIONS: CoHostPermissions = {
  calendar: true,
  reservations: false,
  messages: false,
  pricing: false,
  revenue_view: false,
  reviews: false,
  guest_info: false,
};

const formatRWF = (n: number) => n.toLocaleString('fr-FR') + ' RWF';

// ─── Avatar initials ──────────────────────────────────────────────────────────
const Avatar = ({ name, size = 44 }: { name: string; size?: number }) => (
  <View style={[av.wrap, { width: size, height: size, borderRadius: size / 2 }]}>
    <Text style={[av.txt, { fontSize: size * 0.36 }]}>
      {name.trim().charAt(0).toUpperCase()}
    </Text>
  </View>
);
const av = StyleSheet.create({
  wrap: { backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  txt:  { fontWeight: '700', color: colors.primary },
});

// ─── Toggle row ───────────────────────────────────────────────────────────────
const PermissionToggle = ({
  pkey,
  enabled,
  label,
  sub,
  icon,
  onToggle,
  disabled,
}: {
  pkey: keyof CoHostPermissions;
  enabled: boolean;
  label: string;
  sub: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  onToggle: (key: keyof CoHostPermissions) => void;
  disabled?: boolean;
}) => (
  <TouchableOpacity
    style={pt.row}
    onPress={() => !disabled && onToggle(pkey)}
    activeOpacity={disabled ? 1 : 0.8}
  >
    <View style={[pt.iconWrap, enabled && pt.iconWrapActive]}>
      <MaterialIcons name={icon} size={17} color={enabled ? colors.primary : colors.inkDisabled} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={[pt.label, disabled && pt.labelDisabled]}>{label}</Text>
      <Text style={pt.sub}>{sub}</Text>
    </View>
    <View style={[pt.toggle, enabled && pt.toggleOn, disabled && pt.toggleDisabled]}>
      <View style={[pt.thumb, enabled && pt.thumbOn]} />
    </View>
  </TouchableOpacity>
);
const pt = StyleSheet.create({
  row:           { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  iconWrap:      { width: 44, height: 44, borderRadius: 8, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
  iconWrapActive:{ backgroundColor: colors.primaryLight },
  label:         { fontSize: 14, fontWeight: '600', color: colors.ink },
  labelDisabled: { color: colors.inkDisabled },
  sub:           { fontSize: 13, color: colors.inkSubtle, marginTop: 1 },
  toggle:        { width: 42, height: 22, borderRadius: 11, backgroundColor: colors.border, justifyContent: 'center', paddingHorizontal: 2 },
  toggleOn:      { backgroundColor: colors.primary },
  toggleDisabled:{ opacity: 0.4 },
  thumb:         { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.white },
  thumbOn:       { transform: [{ translateX: 20 }] },
});

// ─── Screen ───────────────────────────────────────────────────────────────────
type Tab = 'cohosts' | 'marketplace';

const HostCoHostScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { t } = useTranslation();

  // Build translated config arrays inside the component
  const PERMISSION_CONFIG: {
    key: keyof CoHostPermissions;
    label: string;
    sub: string;
    icon: React.ComponentProps<typeof MaterialIcons>['name'];
  }[] = [
    { key: 'calendar',      label: t('hostCoHost.permCalendar'),     sub: t('hostCoHost.permCalendarSub'),      icon: 'calendar-today' },
    { key: 'reservations',  label: t('hostCoHost.permReservations'),  sub: t('hostCoHost.permReservationsSub'),  icon: 'event-available' },
    { key: 'messages',      label: t('hostCoHost.permMessages'),      sub: t('hostCoHost.permMessagesSub'),      icon: 'chat-bubble-outline' },
    { key: 'pricing',       label: t('hostCoHost.permPricing'),       sub: t('hostCoHost.permPricingSub'),       icon: 'sell' },
    { key: 'revenue_view',  label: t('hostCoHost.permRevenue'),       sub: t('hostCoHost.permRevenueSub'),       icon: 'bar-chart' },
    { key: 'reviews',       label: t('hostCoHost.permReviews'),       sub: t('hostCoHost.permReviewsSub'),       icon: 'star-outline' },
    { key: 'guest_info',    label: t('hostCoHost.permGuestInfo'),     sub: t('hostCoHost.permGuestInfoSub'),     icon: 'person-outline' },
  ];

  const REVENUE_TYPES: { key: RevenueShareType; label: string; sub: string }[] = [
    { key: 'PERCENTAGE',        label: t('hostCoHost.revenuePercentage'),   sub: '5 % – 25 % du loyer net' },
    { key: 'FIXED_PER_BOOKING', label: t('hostCoHost.revenueFixedBooking'), sub: 'Par contrat signé' },
    { key: 'FIXED_MONTHLY',     label: t('hostCoHost.revenueFixedMonthly'), sub: "Indépendant du taux d'occupation" },
  ];

  const STATUS_CONFIG: Record<
    CoHost['status'],
    { label: string; color: string; bg: string }
  > = {
    PENDING:    { label: t('hostCoHost.statusPending'),    color: colors.warning,    bg: colors.warning + '18' },
    ACTIVE:     { label: t('hostCoHost.statusActive'),     color: colors.success,    bg: colors.success + '18' },
    SUSPENDED:  { label: t('hostCoHost.statusSuspended'),  color: colors.error,      bg: colors.error   + '14' },
    TERMINATED: { label: t('hostCoHost.statusTerminated'), color: colors.inkDisabled, bg: colors.surfaceSunken },
  };

  const [tab, setTab] = useState<Tab>('cohosts');
  const [coHosts, setCoHosts] = useState<CoHost[]>([]);
  const [candidates, setCandidates] = useState<CoHostCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Invite modal ────────────────────────────────────────────────────────────
  const [inviteVisible, setInviteVisible] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePerms, setInvitePerms] = useState<CoHostPermissions>(DEFAULT_PERMISSIONS);
  const [inviteRevenueType, setInviteRevenueType] = useState<RevenueShareType>('PERCENTAGE');
  const [inviteRevenueValue, setInviteRevenueValue] = useState(10);
  const [inviting, setInviting] = useState(false);
  const [ownedListings, setOwnedListings] = useState<{id: string; title: string}[]>([]);
  const [selectedListingIds, setSelectedListingIds] = useState<string[]>([]);

  // ── Permissions modal ───────────────────────────────────────────────────────
  const [editTarget, setEditTarget] = useState<CoHost | null>(null);
  const [editPerms, setEditPerms] = useState<CoHostPermissions>(DEFAULT_PERMISSIONS);
  const [savingPerms, setSavingPerms] = useState(false);

  // ── Terminate confirm ───────────────────────────────────────────────────────
  const [terminateTarget, setTerminateTarget] = useState<CoHost | null>(null);
  const [terminating, setTerminating] = useState(false);

  // ─── Load ─────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'cohosts') {
        const data = await cohostService.getCoHosts();
        setCoHosts(Array.isArray(data) ? data : []);
        setOwnedListings(await cohostService.getOwnedListings());
      } else {
        const data = await cohostService.getMarketplace();
        setCandidates(Array.isArray(data) ? data : []);
      }
    } catch {
      setError('Impossible de charger les données');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  // ─── Invite ────────────────────────────────────────────────────────────────
  const handleInvite = async () => {
    if (!inviteEmail.trim() || !selectedListingIds.length) return;
    setError(null);
    setInviting(true);
    try {
      const payload: InviteCoHostPayload = {
        email: inviteEmail.trim(),
        listingIds: selectedListingIds,
        permissions: invitePerms,
        revenueShareType: inviteRevenueType,
        revenueShareValue: inviteRevenueValue,
      };
      await cohostService.invite(payload);
      setInviteVisible(false);
      setInviteEmail('');
      setInvitePerms(DEFAULT_PERMISSIONS);
      load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Invitation impossible. Réessayez.'); } finally {
      setInviting(false);
    }
  };

  // ─── Update permissions ────────────────────────────────────────────────────
  const handleSavePerms = async () => {
    if (!editTarget) return;
    setSavingPerms(true);
    try {
      await cohostService.updatePermissions(editTarget.id, editPerms);
      setCoHosts(prev =>
        prev.map(c => c.id === editTarget.id ? { ...c, permissions: editPerms, status: 'PENDING' } : c),
      );
      setEditTarget(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Modification impossible. Réessayez.'); } finally {
      setSavingPerms(false);
    }
  };

  // ─── Terminate ─────────────────────────────────────────────────────────────
  const handleTerminate = async () => {
    if (!terminateTarget) return;
    setTerminating(true);
    try {
      await cohostService.terminate(terminateTarget.id);
      setCoHosts(prev => prev.filter(c => c.id !== terminateTarget.id));
      setTerminateTarget(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Résiliation impossible. Réessayez.'); } finally {
      setTerminating(false);
    }
  };

  // ─── Render co-host card ───────────────────────────────────────────────────
  const renderCoHostCard = (item: CoHost) => {
    const sc = STATUS_CONFIG[item.status];
    const activePermsCount = Object.values(item.permissions).filter(Boolean).length;
    return (
      <View key={item.id}>
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Avatar name={item.coHostName} size={46} />
            <View style={{ flex: 1 }}>
              <Text style={s.cardName}>{item.coHostName}</Text>
              <Text style={s.cardEmail}>{item.coHostEmail}</Text>
              <Text style={s.cardListings} numberOfLines={1}>
                {item.listingTitles.join(', ')}
              </Text>
            </View>
            <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
              <Text style={[s.statusTxt, { color: sc.color }]}>{sc.label}</Text>
            </View>
          </View>

          {/* Revenue & perms summary */}
          <View style={s.cardMeta}>
            <View style={s.metaChip}>
              <MaterialIcons name="payments" size={13} color={colors.inkSubtle} />
              <Text style={s.metaTxt}>
                {item.revenueShareType === 'PERCENTAGE'
                  ? `${item.revenueShareValue}% des revenus`
                  : item.revenueShareType === 'FIXED_MONTHLY'
                  ? `${formatRWF(item.revenueShareValue)}/mois`
                  : `${formatRWF(item.revenueShareValue)}/réservation`}
              </Text>
            </View>
            <View style={s.metaChip}>
              <MaterialIcons name="lock-open" size={13} color={colors.inkSubtle} />
              <Text style={s.metaTxt}>{activePermsCount} permissions</Text>
            </View>
            {item.probationEnd && (
              <View style={[s.metaChip, { backgroundColor: colors.warning + '14' }]}>
                <MaterialIcons name="timer" size={13} color={colors.warning} />
                <Text style={[s.metaTxt, { color: colors.warning }]}>{t('hostCoHost.probation')}</Text>
              </View>
            )}
          </View>

          {/* Actions */}
          {item.status === 'PENDING' && item.received && (
            <View style={s.cardActions}>
              <Text style={s.cardListings}>Permissions proposées : {item.permissions.calendar ? 'calendrier ' : ''}{item.permissions.reviews ? 'réponses aux avis' : ''}. Rémunération convenue entre les parties, sans versement automatique.</Text>
              {[true, false].map(accept => <TouchableOpacity key={String(accept)} style={s.outlineBtn} onPress={async () => {
                try { await cohostService.respond(item.id, accept); await load(); }
                catch (cause) { setError(cause instanceof Error ? cause.message : 'Réponse impossible.'); }
              }}><Text style={s.outlineTxt}>{accept ? 'Accepter' : 'Refuser'}</Text></TouchableOpacity>)}
            </View>
          )}
          {item.status === 'ACTIVE' && (
            <View style={s.cardActions}>
              {item.received && item.permissions.calendar && item.listingIds.map(id => <TouchableOpacity key={id} style={s.outlineBtn} onPress={() => navigation.navigate('HostCalendar', {propertyId: id})}><Text style={s.outlineTxt}>Calendrier · {id.slice(0,8)}</Text></TouchableOpacity>)}
              {!item.received && <TouchableOpacity
                style={s.outlineBtn}
                onPress={() => { setEditTarget(item); setEditPerms(item.permissions); }}
                activeOpacity={0.8}
              >
                <MaterialIcons name="tune" size={14} color={colors.inkMid} />
                <Text style={s.outlineTxt}>Permissions</Text>
              </TouchableOpacity>}
              <TouchableOpacity
                style={[s.outlineBtn, s.outlineBtnDanger]}
                onPress={() => setTerminateTarget(item)}
                activeOpacity={0.8}
              >
                <MaterialIcons name="link-off" size={14} color={colors.error} />
                <Text style={[s.outlineTxt, { color: colors.error }]}>{t('hostCoHost.terminate')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  // ─── Render candidate card ─────────────────────────────────────────────────
  const renderCandidateCard = (item: CoHostCandidate) => (
    <View key={item.id}>
      <View style={s.card}>
        <View style={s.cardHeader}>
          <Avatar name={item.name} size={46} />
          <View style={{ flex: 1 }}>
            <Text style={s.cardName}>{item.name}</Text>
            <View style={s.candidateMeta}>
              <MaterialIcons name="location-on" size={12} color={colors.inkSubtle} />
              <Text style={s.candidateMetaTxt}>{item.city}</Text>
              {item.avgRating != null && (
                <>
                  <MaterialIcons name="star" size={12} color={colors.warning} />
                  <Text style={s.candidateMetaTxt}>{item.avgRating.toFixed(1)}</Text>
                </>
              )}
            </View>
            <Text style={s.candidateLangs}>{item.languages.join(' · ')}</Text>
          </View>
          <View style={[
            s.availBadge,
            { backgroundColor: item.availableNow ? colors.success + '18' : colors.surfaceSunken },
          ]}>
            <View style={[s.availDot, { backgroundColor: item.availableNow ? colors.success : colors.inkDisabled }]} />
            <Text style={[s.availTxt, { color: item.availableNow ? colors.success : colors.inkDisabled }]}>
              {item.availableNow ? t('hostCoHost.available') : t('hostCoHost.busy')}
            </Text>
          </View>
        </View>

        {item.bio && (
          <Text style={s.candidateBio} numberOfLines={2}>{item.bio}</Text>
        )}

        <View style={s.candidateStats}>
          <Text style={s.candidateStatsTxt}>
            {item.completedCoHostings} co-hôtage{item.completedCoHostings > 1 ? 's' : ''} réalisé{item.completedCoHostings > 1 ? 's' : ''}
          </Text>
        </View>

        <TouchableOpacity
          style={s.inviteFromMarketBtn}
          onPress={() => { setInviteVisible(true); }}
          activeOpacity={0.85}
        >
          <MaterialIcons name="person-add" size={14} color={colors.white} />
          <Text style={s.inviteFromMarketTxt}>{t('hostCoHost.inviteFromDirectory')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ─── Main render ───────────────────────────────────────────────────────────
  return (
    <HostPage scroll={false}><View style={s.root}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
        <HostHeader title={t('hostCoHost.title')} subtitle={t('hostCoHost.subtitle')} onBack={() => navigation.goBack()} />
<TouchableOpacity
          accessibilityRole="button"
          style={[s.inviteBtn, { alignSelf: 'flex-start', marginBottom: 16, minHeight: 48 }]}
          onPress={() => setInviteVisible(true)}
          activeOpacity={0.85}
        >
          <MaterialIcons name="person-add" size={16} color={colors.white} />
          <Text style={s.inviteBtnTxt}>{t('hostCoHost.invite')}</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        <TouchableOpacity
          style={[s.tab, tab === 'cohosts' && s.tabActive]}
          onPress={() => setTab('cohosts')}
          activeOpacity={0.8}
        >
          <Text style={[s.tabTxt, tab === 'cohosts' && s.tabTxtActive]}>{t('hostCoHost.tabMine')}</Text>
          {coHosts.filter(c => c.status === 'ACTIVE').length > 0 && (
            <View style={s.tabBadge}>
              <Text style={s.tabBadgeTxt}>
                {coHosts.filter(c => c.status === 'ACTIVE').length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, tab === 'marketplace' && s.tabActive]}
          disabled
          activeOpacity={0.8}
        >
          <Text style={s.tabTxt}>Annuaire indisponible</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <ContentSkeleton style={{ paddingHorizontal: 20 }} />
      ) : error ? (
        <View style={s.centered}>
          <MaterialIcons name="cloud-off" size={36} color={colors.inkDisabled} />
          <Text style={s.errorTxt}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={load} activeOpacity={0.8}>
            <Text style={s.retryTxt}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
        >
          {tab === 'cohosts' ? (
            coHosts.length === 0 ? (
              <View style={s.emptyCard}>
                <MaterialIcons name="group" size={40} color={colors.inkDisabled} />
                <Text style={s.emptyTitle}>{t('hostCoHost.empty')}</Text>
                <Text style={s.emptySubtitle}>
                  {t('hostCoHost.emptySubtitle')}
                </Text>
                <TouchableOpacity
                  style={s.emptyInviteBtn}
                  onPress={() => setInviteVisible(true)}
                  activeOpacity={0.85}
                >
                  <MaterialIcons name="person-add" size={16} color={colors.white} />
                  <Text style={s.inviteBtnTxt}>{t('hostCoHost.inviteBtn')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              coHosts.map(renderCoHostCard)
            )
          ) : (
            candidates.length === 0 ? (
              <View style={s.emptyCard}>
                <MaterialIcons name="search" size={40} color={colors.inkDisabled} />
                <Text style={s.emptyTitle}>{t('hostCoHost.directoryEmpty')}</Text>
                <Text style={s.emptySubtitle}>
                  {t('hostCoHost.directoryEmptySubtitle')}
                </Text>
              </View>
            ) : (
              candidates.map(renderCandidateCard)
            )
          )}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}

      {/* ── Invite modal ────────────────────────────────────────────────────── */}
      <Modal
        visible={inviteVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setInviteVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            style={m.overlay}
            activeOpacity={1}
            onPress={() => setInviteVisible(false)}
          >
            <View
              style={m.sheet}
              onStartShouldSetResponder={() => true}
            >
              <View style={m.handle} />
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={m.title}>{t('hostCoHost.inviteTitle')}</Text>
                {error && <Text style={{color: colors.error}}>{error}</Text>}

                {/* Email */}
                <Text style={m.sectionLabel}>{t('hostCoHost.emailLabel')}</Text>
                <View style={m.inputWrap}>
                  <MaterialIcons name="email" size={16} color={colors.inkSubtle} />
                  <TextInput
                    style={m.input}
                    value={inviteEmail}
                    onChangeText={setInviteEmail}
                    placeholder="exemple@gmail.com"
                    placeholderTextColor={colors.inkSubtle}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                {/* Permissions */}
                <Text style={[m.sectionLabel, { marginTop: 20 }]}>Logements concernés</Text>
                {ownedListings.map(listing => <TouchableOpacity key={listing.id} style={m.revenueRow} onPress={() => setSelectedListingIds(ids => ids.includes(listing.id) ? ids.filter(id => id !== listing.id) : [...ids, listing.id])} accessibilityRole="checkbox" accessibilityState={{checked: selectedListingIds.includes(listing.id)}}>
                  <MaterialIcons name={selectedListingIds.includes(listing.id) ? 'check-box' : 'check-box-outline-blank'} size={22} color={colors.primary} />
                  <Text style={{flex: 1}}>{listing.title || 'Brouillon'}</Text>
                </TouchableOpacity>)}
                {!ownedListings.length && <Text>Créez un logement avant d’inviter un co-hôte.</Text>}
                <Text style={[m.sectionLabel, { marginTop: 20 }]}>{t('hostCoHost.permissionsLabel')}</Text>
                <Text>Calendrier et réponses aux avis disponibles. Les autres accès ne sont pas encore pris en charge.</Text>
                <View style={m.permsCard}>
                  {PERMISSION_CONFIG.map((pc, i) => (
                    <View key={pc.key}>
                      <PermissionToggle
                        pkey={pc.key}
                        enabled={invitePerms[pc.key]}
                        label={pc.label}
                        sub={pc.sub}
                        icon={pc.icon}
                        disabled={!['calendar', 'reviews'].includes(pc.key)}
                        onToggle={key =>
                          setInvitePerms(prev => ({ ...prev, [key]: !prev[key] }))
                        }
                      />
                      {i < PERMISSION_CONFIG.length - 1 && <View style={m.divider} />}
                    </View>
                  ))}
                </View>

                {/* Revenue share type */}
                <Text style={[m.sectionLabel, { marginTop: 20 }]}>{t('hostCoHost.revenueLabel')}</Text>
                {REVENUE_TYPES.map(rt => (
                  <TouchableOpacity
                    key={rt.key}
                    style={[m.revenueRow, inviteRevenueType === rt.key && m.revenueRowActive]}
                    onPress={() => setInviteRevenueType(rt.key)}
                    activeOpacity={0.8}
                  >
                    <View style={m.radio}>
                      {inviteRevenueType === rt.key && <View style={m.radioInner} />}
                    </View>
                    <View>
                      <Text style={m.revenueLabel}>{rt.label}</Text>
                      <Text style={m.revenueSub}>{rt.sub}</Text>
                    </View>
                  </TouchableOpacity>
                ))}

                {/* Revenue value stepper */}
                <View style={m.valueRow}>
                  <Text style={m.valueLabel}>
                    {inviteRevenueType === 'PERCENTAGE'
                      ? t('hostCoHost.revenuePercentageLabel')
                      : t('hostCoHost.revenueAmountLabel')}
                  </Text>
                  <View style={m.stepper}>
                    <TouchableOpacity
                      style={m.stepBtn}
                      onPress={() => setInviteRevenueValue(v =>
                        inviteRevenueType === 'PERCENTAGE'
                          ? Math.max(5, v - 1)
                          : Math.max(5000, v - 5000),
                      )}
                    >
                      <MaterialIcons name="remove" size={16} color={colors.inkMid} />
                    </TouchableOpacity>
                    <Text style={m.stepValue}>
                      {inviteRevenueType === 'PERCENTAGE'
                        ? `${inviteRevenueValue}%`
                        : formatRWF(inviteRevenueValue)}
                    </Text>
                    <TouchableOpacity
                      style={m.stepBtn}
                      onPress={() => setInviteRevenueValue(v =>
                        inviteRevenueType === 'PERCENTAGE'
                          ? Math.min(25, v + 1)
                          : v + 5000,
                      )}
                    >
                      <MaterialIcons name="add" size={16} color={colors.inkMid} />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text>Ces conditions seront présentées au co-hôte pour accord. LocaMap ne réalise aucun versement automatique.</Text>

                {/* CTA */}
                <TouchableOpacity
                  style={[m.sendBtn, (!inviteEmail.trim() || inviting) && m.sendBtnDisabled]}
                  onPress={handleInvite}
                  disabled={!inviteEmail.trim() || !selectedListingIds.length || inviting}
                  activeOpacity={0.85}
                >
                  {inviting
                    ? <ActivityIndicator size="small" color={colors.white} />
                    : (
                      <>
                        <MaterialIcons name="send" size={16} color={colors.white} />
                        <Text style={m.sendBtnTxt}>{t('hostCoHost.sendInvite')}</Text>
                      </>
                    )
                  }
                </TouchableOpacity>
                <View style={{ height: 32 }} />
              </ScrollView>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Edit permissions modal ───────────────────────────────────────────── */}
      <Modal
        visible={editTarget !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setEditTarget(null)}
      >
        <TouchableOpacity
          style={m.overlay}
          activeOpacity={1}
          onPress={() => setEditTarget(null)}
        >
          <View
            style={m.sheet}
            onStartShouldSetResponder={() => true}
          >
            <View style={m.handle} />
            {error && <Text style={{color: colors.error}}>{error}</Text>}
            <Text style={m.title}>
              {t('hostCoHost.editPermissionsTitle', { name: editTarget?.coHostName })}
            </Text>
            <View style={[m.permsCard, { marginBottom: 16 }]}>
              {PERMISSION_CONFIG.map((pc, i) => (
                <View key={pc.key}>
                  <PermissionToggle
                    pkey={pc.key}
                    enabled={editPerms[pc.key]}
                    label={pc.label}
                    sub={pc.sub}
                    icon={pc.icon}
                    disabled={!['calendar', 'reviews'].includes(pc.key)}
                    onToggle={key =>
                      setEditPerms(prev => ({ ...prev, [key]: !prev[key] }))
                    }
                  />
                  {i < PERMISSION_CONFIG.length - 1 && <View style={m.divider} />}
                </View>
              ))}
            </View>
            <TouchableOpacity
              style={[m.sendBtn, savingPerms && m.sendBtnDisabled]}
              onPress={handleSavePerms}
              disabled={savingPerms}
              activeOpacity={0.85}
            >
              {savingPerms
                ? <ActivityIndicator size="small" color={colors.white} />
                : <Text style={m.sendBtnTxt}>{t('hostCoHost.savePermissions')}</Text>
              }
            </TouchableOpacity>
            <View style={{ height: 32 }} />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Terminate confirm modal ──────────────────────────────────────────── */}
      <Modal
        visible={terminateTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setTerminateTarget(null)}
      >
        <View style={tc.overlay}>
          <View style={tc.card}>
            <MaterialIcons name="link-off" size={32} color={colors.error} style={{ marginBottom: 12 }} />
            <Text style={tc.title}>{t('hostCoHost.terminateTitle')}</Text>
            <Text style={tc.body}>
              {t('hostCoHost.terminateBody', { name: terminateTarget?.coHostName })}
            </Text>
            <View style={tc.actions}>
              <TouchableOpacity
                style={tc.cancelBtn}
                onPress={() => setTerminateTarget(null)}
                activeOpacity={0.8}
              >
                <Text style={tc.cancelTxt}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[tc.confirmBtn, terminating && { opacity: 0.6 }]}
                onPress={handleTerminate}
                disabled={terminating}
                activeOpacity={0.85}
              >
                {terminating
                  ? <ActivityIndicator size="small" color={colors.white} />
                  : <Text style={tc.confirmTxt}>{t('hostCoHost.terminate')}</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View></HostPage>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:     { flex: 1, backgroundColor: colors.background, width: '100%', maxWidth: 760, alignSelf: 'center' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  errorTxt: { fontSize: 14, color: colors.inkSubtle, textAlign: 'center' },
  retryBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, borderWidth: 1.5, borderColor: colors.primary },
  retryTxt: { fontSize: 14, fontWeight: '600', color: colors.primary },

  header:     { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 16 },
  title:      { fontSize: 24, fontWeight: '700', color: colors.ink, letterSpacing: -0.4 },
  subtitle:   { fontSize: 13, color: colors.inkSubtle, marginTop: 2 },
  inviteBtn:  { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  inviteBtnTxt: { fontSize: 13, fontWeight: '700', color: colors.white },

  tabs:         { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, marginBottom: 12, gap: 6 },
  tab:          { flexGrow: 1, flexBasis: 85, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  tabActive:    { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  tabTxt:       { fontSize: 13, fontWeight: '600', color: colors.inkSubtle },
  tabTxtActive: { color: colors.primary },
  tabBadge:     { backgroundColor: colors.primary, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  tabBadgeTxt:  { fontSize: 9, fontWeight: '700', color: colors.white },

  scroll: { paddingHorizontal: 20 },

  card:        {
    backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border,
    marginBottom: 14, overflow: 'hidden',
    ...Platform.select({
      ios:     { shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  cardHeader:  { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14 },
  cardName:    { fontSize: 15, fontWeight: '700', color: colors.ink },
  cardEmail:   { fontSize: 12, color: colors.inkSubtle, marginTop: 1 },
  cardListings:{ fontSize: 12, color: colors.primary, marginTop: 2 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusTxt:   { fontSize: 11, fontWeight: '700' },
  cardMeta:    { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingBottom: 12, flexWrap: 'wrap' },
  metaChip:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surfaceSunken, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  metaTxt:     { fontSize: 13, color: colors.inkSubtle, fontWeight: '500' },
  cardActions: { flexDirection: 'row', gap: 8, padding: 14, borderTopWidth: 1, borderTopColor: colors.border, flexWrap: 'wrap' },
  outlineBtn:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: colors.border },
  outlineBtnDanger: { borderColor: colors.error + '66' },
  outlineTxt:  { fontSize: 12, fontWeight: '600', color: colors.inkMid },

  candidateMeta:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  candidateMetaTxt:  { fontSize: 12, color: colors.inkSubtle },
  candidateLangs:    { fontSize: 11, color: colors.primary, marginTop: 3, fontWeight: '500' },
  candidateBio:      { fontSize: 13, color: colors.inkMid, paddingHorizontal: 14, paddingBottom: 8, lineHeight: 18 },
  candidateStats:    { paddingHorizontal: 14, paddingBottom: 10 },
  candidateStatsTxt: { fontSize: 12, color: colors.inkSubtle },
  availBadge:        { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  availDot:          { width: 7, height: 7, borderRadius: 4 },
  availTxt:          { fontSize: 11, fontWeight: '600' },
  inviteFromMarketBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, margin: 14, marginTop: 4, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 12 },
  inviteFromMarketTxt: { fontSize: 13, fontWeight: '700', color: colors.white },

  emptyCard:     { alignItems: 'center', padding: 24, backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, gap: 10, marginTop: 8 },
  emptyTitle:    { fontSize: 16, fontWeight: '700', color: colors.ink },
  emptySubtitle: { fontSize: 13, color: colors.inkSubtle, textAlign: 'center', lineHeight: 19, maxWidth: 260 },
  emptyInviteBtn:{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 20, marginTop: 4 },
});

// Modal styles
const m = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(15,31,31,0.45)', justifyContent: 'flex-end' },
  sheet:      { backgroundColor: colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, maxHeight: '90%', width: '100%', maxWidth: 760, alignSelf: 'center' },
  handle:     { width: 36, height: 3, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 },
  title:      { fontSize: 18, fontWeight: '700', color: colors.ink, marginBottom: 20 },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: colors.inkSubtle,   marginBottom: 8 },
  inputWrap:  { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surfaceSunken, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 4 },
  input:      { flex: 1, fontSize: 14, color: colors.ink, padding: 0 },
  permsCard:  { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  divider:    { height: 1, backgroundColor: colors.border, marginLeft: 62 },
  revenueRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 10, marginBottom: 6, borderWidth: 1.5, borderColor: colors.border },
  revenueRowActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  radio:      { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  revenueLabel: { fontSize: 14, fontWeight: '600', color: colors.ink },
  revenueSub:   { fontSize: 13, color: colors.inkSubtle, marginTop: 1 },
  valueRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  valueLabel: { fontSize: 13, fontWeight: '600', color: colors.inkMid },
  stepper:    { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceSunken, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, overflow: 'hidden' },
  stepBtn:    { width: 36, height: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  stepValue:  { minWidth: 80, textAlign: 'center', fontSize: 14, fontWeight: '700', color: colors.ink },
  sendBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, marginTop: 16 },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnTxt: { fontSize: 15, fontWeight: '700', color: colors.white },
});

// Terminate confirm styles
const tc = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(15,31,31,0.5)', justifyContent: 'center', padding: 24 },
  card:       { backgroundColor: colors.surface, borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  title:      { fontSize: 17, fontWeight: '700', color: colors.ink, marginBottom: 10, textAlign: 'center' },
  body:       { fontSize: 14, color: colors.inkMid, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  actions:    { flexDirection: 'row', gap: 12, width: '100%' },
  cancelBtn:  { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center' },
  cancelTxt:  { fontSize: 14, fontWeight: '600', color: colors.inkMid },
  confirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: colors.error, alignItems: 'center' },
  confirmTxt: { fontSize: 14, fontWeight: '700', color: colors.white },
});

export default HostCoHostScreen;
