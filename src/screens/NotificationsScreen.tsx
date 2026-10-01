import ContentSkeleton from '../components/ContentSkeleton';
import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useUserStore } from '../store/user';
import { useNotifications } from '../hooks/useNotifications';
import { colors } from '../theme';

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const userId = useUserStore(state => state.user.id);
  const { notifications, unreadCount, loading, error, refetch, markRead, markAllRead } = useNotifications(userId);
  const [refreshing, setRefreshing] = useState(false);
  const refresh = async () => {
    setRefreshing(true);
    try { await refetch(); }
    finally { setRefreshing(false); }
  };
  return <SafeAreaView style={styles.root}>
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button"><Text style={styles.link}>Retour</Text></TouchableOpacity>
      <Text style={styles.title}>Notifications</Text>
      <Text>{unreadCount} non lues</Text>
    </View>
    <Text style={styles.note}>Notifications dans l’application : messages et réservations. Les 50 plus récentes sont affichées.</Text>
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <TouchableOpacity style={{ padding: 16 }} onPress={() => { void markAllRead().catch(() => {}); }} accessibilityRole="button"><Text style={styles.link}>Tout marquer comme lu</Text></TouchableOpacity>
    <FlatList data={notifications} keyExtractor={item => item.id} refreshing={refreshing} onRefresh={() => void refresh()}
      ListEmptyComponent={loading || refreshing ? (!refreshing ? <ContentSkeleton style={{ paddingHorizontal: 20 }} /> : null) : <Text style={styles.note}>{error ? 'Tirez pour réessayer.' : 'Aucune notification.'}</Text>}
      renderItem={({ item }) => <TouchableOpacity style={[styles.item, !item.is_read && styles.unread]} onPress={() => { void markRead(item.id).catch(() => {}); }} accessibilityRole="button" accessibilityLabel={`${item.title}${item.is_read ? '' : ', non lue'}`}>
        <Text style={{ fontWeight: item.is_read ? '500' : '700', color: colors.ink }}>{item.title}</Text>
        <Text style={{ color: colors.inkMid, marginTop: 6 }}>{item.message}</Text>
        <Text style={{ color: colors.inkSubtle, marginTop: 8 }}>{new Date(item.created_at).toLocaleString()}</Text>
      </TouchableOpacity>} />
  </SafeAreaView>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.background }, header: { padding: 16, gap: 10, borderBottomWidth: 1, borderColor: colors.border }, title: { fontSize: 24, fontWeight: '700', color: colors.ink }, link: { color: colors.primary, fontWeight: '600' }, note: { padding: 16, color: colors.inkSubtle }, error: { padding: 16, color: colors.error }, item: { padding: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderColor: colors.border }, unread: { backgroundColor: colors.primaryLight } });
