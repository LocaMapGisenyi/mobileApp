import ContentSkeleton from '../components/ContentSkeleton';
import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import type { HostBookingFilter, RootStackParamList } from '../types';
import { useUserStore } from '../store/user';
import { useHostBookings } from '../hooks/useHostBookings';
import { colors } from '../theme';
import { HostButton, HostEmpty, HostHeader, HostNotice, HostPage, HostStatus, hostStyles } from '../components/host/HostUI';

export default function HostBookingsScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'HostBookings'>) {
  const { t, i18n } = useTranslation();
  const userId = useUserStore(state => state.user.id);
  const [filter, setFilter] = useState<HostBookingFilter>(route.params?.filter ?? 'all');
  useEffect(() => setFilter(route.params?.filter ?? 'all'), [route.params?.filter]);
  const { rows, loading, loadingMore, error, hasMore, refresh, loadMore } = useHostBookings(userId, filter);
  const filters: HostBookingFilter[] = ['all', 'requests', 'upcoming', 'current', 'history'];
  if (filter === 'arrivals' || filter === 'departures') filters.push(filter);
  const date = (value: string) => new Date(`${value}T12:00:00Z`).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Kigali' });
  return <HostPage scroll={false}>
    <FlatList data={rows} keyExtractor={item => item.id} contentContainerStyle={hostStyles.content}
      refreshing={loading && !loadingMore && rows.length > 0} onRefresh={() => void refresh()}
      ListHeaderComponent={<>
        <HostHeader title={t('hostFlow.bookings.title')} subtitle={t('hostFlow.bookings.subtitle')} onBack={() => navigation.goBack()} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>
          {filters.map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: value === filter }} onPress={() => setFilter(value)}
            style={[s.filter, value === filter && s.activeFilter]}><Text style={[s.filterText, value === filter && s.activeText]}>{t(`hostFlow.bookings.${value}`)}</Text></Pressable>)}
        </ScrollView>
        {error && <HostNotice message={t('hostFlow.bookings.loadError')} onRetry={() => void refresh()} />}
      </>}
      ListEmptyComponent={loading ? <ContentSkeleton /> : error ? null : <HostEmpty icon="event-note" title={t('hostFlow.bookings.empty')} description={t('hostFlow.bookings.emptyHint')} />}
      renderItem={({ item }) => <Pressable accessibilityRole="button" onPress={() => navigation.navigate('HostBookingDetail', { bookingId: item.id })} style={s.booking}>
        <HostStatus label={t(`hostFlow.bookings.${item.status}`)} tone={item.status === 'approved' ? 'success' : item.status === 'pending' ? 'warning' : 'neutral'} />
        <Text style={s.title}>{item.property?.title || t('hostFlow.bookings.property')}</Text>
        <Text style={hostStyles.muted}>{date(item.start_date)} – {date(item.end_date)}</Text>
        <View style={s.bottom}><Text style={hostStyles.body}>{new Intl.NumberFormat(i18n.language, { style: 'currency', currency: item.currency, maximumFractionDigits: 0 }).format(item.total_price)}</Text>
          <Text style={hostStyles.muted}>{t('hostFlow.bookings.people', { count: item.guest_count })}</Text></View>
      </Pressable>}
      ListFooterComponent={hasMore && rows.length ? <HostButton variant="secondary" disabled={loading} busy={loadingMore} label={t('hostFlow.bookings.loadMore')} onPress={() => void loadMore()} /> : null} />
  </HostPage>;
}
const s = StyleSheet.create({
  filters: { gap: 8, paddingBottom: 24 }, filter: { minHeight: 44, justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 22, paddingHorizontal: 18 },
  activeFilter: { borderColor: colors.ink, backgroundColor: colors.ink }, filterText: { fontSize: 14, lineHeight: 20, color: colors.ink }, activeText: { color: colors.white },
  booking: { paddingVertical: 22, gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 6 }, title: { fontSize: 20, lineHeight: 28, fontWeight: '600', color: colors.ink },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
});
