import { SkeletonScreen } from '../components/ContentSkeleton';
import React, { useRef,useState } from 'react';
import { ScrollView, View, Text, TextInput, StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import type { RootStackParamList } from '../types';
import useListingById from '../hooks/useListingById';
import { createBooking, quoteBooking, type BookingQuote } from '../services/booking.service';
import { colors } from '../theme';

export default function BookingRequestScreen({route, navigation}: NativeStackScreenProps<RootStackParamList, 'BookingRequest'>) {
  const { t } = useTranslation();
  const { listing, isLoading, error: loadError } = useListingById(route.params.propertyId);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [guests, setGuests] = useState('1');
  const [message, setMessage] = useState('');
  const [quote, setQuote] = useState<BookingQuote | null>(null);
  const [busy, setBusy] = useState(false);
  const sending=useRef(false);
  const [error, setError] = useState('');
  const edit = (setter: (text: string) => void) => (value: string) => { setter(value); setQuote(null); setError(''); };
  const submit = async () => {
    if(sending.current)return; sending.current=true;
    setBusy(true); setError('');
    const input = {property_id: route.params.propertyId, start_date: start.trim(), end_date: end.trim(), guest_count: Number(guests), message};
    try {
      if (!quote) setQuote(await quoteBooking(input));
      else { await createBooking({...input, expected_total: quote.total_price}); navigation.replace('Bookings'); }
    } catch (failure) { setQuote(null); setError(failure instanceof Error ? failure.message : t('bookingFlow.error', 'Impossible de traiter cette demande.')); }
    finally { sending.current=false; setBusy(false); }
  };
  if (isLoading) return <SkeletonScreen variant="form" />;
  if (!listing) return <Text style={s.error}>{loadError || t('bookingFlow.unavailable', 'Logement indisponible.')}</Text>;
  return <ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
    <Text style={s.title}>{listing.title}</Text>
    <Text style={s.text}>{listing.price.toLocaleString()} {listing.currency} / {t('bookingFlow.month', 'mois')}</Text>
    <Text style={s.text}>{t('bookingFlow.minimum', 'Durée minimale : {{days}} jours. Le jour de départ est exclu.', {days: (listing.minDurationMonths || 1) * 30})}</Text>
    <Text style={s.label}>{t('bookingFlow.start', 'Arrivée (AAAA-MM-JJ)')}</Text>
    <TextInput style={s.input} value={start} onChangeText={edit(setStart)} placeholder="2026-10-01" accessibilityLabel={t('bookingFlow.start', 'Arrivée (AAAA-MM-JJ)')} editable={!busy} autoCapitalize="none" />
    <Text style={s.label}>{t('bookingFlow.end', 'Départ (AAAA-MM-JJ)')}</Text>
    <TextInput style={s.input} value={end} onChangeText={edit(setEnd)} placeholder="2026-10-31" accessibilityLabel={t('bookingFlow.end', 'Départ (AAAA-MM-JJ)')} editable={!busy} autoCapitalize="none" />
    <Text style={s.label}>{t('bookingFlow.guests', 'Nombre de personnes')}</Text>
    <TextInput style={s.input} value={guests} onChangeText={edit(setGuests)} keyboardType="number-pad" accessibilityLabel={t('bookingFlow.guests', 'Nombre de personnes')} editable={!busy} />
    <Text style={s.label}>{t('bookingFlow.message', 'Message à l’hôte (facultatif)')}</Text>
    <TextInput style={[s.input, {minHeight: 90}]} value={message} onChangeText={setMessage} multiline maxLength={2000} editable={!busy} accessibilityLabel={t('bookingFlow.message', 'Message à l’hôte (facultatif)')} />
    {quote && <View style={s.quote} accessibilityLiveRegion="polite">
      <Text style={s.title}>{quote.total_price.toLocaleString()} {quote.currency}</Text>
      <Text style={s.text}>{t('bookingFlow.quote', 'Loyer total pour {{days}} jours, selon le calendrier de l’hôte.', {days: quote.days})}</Text>
      <Text style={s.text}>{t('bookingFlow.deposit', 'Caution indiquée séparément : {{amount}} {{currency}}.', {amount: quote.deposit.toLocaleString(), currency: quote.currency})}</Text>
    </View>}
    <Text style={s.text}>{t('bookingFlow.paymentNote', 'Cette demande attendra l’accord de l’hôte. Aucun paiement n’est effectué dans l’application.')}</Text>
    {!!error && <Text style={s.error} accessibilityRole="alert">{error}</Text>}
    <Button mode="contained" buttonColor={colors.accent} textColor={colors.onAccent} style={{borderRadius:12}} contentStyle={{minHeight:52}} labelStyle={{fontSize:16,fontWeight:'600'}} onPress={submit} loading={busy} disabled={busy}>{quote ? t('bookingFlow.confirm', 'Envoyer la demande') : t('bookingFlow.check', 'Vérifier les dates et le prix')}</Button>
  </ScrollView>;
}
const s = StyleSheet.create({page:{width:'100%',maxWidth:640,alignSelf:'center',padding:24,gap:12,backgroundColor:colors.background,flexGrow:1},title:{fontSize:22,fontWeight:'600',color:colors.ink},text:{fontSize:15,color:colors.inkSubtle,lineHeight:22},label:{fontSize:15,color:colors.ink,marginTop:10},input:{borderWidth:1,borderColor:colors.border,borderRadius:10,padding:14,color:colors.ink,backgroundColor:colors.surface,fontSize:16},quote:{paddingVertical:16,gap:8},error:{color:colors.error,padding:12}});
