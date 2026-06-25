import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
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
import { colors, borderRadius } from '../theme';
import { RootStackParamList } from '../types';
import { hostService, ListingCard, ListingStatus } from '../services/api';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  ListingStatus,
  { label: string; color: string; bg: string; icon: React.ComponentProps<typeof MaterialIcons>['name'] }
> = {
  ACTIVE:         { label: 'Actif',           color: colors.success,    bg: colors.success + '18',    icon: 'radio-button-checked' },
  DRAFT:          { label: 'Brouillon',        color: colors.inkSubtle,  bg: colors.surfaceSunken,     icon: 'edit' },
  PENDING_REVIEW: { label: 'En vérification',  color: colors.warning,    bg: colors.warning + '18',    icon: 'hourglass-empty' },
  PAUSED:         { label: 'En pause',         color: colors.inkMid,     bg: colors.border,             icon: 'pause-circle-outline' },
  SUSPENDED:      { label: 'Suspendue',        color: colors.error,      bg: colors.error + '14',      icon: 'block' },
  ARCHIVED:       { label: 'Archivée',         color: colors.inkDisabled, bg: colors.surfaceSunken,    icon: 'archive' },
};

const formatFC = (n: number | null | undefined) =>
  typeof n === 'number' ? n.toLocaleString('fr-FR') + ' FC' : '—';

// ─── Completion bar ───────────────────────────────────────────────────────────
const CompletionBar = ({ score }: { score: number }) => (
  <View style={cb.track}>
    <View style={[cb.fill, { width: `${Math.min(score, 100)}%` as `${number}%` }]} />
  </View>
);
const cb = StyleSheet.create({
  track: { height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' },
  fill:  { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
});

// ─── Delete confirmation modal ────────────────────────────────────────────────
const DeleteModal = ({
  visible,
  title,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
}) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
    <View style={dm.overlay}>
      <View style={dm.card}>
        <MaterialIcons name="warning" size={32} color={colors.error} style={{ marginBottom: 12 }} />
        <Text style={dm.title}>Archiver cette annonce ?</Text>
        <Text style={dm.body}>
          <Text style={{ fontWeight: '700' }}>{title}</Text>
          {' '}sera retirée de la recherche. Cette action est irréversible.
        </Text>
        <View style={dm.actions}>
          <TouchableOpacity style={dm.cancelBtn} onPress={onCancel} activeOpacity={0.8}>
            <Text style={dm.cancelTxt}>Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity style={dm.confirmBtn} onPress={onConfirm} activeOpacity={0.8}>
            <Text style={dm.confirmTxt}>Archiver</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);
const dm = StyleSheet.create({
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

// ─── Listing card ─────────────────────────────────────────────────────────────
const ListingCardView = ({
  item,
  onToggleStatus,
  onArchive,
  onEdit,
  onCalendar,
  toggling,
}: {
  item: ListingCard;
  onToggleStatus: (id: string, current: ListingStatus) => void;
  onArchive: (item: ListingCard) => void;
  onEdit: (id: string) => void;
  onCalendar: (id: string) => void;
  toggling: boolean;
}) => {
  const sc = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.DRAFT;
  const isDraft = item.status === 'DRAFT';
  const isActive = item.status === 'ACTIVE';
  const isPaused = item.status === 'PAUSED';
  const canToggle = isActive || isPaused;
  const isSuspended = item.status === 'SUSPENDED';

  return (
    <View style={lc.card}>
      {/* Cover photo */}
      <View style={lc.photoWrap}>
        {item.coverPhotoUrl ? (
          <Image source={{ uri: item.coverPhotoUrl }} style={lc.photo} resizeMode="cover" />
        ) : (
          <View style={lc.photoPlaceholder}>
            <MaterialIcons name="add-photo-alternate" size={28} color={colors.inkDisabled} />
            <Text style={lc.photoPlaceholderTxt}>Ajouter des photos</Text>
          </View>
        )}

        {/* Status badge overlay */}
        <View style={[lc.statusBadge, { backgroundColor: sc.bg }]}>
          <MaterialIcons name={sc.icon} size={12} color={sc.color} />
          <Text style={[lc.statusBadgeTxt, { color: sc.color }]}>{sc.label}</Text>
        </View>
      </View>

      {/* Content */}
      <View style={lc.content}>
        <Text style={lc.title} numberOfLines={2}>{item.title}</Text>
        <Text style={lc.city}>{item.city}</Text>

        {/* Draft: completion bar */}
        {isDraft ? (
          <View style={lc.draftSection}>
            <View style={lc.completionRow}>
              <Text style={lc.completionTxt}>Complétude</Text>
              <Text style={lc.completionPct}>{item.completionScore}%</Text>
            </View>
            <CompletionBar score={item.completionScore} />
            {item.completionScore < 90 && (
              <Text style={lc.completionHint}>
                {90 - item.completionScore} pts manquants pour publier
              </Text>
            )}
          </View>
        ) : (
          /* Active/Paused: price + stats row */
          <View style={lc.statsRow}>
            {item.pricePerNight != null && (
              <View style={lc.statChip}>
                <Text style={lc.statValue}>{formatFC(item.pricePerNight)}</Text>
                <Text style={lc.statUnit}>/nuit</Text>
              </View>
            )}
            {item.avgRating != null && (
              <View style={lc.statChip}>
                <MaterialIcons name="star" size={13} color={colors.warning} />
                <Text style={lc.statValue}>
                  {item.avgRating.toFixed(1)}
                </Text>
                <Text style={lc.statUnit}>({item.reviewCount})</Text>
              </View>
            )}
            {item.occupancyRate != null && (
              <View style={lc.statChip}>
                <Text style={lc.statValue}>{Math.round(item.occupancyRate)}%</Text>
                <Text style={lc.statUnit}>occupation</Text>
              </View>
            )}
          </View>
        )}

        {/* Suspended notice */}
        {isSuspended && (
          <View style={lc.suspendedBanner}>
            <MaterialIcons name="info-outline" size={13} color={colors.error} />
            <Text style={lc.suspendedTxt}>Contactez le support pour réactiver</Text>
          </View>
        )}

        {/* Actions */}
        <View style={lc.actions}>
          {isDraft ? (
            <TouchableOpacity
              style={lc.ctaBtn}
              onPress={() => onEdit(item.id)}
              activeOpacity={0.8}
            >
              <Text style={lc.ctaTxt}>Continuer la configuration</Text>
              <MaterialIcons name="arrow-forward" size={14} color={colors.white} />
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={lc.outlineBtn}
                onPress={() => onEdit(item.id)}
                activeOpacity={0.8}
              >
                <MaterialIcons name="edit" size={14} color={colors.inkMid} />
                <Text style={lc.outlineTxt}>Modifier</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={lc.outlineBtn}
                onPress={() => onCalendar(item.id)}
                activeOpacity={0.8}
              >
                <MaterialIcons name="calendar-today" size={14} color={colors.inkMid} />
                <Text style={lc.outlineTxt}>Calendrier</Text>
              </TouchableOpacity>
              {canToggle && (
                <TouchableOpacity
                  style={[lc.toggleBtn, isActive ? lc.toggleBtnPause : lc.toggleBtnActivate]}
                  onPress={() => onToggleStatus(item.id, item.status)}
                  disabled={toggling}
                  activeOpacity={0.8}
                >
                  {toggling ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <>
                      <MaterialIcons
                        name={isActive ? 'pause' : 'play-arrow'}
                        size={14}
                        color={colors.white}
                      />
                      <Text style={lc.toggleTxt}>{isActive ? 'Pause' : 'Activer'}</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </>
          )}
          <TouchableOpacity
            style={lc.archiveBtn}
            onPress={() => onArchive(item)}
            activeOpacity={0.8}
          >
            <MaterialIcons name="delete-outline" size={18} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const lc = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios:     { shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  photoWrap: { height: 160, position: 'relative' },
  photo:     { width: '100%', height: '100%' },
  photoPlaceholder: {
    width: '100%', height: '100%',
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  photoPlaceholderTxt: { fontSize: 12, color: colors.inkDisabled },
  statusBadge: {
    position: 'absolute', top: 10, left: 10,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  statusBadgeTxt: { fontSize: 11, fontWeight: '700' },
  content:  { padding: 14 },
  title:    { fontSize: 15, fontWeight: '700', color: colors.ink, marginBottom: 3 },
  city:     { fontSize: 12, color: colors.inkSubtle, marginBottom: 10 },

  draftSection:   { marginBottom: 12 },
  completionRow:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  completionTxt:  { fontSize: 12, color: colors.inkSubtle },
  completionPct:  { fontSize: 12, fontWeight: '700', color: colors.primary },
  completionHint: { fontSize: 11, color: colors.warning, marginTop: 4 },

  statsRow:  { flexDirection: 'row', gap: 10, marginBottom: 12, flexWrap: 'wrap' },
  statChip:  { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statValue: { fontSize: 13, fontWeight: '700', color: colors.ink },
  statUnit:  { fontSize: 11, color: colors.inkSubtle },

  suspendedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.error + '10',
    borderRadius: 6, padding: 8, marginBottom: 10,
  },
  suspendedTxt: { fontSize: 12, color: colors.error },

  actions:  { flexDirection: 'row', gap: 8, alignItems: 'center' },
  ctaBtn:   {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, backgroundColor: colors.primary,
    borderRadius: 8, paddingVertical: 10,
  },
  ctaTxt:   { fontSize: 13, fontWeight: '700', color: colors.white },
  outlineBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10,
    backgroundColor: colors.surface,
  },
  outlineTxt: { fontSize: 12, fontWeight: '600', color: colors.inkMid },
  toggleBtn:  {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10,
  },
  toggleBtnPause:    { backgroundColor: colors.inkMid },
  toggleBtnActivate: { backgroundColor: colors.success },
  toggleTxt: { fontSize: 12, fontWeight: '700', color: colors.white },
  archiveBtn: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: colors.error + '12',
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 'auto',
  },
});

// ─── Screen ───────────────────────────────────────────────────────────────────
const HostListingsScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();

  const [listings, setListings] = useState<ListingCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ListingCard | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await hostService.getListings();
      setListings(Array.isArray(data) ? data : []);
    } catch {
      setError('Impossible de charger vos annonces');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleToggleStatus = async (id: string, current: ListingStatus) => {
    const next = current === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    setTogglingId(id);
    // Optimistic
    setListings(prev =>
      prev.map(l => l.id === id ? { ...l, status: next } : l),
    );
    try {
      await hostService.updateListingStatus(id, next);
    } catch {
      // Rollback
      setListings(prev =>
        prev.map(l => l.id === id ? { ...l, status: current } : l),
      );
    } finally {
      setTogglingId(null);
    }
  };

  const handleArchiveConfirm = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    setListings(prev => prev.filter(l => l.id !== id));
    try {
      await hostService.archiveListing(id);
    } catch {
      // Silently ignore — will re-appear on next refresh
    }
  };

  // ── Empty state ─────────────────────────────────────────────────────────────
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
        <Text style={s.errorTxt}>{error}</Text>
        <TouchableOpacity style={s.retryBtn} onPress={load} activeOpacity={0.8}>
          <Text style={s.retryTxt}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (listings.length === 0) {
    return (
      <View style={s.centered}>
        <View style={s.emptyIcon}>
          <MaterialIcons name="home-work" size={40} color={colors.primary} />
        </View>
        <Text style={s.emptyTitle}>Aucune annonce</Text>
        <Text style={s.emptySubtitle}>
          Créez votre première annonce pour commencer à recevoir des voyageurs.
        </Text>
        <TouchableOpacity
          style={s.createBtn}
          onPress={() => navigation.navigate('CreateListing')}
          activeOpacity={0.85}
        >
          <MaterialIcons name="add" size={18} color={colors.white} />
          <Text style={s.createBtnTxt}>Créer une annonce</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingTop: insets.top + 20 }]}
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
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(340)} style={s.header}>
          <View>
            <Text style={s.headerTitle}>Mes annonces</Text>
            <Text style={s.headerCount}>{listings.length} logement{listings.length > 1 ? 's' : ''}</Text>
          </View>
          <TouchableOpacity
            style={s.newBtn}
            onPress={() => navigation.navigate('CreateListing')}
            activeOpacity={0.85}
          >
            <MaterialIcons name="add" size={18} color={colors.white} />
            <Text style={s.newBtnTxt}>Nouvelle</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Cards */}
        {listings.map((item, i) => (
          <Animated.View
            key={item.id}
            entering={FadeInDown.delay(i * 60).duration(320)}
          >
            <ListingCardView
              item={item}
              onToggleStatus={handleToggleStatus}
              onArchive={setDeleteTarget}
              onEdit={() => navigation.navigate('CreateListing')}
              onCalendar={() => {/* switch calendar tab — handled by parent */}}
              toggling={togglingId === item.id}
            />
          </Animated.View>
        ))}

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* Delete confirmation */}
      <DeleteModal
        visible={deleteTarget !== null}
        title={deleteTarget?.title ?? ''}
        onConfirm={handleArchiveConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: 20 },
  centered: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 32, gap: 12,
  },
  errorTxt:  { fontSize: 14, color: colors.inkSubtle, textAlign: 'center' },
  retryBtn:  { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, borderWidth: 1.5, borderColor: colors.primary },
  retryTxt:  { fontSize: 14, fontWeight: '600', color: colors.primary },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle:    { fontSize: 18, fontWeight: '700', color: colors.ink },
  emptySubtitle: { fontSize: 14, color: colors.inkSubtle, textAlign: 'center', lineHeight: 20, maxWidth: 260 },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primary,
    borderRadius: 10, paddingVertical: 13, paddingHorizontal: 24,
    marginTop: 4,
  },
  createBtnTxt: { fontSize: 15, fontWeight: '700', color: colors.white },

  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: colors.ink, letterSpacing: -0.4 },
  headerCount: { fontSize: 13, color: colors.inkSubtle, marginTop: 2 },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.primary,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
  },
  newBtnTxt: { fontSize: 13, fontWeight: '700', color: colors.white },
});

export default HostListingsScreen;
