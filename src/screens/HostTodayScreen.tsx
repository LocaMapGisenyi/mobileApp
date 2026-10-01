import ContentSkeleton from '../components/ContentSkeleton';
import React, { useCallback, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { RootStackParamList } from '../types';
import { useUserStore } from '../store/user';
import { hostService, type DashboardSummary, type PendingRequest } from '../services/api';
import { colors } from '../theme';
import AppLogo from '../components/AppLogo';
import { HostButton, HostEmpty, HostHeader, HostNotice, HostPage, HostRow, hostStyles } from '../components/host/HostUI';

export default function HostTodayScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { t, i18n } = useTranslation();
  const user = useUserStore(state => state.user);
  const generation = useRef(0);
  const account = useRef(user.id);
  const [data, setData] = useState<{ summary: DashboardSummary; requests: PendingRequest[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const load = useCallback(async () => {
    const version = ++generation.current;
    setLoading(true); setError(false);
    try {
      const [summary, requests] = await Promise.all([hostService.getDashboardSummary(), hostService.getPendingRequests()]);
      if (version === generation.current) setData({ summary, requests });
    } catch { if (version === generation.current) setError(true); }
    finally { if (version === generation.current) setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => {
    if (account.current !== user.id) { account.current = user.id; setData(null); }
    void load(); return () => { ++generation.current; };
  }, [load, user.id]));
  const date = (value?: string) => value ? new Date(`${value}T12:00:00Z`).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', timeZone: 'Africa/Kigali' }) : '';
  return <HostPage scroll={false} bottomSafe={false}>
    <ScrollView contentContainerStyle={hostStyles.content} refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={() => void load()} tintColor={colors.primary} />}>
      <View style={s.top}><AppLogo size={48} /><Text style={s.brand}>LocaMap</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={t('hostFlow.today.notifications')} onPress={() => navigation.navigate('Notifications')} style={s.bell}>
          <MaterialIcons name="notifications-none" size={25} color={colors.ink} />
          {!!data?.summary.unreadNotifications && <View style={s.dot} />}
        </Pressable>
      </View>
      <HostHeader title={t('hostFlow.today.title', { name: user.fullName?.trim().split(/\s+/)[0] || t('hostFlow.today.fallbackName') })} subtitle={t('hostFlow.today.subtitle')} />
      {error && <HostNotice message={t('hostFlow.today.loadError')} onRetry={() => void load()} />}
      {loading && !data ? <ContentSkeleton variant="dashboard" /> : data && <>
        <View style={s.sectionHeading}><Text style={hostStyles.section}>{t('hostFlow.today.requests')}</Text>
          <Text style={s.count}>{data.summary.pendingRequests}</Text></View>
        {data.requests.length ? <View>
          {data.requests.filter(request => request.type === 'reservation').slice(0, 3).map(request => <HostRow key={request.id}
            title={request.guestName} description={`${request.propertyTitle}\n${date(request.checkIn)} – ${date(request.checkOut)}`}
            icon="person-outline" onPress={() => navigation.navigate('HostBookingDetail', { bookingId: request.id })} />)}
          <View style={{ marginTop: 16 }}><HostButton variant="secondary" label={t('hostFlow.today.viewRequests')} onPress={() => navigation.navigate('HostBookings', { filter: 'requests' })} /></View>
        </View> : <HostEmpty icon="check-circle-outline" title={t('hostFlow.today.noRequests')} description={t('hostFlow.today.noRequestsHint')} />}
        <View style={hostStyles.divider} />
        <View style={s.daily}>
          {(['arrivals', 'departures'] as const).map((filter, index) => <Pressable key={filter} accessibilityRole="button"
            onPress={() => navigation.navigate('HostBookings', { filter })} style={s.dailyItem}>
            <MaterialIcons name={index === 0 ? 'login' : 'logout'} size={24} color={colors.primary} />
            <Text style={s.dailyNumber}>{index === 0 ? data.summary.checkInsToday : data.summary.checkOutsToday}</Text>
            <Text style={hostStyles.muted}>{t(`hostFlow.today.${filter}`)}</Text>
          </Pressable>)}
        </View>
        <HostRow title={t('hostFlow.today.bookings')} icon="event-note" onPress={() => navigation.navigate('HostBookings', { filter: 'all' })} />
        <View style={s.month}><Text style={hostStyles.muted}>{t('hostFlow.today.month')}</Text>
          <Text style={[hostStyles.section, { marginTop: 8 }]}>{t('hostFlow.today.value')}</Text>
          <Text style={s.amount}>{new Intl.NumberFormat(i18n.language, { style: 'currency', currency: data.summary.currency, maximumFractionDigits: 0 }).format(data.summary.revenueMonth)}</Text>
          <Text style={hostStyles.muted}>{t('hostFlow.today.valueHint')}</Text>
        </View>
      </>}
    </ScrollView>
  </HostPage>;
}
const s = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', paddingTop: 12, gap: 6 }, brand: { fontSize: 20, color: colors.ink, fontWeight: '700', flex: 1 },
  bell: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }, dot: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  sectionHeading: { flexDirection: 'row', gap: 12, alignItems: 'center', flexWrap: 'wrap' }, count: { fontSize: 16, color: colors.primaryDark, paddingVertical: 5, paddingHorizontal: 10, backgroundColor: colors.primaryLight, borderRadius: 8, overflow: 'hidden' },
  daily: { flexDirection: 'row', gap: 16, paddingBottom: 12 }, dailyItem: { flex: 1, padding: 18, backgroundColor: colors.background, borderRadius: 14, gap: 8 }, dailyNumber: { fontSize: 30, lineHeight: 36, fontWeight: '600', color: colors.ink },
  month: { marginTop: 32, paddingTop: 8 }, amount: { fontSize: 30, lineHeight: 40, fontWeight: '600', color: colors.ink, marginVertical: 8 },
});
