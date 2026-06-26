import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Linking,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from 'react-native-paper';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme';
import { useUserStore } from '../store/user';
import {
  supportService,
  SupportTicket,
  TicketMessage,
  FaqItem,
  TicketPriority,
  TicketStatus,
  CreateTicketPayload,
  ChatAvailability,
  SLA_HOURS,
} from '../services/api';

// ─── Constants ─────────────────────────────────────────────────────────────────
const WHATSAPP_NUMBER = '250788000000'; // Rwanda +250

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-RW', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

const formatTimeAgo = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'Il y a moins d\'1h';
  if (h < 24) return `Il y a ${h}h`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'Hier' : `Il y a ${d} jours`;
};

const buildWhatsAppMsg = (fullName: string | null): string => {
  const name = fullName ?? 'Hôte';
  return encodeURIComponent(
    `Bonjour LocaMap Support,\nJe suis ${name}, hôte sur LocaMap Rwanda.\nJ'ai besoin d'aide concernant : `,
  );
};

// ─── Priority badge ───────────────────────────────────────────────────────────
const PriorityBadge = ({ priority }: { priority: TicketPriority }) => {
  const { t } = useTranslation();
  const PRIORITY_CONFIG: Record<
    TicketPriority,
    { label: string; color: string; bg: string; desc: string; icon: React.ComponentProps<typeof MaterialIcons>['name'] }
  > = {
    URGENT: { label: t('hostSupport.priorityUrgent'),  color: colors.error,     bg: colors.error + '14',   icon: 'emergency',           desc: t('hostSupport.priorityUrgentDesc') },
    HIGH:   { label: t('hostSupport.priorityHigh'),    color: colors.warning,   bg: colors.warning + '18', icon: 'priority-high',       desc: t('hostSupport.priorityHighDesc') },
    NORMAL: { label: t('hostSupport.priorityNormal'),  color: colors.primary,   bg: colors.primaryLight,   icon: 'remove',              desc: t('hostSupport.priorityNormalDesc') },
    LOW:    { label: t('hostSupport.priorityLow'),     color: colors.inkSubtle, bg: colors.surfaceSunken,  icon: 'keyboard-arrow-down', desc: t('hostSupport.priorityLowDesc') },
  };
  const cfg = PRIORITY_CONFIG[priority];
  return (
    <View style={[pb.wrap, { backgroundColor: cfg.bg }]}>
      <MaterialIcons name={cfg.icon} size={11} color={cfg.color} />
      <Text style={[pb.txt, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
};
const pb = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 },
  txt:  { fontSize: 10, fontWeight: '700' },
});

// ─── Status badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: TicketStatus }) => {
  const { t } = useTranslation();
  const STATUS_CONFIG: Record<
    TicketStatus,
    { label: string; color: string; bg: string }
  > = {
    OPEN:         { label: t('hostSupport.statusOpen'),       color: colors.primary,     bg: colors.primaryLight },
    IN_PROGRESS:  { label: t('hostSupport.statusInProgress'), color: colors.warning,     bg: colors.warning + '18' },
    WAITING_HOST: { label: t('hostSupport.statusWaiting'),    color: colors.error,       bg: colors.error + '14' },
    RESOLVED:     { label: t('hostSupport.statusResolved'),   color: colors.success,     bg: colors.success + '18' },
    CLOSED:       { label: t('hostSupport.statusClosed'),     color: colors.inkDisabled, bg: colors.surfaceSunken },
  };
  const cfg = STATUS_CONFIG[status];
  return (
    <View style={[stb.wrap, { backgroundColor: cfg.bg }]}>
      <Text style={[stb.txt, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
};
const stb = StyleSheet.create({
  wrap: { borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 },
  txt:  { fontSize: 10, fontWeight: '700' },
});

// ─── Ticket row ───────────────────────────────────────────────────────────────
const TicketRow = ({ ticket, onPress }: { ticket: SupportTicket; onPress: () => void }) => (
  <TouchableOpacity style={tr.row} onPress={onPress} activeOpacity={0.82}>
    <View style={tr.left}>
      <View style={tr.topRow}>
        <PriorityBadge priority={ticket.priority} />
        <StatusBadge status={ticket.status} />
        {ticket.unreadReplies > 0 && (
          <View style={tr.unreadBadge}>
            <Text style={tr.unreadTxt}>{ticket.unreadReplies}</Text>
          </View>
        )}
      </View>
      <Text style={tr.subject} numberOfLines={1}>{ticket.subject}</Text>
      <Text style={tr.meta}>
        {formatTimeAgo(ticket.createdAt)} · SLA {SLA_HOURS[ticket.priority]}h
      </Text>
    </View>
    <MaterialIcons name="chevron-right" size={20} color={colors.inkDisabled} />
  </TouchableOpacity>
);
const tr = StyleSheet.create({
  row:        { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  left:       { flex: 1 },
  topRow:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
  subject:    { fontSize: 14, fontWeight: '600', color: colors.ink, marginBottom: 3 },
  meta:       { fontSize: 11, color: colors.inkSubtle },
  unreadBadge:{ backgroundColor: colors.primary, borderRadius: 8, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  unreadTxt:  { fontSize: 9, fontWeight: '700', color: colors.white },
});

// ─── Ticket detail modal ──────────────────────────────────────────────────────
const TicketDetailModal = ({
  ticketId,
  currentUserId,
  onClose,
}: {
  ticketId: string;
  currentUserId: string;
  onClose: () => void;
}) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const flatRef = useRef<FlatList>(null);

  useEffect(() => {
    supportService.getTicket(ticketId)
      .then(({ ticket: tk, messages: m }) => {
        setTicket(tk);
        setMessages(Array.isArray(m) ? m : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [ticketId]);

  const handleSend = async () => {
    if (!reply.trim() || sending) return;
    setSending(true);
    const content = reply.trim();
    const optimistic: TicketMessage = {
      id: `opt_${Date.now()}`,
      senderId: currentUserId,
      senderName: 'Vous',
      isSupport: false,
      content,
      createdAt: new Date().toISOString(),
      rating: null,
    };
    setMessages(prev => [...prev, optimistic]);
    setReply('');
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 80);
    try {
      const sent = await supportService.replyTicket(ticketId, content);
      setMessages(prev => prev.map(m => m.id === optimistic.id ? sent : m));
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      setReply(content);
    } finally {
      setSending(false);
    }
  };

  const handleRate = async (msgId: string, rating: 1 | -1) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, rating } : m));
    await supportService.rateMessage(ticketId, msgId, rating).catch(() => {});
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[tdm.root, { paddingTop: insets.top }]}>
        <View style={tdm.bar}>
          <TouchableOpacity style={tdm.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={22} color={colors.ink} />
          </TouchableOpacity>
          <Text style={tdm.barTitle} numberOfLines={1}>
            {ticket?.subject ?? 'Ticket'}
          </Text>
          {ticket && (
            <View style={tdm.barBadges}>
              <StatusBadge status={ticket.status} />
            </View>
          )}
        </View>

        {loading ? (
          <View style={tdm.centered}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={insets.top + 56}
          >
            <FlatList
              ref={flatRef}
              data={messages}
              keyExtractor={m => m.id}
              contentContainerStyle={tdm.msgList}
              onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
              ListHeaderComponent={
                ticket ? (
                  <View style={tdm.ticketInfo}>
                    <PriorityBadge priority={ticket.priority} />
                    <Text style={tdm.ticketDate}>Ouvert le {formatDate(ticket.createdAt)}</Text>
                    <Text style={tdm.ticketDesc}>{ticket.description}</Text>
                  </View>
                ) : null
              }
              renderItem={({ item }) => (
                <View style={[tdm.bubble, item.isSupport ? tdm.bubbleSupport : tdm.bubbleHost]}>
                  {item.isSupport && (
                    <View style={tdm.supportLabel}>
                      <MaterialIcons name="support-agent" size={12} color={colors.primary} />
                      <Text style={tdm.supportLabelTxt}>Support LocaMap</Text>
                    </View>
                  )}
                  <Text style={[tdm.bubbleTxt, !item.isSupport && tdm.bubbleTxtHost]}>
                    {item.content}
                  </Text>
                  <Text style={[tdm.bubbleTime, !item.isSupport && tdm.bubbleTimeHost]}>
                    {formatTimeAgo(item.createdAt)}
                  </Text>
                  {item.isSupport && item.rating === null && (
                    <View style={tdm.ratingRow}>
                      <Text style={tdm.ratingLabel}>{t('hostSupport.ratingQuestion')}</Text>
                      <TouchableOpacity style={tdm.rateBtn} onPress={() => handleRate(item.id, 1)} activeOpacity={0.8}>
                        <MaterialIcons name="thumb-up-off-alt" size={16} color={colors.success} />
                      </TouchableOpacity>
                      <TouchableOpacity style={tdm.rateBtn} onPress={() => handleRate(item.id, -1)} activeOpacity={0.8}>
                        <MaterialIcons name="thumb-down-off-alt" size={16} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  )}
                  {item.rating === 1 && (
                    <Text style={[tdm.ratedTxt, { color: colors.success }]}>{t('hostSupport.ratingUseful')}</Text>
                  )}
                  {item.rating === -1 && (
                    <Text style={[tdm.ratedTxt, { color: colors.error }]}>{t('hostSupport.ratingUseless')}</Text>
                  )}
                </View>
              )}
            />
            {ticket?.status !== 'RESOLVED' && ticket?.status !== 'CLOSED' && (
              <View style={[tdm.compose, { paddingBottom: Math.max(insets.bottom, 8) }]}>
                <View style={tdm.inputWrap}>
                  <TextInput
                    style={tdm.input}
                    value={reply}
                    onChangeText={setReply}
                    placeholder={t('hostSupport.replyPlaceholder')}
                    placeholderTextColor={colors.inkDisabled}
                    multiline
                    maxLength={2000}
                  />
                </View>
                <TouchableOpacity
                  style={[tdm.sendBtn, (!reply.trim() || sending) && tdm.sendBtnOff]}
                  onPress={handleSend}
                  disabled={!reply.trim() || sending}
                  activeOpacity={0.85}
                >
                  {sending
                    ? <ActivityIndicator size="small" color={colors.white} />
                    : <MaterialIcons name="send" size={18} color={colors.white} />
                  }
                </TouchableOpacity>
              </View>
            )}
          </KeyboardAvoidingView>
        )}
      </View>
    </Modal>
  );
};

const tdm = StyleSheet.create({
  root:         { flex: 1, backgroundColor: colors.background },
  bar:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 10, backgroundColor: colors.surface },
  closeBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
  barTitle:     { flex: 1, fontSize: 15, fontWeight: '700', color: colors.ink },
  barBadges:    { flexShrink: 0 },
  centered:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  msgList:      { padding: 16, gap: 10, paddingBottom: 20 },
  ticketInfo:   { backgroundColor: colors.surfaceSunken, borderRadius: 10, padding: 14, marginBottom: 16, gap: 6 },
  ticketDate:   { fontSize: 11, color: colors.inkSubtle },
  ticketDesc:   { fontSize: 13, color: colors.inkMid, lineHeight: 18 },
  bubble:       { borderRadius: 14, padding: 12, maxWidth: '88%' },
  bubbleSupport:{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  bubbleHost:   { backgroundColor: colors.primary, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  supportLabel: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  supportLabelTxt: { fontSize: 10, fontWeight: '700', color: colors.primary },
  bubbleTxt:    { fontSize: 14, color: colors.ink, lineHeight: 20 },
  bubbleTxtHost:{ color: colors.white },
  bubbleTime:   { fontSize: 10, color: colors.inkSubtle, marginTop: 5 },
  bubbleTimeHost: { color: colors.white + 'AA' },
  ratingRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border },
  ratingLabel:  { flex: 1, fontSize: 11, color: colors.inkSubtle },
  rateBtn:      { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
  ratedTxt:     { fontSize: 11, fontWeight: '600', marginTop: 6 },
  compose:      { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  inputWrap:    { flex: 1, backgroundColor: colors.surfaceSunken, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 8, maxHeight: 120 },
  input:        { fontSize: 14, color: colors.ink, padding: 0 },
  sendBtn:      { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnOff:   { opacity: 0.35 },
});

// ─── New ticket modal ─────────────────────────────────────────────────────────
const NewTicketModal = ({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (ticket: SupportTicket) => void;
}) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const CATEGORIES = [
    { key: 'reservation', label: t('hostSupport.catReservation') },
    { key: 'payment',     label: t('hostSupport.catPayment') },
    { key: 'listing',     label: t('hostSupport.catListing') },
    { key: 'security',    label: t('hostSupport.catFaqSecurity') },
    { key: 'account',     label: t('hostSupport.catAccount') },
    { key: 'other',       label: t('hostSupport.catOther') },
  ];

  const PRIORITY_CONFIG: Record<
    TicketPriority,
    { label: string; color: string; bg: string; desc: string; icon: React.ComponentProps<typeof MaterialIcons>['name'] }
  > = {
    URGENT: { label: t('hostSupport.priorityUrgent'),  color: colors.error,     bg: colors.error + '14',   icon: 'emergency',           desc: t('hostSupport.priorityUrgentDesc') },
    HIGH:   { label: t('hostSupport.priorityHigh'),    color: colors.warning,   bg: colors.warning + '18', icon: 'priority-high',       desc: t('hostSupport.priorityHighDesc') },
    NORMAL: { label: t('hostSupport.priorityNormal'),  color: colors.primary,   bg: colors.primaryLight,   icon: 'remove',              desc: t('hostSupport.priorityNormalDesc') },
    LOW:    { label: t('hostSupport.priorityLow'),     color: colors.inkSubtle, bg: colors.surfaceSunken,  icon: 'keyboard-arrow-down', desc: t('hostSupport.priorityLowDesc') },
  };

  const [category, setCategory] = useState('reservation');
  const [priority, setPriority] = useState<TicketPriority>('NORMAL');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!subject.trim() || !description.trim()) {
      setError(t('hostSupport.subjectRequired'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const ticket = await supportService.createTicket({
        category, priority, subject: subject.trim(), description: description.trim(),
      });
      onCreated(ticket);
    } catch {
      setError(t('hostSupport.createError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[ntm.bar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={ntm.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <MaterialIcons name="close" size={22} color={colors.ink} />
          </TouchableOpacity>
          <Text style={ntm.barTitle}>Nouveau ticket</Text>
        </View>
        <ScrollView contentContainerStyle={ntm.scroll} keyboardShouldPersistTaps="handled">
          {/* Category */}
          <Text style={ntm.sectionLabel}>{t('hostSupport.categoryLabel')}</Text>
          <View style={ntm.chipRow}>
            {CATEGORIES.map(c => (
              <TouchableOpacity
                key={c.key}
                style={[ntm.chip, category === c.key && ntm.chipActive]}
                onPress={() => setCategory(c.key)}
                activeOpacity={0.8}
              >
                <Text style={[ntm.chipTxt, category === c.key && ntm.chipTxtActive]}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Priority */}
          <Text style={[ntm.sectionLabel, { marginTop: 20 }]}>{t('hostSupport.priorityLabel')}</Text>
          {(['URGENT', 'HIGH', 'NORMAL', 'LOW'] as TicketPriority[]).map(p => {
            const cfg = PRIORITY_CONFIG[p];
            const active = priority === p;
            return (
              <TouchableOpacity
                key={p}
                style={[ntm.priorityRow, active && { borderColor: cfg.color, backgroundColor: cfg.bg }]}
                onPress={() => setPriority(p)}
                activeOpacity={0.8}
              >
                <View style={ntm.radio}>
                  {active && <View style={[ntm.radioInner, { backgroundColor: cfg.color }]} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[ntm.priorityLabel, active && { color: cfg.color }]}>{cfg.label}</Text>
                  <Text style={ntm.priorityDesc}>{cfg.desc}</Text>
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Subject */}
          <Text style={[ntm.sectionLabel, { marginTop: 20 }]}>{t('hostSupport.subjectLabel')}</Text>
          <View style={ntm.inputWrap}>
            <TextInput
              style={ntm.input}
              value={subject}
              onChangeText={setSubject}
              placeholder={t('hostSupport.subjectPlaceholder')}
              placeholderTextColor={colors.inkDisabled}
              maxLength={120}
            />
          </View>

          {/* Description */}
          <Text style={[ntm.sectionLabel, { marginTop: 14 }]}>{t('hostSupport.descriptionLabel')}</Text>
          <View style={[ntm.inputWrap, { minHeight: 100 }]}>
            <TextInput
              style={[ntm.input, { textAlignVertical: 'top', paddingTop: 4 }]}
              value={description}
              onChangeText={setDescription}
              placeholder={t('hostSupport.descriptionPlaceholder')}
              placeholderTextColor={colors.inkDisabled}
              multiline
              maxLength={2000}
            />
          </View>
          {description.length > 0 && (
            <Text style={ntm.charCount}>{description.length}/2000</Text>
          )}

          {error && (
            <View style={ntm.errorBanner}>
              <MaterialIcons name="error-outline" size={14} color={colors.error} />
              <Text style={ntm.errorTxt}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[ntm.submitBtn, submitting && ntm.submitBtnOff]}
            onPress={handleCreate}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting
              ? <ActivityIndicator size="small" color={colors.white} />
              : (
                <>
                  <MaterialIcons name="send" size={16} color={colors.white} />
                  <Text style={ntm.submitTxt}>{t('hostSupport.submitTicket')}</Text>
                </>
              )
            }
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};
const ntm = StyleSheet.create({
  bar:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  closeBtn:  { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
  barTitle:  { fontSize: 17, fontWeight: '700', color: colors.ink },
  scroll:    { padding: 20 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: colors.inkDisabled, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  chipRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:      { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive:{ borderColor: colors.primary, backgroundColor: colors.primaryLight },
  chipTxt:   { fontSize: 13, fontWeight: '600', color: colors.inkSubtle },
  chipTxtActive: { color: colors.primary },
  priorityRow:{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, marginBottom: 8 },
  radio:     { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  radioInner:{ width: 10, height: 10, borderRadius: 5 },
  priorityLabel: { fontSize: 14, fontWeight: '700', color: colors.ink, marginBottom: 2 },
  priorityDesc:  { fontSize: 12, color: colors.inkSubtle, lineHeight: 16 },
  inputWrap: { backgroundColor: colors.surfaceSunken, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 4 },
  input:     { fontSize: 14, color: colors.ink, padding: 0 },
  charCount: { fontSize: 10, color: colors.inkDisabled, textAlign: 'right', marginBottom: 8 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.error + '12', borderRadius: 8, padding: 10, marginBottom: 12 },
  errorTxt:  { fontSize: 13, color: colors.error },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, marginTop: 4 },
  submitBtnOff: { opacity: 0.4 },
  submitTxt: { fontSize: 15, fontWeight: '700', color: colors.white },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
type Tab = 'contact' | 'faq' | 'tickets';

const HostSupportScreen = () => {
  const insets = useSafeAreaInsets();
  const fullName = useUserStore(s => s.user.fullName);
  const { t } = useTranslation();

  const FAQ_CATEGORIES = [
    { key: '',            label: t('hostSupport.catAll') },
    { key: 'reservation', label: t('hostSupport.catFaqReservations') },
    { key: 'payment',     label: t('hostSupport.catFaqPayments') },
    { key: 'listing',     label: t('hostSupport.catFaqListings') },
    { key: 'security',    label: t('hostSupport.catFaqSecurity') },
  ];

  const [tab, setTab] = useState<Tab>('contact');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [faqItems, setFaqItems] = useState<FaqItem[]>([]);
  const [chatAvail, setChatAvail] = useState<ChatAvailability | null>(null);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [loadingFaq, setLoadingFaq] = useState(false);
  const [faqQuery, setFaqQuery] = useState('');
  const [faqCategory, setFaqCategory] = useState('');
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [newTicketVisible, setNewTicketVisible] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  // ── Load chat availability ─────────────────────────────────────────────────
  useEffect(() => {
    supportService.getChatAvailability()
      .then(a => setChatAvail(a ?? null))
      .catch(() => {});
  }, []);

  // ── Load tickets ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (tab !== 'tickets') return;
    setLoadingTickets(true);
    supportService.getTickets()
      .then(data => setTickets(data))
      .catch(() => {})
      .finally(() => setLoadingTickets(false));
  }, [tab]);

  // ── Search FAQ ─────────────────────────────────────────────────────────────
  const searchFaq = useCallback(async () => {
    if (!faqQuery.trim() && !faqCategory) { setFaqItems([]); return; }
    setLoadingFaq(true);
    try {
      const data = await supportService.searchFaq(faqQuery, faqCategory || undefined);
      setFaqItems(data);
    } catch {
      setFaqItems([]);
    } finally {
      setLoadingFaq(false);
    }
  }, [faqQuery, faqCategory]);

  useEffect(() => {
    if (tab !== 'faq') return;
    const timer = setTimeout(searchFaq, 400);
    return () => clearTimeout(timer);
  }, [faqQuery, faqCategory, tab, searchFaq]);

  const handleWhatsApp = () => {
    const msg = buildWhatsAppMsg(fullName);
    Linking.openURL(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`).catch(() => {});
  };

  const handleTicketCreated = (ticket: SupportTicket) => {
    setNewTicketVisible(false);
    setTickets(prev => [ticket, ...prev]);
    setActiveTicketId(ticket.id);
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={[s.root, { paddingTop: insets.top + 16 }]}>
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(300)} style={s.header}>
        <Text style={s.title}>{t('hostSupport.title')}</Text>
        <Text style={s.subtitle}>{t('hostSupport.subtitle')}</Text>
      </Animated.View>

      {/* Tabs */}
      <View style={s.tabs}>
        {(
          [
            { key: 'contact', label: t('hostSupport.tabContact'), icon: 'support-agent' },
            { key: 'faq',     label: t('hostSupport.tabFaq'),     icon: 'help-outline' },
            { key: 'tickets', label: t('hostSupport.tabTickets'), icon: 'confirmation-number' },
          ] as { key: Tab; label: string; icon: React.ComponentProps<typeof MaterialIcons>['name'] }[]
        ).map(tabItem => (
          <TouchableOpacity
            key={tabItem.key}
            style={[s.tab, tab === tabItem.key && s.tabActive]}
            onPress={() => setTab(tabItem.key)}
            activeOpacity={0.8}
          >
            <MaterialIcons name={tabItem.icon} size={14} color={tab === tabItem.key ? colors.primary : colors.inkDisabled} />
            <Text style={[s.tabTxt, tab === tabItem.key && s.tabTxtActive]}>{tabItem.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Contact tab ─────────────────────────────────────────────────────── */}
      {tab === 'contact' && (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {/* Chat card */}
          <Animated.View entering={FadeInDown.delay(60).duration(280)}>
            <View style={s.channelCard}>
              <View style={s.channelHeader}>
                <View style={[s.channelIcon, { backgroundColor: colors.primaryLight }]}>
                  <MaterialIcons name="chat" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.channelTitle}>{t('hostSupport.chatTitle')}</Text>
                  <View style={s.availRow}>
                    <View style={[s.availDot, { backgroundColor: chatAvail?.available ? colors.success : colors.inkDisabled }]} />
                    <Text style={[s.availTxt, { color: chatAvail?.available ? colors.success : colors.inkSubtle }]}>
                      {chatAvail?.available
                        ? `${t('hostSupport.chatAvailable')}${chatAvail.estimatedWaitMinutes ? ` · ${t('hostSupport.chatWait', { min: chatAvail.estimatedWaitMinutes })}` : ''}`
                        : chatAvail?.nextAvailableAt
                        ? `${t('hostSupport.chatAvailable')} à ${new Date(chatAvail.nextAvailableAt).toLocaleTimeString('fr-RW', { hour: '2-digit', minute: '2-digit' })}`
                        : t('hostSupport.chatHours')}
                    </Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                style={[s.channelBtn, !chatAvail?.available && s.channelBtnOff]}
                activeOpacity={0.85}
              >
                <Text style={s.channelBtnTxt}>
                  {chatAvail?.available ? t('hostSupport.chatStart') : t('hostSupport.chatUnavailable')}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* WhatsApp card */}
          <Animated.View entering={FadeInDown.delay(100).duration(280)}>
            <TouchableOpacity style={s.channelCard} onPress={handleWhatsApp} activeOpacity={0.85}>
              <View style={s.channelHeader}>
                <View style={[s.channelIcon, { backgroundColor: '#E8F8F0' }]}>
                  <MaterialIcons name="phone-in-talk" size={22} color="#25D366" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.channelTitle}>{t('hostSupport.whatsappTitle')}</Text>
                  <Text style={s.channelSub}>+250 788 000 000 · {t('hostSupport.whatsappSub')}</Text>
                </View>
                <MaterialIcons name="open-in-new" size={16} color={colors.inkSubtle} />
              </View>
              <View style={[s.channelBtn, { backgroundColor: '#25D366' }]}>
                <Text style={s.channelBtnTxt}>{t('hostSupport.whatsappBtn')}</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* Email */}
          <Animated.View entering={FadeInDown.delay(140).duration(280)}>
            <TouchableOpacity
              style={s.channelCard}
              onPress={() => Linking.openURL('mailto:support@locamap.rw')}
              activeOpacity={0.85}
            >
              <View style={s.channelHeader}>
                <View style={[s.channelIcon, { backgroundColor: colors.surfaceSunken }]}>
                  <MaterialIcons name="email" size={22} color={colors.inkMid} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.channelTitle}>{t('hostSupport.emailTitle')}</Text>
                  <Text style={s.channelSub}>support@locamap.rw · {t('hostSupport.emailSub')}</Text>
                </View>
                <MaterialIcons name="open-in-new" size={16} color={colors.inkSubtle} />
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* Urgent phone */}
          <Animated.View entering={FadeInDown.delay(180).duration(280)}>
            <View style={[s.channelCard, s.urgentCard]}>
              <View style={s.channelHeader}>
                <View style={[s.channelIcon, { backgroundColor: colors.error + '14' }]}>
                  <MaterialIcons name="phone" size={22} color={colors.error} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.channelTitle, { color: colors.error }]}>{t('hostSupport.urgentTitle')}</Text>
                  <Text style={s.channelSub}>{t('hostSupport.urgentSub')}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[s.channelBtn, { backgroundColor: colors.error }]}
                onPress={() => Linking.openURL('tel:+250788000000')}
                activeOpacity={0.85}
              >
                <Text style={s.channelBtnTxt}>{t('hostSupport.urgentBtn')}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Open ticket CTA */}
          <View style={s.ticketCta}>
            <Text style={s.ticketCtaTitle}>{t('hostSupport.complexTitle')}</Text>
            <Text style={s.ticketCtaSub}>{t('hostSupport.complexSub')}</Text>
            <TouchableOpacity
              style={s.ticketCtaBtn}
              onPress={() => setNewTicketVisible(true)}
              activeOpacity={0.85}
            >
              <MaterialIcons name="add" size={16} color={colors.primary} />
              <Text style={s.ticketCtaBtnTxt}>{t('hostSupport.createTicket')}</Text>
            </TouchableOpacity>
          </View>
          <View style={{ height: 110 }} />
        </ScrollView>
      )}

      {/* ── FAQ tab ──────────────────────────────────────────────────────────── */}
      {tab === 'faq' && (
        <>
          <View style={s.faqSearch}>
            <MaterialIcons name="search" size={18} color={colors.inkSubtle} />
            <TextInput
              style={s.faqInput}
              value={faqQuery}
              onChangeText={setFaqQuery}
              placeholder={t('hostSupport.faqSearch')}
              placeholderTextColor={colors.inkDisabled}
            />
            {faqQuery.length > 0 && (
              <TouchableOpacity onPress={() => setFaqQuery('')}>
                <MaterialIcons name="close" size={16} color={colors.inkSubtle} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.faqCatScroll}
          >
            {FAQ_CATEGORIES.map(c => (
              <TouchableOpacity
                key={c.key}
                style={[s.faqCat, faqCategory === c.key && s.faqCatActive]}
                onPress={() => setFaqCategory(c.key)}
                activeOpacity={0.8}
              >
                <Text style={[s.faqCatTxt, faqCategory === c.key && s.faqCatTxtActive]}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {loadingFaq ? (
            <View style={s.centered}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : faqItems.length === 0 ? (
            <View style={s.centered}>
              <MaterialIcons name="help-outline" size={40} color={colors.inkDisabled} />
              <Text style={s.emptyTitle}>
                {faqQuery || faqCategory ? t('hostSupport.faqNoResult') : t('hostSupport.faqEmpty')}
              </Text>
              {(faqQuery || faqCategory) && (
                <>
                  <Text style={s.emptySubtitle}>
                    {t('hostSupport.faqNoResultSub')}
                  </Text>
                  <TouchableOpacity
                    style={s.faqNoResultBtn}
                    onPress={() => setNewTicketVisible(true)}
                    activeOpacity={0.85}
                  >
                    <MaterialIcons name="add" size={15} color={colors.primary} />
                    <Text style={s.faqNoResultBtnTxt}>{t('hostSupport.createTicket')}</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          ) : (
            <ScrollView contentContainerStyle={s.faqList} showsVerticalScrollIndicator={false}>
              {faqItems.map(item => (
                <Animated.View key={item.id} entering={FadeIn.duration(200)}>
                  <TouchableOpacity
                    style={s.faqItem}
                    onPress={() => setExpandedFaq(prev => prev === item.id ? null : item.id)}
                    activeOpacity={0.8}
                  >
                    <View style={s.faqItemHeader}>
                      <Text style={s.faqQ} numberOfLines={expandedFaq === item.id ? undefined : 2}>
                        {item.question}
                      </Text>
                      <MaterialIcons
                        name={expandedFaq === item.id ? 'expand-less' : 'expand-more'}
                        size={20}
                        color={colors.inkSubtle}
                      />
                    </View>
                    {expandedFaq === item.id && (
                      <Text style={s.faqA}>{item.answer}</Text>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              ))}
              <View style={{ height: 110 }} />
            </ScrollView>
          )}
        </>
      )}

      {/* ── Tickets tab ──────────────────────────────────────────────────────── */}
      {tab === 'tickets' && (
        <View style={{ flex: 1 }}>
          <View style={s.ticketsToolbar}>
            <Text style={s.ticketsCount}>
              {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
            </Text>
            <TouchableOpacity
              style={s.newTicketBtn}
              onPress={() => setNewTicketVisible(true)}
              activeOpacity={0.85}
            >
              <MaterialIcons name="add" size={16} color={colors.white} />
              <Text style={s.newTicketBtnTxt}>{t('hostSupport.newTicket')}</Text>
            </TouchableOpacity>
          </View>

          {loadingTickets ? (
            <View style={s.centered}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : tickets.length === 0 ? (
            <View style={s.centered}>
              <MaterialIcons name="confirmation-number" size={40} color={colors.inkDisabled} />
              <Text style={s.emptyTitle}>{t('hostSupport.ticketsEmpty')}</Text>
              <Text style={s.emptySubtitle}>
                {t('hostSupport.ticketsEmptySub')}
              </Text>
              <TouchableOpacity
                style={s.newTicketBtn}
                onPress={() => setNewTicketVisible(true)}
                activeOpacity={0.85}
              >
                <MaterialIcons name="add" size={16} color={colors.white} />
                <Text style={s.newTicketBtnTxt}>{t('hostSupport.createTicket')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={tickets}
              keyExtractor={tk => tk.id}
              contentContainerStyle={s.ticketList}
              renderItem={({ item, index }) => (
                <Animated.View entering={FadeInDown.delay(index * 40).duration(260)}>
                  <TicketRow ticket={item} onPress={() => setActiveTicketId(item.id)} />
                </Animated.View>
              )}
            />
          )}
        </View>
      )}

      {/* Modals */}
      {activeTicketId && (
        <TicketDetailModal
          ticketId={activeTicketId}
          currentUserId=""
          onClose={() => setActiveTicketId(null)}
        />
      )}
      {newTicketVisible && (
        <NewTicketModal
          onClose={() => setNewTicketVisible(false)}
          onCreated={handleTicketCreated}
        />
      )}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:     { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  header:   { paddingHorizontal: 20, marginBottom: 14 },
  title:    { fontSize: 24, fontWeight: '700', color: colors.ink, letterSpacing: -0.4 },
  subtitle: { fontSize: 13, color: colors.inkSubtle, marginTop: 2 },

  tabs:       { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 14, gap: 6 },
  tab:        { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  tabActive:  { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  tabTxt:     { fontSize: 11, fontWeight: '600', color: colors.inkDisabled },
  tabTxtActive: { color: colors.primary },

  scroll: { paddingHorizontal: 20 },

  // Contact channels
  channelCard:   {
    backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border,
    padding: 16, marginBottom: 12,
    ...Platform.select({
      ios:     { shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  urgentCard:    { borderColor: colors.error + '44' },
  channelHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  channelIcon:   { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  channelTitle:  { fontSize: 15, fontWeight: '700', color: colors.ink },
  channelSub:    { fontSize: 12, color: colors.inkSubtle, marginTop: 2 },
  availRow:      { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  availDot:      { width: 7, height: 7, borderRadius: 4 },
  availTxt:      { fontSize: 12, fontWeight: '500' },
  channelBtn:    { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 11, alignItems: 'center' },
  channelBtnOff: { backgroundColor: colors.inkDisabled },
  channelBtnTxt: { fontSize: 14, fontWeight: '700', color: colors.white },

  // Ticket CTA
  ticketCta:     { backgroundColor: colors.surfaceSunken, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 16, marginTop: 4 },
  ticketCtaTitle:{ fontSize: 15, fontWeight: '700', color: colors.ink, marginBottom: 4 },
  ticketCtaSub:  { fontSize: 13, color: colors.inkSubtle, lineHeight: 18, marginBottom: 14 },
  ticketCtaBtn:  { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.primaryLight },
  ticketCtaBtnTxt: { fontSize: 13, fontWeight: '700', color: colors.primary },

  // FAQ
  faqSearch:     { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 10, backgroundColor: colors.surfaceSunken, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  faqInput:      { flex: 1, fontSize: 14, color: colors.ink, padding: 0 },
  faqCatScroll:  { paddingHorizontal: 20, paddingBottom: 8, gap: 6 },
  faqCat:        { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  faqCatActive:  { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  faqCatTxt:     { fontSize: 12, fontWeight: '600', color: colors.inkSubtle },
  faqCatTxtActive:{ color: colors.primary },
  faqList:       { paddingHorizontal: 20 },
  faqItem:       { backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 10 },
  faqItemHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  faqQ:          { flex: 1, fontSize: 14, fontWeight: '600', color: colors.ink, lineHeight: 20 },
  faqA:          { fontSize: 13, color: colors.inkMid, lineHeight: 19, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
  faqNoResultBtn:{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.primaryLight, marginTop: 4 },
  faqNoResultBtnTxt: { fontSize: 13, fontWeight: '700', color: colors.primary },

  // Tickets
  ticketsToolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 8 },
  ticketsCount:   { fontSize: 13, color: colors.inkSubtle },
  newTicketBtn:   { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  newTicketBtnTxt:{ fontSize: 13, fontWeight: '700', color: colors.white },
  ticketList:     { paddingHorizontal: 20, paddingBottom: 110 },

  emptyTitle:     { fontSize: 15, fontWeight: '700', color: colors.ink },
  emptySubtitle:  { fontSize: 13, color: colors.inkSubtle, textAlign: 'center', lineHeight: 19, maxWidth: 260 },
});

export default HostSupportScreen;
