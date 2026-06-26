import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from 'react-native-paper';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme';
import { useUserStore } from '../store/user';
import {
  messageService,
  HostConversation,
  HostMessage,
  MessageTemplate,
  ConvFilter,
  ReportCategory,
  hasContacts,
  maskContacts,
} from '../services/api/message.service';

// ─── Templates par défaut (Rwanda — location longue durée) ───────────────────
const DEFAULT_TEMPLATES: MessageTemplate[] = [
  {
    id: 'tpl_welcome',
    name: 'Bienvenue',
    category: 'general',
    content:
      'Muraho {guest_name}, murakoze guhitamo {listing_name}. Nishimiye kukwakira. Muze muri ikibazo cyose, nzabisubiza vuba.',
  },
  {
    id: 'tpl_checkin',
    name: 'Entrée',
    category: 'checkin',
    content:
      'Muraho {guest_name}, nongeye kukwibutsa ko winjira ku {checkin_date}. Muza saa {checkin_time}. Code y\'inzugo ni {access_code}.',
  },
  {
    id: 'tpl_wifi',
    name: 'Wi-Fi',
    category: 'info',
    content:
      'Wi-Fi izina: LocaMap_{listing_name}\nPassword: {wifi_password}\nNiba hari ikibazo cyo gutumagana, bwira..',
  },
  {
    id: 'tpl_checkout',
    name: 'Départ',
    category: 'checkout',
    content:
      'Muraho {guest_name}, ugenda ku {checkout_date} saa {checkout_time}. Nyamuneka siga inzugo imbere no gutwika amazi.',
  },
  {
    id: 'tpl_review',
    name: 'Avis',
    category: 'review',
    content:
      'Murakoze cyane {guest_name} kuba mwaratuye {listing_name}. Nshimira ko muzatanga ibitekerezo byanyu kuri LocaMap. Bitwemerera gukomeza kunoza serivisi zacu.',
  },
];

// ─── Filter key definitions (labels resolved via t() in render) ───────────────
const FILTER_KEYS: { key: ConvFilter; labelKey: string }[] = [
  { key: 'all',      labelKey: 'hostMessages.all' },
  { key: 'unread',   labelKey: 'hostMessages.unread' },
  { key: 'archived', labelKey: 'hostMessages.archived' },
];

// ─── Report option key definitions ───────────────────────────────────────────
const REPORT_OPTIONS: { key: ReportCategory; labelKey: string }[] = [
  { key: 'language',   labelKey: 'hostMessages.reportLanguage' },
  { key: 'harassment', labelKey: 'hostMessages.reportHarassment' },
  { key: 'fraud',      labelKey: 'hostMessages.reportFraud' },
  { key: 'spam',       labelKey: 'hostMessages.reportSpam' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatTime = (iso: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return d.toLocaleDateString('fr-FR', { weekday: 'short' });
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

const resolveTemplate = (
  tpl: string,
  vars: Record<string, string>,
): string => {
  let out = tpl;
  Object.entries(vars).forEach(([k, v]) => {
    out = out.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
  });
  return out;
};

// ─── Avatar initials ──────────────────────────────────────────────────────────
const AvatarInitials = ({ name, size = 44 }: { name: string; size?: number }) => (
  <View style={[av.circle, { width: size, height: size, borderRadius: size / 2 }]}>
    <Text style={[av.txt, { fontSize: size * 0.38 }]}>
      {name.trim().charAt(0).toUpperCase()}
    </Text>
  </View>
);
const av = StyleSheet.create({
  circle: { backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  txt:    { fontWeight: '700', color: colors.primary },
});

// ─── Main component ───────────────────────────────────────────────────────────
const HostMessagesScreen = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const currentUserId = useUserStore(s => s.user.id) ?? '';

  // ── List state ─────────────────────────────────────────────────────────────
  const [filter, setFilter] = useState<ConvFilter>('all');
  const [conversations, setConversations] = useState<HostConversation[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  // ── Conversation view state ────────────────────────────────────────────────
  const [activeConv, setActiveConv] = useState<HostConversation | null>(null);
  const [messages, setMessages] = useState<HostMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // ── Compose state ──────────────────────────────────────────────────────────
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<MessageTemplate[]>(DEFAULT_TEMPLATES);
  const [contactWarning, setContactWarning] = useState(false);

  // ── Report modal ───────────────────────────────────────────────────────────
  const [reportVisible, setReportVisible] = useState(false);
  const [reportCategory, setReportCategory] = useState<ReportCategory>('spam');
  const [reporting, setReporting] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  // ── Load conversations ─────────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    try {
      setListError(null);
      const data = await messageService.getHostConversations(filter);
      setConversations(Array.isArray(data) ? data : []);
    } catch {
      setListError(t('hostMessages.title'));
    } finally {
      setLoadingList(false);
    }
  }, [filter, t]);

  useEffect(() => {
    setLoadingList(true);
    loadConversations();
  }, [loadConversations]);

  // ── Load templates once ────────────────────────────────────────────────────
  useEffect(() => {
    messageService.getTemplates()
      .then(data => { if (Array.isArray(data) && data.length > 0) setTemplates(data); })
      .catch(() => {/* keep defaults */});
  }, []);

  // ── Open conversation ──────────────────────────────────────────────────────
  const openConversation = useCallback(async (conv: HostConversation) => {
    setActiveConv(conv);
    setMessages([]);
    setNextCursor(null);
    setLoadingMessages(true);
    try {
      const { messages: msgs, nextCursor: nc } = await messageService.getHostMessages(conv.id);
      setMessages(Array.isArray(msgs) ? msgs : []);
      setNextCursor(nc);
      // Mark as read
      if (conv.unreadCount > 0) {
        await messageService.markHostConversationRead(conv.id).catch(() => {});
        setConversations(prev =>
          prev.map(c => c.id === conv.id ? { ...c, unreadCount: 0 } : c),
        );
      }
    } catch {
      /* show empty */
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // ── Load more (pagination) ─────────────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (!activeConv || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const { messages: older, nextCursor: nc } =
        await messageService.getHostMessages(activeConv.id, nextCursor);
      setMessages(prev => [...(Array.isArray(older) ? older : []), ...prev]);
      setNextCursor(nc);
    } catch {/* silent */} finally {
      setLoadingMore(false);
    }
  }, [activeConv, nextCursor, loadingMore]);

  // ── Send message ───────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    if (!activeConv || !draft.trim() || sending) return;
    const content = maskContacts(draft.trim());
    setSending(true);
    const optimistic: HostMessage = {
      id: `opt_${Date.now()}`,
      conversationId: activeConv.id,
      senderId: currentUserId,
      senderName: 'Vous',
      content,
      isRead: false,
      createdAt: new Date().toISOString(),
      templateId: null,
    };
    setMessages(prev => [...prev, optimistic]);
    setDraft('');
    setShowTemplates(false);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    try {
      const sent = await messageService.sendHostMessage(activeConv.id, content);
      setMessages(prev => prev.map(m => m.id === optimistic.id ? sent : m));
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      setDraft(content);
    } finally {
      setSending(false);
    }
  }, [activeConv, draft, sending, currentUserId]);

  // ── Draft change with contact detection ───────────────────────────────────
  const handleDraftChange = (text: string) => {
    setDraft(text);
    setContactWarning(hasContacts(text));
  };

  // ── Insert template ────────────────────────────────────────────────────────
  const insertTemplate = (tpl: MessageTemplate) => {
    const resolved = resolveTemplate(tpl.content, {
      guest_name: activeConv?.guestName ?? 'Client',
      listing_name: activeConv?.listingTitle ?? '',
      checkin_date: '',
      checkout_date: '',
      checkin_time: '14h00',
      checkout_time: '10h00',
      access_code: '****',
      wifi_password: '****',
    });
    setDraft(resolved);
    setShowTemplates(false);
  };

  // ── Archive ────────────────────────────────────────────────────────────────
  const handleArchive = async () => {
    if (!activeConv) return;
    await messageService.archiveHostConversation(activeConv.id).catch(() => {});
    setConversations(prev => prev.filter(c => c.id !== activeConv.id));
    setActiveConv(null);
  };

  // ── Report ─────────────────────────────────────────────────────────────────
  const handleReport = async () => {
    if (!activeConv) return;
    setReporting(true);
    try {
      await messageService.reportMessage(activeConv.id, reportCategory);
      setReportVisible(false);
      setActiveConv(null);
    } catch {/* silent */} finally {
      setReporting(false);
    }
  };

  // ── Filtered conversations ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = conversations;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        c =>
          c.guestName.toLowerCase().includes(q) ||
          c.listingTitle.toLowerCase().includes(q) ||
          (c.lastMessageText ?? '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [conversations, searchQuery]);

  // ─── CONVERSATION VIEW ────────────────────────────────────────────────────
  if (activeConv) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" />

        {/* Header conv */}
        <View style={s.convHeader}>
          <TouchableOpacity style={s.backBtn} onPress={() => setActiveConv(null)} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={22} color={colors.ink} />
          </TouchableOpacity>
          <View style={s.convHeaderCenter}>
            <AvatarInitials name={activeConv.guestName} size={36} />
            <View>
              <Text style={s.convHeaderName}>{activeConv.guestName}</Text>
              <Text style={s.convHeaderSub} numberOfLines={1}>{activeConv.listingTitle}</Text>
            </View>
          </View>
          <View style={s.convHeaderActions}>
            <TouchableOpacity
              style={s.headerIconBtn}
              onPress={handleArchive}
              activeOpacity={0.7}
            >
              <MaterialIcons name="archive" size={20} color={colors.inkSubtle} />
            </TouchableOpacity>
            <TouchableOpacity
              style={s.headerIconBtn}
              onPress={() => setReportVisible(true)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="flag" size={20} color={colors.inkSubtle} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Messages */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={insets.top + 56}
        >
          {loadingMessages ? (
            <View style={s.centered}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={m => m.id}
              contentContainerStyle={s.messagesList}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
              ListHeaderComponent={
                nextCursor ? (
                  <TouchableOpacity style={s.loadMoreBtn} onPress={loadMore} disabled={loadingMore}>
                    {loadingMore
                      ? <ActivityIndicator size="small" color={colors.primary} />
                      : <Text style={s.loadMoreTxt}>{t('hostMessages.loadPrevious')}</Text>
                    }
                  </TouchableOpacity>
                ) : null
              }
              renderItem={({ item }) => {
                const isMe = item.senderId === currentUserId;
                return (
                  <View style={[s.msgRow, isMe && s.msgRowMe]}>
                    {!isMe && (
                      <AvatarInitials name={activeConv.guestName} size={28} />
                    )}
                    <View style={[s.bubble, isMe ? s.bubbleMe : s.bubbleOther]}>
                      <Text style={[s.bubbleTxt, isMe && s.bubbleTxtMe]}>
                        {item.content}
                      </Text>
                      <Text style={[s.bubbleTime, isMe && s.bubbleTimeMe]}>
                        {formatTime(item.createdAt)}
                        {isMe && (
                          <Text>
                            {' '}
                            <MaterialIcons
                              name={item.isRead ? 'done-all' : 'done'}
                              size={11}
                              color={item.isRead ? colors.primaryMid : colors.inkDisabled}
                            />
                          </Text>
                        )}
                      </Text>
                    </View>
                  </View>
                );
              }}
            />
          )}

          {/* Contact warning */}
          {contactWarning && (
            <View style={s.warningBanner}>
              <MaterialIcons name="warning" size={14} color={colors.warning} />
              <Text style={s.warningTxt}>
                {t('hostMessages.contactWarning')}
              </Text>
            </View>
          )}

          {/* Templates */}
          {showTemplates && (
            <View style={s.tplStrip}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tplScroll}>
                {templates.map(tpl => (
                  <TouchableOpacity
                    key={tpl.id}
                    style={s.tplChip}
                    onPress={() => insertTemplate(tpl)}
                    activeOpacity={0.8}
                  >
                    <Text style={s.tplChipTxt}>{tpl.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Compose bar */}
          <View style={[s.composeBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
            <TouchableOpacity
              style={[s.tplToggle, showTemplates && s.tplToggleActive]}
              onPress={() => setShowTemplates(v => !v)}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name="auto-fix-high"
                size={20}
                color={showTemplates ? colors.primary : colors.inkSubtle}
              />
            </TouchableOpacity>
            <View style={s.inputWrap}>
              <TextInput
                style={s.input}
                value={draft}
                onChangeText={handleDraftChange}
                placeholder={t('hostMessages.inputPlaceholder') as string}
                placeholderTextColor={colors.inkDisabled}
                multiline
                maxLength={2000}
              />
            </View>
            <TouchableOpacity
              style={[s.sendBtn, (!draft.trim() || sending) && s.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!draft.trim() || sending}
              activeOpacity={0.85}
            >
              {sending
                ? <ActivityIndicator size="small" color={colors.white} />
                : <MaterialIcons name="send" size={18} color={colors.white} />
              }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        {/* Report modal */}
        <Modal
          visible={reportVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setReportVisible(false)}
        >
          <View style={s.modalOverlay}>
            <Animated.View entering={FadeInDown.duration(220)} style={s.reportCard}>
              <Text style={s.reportTitle}>{t('hostMessages.report')}</Text>
              {REPORT_OPTIONS.map(r => (
                <TouchableOpacity
                  key={r.key}
                  style={[s.reportOption, reportCategory === r.key && s.reportOptionActive]}
                  onPress={() => setReportCategory(r.key)}
                  activeOpacity={0.8}
                >
                  <View style={s.reportRadio}>
                    {reportCategory === r.key && <View style={s.reportRadioInner} />}
                  </View>
                  <Text style={s.reportOptionTxt}>{t(r.labelKey)}</Text>
                </TouchableOpacity>
              ))}
              <View style={s.reportActions}>
                <TouchableOpacity
                  style={s.reportCancel}
                  onPress={() => setReportVisible(false)}
                  activeOpacity={0.8}
                >
                  <Text style={s.reportCancelTxt}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.reportConfirm}
                  onPress={handleReport}
                  disabled={reporting}
                  activeOpacity={0.85}
                >
                  {reporting
                    ? <ActivityIndicator size="small" color={colors.white} />
                    : <Text style={s.reportConfirmTxt}>{t('hostMessages.reportAction')}</Text>
                  }
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </Modal>
      </View>
    );
  }

  // ─── CONVERSATIONS LIST ───────────────────────────────────────────────────
  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={s.listHeader}>
        <Text style={s.listTitle}>{t('hostMessages.title')}</Text>
      </View>

      {/* Search */}
      <View style={s.searchBar}>
        <MaterialIcons name="search" size={18} color={colors.inkSubtle} style={{ marginRight: 8 }} />
        <TextInput
          style={s.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t('hostMessages.search') as string}
          placeholderTextColor={colors.inkDisabled}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialIcons name="close" size={16} color={colors.inkSubtle} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter tabs */}
      <View style={s.filterRow}>
        {FILTER_KEYS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[s.filterTab, filter === f.key && s.filterTabActive]}
            onPress={() => setFilter(f.key)}
            activeOpacity={0.8}
          >
            <Text style={[s.filterTabTxt, filter === f.key && s.filterTabTxtActive]}>
              {t(f.labelKey)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {loadingList ? (
        <View style={s.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : listError ? (
        <View style={s.centered}>
          <MaterialIcons name="cloud-off" size={36} color={colors.inkDisabled} />
          <Text style={s.errorTxt}>{listError}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={loadConversations} activeOpacity={0.8}>
            <Text style={s.retryTxt}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : filtered.length === 0 ? (
        <View style={s.centered}>
          <MaterialIcons name="chat-bubble-outline" size={44} color={colors.inkDisabled} />
          <Text style={s.emptyTitle}>
            {filter === 'archived'
              ? t('hostMessages.emptyArchived')
              : filter === 'unread'
              ? t('hostMessages.emptyUnread')
              : t('hostMessages.empty')}
          </Text>
          <Text style={s.emptySubtitle}>
            {t('hostMessages.emptySubtitle')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={c => c.id}
          contentContainerStyle={{ paddingBottom: 110 }}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 40).duration(280)}>
              <TouchableOpacity
                style={[s.convRow, item.unreadCount > 0 && s.convRowUnread]}
                onPress={() => openConversation(item)}
                activeOpacity={0.8}
              >
                <View style={s.convAvatar}>
                  <AvatarInitials name={item.guestName} size={46} />
                  {item.unreadCount > 0 && <View style={s.unreadDot} />}
                </View>
                <View style={s.convContent}>
                  <View style={s.convTopRow}>
                    <Text style={[s.convName, item.unreadCount > 0 && s.convNameUnread]}>
                      {item.guestName}
                    </Text>
                    <Text style={s.convTime}>{formatTime(item.lastMessageAt)}</Text>
                  </View>
                  <Text style={s.convListing} numberOfLines={1}>
                    {item.listingTitle}
                  </Text>
                  <View style={s.convBottomRow}>
                    <Text
                      style={[s.convPreview, item.unreadCount > 0 && s.convPreviewUnread]}
                      numberOfLines={1}
                    >
                      {item.lastMessageSenderId === currentUserId ? 'Vous : ' : ''}
                      {item.lastMessageText ?? '—'}
                    </Text>
                    {item.unreadCount > 0 && (
                      <View style={s.unreadBadge}>
                        <Text style={s.unreadBadgeTxt}>
                          {item.unreadCount > 9 ? '9+' : item.unreadCount}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
              <View style={s.separator} />
            </Animated.View>
          )}
        />
      )}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: colors.background },
  centered:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  errorTxt:     { fontSize: 14, color: colors.inkSubtle, textAlign: 'center' },
  retryBtn:     { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, borderWidth: 1.5, borderColor: colors.primary },
  retryTxt:     { fontSize: 14, fontWeight: '600', color: colors.primary },

  // List header
  listHeader:   { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10 },
  listTitle:    { fontSize: 24, fontWeight: '700', color: colors.ink, letterSpacing: -0.4 },

  // Search
  searchBar:    { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 12, backgroundColor: colors.surfaceSunken, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 8 },
  searchInput:  { flex: 1, fontSize: 14, color: colors.ink, padding: 0 },

  // Filter tabs
  filterRow:    { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 8, gap: 6 },
  filterTab:    { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  filterTabActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  filterTabTxt: { fontSize: 12, fontWeight: '600', color: colors.inkSubtle },
  filterTabTxtActive: { color: colors.primary },

  // Conversation row
  convRow:       { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 14, gap: 14, backgroundColor: colors.surface },
  convRowUnread: { backgroundColor: colors.primaryLight + '44' },
  convAvatar:    { position: 'relative' },
  unreadDot:     { position: 'absolute', top: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary, borderWidth: 2, borderColor: colors.surface },
  convContent:   { flex: 1 },
  convTopRow:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  convName:      { fontSize: 15, fontWeight: '500', color: colors.ink },
  convNameUnread:{ fontWeight: '700' },
  convTime:      { fontSize: 11, color: colors.inkSubtle },
  convListing:   { fontSize: 12, color: colors.inkSubtle, marginBottom: 3 },
  convBottomRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  convPreview:   { flex: 1, fontSize: 13, color: colors.inkSubtle },
  convPreviewUnread: { color: colors.inkMid, fontWeight: '600' },
  unreadBadge:   { backgroundColor: colors.primary, borderRadius: 9, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  unreadBadgeTxt:{ fontSize: 10, fontWeight: '700', color: colors.white },
  separator:     { height: 1, backgroundColor: colors.border, marginLeft: 80 },

  // Empty
  emptyTitle:    { fontSize: 16, fontWeight: '700', color: colors.ink, textAlign: 'center' },
  emptySubtitle: { fontSize: 13, color: colors.inkSubtle, textAlign: 'center', lineHeight: 19, maxWidth: 240 },

  // Conversation view — header
  convHeader:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface, gap: 10 },
  backBtn:          { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
  convHeaderCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  convHeaderName:   { fontSize: 15, fontWeight: '700', color: colors.ink },
  convHeaderSub:    { fontSize: 11, color: colors.inkSubtle },
  convHeaderActions:{ flexDirection: 'row', gap: 4 },
  headerIconBtn:    { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },

  // Messages
  messagesList:  { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  loadMoreBtn:   { alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 16, marginBottom: 8 },
  loadMoreTxt:   { fontSize: 12, color: colors.primary, fontWeight: '600' },
  msgRow:        { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgRowMe:      { flexDirection: 'row-reverse' },
  bubble:        { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 9 },
  bubbleOther:   { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
  bubbleMe:      { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleTxt:     { fontSize: 14, color: colors.ink, lineHeight: 20 },
  bubbleTxtMe:   { color: colors.white },
  bubbleTime:    { fontSize: 10, color: colors.inkSubtle, marginTop: 4, textAlign: 'right' },
  bubbleTimeMe:  { color: colors.white + 'CC' },

  // Warning banner
  warningBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.warning + '18', paddingVertical: 8, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: colors.warning + '33' },
  warningTxt:    { fontSize: 12, color: colors.warning, fontWeight: '500', flex: 1 },

  // Templates
  tplStrip:      { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  tplScroll:     { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  tplChip:       { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: colors.primaryLight, borderWidth: 1.5, borderColor: colors.primary + '44' },
  tplChipTxt:    { fontSize: 12, fontWeight: '700', color: colors.primary },

  // Compose bar
  composeBar:    { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingTop: 10, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, gap: 8 },
  tplToggle:     { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
  tplToggleActive: { backgroundColor: colors.primaryLight },
  inputWrap:     { flex: 1, backgroundColor: colors.surfaceSunken, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 8, maxHeight: 120 },
  input:         { fontSize: 14, color: colors.ink, padding: 0 },
  sendBtn:       { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.35 },

  // Report modal
  modalOverlay:  { flex: 1, backgroundColor: 'rgba(15,31,31,0.5)', justifyContent: 'center', padding: 24 },
  reportCard:    { backgroundColor: colors.surface, borderRadius: 16, padding: 22, borderWidth: 1, borderColor: colors.border },
  reportTitle:   { fontSize: 16, fontWeight: '700', color: colors.ink, marginBottom: 16 },
  reportOption:  { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderRadius: 8, paddingHorizontal: 4 },
  reportOptionActive: { backgroundColor: colors.primaryLight },
  reportRadio:   { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  reportRadioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  reportOptionTxt:  { fontSize: 14, color: colors.ink },
  reportActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  reportCancel:  { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center' },
  reportCancelTxt: { fontSize: 14, fontWeight: '600', color: colors.inkMid },
  reportConfirm: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: colors.error, alignItems: 'center' },
  reportConfirmTxt: { fontSize: 14, fontWeight: '700', color: colors.white },
});

export default HostMessagesScreen;
