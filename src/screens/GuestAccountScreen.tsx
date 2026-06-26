// src/screens/GuestAccountScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, ActivityIndicator, StatusBar,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme';
import { RootStackParamList } from '../types';
import { useUserStore } from '../store/user';
import { SectionHeader, RowItem, NotifRow, DeleteAccountModal } from '../components/account';

type Nav = NativeStackNavigationProp<RootStackParamList, 'GuestAccount' as any>;

// ─── Types ────────────────────────────────────────────────────────────────────
type PaymentMethod = 'MTN_MOMO' | 'AIRTEL_MONEY' | 'VISA' | 'MASTERCARD';

interface PaymentAccount {
  id: string;
  type: PaymentMethod;
  accountName: string;
  accountNumber: string;
  isDefault: boolean;
}

interface GuestNotifPrefs {
  reservations: boolean;
  messages: boolean;
  alerts: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
}

const PAYMENT_TYPES: { type: PaymentMethod; label: string; color: string }[] = [
  { type: 'MTN_MOMO',     label: 'MTN MoMo',    color: '#FFCC00' },
  { type: 'AIRTEL_MONEY', label: 'Airtel Money', color: '#E4002B' },
  { type: 'VISA',         label: 'Visa',         color: '#1A1F71' },
  { type: 'MASTERCARD',   label: 'Mastercard',   color: '#EB001B' },
];

// ─── Add payment modal ────────────────────────────────────────────────────────
const AddPaymentModal = ({
  visible, onClose, onAdd, labels,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (data: Omit<PaymentAccount, 'id' | 'isDefault'>) => void;
  labels: { title: string; method: string; holder: string; number: string; add: string; cancel: string };
}) => {
  const [type, setType] = useState<PaymentMethod>('MTN_MOMO');
  const [number, setNumber] = useState('');
  const [name, setName] = useState('');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={pm.overlay}>
        <View style={pm.card}>
          <Text style={pm.title}>{labels.title}</Text>

          <Text style={pm.label}>{labels.method}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {PAYMENT_TYPES.map(p => (
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

          <Text style={pm.label}>{labels.number}</Text>
          <View style={pm.inputWrap}>
            <TextInput
              style={pm.input}
              value={number}
              onChangeText={setNumber}
              placeholder={type === 'VISA' || type === 'MASTERCARD' ? '•••• •••• •••• ••••' : '078 XXX XXX'}
              placeholderTextColor={colors.inkDisabled}
              keyboardType={type === 'VISA' || type === 'MASTERCARD' ? 'number-pad' : 'phone-pad'}
            />
          </View>

          <View style={pm.actions}>
            <TouchableOpacity style={pm.cancelBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={pm.cancelTxt}>{labels.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[pm.addBtn, (!name.trim() || !number.trim()) && pm.addBtnDisabled]}
              onPress={() => {
                onAdd({ type, accountNumber: number, accountName: name });
                setNumber(''); setName('');
              }}
              disabled={!name.trim() || !number.trim()}
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
  overlay:      { flex: 1, backgroundColor: 'rgba(15,31,31,0.5)', justifyContent: 'flex-end' },
  card:         { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 36, borderTopWidth: 1, borderColor: colors.border },
  title:        { fontSize: 17, fontWeight: '700', color: colors.ink, marginBottom: 20 },
  label:        { fontSize: 11, fontWeight: '700', color: colors.inkSubtle, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  typeChip:     { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border },
  typeChipTxt:  { fontSize: 12, fontWeight: '500', color: colors.inkMid },
  inputWrap:    { backgroundColor: colors.surfaceSunken, borderRadius: 8, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 12, marginBottom: 16 },
  input:        { fontSize: 15, color: colors.ink, paddingVertical: 11 },
  actions:      { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn:    { flex: 1, paddingVertical: 13, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center' },
  cancelTxt:    { fontSize: 14, fontWeight: '600', color: colors.inkMid },
  addBtn:       { flex: 1, paddingVertical: 13, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center' },
  addBtnDisabled: { opacity: 0.4 },
  addTxt:       { fontSize: 14, fontWeight: '700', color: colors.white },
});

// ─── Screen ───────────────────────────────────────────────────────────────────
const GuestAccountScreen = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { user, actions } = useUserStore();

  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([]);
  const [notifPrefs, setNotifPrefs] = useState<GuestNotifPrefs>({
    reservations: true,
    messages: true,
    alerts: true,
    pushEnabled: true,
    emailEnabled: true,
    smsEnabled: false,
  });
  const [addPaymentVisible, setAddPaymentVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exportRequested, setExportRequested] = useState(false);
  const [savingNotifs, setSavingNotifs] = useState(false);

  const handleNotifToggle = useCallback(async (key: keyof GuestNotifPrefs, value: boolean) => {
    const prev = notifPrefs;
    setNotifPrefs(p => ({ ...p, [key]: value }));
    setSavingNotifs(true);
    try {
      // API stub — brancher sur userService quand disponible
    } catch {
      setNotifPrefs(prev);
    } finally {
      setSavingNotifs(false);
    }
  }, [notifPrefs]);

  const handleAddPayment = (data: Omit<PaymentAccount, 'id' | 'isDefault'>) => {
    setAddPaymentVisible(false);
    const optimistic: PaymentAccount = { ...data, id: `opt_${Date.now()}`, isDefault: paymentAccounts.length === 0 };
    setPaymentAccounts(prev => [...prev, optimistic]);
  };

  const handleDeletePayment = (id: string) => {
    setPaymentAccounts(prev => prev.filter(p => p.id !== id));
  };

  const handleExport = () => {
    setExportRequested(true);
    // API stub
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await actions.logout();
    } catch {/* silent */} finally {
      setDeleting(false);
      setDeleteVisible(false);
    }
  };

  const initials = user.fullName
    ? user.fullName.trim().split(' ').map(p => p.charAt(0)).slice(0, 2).join('').toUpperCase()
    : 'G';

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={22} color={colors.ink} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('guestAccount.title')}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 24, 40) }}
      >
        {/* Avatar */}
        <Animated.View entering={FadeInDown.duration(320)} style={s.avatarSection}>
          <View style={s.avatar}>
            <Text style={s.avatarTxt}>{initials}</Text>
          </View>
          <Text style={s.profileName}>{user.fullName ?? '—'}</Text>
          <Text style={s.profileEmail}>{user.email ?? ''}</Text>
        </Animated.View>

        {/* MON PROFIL */}
        <Animated.View entering={FadeInDown.delay(50).duration(300)}>
          <SectionHeader title={t('guestAccount.sectionProfile')} />
          <View style={s.card}>
            <RowItem icon="person-outline" label={t('guestAccount.personalInfo')} value={user.fullName ?? undefined} onPress={() => {}} />
            <RowItem icon="add-a-photo"    label={t('guestAccount.profilePhoto')}                                     onPress={() => {}} />
            <RowItem icon="edit-note"      label={t('guestAccount.bio')}                                              onPress={() => {}} />
            <RowItem icon="translate"      label={t('guestAccount.languages')}     value="Kinyarwanda, FR"            onPress={() => {}} last />
          </View>
        </Animated.View>

        {/* SÉCURITÉ */}
        <Animated.View entering={FadeInDown.delay(80).duration(300)}>
          <SectionHeader title={t('guestAccount.sectionSecurity')} />
          <View style={s.card}>
            <RowItem icon="lock-outline" label={t('guestAccount.changePassword')}                                                                                      onPress={() => {}} />
            <RowItem icon="phone-iphone" label={t('guestAccount.twoFactor')} badge={t('guestAccount.twoFactorBadge')} badgeBg={colors.error + '12'} badgeColor={colors.error} onPress={() => {}} />
            <RowItem icon="devices"      label={t('guestAccount.connectedDevices')}                                                                                    onPress={() => {}} last />
          </View>
        </Animated.View>

        {/* MÉTHODES DE PAIEMENT */}
        <Animated.View entering={FadeInDown.delay(110).duration(300)}>
          <SectionHeader title={t('guestAccount.sectionPayments')} />
          <View style={s.card}>
            {paymentAccounts.length === 0 ? (
              <View style={s.emptyPayment}>
                <MaterialIcons name="credit-card" size={28} color={colors.inkDisabled} />
                <Text style={s.emptyPaymentTxt}>{t('guestAccount.noPayment')}</Text>
              </View>
            ) : (
              paymentAccounts.map((acc, i) => {
                const cfg = PAYMENT_TYPES.find(p => p.type === acc.type)!;
                return (
                  <View key={acc.id} style={[s.paymentRow, i < paymentAccounts.length - 1 && s.paymentRowBorder]}>
                    <View style={[s.paymentDot, { backgroundColor: cfg.color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.paymentLabel}>{cfg.label}</Text>
                      <Text style={s.paymentNumber}>{acc.accountNumber}</Text>
                    </View>
                    {acc.isDefault && (
                      <View style={s.defaultChip}>
                        <Text style={s.defaultChipTxt}>{t('guestAccount.defaultLabel')}</Text>
                      </View>
                    )}
                    <TouchableOpacity onPress={() => handleDeletePayment(acc.id)} activeOpacity={0.7}>
                      <MaterialIcons name="delete-outline" size={18} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
            <TouchableOpacity style={s.addBtn} onPress={() => setAddPaymentVisible(true)} activeOpacity={0.8}>
              <MaterialIcons name="add" size={16} color={colors.primary} />
              <Text style={s.addBtnTxt}>{t('guestAccount.addPayment')}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* NOTIFICATIONS */}
        <Animated.View entering={FadeInDown.delay(140).duration(300)}>
          <View style={s.sectionLabelRow}>
            <SectionHeader title={t('guestAccount.sectionNotifications')} />
            {savingNotifs && <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 20, marginRight: 20 }} />}
          </View>
          <View style={s.card}>
            <NotifRow label={t('guestAccount.notifReservations')} value={notifPrefs.reservations} onChange={v => handleNotifToggle('reservations', v)} />
            <NotifRow label={t('guestAccount.notifMessages')}     value={notifPrefs.messages}     onChange={v => handleNotifToggle('messages', v)} />
            <NotifRow label={t('guestAccount.notifAlerts')}       value={notifPrefs.alerts}        onChange={v => handleNotifToggle('alerts', v)} last />
          </View>

          <SectionHeader title={t('guestAccount.sectionDelivery')} />
          <View style={s.card}>
            <NotifRow label={t('guestAccount.notifPush')}  value={notifPrefs.pushEnabled}  onChange={v => handleNotifToggle('pushEnabled', v)} />
            <NotifRow label={t('guestAccount.notifEmail')} value={notifPrefs.emailEnabled} onChange={v => handleNotifToggle('emailEnabled', v)} />
            <NotifRow label={t('guestAccount.notifSms')}   value={notifPrefs.smsEnabled}   onChange={v => handleNotifToggle('smsEnabled', v)} last />
          </View>
        </Animated.View>

        {/* CONFIDENTIALITÉ */}
        <Animated.View entering={FadeInDown.delay(170).duration(300)}>
          <SectionHeader title={t('guestAccount.sectionPrivacy')} />
          <View style={s.card}>
            <RowItem
              icon="download"
              label={t('guestAccount.exportData')}
              badge={exportRequested ? t('guestAccount.exportRequested') : undefined}
              badgeBg={colors.success + '14'} badgeColor={colors.success}
              onPress={handleExport}
            />
            <RowItem
              icon="delete-forever"
              label={t('guestAccount.deleteAccount')}
              onPress={() => setDeleteVisible(true)}
              last
            />
          </View>
        </Animated.View>

        {/* DEVENIR HÔTE */}
        <Animated.View entering={FadeInDown.delay(200).duration(300)} style={s.becomeHostBanner}>
          <View style={s.becomeHostLeft}>
            <MaterialIcons name="home" size={28} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={s.becomeHostTitle}>{t('guestAccount.becomeHostTitle')}</Text>
              <Text style={s.becomeHostSubtitle}>{t('guestAccount.becomeHostSubtitle')}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={s.becomeHostCta}
            onPress={() => navigation.navigate('HostOnboarding' as any)}
            activeOpacity={0.85}
          >
            <Text style={s.becomeHostCtaTxt}>{t('guestAccount.becomeHostCta')}</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      <AddPaymentModal
        visible={addPaymentVisible}
        onClose={() => setAddPaymentVisible(false)}
        onAdd={handleAddPayment}
        labels={{
          title:  t('guestAccount.addPaymentTitle'),
          method: t('guestAccount.paymentMethod'),
          holder: t('guestAccount.paymentHolder'),
          number: t('guestAccount.paymentNumber'),
          add:    t('guestAccount.paymentAdd'),
          cancel: t('guestAccount.cancel'),
        }}
      />
      <DeleteAccountModal
        visible={deleteVisible}
        onClose={() => setDeleteVisible(false)}
        onConfirm={handleDeleteAccount}
        deleting={deleting}
        labels={{
          title:   t('guestAccount.deleteTitle'),
          body:    t('guestAccount.deleteBody'),
          cancel:  t('guestAccount.cancel'),
          confirm: t('guestAccount.confirm'),
        }}
      />
    </View>
  );
};

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: colors.background },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  backBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
  headerTitle:  { fontSize: 17, fontWeight: '700', color: colors.ink },
  avatarSection:{ alignItems: 'center', paddingVertical: 28, gap: 6 },
  avatar:       { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primaryLight, borderWidth: 2.5, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarTxt:    { fontSize: 26, fontWeight: '800', color: colors.primary },
  profileName:  { fontSize: 18, fontWeight: '700', color: colors.ink },
  profileEmail: { fontSize: 13, color: colors.inkSubtle },
  card:         { backgroundColor: colors.surface, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  paymentRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 20, gap: 12, backgroundColor: colors.surface },
  paymentRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  paymentDot:       { width: 10, height: 10, borderRadius: 5 },
  paymentLabel:     { fontSize: 13, fontWeight: '600', color: colors.ink },
  paymentNumber:    { fontSize: 12, color: colors.inkSubtle, marginTop: 1 },
  defaultChip:      { backgroundColor: colors.primaryLight, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  defaultChipTxt:   { fontSize: 10, fontWeight: '700', color: colors.primary },
  emptyPayment:     { alignItems: 'center', paddingVertical: 20, gap: 6 },
  emptyPaymentTxt:  { fontSize: 13, color: colors.inkSubtle },
  addBtn:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderTopWidth: 1, borderTopColor: colors.border },
  addBtnTxt:        { fontSize: 14, fontWeight: '600', color: colors.primary },
  becomeHostBanner: { margin: 16, borderRadius: 16, borderWidth: 1.5, borderColor: colors.primary + '40', backgroundColor: colors.primaryLight, padding: 16, gap: 12 },
  becomeHostLeft:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  becomeHostTitle:  { fontSize: 15, fontWeight: '700', color: colors.ink },
  becomeHostSubtitle: { fontSize: 12, color: colors.inkSubtle, marginTop: 2 },
  becomeHostCta:    { alignSelf: 'flex-end', backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 18, paddingVertical: 10 },
  becomeHostCtaTxt: { fontSize: 13, fontWeight: '700', color: colors.white },
});

export default GuestAccountScreen;
