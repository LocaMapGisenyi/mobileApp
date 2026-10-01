import React, { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import type { RootStackParamList } from '../types';
import { useUserStore } from '../store/user';
import AppLogo from '../components/AppLogo';
import LogoutDialog from '../components/LogoutDialog';
import { HostButton, HostHeader, HostPage, HostRow, hostStyles } from '../components/host/HostUI';

export default function HostProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { t } = useTranslation();
  const { user, actions } = useUserStore();
  const lock = useRef(false);
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const logout = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await actions.logout(); }
    catch { setError(t('hostFlow.menu.logoutError')); }
    finally { lock.current = false; setBusy(false); }
  };
  return <HostPage bottomSafe={false}>
    <HostHeader title={t('hostFlow.tabs.menu')} action={<AppLogo size={48} />} />
    <Text style={hostStyles.section}>{user.fullName || t('hostFlow.menu.title')}</Text>
    <Text style={[hostStyles.muted, { marginTop: 6, marginBottom: 16 }]}>{t('hostFlow.menu.subtitle')}</Text>
    <HostRow title={t('hostFlow.menu.account')} description={t('hostFlow.menu.accountHint')} icon="account-circle" onPress={() => navigation.navigate('HostAccount')} />
    <Text style={s.section}>{t('hostFlow.menu.operations')}</Text>
    <HostRow title={t('hostFlow.today.bookings')} icon="event-note" onPress={() => navigation.navigate('HostBookings', { filter: 'all' })} />
    <HostRow title={t('hostFlow.menu.cohosts')} description={t('hostFlow.menu.cohostsHint')} icon="people-outline" onPress={() => navigation.navigate('HostCoHost')} />
    <HostRow title={t('hostFlow.menu.resources')} icon="menu-book" onPress={() => navigation.navigate('HostResources')} />
    <HostRow title={t('hostFlow.menu.referral')} icon="person-add-alt" onPress={() => navigation.navigate('HostReferral')} />
    <View style={{ height: 20 }} />
    <HostRow title={t('hostFlow.menu.support')} description={t('hostFlow.menu.supportHint')} icon="help-outline" onPress={() => navigation.navigate('Support')} />
    <HostRow title={t('hostFlow.menu.legal')} icon="description" onPress={() => navigation.navigate('Legal', { mode: 'host' })} />
    <View style={s.actions}>
      <HostButton variant="secondary" icon="travel-explore" label={t('hostFlow.menu.guestMode')} onPress={() => navigation.navigate('MainTabs')} />
      <HostButton variant="quiet" label={t('hostFlow.menu.logout')} onPress={() => { setError(''); setLogoutVisible(true); }} />
    </View>
    <LogoutDialog visible={logoutVisible} busy={busy} error={error} onCancel={() => setLogoutVisible(false)} onConfirm={() => void logout()} />
  </HostPage>;
}
const s = StyleSheet.create({ section: { ...hostStyles.section, marginTop: 32, marginBottom: 6 }, actions: { gap: 10, marginTop: 32 } });
