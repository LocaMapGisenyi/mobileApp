import ContentSkeleton from '../components/ContentSkeleton';
import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, TextInput, Text } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme';
import { RootStackParamList } from '../types';
import { useUserStore } from '../store/user';
import { supabase } from '../lib/supabase';
import { HostPage, HostHeader, HostNotice, HostEmpty } from '../components/host/HostUI';
import { messageService, HostConversation, ConvFilter } from '../services/api/message.service';

export default function HostMessagesScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const userId = useUserStore(state => state.authUser?.id ?? '');
  const [filter, setFilter] = useState<ConvFilter>('all');
  const [conversations, setConversations] = useState<HostConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const generation = useRef(0);
  const focused = useRef(false);
  const load = useCallback(async () => {
    if (!focused.current) return;
    const request = ++generation.current;
    setRefreshing(true);
    try {
      const rows = userId ? await messageService.getHostConversations(filter) : [];
      if (request !== generation.current) return;
      setConversations(rows);
      setError(null);
    } catch (failure) {
      if (request === generation.current) setError(failure instanceof Error ? failure.message : t('hostFlow.messages.loadError'));
    } finally {
      if (request === generation.current) { setLoading(false); setRefreshing(false); }
    }
  }, [filter, userId, t]);
  useEffect(() => { setConversations([]); setLoading(true); setQuery(''); }, [userId]);
  useFocusEffect(useCallback(() => {
    focused.current = true;
    void load();
    return () => { focused.current = false; ++generation.current; };
  }, [load]));
  useEffect(() => {
    if (!userId) return;
    let active = true;
    const channel = supabase.channel(`host-inbox-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_participants', filter: `user_id=eq.${userId}` }, () => void load())
      .subscribe(status => {
        if (status === 'SUBSCRIBED') void load();
        else if (active && (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT')) setError(t('hostFlow.messages.connectionError'));
      });
    return () => { active = false; void supabase.removeChannel(channel); };
  }, [userId, load, t]);
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase(i18n.language);
    return conversations.filter(row => !q || [row.guestName, row.listingTitle, row.lastMessageText ?? '']
      .some(value => value.toLocaleLowerCase(i18n.language).includes(q)));
  }, [conversations, query, i18n.language]);
  return <HostPage scroll={false} bottomSafe={false}>
    <View style={s.content}>
      <HostHeader title={t('hostMessages.title')} subtitle={t('hostFlow.messages.subtitle')} />
      <View style={s.search}>
        <MaterialIcons name="search" size={22} color={colors.inkSubtle} />
        <TextInput value={query} onChangeText={setQuery} style={s.input} placeholder={t('hostMessages.search')}
          accessibilityLabel={t('hostMessages.search')} placeholderTextColor={colors.inkSubtle} />
        {!!query && <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('hostFlow.messages.clearSearch')}
          style={s.iconButton} onPress={() => setQuery('')}><MaterialIcons name="close" size={20} color={colors.ink} /></TouchableOpacity>}
      </View>
      <View style={s.filters}>{(['all', 'unread', 'archived'] as const).map(value =>
        <TouchableOpacity key={value} accessibilityRole="tab" accessibilityState={{ selected: filter === value }}
          onPress={() => setFilter(value)} style={[s.filter, filter === value && s.selectedFilter]}>
          <Text style={[s.filterText, filter === value && { color: colors.primaryDark }]}>{t(`hostMessages.${value}`)}</Text>
        </TouchableOpacity>)}</View>
      {error !== null && <HostNotice message={error || t('hostFlow.messages.loadError')} onRetry={() => void load()} />}
      {loading ? <ContentSkeleton style={{ paddingHorizontal: 20 }} /> :
        <FlatList data={filtered} keyExtractor={row => row.id} refreshing={refreshing} onRefresh={load}
          contentContainerStyle={s.list} keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<HostEmpty icon="chat-bubble-outline"
            title={query ? t('hostFlow.messages.noResults') : t(filter === 'archived' ? 'hostMessages.emptyArchived' : filter === 'unread' ? 'hostMessages.emptyUnread' : 'hostMessages.empty')}
            description={query ? t('hostFlow.messages.searchHint') : t('hostMessages.emptySubtitle')} />}
          renderItem={({ item }) => <TouchableOpacity accessibilityRole="button"
            accessibilityLabel={`${item.guestName}, ${item.listingTitle}${item.unreadCount ? `, ${t('hostFlow.messages.unreadCount', { count: item.unreadCount })}` : ''}`}
            onPress={() => navigation.navigate('HostConversation', { conversationId: item.id })}
            style={[s.row, item.unreadCount > 0 && s.unreadRow]}>
            <View style={s.avatar}><Text style={s.initial}>{item.guestName.trim().charAt(0).toUpperCase()}</Text></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={s.rowTop}><Text numberOfLines={2} style={[s.name, item.unreadCount > 0 && { fontWeight: '700' }]}>{item.guestName}</Text>
                {item.lastMessageAt && <Text style={s.time}>{new Date(item.lastMessageAt).toLocaleDateString(i18n.language, { timeZone: 'Africa/Kigali', day: 'numeric', month: 'short' })}</Text>}</View>
              <Text style={s.property} numberOfLines={2}>{item.listingTitle}</Text>
              <View style={s.rowTop}><Text style={s.preview} numberOfLines={2}>{item.lastMessageSenderId === userId ? `${t('hostFlow.messages.you')}: ` : ''}{item.lastMessageText ?? '—'}</Text>
                {item.unreadCount > 0 && <View style={s.badge}><Text style={s.badgeText}>{item.unreadCount > 99 ? '99+' : item.unreadCount}</Text></View>}</View>
            </View>
          </TouchableOpacity>} />}
    </View>
  </HostPage>;
}
const s = StyleSheet.create({
  content: { flex: 1, width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 8 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 10, paddingLeft: 12, minHeight: 48 },
  input: { flex: 1, minWidth: 0, minHeight: 48, fontSize: 16, color: colors.ink },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 16 },
  filter: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  selectedFilter: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  filterText: { fontSize: 14, fontWeight: '600', color: colors.inkSubtle },
  list: { paddingBottom: 24 },
  row: { flexDirection: 'row', gap: 12, paddingVertical: 18, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  unreadRow: { backgroundColor: colors.primaryLight },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
  initial: { fontSize: 18, color: colors.primaryDark, fontWeight: '700' },
  rowTop: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  name: { flex: 1, fontSize: 16, color: colors.ink, fontWeight: '500' },
  time: { fontSize: 12, color: colors.inkSubtle, paddingTop: 2 },
  property: { fontSize: 13, lineHeight: 18, color: colors.primaryDark, marginTop: 4, marginBottom: 6 },
  preview: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.inkSubtle },
  badge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { fontSize: 12, color: colors.white, fontWeight: '700' },
});
