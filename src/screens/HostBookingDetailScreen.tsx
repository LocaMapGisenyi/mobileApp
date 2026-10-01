import ContentSkeleton from '../components/ContentSkeleton';
import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Dialog, Portal } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import type { RootStackParamList } from '../types';
import { getHostBookingDetail, updateBookingStatus, type HostBookingDetail } from '../services/booking.service';
import { useUserStore } from '../store/user';
import { dateDay } from '../utils/stays';
import { canCompleteBooking, runBookingDecision } from '../utils/hostBookings';
import { colors } from '../theme';
import { HostButton, HostEmpty, HostHeader, HostNotice, HostPage, HostRow, HostStatus, hostStyles } from '../components/host/HostUI';

type Decision = 'approved' | 'rejected' | 'cancelled' | 'completed';
const confirmation = { approved: 'confirmAccept', rejected: 'confirmReject', cancelled: 'confirmCancel', completed: 'confirmComplete' };

export default function HostBookingDetailScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'HostBookingDetail'>) {
  const { t, i18n } = useTranslation();
  const userId = useUserStore(state => state.user.id);
  const [booking, setBooking] = useState<HostBookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const generation = useRef(0);
  const load = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true); setError('');
    try {
      const row = userId ? await getHostBookingDetail(route.params.bookingId, userId) : null;
      if (request === generation.current) setBooking(row);
    } catch { if (request === generation.current) setError('loadError'); }
    finally { if (request === generation.current) setLoading(false); }
  }, [route.params.bookingId, userId]);
  useFocusEffect(useCallback(() => {
    setBooking(null); setSuccess(false); setDecision(null); void load();
    return () => { ++generation.current; };
  }, [load]));
  const apply = async () => {
    if (!decision || !booking || !userId) return;
    const request = generation.current;
    try {
      await runBookingDecision(lock, async () => {
        setError(''); setSuccess(false);
        const updated = await updateBookingStatus(booking.id, decision);
        if (request !== generation.current) return;
        setBooking(current => current ? { ...current, ...updated } : null);
        setDecision(null); setSuccess(true);
      }, setBusy);
    } catch { if (request === generation.current) { setDecision(null); setError('actionError'); } }
  };
  const date = (value: string) => new Date(`${value}T12:00:00Z`).toLocaleDateString(i18n.language, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Kigali' });
  return <HostPage>
    <HostHeader title={t('hostFlow.bookings.detail')} onBack={() => navigation.goBack()} />
    {!!error && <HostNotice message={t(`hostFlow.bookings.${error}`)} onRetry={error === 'loadError' ? () => void load() : undefined} />}
    {success && <HostNotice tone="success" message={t('hostFlow.bookings.updated')} />}
    {loading && !booking ? <ContentSkeleton variant="article" count={2} /> : !booking ? !error && <HostEmpty icon="event-busy" title={t('hostFlow.bookings.missing')} /> : <>
      <HostStatus label={t(`hostFlow.bookings.${booking.status}`)} tone={booking.status === 'approved' ? 'success' : booking.status === 'pending' ? 'warning' : 'neutral'} />
      <Text style={s.property}>{booking.property?.title || t('hostFlow.bookings.property')}</Text>
      {!!booking.property?.city && <Text style={hostStyles.muted}>{booking.property.city}</Text>}
      <HostRow icon="person-outline" title={booking.guestName || t('hostFlow.bookings.guest')} description={t('hostFlow.bookings.people', { count: booking.guest_count })} />
      <HostRow icon="date-range" title={`${date(booking.start_date)} – ${date(booking.end_date)}`}
        description={t('hostFlow.bookings.nights', { count: dateDay(booking.end_date) - dateDay(booking.start_date) })} />
      <View style={s.value}><Text style={hostStyles.muted}>{t('hostFlow.bookings.total')}</Text>
        <Text style={s.amount}>{new Intl.NumberFormat(i18n.language, { style: 'currency', currency: booking.currency, maximumFractionDigits: 0 }).format(booking.total_price)}</Text>
        <Text style={hostStyles.muted}>{t('hostFlow.bookings.paymentHint')}</Text>
      </View>
      {!!booking.message && <View style={s.message}><Text style={hostStyles.section}>{t('hostFlow.bookings.message')}</Text><Text style={hostStyles.body}>{booking.message}</Text></View>}
      <View style={s.actions}>
        {booking.status === 'pending' && <>
          <HostButton label={t('hostFlow.bookings.accept')} disabled={busy} onPress={() => setDecision('approved')} />
          <HostButton label={t('hostFlow.bookings.reject')} disabled={busy} variant="secondary" onPress={() => setDecision('rejected')} />
        </>}
        {booking.status === 'approved' && <>
          {canCompleteBooking(booking.status, booking.end_date) && <HostButton label={t('hostFlow.bookings.complete')} disabled={busy} onPress={() => setDecision('completed')} />}
          <HostButton label={t('hostFlow.bookings.cancel')} disabled={busy} variant="secondary" onPress={() => setDecision('cancelled')} />
        </>}
      </View>
    </>}
    <Portal><Dialog visible={!!decision} onDismiss={() => setDecision(null)} dismissable={!busy} dismissableBackButton={!busy} style={s.dialog}>
      <Dialog.Title>{t('hostFlow.bookings.confirmTitle')}</Dialog.Title>
      <Dialog.Content><Text style={hostStyles.body}>{decision ? t(`hostFlow.bookings.${confirmation[decision]}`) : ''}</Text>
        <View style={s.actions}><HostButton label={t('hostFlow.bookings.confirm')} busy={busy} onPress={() => void apply()} />
          <HostButton label={t('common.cancel')} variant="quiet" disabled={busy} onPress={() => setDecision(null)} /></View>
      </Dialog.Content>
    </Dialog></Portal>
  </HostPage>;
}
const s = StyleSheet.create({
  property: { fontSize: 25, lineHeight: 32, fontWeight: '600', color: colors.ink, marginTop: 20, marginBottom: 6 },
  value: { marginTop: 24, padding: 20, backgroundColor: colors.background, borderRadius: 14 }, amount: { fontSize: 28, lineHeight: 38, fontWeight: '600', color: colors.ink, marginVertical: 6 },
  message: { gap: 12, marginTop: 28 }, actions: { gap: 12, marginTop: 24 }, dialog: { backgroundColor: colors.surface, borderRadius: 18, maxWidth: 440, width: '90%', alignSelf: 'center' },
});
