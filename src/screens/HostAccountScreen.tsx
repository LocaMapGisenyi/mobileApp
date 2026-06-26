import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  StatusBar,
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
import {
  hostAccountService,
  PayoutAccount,
  PayoutType,
  NotificationPrefs,
  KycStatus,
} from '../services/api';
import { SectionHeader, RowItem, NotifRow, DeleteAccountModal } from '../components/account';

type Nav = NativeStackNavigationProp<RootStackParamList, 'HostAccount'>;

// ─── Constants ────────────────────────────────────────────────────────────────
const PAYOUT_TYPES: { type: PayoutType; label: string; prefix: string; color: string }[] = [
  { type: 'MTN_MOMO',      label: 'MTN MoMo',       prefix: '+250 7',  color: '#FFCC00' },
  { type: 'AIRTEL_MONEY',  label: 'Airtel Money',    prefix: '+250 7',  color: '#E4002B' },
  { type: 'M_PESA',        label: 'M-Pesa',          prefix: '+250 7',  color: '#00A651' },
  { type: 'BANK_TRANSFER', label: 'Virement bancaire', prefix: '',      color: colors.primary },
];

type KycConfig = Record<KycStatus, { label: string; color: string; bg: string; icon: React.ComponentProps<typeof MaterialIcons>['name'] }>;

const LANGUAGES_RW = [
  'Kinyarwanda', 'Français', 'English', 'Swahili', 'Arabic',
];

// ─── Add payout modal ─────────────────────────────────────────────────────────
const AddPayoutModal = ({
  visible,
  onClose,
  onAdd,
  labels,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (data: Omit<PayoutAccount, 'id' | 'isVerified'>) => void;
  labels: { title: string; method: string; holder: string; number: string; add: string; cancel: string };
}) => {
  const [type, setType] = useState<PayoutType>('MTN_MOMO');
  const [number, setNumber] = useState('');
  const [name, setName] = useState('');

  const cfg = PAYOUT_TYPES.find(p => p.type === type)!;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={pm.overlay}>
        <View style={pm.card}>
          <Text style={pm.title}>{labels.title}</Text>

          <Text style={pm.label}>{labels.method}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {PAYOUT_TYPES.map(p => (
                <TouchableOpacity
                  key={p.type}
                  style={[pm.typeChip, type === p.type && { borderColor: p.color, backgroundColor: p.color + '18' }]}
                  onPress={() => setType(p.type)}
                  activeOpacity={0.8}
                >
                  <Text style={[pm.typeChipTxt, type === p.type && { color: p.color, fontWeight: '700' }]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Text style={pm.label}>{labels.holder}</Text>
          <View style={pm.inputWrap}>
            <TextInput
              style={pm.input}
              value={name}
              onChangeText={setName}
              placeholder="Jean Bosco Hakizimana"
              placeholderTextColor={colors.inkDisabled}
            />
          </View>

          {type !== 'BANK_TRANSFER' && (
            <>
              <Text style={pm.label}>{labels.number}</Text>
              <View style={[pm.inputWrap, { flexDirection: 'row' }]}>
                <Text style={pm.prefix}>{cfg.prefix}</Text>
                <TextInput
                  style={[pm.input, { flex: 1 }]}
                  value={number}
                  onChangeText={setNumber}
                  placeholder="78 XXX XXX"
                  placeholderTextColor={colors.inkDisabled}
                  keyboardType="phone-pad"
                />
              </View>
            </>
          )}

          <View style={pm.actions}>
            <TouchableOpacity style={pm.cancelBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={pm.cancelTxt}>{labels.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[pm.addBtn, (!name.trim() || (type !== 'BANK_TRANSFER' && !number.trim())) && pm.addBtnDisabled]}
              onPress={() => {
                onAdd({ type, accountNumber: number, accountName: name, isDefault: false });
                setNumber(''); setName('');
              }}
              disabled={!name.trim() || (type !== 'BANK_TRANSFER' && !number.trim())}
              activeOpacity={0.85}
            >
              <Text style={pm.addTxt}>{labels.add}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
const pm = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(15,31,31,0.5)', justifyContent: 'flex-end' },
  card:       { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 36, borderTopWidth: 1, borderColor: colors.border },
  title:      { fontSize: 17, fontWeight: '700', color: colors.ink, marginBottom: 20 },
  label:      { fontSize: 11, fontWeight: '700', color: colors.inkSubtle, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  typeChip:   { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border },
  typeChipTxt:{ fontSize: 12, fontWeight: '500', color: colors.inkMid },
  inputWrap:  { backgroundColor: colors.surfaceSunken, borderRadius: 8, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center' },
  input:      { fontSize: 15, color: colors.ink, paddingVertical: 11 },
  prefix:     { fontSize: 15, color: colors.inkSubtle, paddingVertical: 11, marginRight: 4 },
  actions:    { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn:  { flex: 1, paddingVertical: 13, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center' },
  cancelTxt:  { fontSize: 14, fontWeight: '600', color: colors.inkMid },
  addBtn:     { flex: 1, paddingVertical: 13, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center' },
  addBtnDisabled: { opacity: 0.4 },
  addTxt:     { fontSize: 14, fontWeight: '700', color: colors.white },
});

// ─── Screen ───────────────────────────────────────────────────────────────────
const HostAccountScreen = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { user, actions } = useUserStore();

  const KYC_CONFIG: KycConfig = {
    VERIFIED:     { label: t('editProfile.kycVerified'),    color: colors.success,    bg: colors.success + '14',  icon: 'verified-user' },
    PENDING:      { label: t('editProfile.kycPending'),     color: colors.warning,    bg: colors.warning + '18',  icon: 'hourglass-empty' },
    NOT_VERIFIED: { label: t('editProfile.kycNotVerified'), color: colors.inkSubtle,  bg: colors.surfaceSunken,   icon: 'person-outline' },
    REJECTED:     { label: t('editProfile.kycRejected'),    color: colors.error,      bg: colors.error + '12',    icon: 'error-outline' },
  };

  // ── State ──────────────────────────────────────────────────────────────────
  const [kycStatus, setKycStatus] = useState<KycStatus>('NOT_VERIFIED');
  const [payoutAccounts, setPayoutAccounts] = useState<PayoutAccount[]>([]);
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>({
    reservations: true,
    messages:     true,
    promotions:   false,
    newsletter:   false,
    pushEnabled:  true,
    emailEnabled: true,
    smsEnabled:   false,
  });
  const [loading, setLoading] = useState(true);
  const [addPayoutVisible, setAddPayoutVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exportRequested, setExportRequested] = useState(false);
  const [savingNotifs, setSavingNotifs] = useState(false);

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const [kyc, payouts, notifs] = await Promise.all([
          hostAccountService.getKycStatus().catch(() => ({ status: 'NOT_VERIFIED' as KycStatus })),
          hostAccountService.getPayoutAccounts().catch(() => [] as PayoutAccount[]),
          hostAccountService.getNotificationPrefs().catch(() => null),
        ]);
        if (!isMounted) return;
        setKycStatus(kyc?.status ?? 'NOT_VERIFIED');
        setPayoutAccounts(Array.isArray(payouts) ? payouts : []);
        if (notifs) setNotifPrefs(notifs);
      } catch {
        // API non disponible — l'écran affiche les valeurs par défaut
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, []);

  // ── Notification toggle ────────────────────────────────────────────────────
  const handleNotifToggle = useCallback(async (key: keyof NotificationPrefs, value: boolean) => {
    const updated = { ...notifPrefs, [key]: value };
    setNotifPrefs(updated);
    setSavingNotifs(true);
    try {
      await hostAccountService.updateNotificationPrefs({ [key]: value });
    } catch {
      setNotifPrefs(notifPrefs); // rollback
    } finally {
      setSavingNotifs(false);
    }
  }, [notifPrefs]);

  // ── Add payout account ─────────────────────────────────────────────────────
  const handleAddPayout = async (data: Omit<PayoutAccount, 'id' | 'isVerified'>) => {
    setAddPayoutVisible(false);
    const optimistic: PayoutAccount = { ...data, id: `opt_${Date.now()}`, isVerified: false };
    setPayoutAccounts(prev => [...prev, optimistic]);
    try {
      const created = await hostAccountService.addPayoutAccount(data);
      setPayoutAccounts(prev => prev.map(p => p.id === optimistic.id ? created : p));
    } catch {
      setPayoutAccounts(prev => prev.filter(p => p.id !== optimistic.id));
    }
  };

  // ── Delete payout ──────────────────────────────────────────────────────────
  const handleDeletePayout = async (id: string) => {
    setPayoutAccounts(prev => prev.filter(p => p.id !== id));
    await hostAccountService.deletePayoutAccount(id).catch(() => {});
  };

  // ── Data export ────────────────────────────────────────────────────────────
  const handleExport = async () => {
    setExportRequested(true);
    await hostAccountService.requestDataExport().catch(() => {});
  };

  // ── Delete account ─────────────────────────────────────────────────────────
  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await hostAccountService.deleteAccount();
      await actions.logout();
    } catch {/* silent */} finally {
      setDeleting(false);
      setDeleteVisible(false);
    }
  };

  const kyc = KYC_CONFIG[kycStatus];
  const initials = user.fullName
    ? user.fullName.trim().split(' ').map(p => p.charAt(0)).slice(0, 2).join('').toUpperCase()
    : 'H';

  if (loading) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <View style={s.loadingHeader}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={22} color={colors.ink} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{t('editProfile.title')}</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={s.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={22} color={colors.ink} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('editProfile.title')}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 24, 40) }}
      >
        {/* Avatar + KYC badge */}
        <Animated.View entering={FadeInDown.duration(320)} style={s.avatarSection}>
          <View style={s.avatar}>
            <Text style={s.avatarTxt}>{initials}</Text>
          </View>
          <Text style={s.profileName}>{user.fullName ?? '—'}</Text>
          <TouchableOpacity
            style={[s.kycBadge, { backgroundColor: kyc.bg }]}
            activeOpacity={0.8}
          >
            <MaterialIcons name={kyc.icon} size={13} color={kyc.color} />
            <Text style={[s.kycBadgeTxt, { color: kyc.color }]}>{kyc.label}</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* MON PROFIL */}
        <Animated.View entering={FadeInDown.delay(50).duration(300)}>
          <SectionHeader title={t('editProfile.sectionProfile')} />
          <View style={s.card}>
            <RowItem icon="person-outline" label={t('editProfile.personalInfo')}  value={user.fullName ?? undefined} onPress={() => {}} />
            <RowItem icon="add-a-photo"    label={t('editProfile.profilePhoto')}                                     onPress={() => {}} />
            <RowItem icon="edit-note"      label={t('editProfile.bio')}                                              onPress={() => {}} />
            <RowItem icon="translate"      label={t('editProfile.languages')}     value="Kinyarwanda, FR"            onPress={() => {}} last />
          </View>
        </Animated.View>

        {/* SÉCURITÉ */}
        <Animated.View entering={FadeInDown.delay(80).duration(300)}>
          <SectionHeader title={t('editProfile.sectionSecurity')} />
          <View style={s.card}>
            <RowItem icon="lock-outline" label={t('editProfile.changePassword')}                                                                                  onPress={() => {}} />
            <RowItem icon="phone-iphone" label={t('editProfile.twoFactor')} badge={t('editProfile.twoFactorBadge')} badgeBg={colors.error + '12'} badgeColor={colors.error} onPress={() => {}} />
            <RowItem icon="devices"      label={t('editProfile.connectedDevices')}                                                                                onPress={() => {}} last />
          </View>
        </Animated.View>

        {/* PAIEMENTS */}
        <Animated.View entering={FadeInDown.delay(110).duration(300)}>
          <SectionHeader title={t('editProfile.sectionPayments')} />
          <View style={s.card}>
            {payoutAccounts.length === 0 ? (
              <View style={s.emptyPayout}>
                <MaterialIcons name="account-balance-wallet" size={28} color={colors.inkDisabled} />
                <Text style={s.emptyPayoutTxt}>{t('editProfile.noAccount')}</Text>
              </View>
            ) : (
              payoutAccounts.map((acc, i) => {
                const cfg = PAYOUT_TYPES.find(p => p.type === acc.type)!;
                return (
                  <View key={acc.id} style={[s.payoutRow, i < payoutAccounts.length - 1 && s.payoutRowBorder]}>
                    <View style={[s.payoutDot, { backgroundColor: cfg.color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.payoutLabel}>{cfg.label}</Text>
                      <Text style={s.payoutNumber}>{acc.accountNumber || acc.accountName}</Text>
                    </View>
                    {acc.isDefault && (
                      <View style={s.defaultChip}>
                        <Text style={s.defaultChipTxt}>{t('editProfile.defaultLabel')}</Text>
                      </View>
                    )}
                    {acc.isVerified && (
                      <MaterialIcons name="verified" size={16} color={colors.success} />
                    )}
                    <TouchableOpacity onPress={() => handleDeletePayout(acc.id)} activeOpacity={0.7}>
                      <MaterialIcons name="delete-outline" size={18} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
            <TouchableOpacity
              style={s.addPayoutBtn}
              onPress={() => setAddPayoutVisible(true)}
              activeOpacity={0.8}
            >
              <MaterialIcons name="add" size={16} color={colors.primary} />
              <Text style={s.addPayoutTxt}>{t('editProfile.addAccount')}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* NOTIFICATIONS */}
        <Animated.View entering={FadeInDown.delay(140).duration(300)}>
          <View style={s.sectionLabelRow}>
            <SectionHeader title={t('editProfile.sectionNotifications')} />
            {savingNotifs && <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 20, marginRight: 20 }} />}
          </View>
          <View style={s.card}>
            <NotifRow label={t('editProfile.notifReservations')} value={notifPrefs.reservations} onChange={v => handleNotifToggle('reservations', v)} />
            <NotifRow label={t('editProfile.notifMessages')}     value={notifPrefs.messages}     onChange={v => handleNotifToggle('messages', v)} />
            <NotifRow label={t('editProfile.notifPromotions')}   value={notifPrefs.promotions}   onChange={v => handleNotifToggle('promotions', v)} />
            <NotifRow label={t('editProfile.notifNewsletter')}   value={notifPrefs.newsletter}   onChange={v => handleNotifToggle('newsletter', v)} last />
          </View>

          <SectionHeader title={t('editProfile.sectionDelivery')} />
          <View style={s.card}>
            <NotifRow label={t('editProfile.notifPush')}  value={notifPrefs.pushEnabled}  onChange={v => handleNotifToggle('pushEnabled', v)} />
            <NotifRow label={t('editProfile.notifEmail')} value={notifPrefs.emailEnabled} onChange={v => handleNotifToggle('emailEnabled', v)} />
            <NotifRow label={t('editProfile.notifSms')}   value={notifPrefs.smsEnabled}   onChange={v => handleNotifToggle('smsEnabled', v)} last />
          </View>
        </Animated.View>

        {/* CONFIDENTIALITÉ */}
        <Animated.View entering={FadeInDown.delay(170).duration(300)}>
          <SectionHeader title={t('editProfile.sectionPrivacy')} />
          <View style={s.card}>
            <RowItem
              icon="download"
              label={t('editProfile.exportData')}
              badge={exportRequested ? t('editProfile.exportRequested') : undefined}
              badgeBg={colors.success + '14'} badgeColor={colors.success}
              onPress={handleExport}
            />
            <RowItem
              icon="delete-forever"
              label={t('editProfile.deleteAccount')}
              onPress={() => setDeleteVisible(true)}
              last
            />
          </View>
        </Animated.View>
      </ScrollView>

      {/* Modals */}
      <AddPayoutModal
        visible={addPayoutVisible}
        onClose={() => setAddPayoutVisible(false)}
        onAdd={handleAddPayout}
        labels={{
          title:  t('editProfile.addPayoutTitle'),
          method: t('editProfile.payoutMethod'),
          holder: t('editProfile.payoutHolder'),
          number: t('editProfile.payoutNumber'),
          add:    t('editProfile.payoutAdd'),
          cancel: t('editProfile.cancel'),
        }}
      />
      <DeleteAccountModal
        visible={deleteVisible}
        onClose={() => setDeleteVisible(false)}
        onConfirm={handleDeleteAccount}
        deleting={deleting}
        labels={{
          title:   t('editProfile.deleteTitle'),
          body:    t('editProfile.deleteBody'),
          cancel:  t('editProfile.cancel'),
          confirm: t('editProfile.confirm'),
        }}
      />
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: colors.background },
  centered:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },

  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  backBtn:    { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
  headerTitle:{ fontSize: 17, fontWeight: '700', color: colors.ink },

  avatarSection:{ alignItems: 'center', paddingVertical: 28, gap: 8 },
  avatar:     { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primaryLight, borderWidth: 2.5, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarTxt:  { fontSize: 26, fontWeight: '800', color: colors.primary },
  profileName:{ fontSize: 18, fontWeight: '700', color: colors.ink },
  kycBadge:   { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  kycBadgeTxt:{ fontSize: 12, fontWeight: '700' },

  card:       { backgroundColor: colors.surface, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, overflow: 'hidden' },

  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  // Payout
  payoutRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 20, gap: 12, backgroundColor: colors.surface },
  payoutRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  payoutDot:       { width: 10, height: 10, borderRadius: 5 },
  payoutLabel:     { fontSize: 13, fontWeight: '600', color: colors.ink },
  payoutNumber:    { fontSize: 12, color: colors.inkSubtle, marginTop: 1 },
  defaultChip:     { backgroundColor: colors.primaryLight, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  defaultChipTxt:  { fontSize: 10, fontWeight: '700', color: colors.primary },
  emptyPayout:     { alignItems: 'center', paddingVertical: 20, gap: 6 },
  emptyPayoutTxt:  { fontSize: 13, color: colors.inkSubtle },
  addPayoutBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderTopWidth: 1, borderTopColor: colors.border },
  addPayoutTxt:    { fontSize: 14, fontWeight: '600', color: colors.primary },
});

export default HostAccountScreen;
