import React, { useCallback,useRef, useState } from 'react';
import { ScrollView, Text, View, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { Button } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import type { RootStackParamList } from '../types';
import { useUserStore } from '../store/user';
import { useBookings } from '../hooks/useBookings';
import { updateBookingStatus } from '../services/booking.service';
import { colors } from '../theme';

export default function BookingsScreen({navigation}: NativeStackScreenProps<RootStackParamList, 'Bookings'>) {
  const {t} = useTranslation();
  const uid = useUserStore(s => s.authUser?.id ?? null);
  const [role, setRole] = useState<'guest' | 'host'>('guest');
  const {bookings, loading, error, refetch,hasMore,loadMore} = useBookings(uid, role);
  const sending=useRef(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const refresh = async () => {
    setRefreshing(true);
    try { await refetch(); }
    finally { setRefreshing(false); }
  };
  useFocusEffect(useCallback(() => { void refetch(); }, [refetch]));
  const update = async (id: string, status: 'approved' | 'rejected' | 'cancelled' | 'completed') => {
    if(sending.current)return;sending.current=true;
    setBusy(id); setActionError('');
    try { await updateBookingStatus(id,status); await refetch(); }
    catch (failure) {setActionError(failure instanceof Error ? failure.message : t('bookingFlow.error', 'Impossible de traiter cette demande.'));}
    finally {sending.current=false;setBusy(null);}
  };
  const statuses = {pending:t('bookingFlow.pending','En attente'),approved:t('bookingFlow.approved','Acceptée'),rejected:t('bookingFlow.rejected','Refusée'),cancelled:t('bookingFlow.cancelled','Annulée'),completed:t('bookingFlow.completed','Terminée')};
  return <ScrollView contentContainerStyle={s.page} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}>
    {<View style={s.actions}><Button mode={role==='guest'?'contained':'outlined'} disabled={!!busy} onPress={()=>setRole('guest')}>{t('bookingFlow.myStays','Mes séjours')}</Button><Button mode={role==='host'?'contained':'outlined'} disabled={!!busy} onPress={()=>setRole('host')}>{t('bookingFlow.received','Demandes reçues')}</Button></View>}
    {!!(error || actionError) && <Text accessibilityRole="alert" style={s.error}>{error || actionError}</Text>}
    {loading && !refreshing && !bookings.length && <ActivityIndicator color={colors.primary} />}
    {!loading && !refreshing && !error && !bookings.length && <Text style={s.text}>{t('bookingFlow.empty','Aucune réservation pour le moment.')}</Text>}
    {bookings.map(booking => <View key={booking.id} style={s.card}>
      <Text style={s.title}>{booking.property?.title ?? t('bookingFlow.unavailable','Logement indisponible.')}</Text>
      <Text style={s.text}>{booking.start_date} → {booking.end_date}</Text>
      <Text style={s.text}>{booking.total_price.toLocaleString()} {booking.currency} · {statuses[booking.status]}</Text>
      <View style={s.actions}>
        <Button onPress={()=>navigation.navigate('PropertyDetails',{propertyId:booking.property_id})}>{t('bookingFlow.view','Voir le logement')}</Button>
        {role==='host' && booking.status==='pending' && <><Button disabled={!!busy} onPress={()=>update(booking.id,'approved')}>{t('bookingFlow.accept','Accepter')}</Button><Button disabled={!!busy} onPress={()=>update(booking.id,'rejected')}>{t('bookingFlow.reject','Refuser')}</Button></>}
        {['pending','approved'].includes(booking.status) && <Button disabled={!!busy} loading={busy===booking.id} onPress={()=>update(booking.id,'cancelled')}>{t('bookingFlow.cancel','Annuler la réservation')}</Button>}
        {role==='host' && booking.status==='approved' && booking.end_date<=new Date().toLocaleDateString('en-CA',{timeZone:'Africa/Kigali'}) && <Button disabled={!!busy} onPress={()=>update(booking.id,'completed')}>{t('bookingFlow.complete','Marquer terminée')}</Button>}
        {role==='guest' && booking.status==='completed' && <Button onPress={()=>navigation.navigate('LeaveReview',{bookingId:booking.id,propertyId:booking.property_id,propertyTitle:booking.property?.title ?? '',ownerId:booking.host_id,ownerName:''})}>{t('bookingFlow.review','Laisser un avis')}</Button>}
      </View>
    </View>)}
    {hasMore && <Button disabled={loading} loading={loading} onPress={()=>void loadMore()}>{t('explore.loadMore')}</Button>}
  </ScrollView>;
}
const s=StyleSheet.create({page:{padding:20,gap:16,flexGrow:1,backgroundColor:colors.background},card:{paddingVertical:16,borderBottomWidth:1,borderBottomColor:colors.border,gap:8},title:{fontSize:18,fontWeight:'600',color:colors.ink},text:{fontSize:15,color:colors.inkSubtle},actions:{flexDirection:'row',flexWrap:'wrap',gap:8},error:{color:colors.error}});
