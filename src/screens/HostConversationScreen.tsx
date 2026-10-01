import ContentSkeleton from '../components/ContentSkeleton';
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { HostButton, HostHeader, HostNotice, HostPage } from '../components/host/HostUI';
import { supabase } from '../lib/supabase';
import { messageService, hasContacts, maskContacts, HostConversation, MessageTemplate, ReportCategory } from '../services/api/message.service';
import { useUserStore } from '../store/user';
import { colors } from '../theme';
import { RootStackParamList } from '../types';
import { createHostConversationSession, emptyConversation, HostConversationState } from '../utils/hostConversation';

const categories: { key: ReportCategory; label: string }[] = [
  { key: 'language', label: 'reportLanguage' }, { key: 'harassment', label: 'reportHarassment' },
  { key: 'fraud', label: 'reportFraud' }, { key: 'spam', label: 'reportSpam' },
];

export default function HostConversationScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'HostConversation'>) {
  const { t, i18n } = useTranslation();
  const userId = useUserStore(state => state.authUser?.id ?? '');
  const conversationId = route.params.conversationId;
  const scope = `${userId}:${conversationId}`;
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const [conversation, setConversation] = useState<HostConversation | null>(null);
  const [state, setState] = useState<HostConversationState>(emptyConversation);
  const { draft } = state;
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [category, setCategory] = useState<ReportCategory>('spam');
  const [busyAction, setBusyAction] = useState(false);
  const [retry, setRetry] = useState(0);
  const actionLock = useRef(false);
  const sessionRef = useRef<ReturnType<typeof createHostConversationSession> | null>(null);
  const listRef = useRef<FlatList>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    const session = createHostConversationSession(conversationId, userId, setState, messageService);
    sessionRef.current = session;
    setState(session.getState());
    setConversation(null);
    setShowTemplates(false);
    setReportVisible(false);
    setBusyAction(false);
    actionLock.current = false;
    const defaults: MessageTemplate[] = ['welcome', 'arrival', 'review'].map(key => ({ id: `default:${key}`,
      name: t(`hostFlow.messages.template.${key}`), content: t(`hostFlow.messages.template.${key}Text`), category: 'general' }));
    setTemplates(defaults);
    void (async () => {
      try {
        if (!userId) throw new Error(t('hostFlow.messages.loadError'));
        const rows = await messageService.getHostConversations('all');
        const found = rows.find(row => row.id === conversationId)
          ?? (await messageService.getHostConversations('archived')).find(row => row.id === conversationId);
        if (!active) return;
        if (!found) throw new Error(t('hostFlow.messages.notFound'));
        setConversation(found);
        await session.load();
      } catch (failure) {
        if (active) {
          setState(previous => ({ ...previous, loading: false }));
          session.setError(failure instanceof Error ? failure.message : t('hostFlow.messages.loadError'));
        }
      }
    })();
    void messageService.getTemplates().then(rows => { if (active && rows.length) setTemplates(rows); })
      .catch(() => { if (active) session.setError(t('hostFlow.messages.templatesError')); });
    const channel = supabase.channel(`host-conversation-${userId}-${conversationId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, () => void session.refresh())
      .subscribe(status => {
        if (status === 'SUBSCRIBED') void session.refresh();
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') session.setError(t('hostFlow.messages.connectionError'));
      });
    return () => {
      active = false;
      session.dispose();
      sessionRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [conversationId, userId, scope, retry, t]));

  const changeDraft = (text: string) => sessionRef.current?.setDraft(text);
  const send = async () => {
    const session = sessionRef.current;
    if (!session || !conversation || actionLock.current) return;
    const sent = await session.send(maskContacts(draft.trim()), state.draftRevision);
    if (sent && sessionRef.current === session && scopeRef.current === scope) {
      setShowTemplates(false);
      listRef.current?.scrollToEnd({ animated: true });
    }
  };
  const performAction = async (action: 'archive' | 'report') => {
    if (!conversation || actionLock.current || state.sending) return;
    actionLock.current = true;
    setBusyAction(true);
    const session = sessionRef.current;
    try {
      if (action === 'archive') await messageService.archiveHostConversation(conversationId);
      else await messageService.reportMessage(conversationId, category);
      if (scopeRef.current === scope && sessionRef.current === session) navigation.goBack();
    } catch (failure) {
      if (sessionRef.current === session) session?.setError(failure instanceof Error ? failure.message : t('hostFlow.messages.actionError'));
    } finally {
      if (sessionRef.current === session) { actionLock.current = false; setBusyAction(false); }
    }
  };

  return <HostPage scroll={false}>
    <KeyboardAvoidingView style={s.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.header}>
        <HostHeader title={conversation?.guestName ?? t('hostMessages.title')} subtitle={conversation?.listingTitle}
          onBack={() => navigation.goBack()} />
        {!!conversation && <View style={s.actions}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('hostFlow.messages.archive')}
            disabled={busyAction || state.sending} onPress={() => void performAction('archive')} style={s.action}>
            <MaterialIcons name="archive" size={20} color={colors.inkSubtle} /><Text style={s.actionText}>{t('hostFlow.messages.archive')}</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" disabled={busyAction || state.sending} onPress={() => setReportVisible(true)} style={s.action}>
            <MaterialIcons name="flag" size={20} color={colors.inkSubtle} /><Text style={s.actionText}>{t('hostMessages.report')}</Text>
          </TouchableOpacity>
          {busyAction && !reportVisible && <ActivityIndicator color={colors.primary} />}
        </View>}
      </View>
      {state.error !== null && <HostNotice message={state.error || t('hostFlow.messages.loadError')} onRetry={() => setRetry(value => value + 1)} />}
      {state.loading ? <View style={{ flex: 1 }}><ContentSkeleton variant="conversation" style={{ paddingHorizontal: 20 }} /></View> :
        <FlatList ref={listRef} data={state.messages} keyExtractor={row => row.id} style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={s.messages}
          onContentSizeChange={() => { if (state.messages.length < 31) listRef.current?.scrollToEnd({ animated: false }); }}
          ListHeaderComponent={state.nextCursor ? <HostButton label={t('hostMessages.loadPrevious')} variant="quiet"
            busy={state.loadingMore} onPress={() => void sessionRef.current?.loadMore()} /> : null}
          renderItem={({ item }) => {
            const own = item.senderId === userId;
            return <View style={[s.bubble, own ? s.ownBubble : s.guestBubble]}>
              <Text selectable style={[s.messageText, own && { color: colors.white }]}>{item.content}</Text>
              <View style={s.messageMeta}><Text style={[s.time, own && { color: colors.white }]}>
                {new Date(item.createdAt).toLocaleString(i18n.language, { timeZone: 'Africa/Kigali', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </Text>{own && <MaterialIcons name={item.id.startsWith('pending:') ? 'schedule' : item.isRead ? 'done-all' : 'done'} size={14} color={colors.white} />}</View>
            </View>;
          }} />}
      {hasContacts(draft) && <Text style={s.warning}>{t('hostMessages.contactWarning')}</Text>}
      {showTemplates && <ScrollView horizontal style={s.templates} contentContainerStyle={{ gap: 8, padding: 12 }} keyboardShouldPersistTaps="handled">
        {templates.map(template => <HostButton key={template.id} label={template.name} variant="secondary" onPress={() => {
          changeDraft(template.content.replace(/\{guest_name\}/g, conversation?.guestName ?? '').replace(/\{listing_name\}/g, conversation?.listingTitle ?? ''));
          setShowTemplates(false);
        }} />)}
      </ScrollView>}
      {!!conversation && conversation.status === 'FROZEN' ? <Text style={s.warning}>{t('hostFlow.messages.frozen')}</Text> :
        !!conversation && <View style={s.composer}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('hostFlow.messages.savedReplies')}
            accessibilityState={{ expanded: showTemplates }} style={s.iconButton} disabled={state.sending || busyAction}
            onPress={() => setShowTemplates(value => !value)}><MaterialIcons name="text-snippet" size={23} color={colors.primary} /></TouchableOpacity>
          <TextInput value={draft} onChangeText={changeDraft} editable={!state.sending && !busyAction} multiline maxLength={2000}
            placeholder={t('hostMessages.inputPlaceholder')} accessibilityLabel={t('hostMessages.inputPlaceholder')}
            placeholderTextColor={colors.inkSubtle} style={s.input} />
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('hostFlow.messages.send')}
            accessibilityState={{ busy: state.sending, disabled: !draft.trim() || state.sending || busyAction }}
            disabled={!draft.trim() || state.sending || busyAction} onPress={() => void send()}
            style={[s.send, (!draft.trim() || state.sending || busyAction) && { opacity: 0.5 }]}>
            {state.sending ? <ActivityIndicator color={colors.onAccent} /> : <MaterialIcons name="send" size={21} color={colors.onAccent} />}
          </TouchableOpacity>
        </View>}
    </KeyboardAvoidingView>
    <Modal visible={reportVisible} transparent animationType="fade" onRequestClose={() => !busyAction && setReportVisible(false)}>
      <View style={s.overlay}><View style={s.dialog}>
        <Text accessibilityRole="header" style={s.dialogTitle}>{t('hostMessages.report')}</Text>
        {state.error !== null && <HostNotice message={state.error || t('hostFlow.messages.actionError')} />}
        {categories.map(item => <TouchableOpacity key={item.key} accessibilityRole="radio" accessibilityState={{ checked: item.key === category }}
          disabled={busyAction} onPress={() => setCategory(item.key)} style={s.reportRow}>
          <MaterialIcons name={item.key === category ? 'radio-button-checked' : 'radio-button-unchecked'} size={22} color={colors.primary} />
          <Text style={s.reportText}>{t(`hostMessages.${item.label}`)}</Text>
        </TouchableOpacity>)}
        <HostButton label={t('hostMessages.reportAction')} variant="danger" busy={busyAction} onPress={() => void performAction('report')} />
        <HostButton label={t('common.cancel')} variant="quiet" disabled={busyAction} onPress={() => setReportVisible(false)} />
      </View></View>
    </Modal>
  </HostPage>;
}

const s = StyleSheet.create({
  page: { flex: 1, width: '100%', maxWidth: 760, alignSelf: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, paddingBottom: 8 },
  action: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { fontSize: 14, color: colors.inkSubtle },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  messages: { padding: 16, gap: 12 },
  bubble: { maxWidth: '88%', borderRadius: 12, padding: 12 },
  ownBubble: { alignSelf: 'flex-end', backgroundColor: colors.primary },
  guestBubble: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  messageText: { fontSize: 16, lineHeight: 23, color: colors.ink },
  messageMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center', justifyContent: 'flex-end', marginTop: 7 },
  time: { fontSize: 11, color: colors.inkSubtle },
  warning: { padding: 12, color: colors.ink, backgroundColor: colors.primaryLight, fontSize: 13, lineHeight: 18 },
  templates: { flexGrow: 0, maxHeight: 84, backgroundColor: colors.surface },
  composer: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, gap: 8, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  iconButton: { width: 44, height: 48, justifyContent: 'center', alignItems: 'center' },
  input: { flex: 1, minWidth: 0, minHeight: 48, maxHeight: 120, padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 10, fontSize: 16, lineHeight: 22, color: colors.ink },
  send: { width: 48, height: 48, borderRadius: 12, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center' },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.4)' },
  dialog: { width: '100%', maxWidth: 440, borderRadius: 16, padding: 20, backgroundColor: colors.surface, gap: 8 },
  dialogTitle: { fontSize: 20, fontWeight: '700', color: colors.ink, marginBottom: 8 },
  reportRow: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 12, minHeight: 48 },
  reportText: { flex: 1, fontSize: 16, color: colors.ink },
});
