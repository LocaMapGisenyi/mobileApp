import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Linking,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from 'react-native-paper';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme';
import {
  legalService,
  LegalDocument,
  LegalDocumentFull,
  ConsentRecord,
  TaxCertificate,
} from '../services/api';

// ─── Constants ────────────────────────────────────────────────────────────────
const DPO_EMAIL = 'dpo@locamap.rw';
const CURRENT_YEAR = new Date().getFullYear();

const CATEGORY_CONFIG: Record<
  LegalDocument['category'],
  { label: string; icon: React.ComponentProps<typeof MaterialIcons>['name']; color: string }
> = {
  cgu:            { label: 'CGU',              icon: 'gavel',             color: colors.primary },
  privacy:        { label: 'Confidentialité',  icon: 'lock-outline',      color: colors.inkMid },
  cancellation:   { label: 'Annulations',      icon: 'event-busy',        color: colors.warning },
  discrimination: { label: 'Non-discrimination', icon: 'diversity-3',     color: colors.success },
  rules:          { label: 'Règlement',         icon: 'rule',             color: colors.inkSubtle },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-RW', { day: 'numeric', month: 'long', year: 'numeric' });
};

const formatDateTime = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('fr-RW', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

// ─── Document reader modal ────────────────────────────────────────────────────
const DocumentReaderModal = ({
  slug,
  onClose,
  onConsent,
}: {
  slug: string;
  onClose: () => void;
  onConsent: (documentId: string, version: string) => void;
}) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [doc, setDoc] = useState<LegalDocumentFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [showVersions, setShowVersions] = useState(false);

  useEffect(() => {
    legalService.getDocument(slug)
      .then(d => { setDoc(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    if (distanceFromBottom < 40) setScrolledToBottom(true);
  };

  const handleAccept = async () => {
    if (!doc) return;
    setAccepting(true);
    try {
      await legalService.giveConsent(doc.id, doc.version);
      setAccepted(true);
      onConsent(doc.id, doc.version);
    } catch {/* silent */} finally {
      setAccepting(false);
    }
  };

  const handleDownload = () => {
    if (!doc) return;
    Linking.openURL(`https://locamap.rw/documents/${doc.slug}.pdf`).catch(() => {});
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[drm.root, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={drm.header}>
          <TouchableOpacity style={drm.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <MaterialIcons name="close" size={22} color={colors.ink} />
          </TouchableOpacity>
          <Text style={drm.headerTitle} numberOfLines={1}>
            {doc?.title ?? 'Document'}
          </Text>
          <TouchableOpacity style={drm.downloadBtn} onPress={handleDownload} activeOpacity={0.7}>
            <MaterialIcons name="download" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={drm.centered}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : !doc ? (
          <View style={drm.centered}>
            <MaterialIcons name="error-outline" size={36} color={colors.inkDisabled} />
            <Text style={drm.errorTxt}>{t('hostLegal.docUnavailable')}</Text>
          </View>
        ) : (
          <>
            {/* Meta strip */}
            <View style={drm.metaStrip}>
              <Text style={drm.metaVersion}>{t('hostLegal.version')} {doc.version}</Text>
              <Text style={drm.metaDot}>·</Text>
              <Text style={drm.metaDate}>{t('hostLegal.updatedAt')} {formatDate(doc.updatedAt)}</Text>
              {doc.previousVersions.length > 0 && (
                <TouchableOpacity
                  style={drm.versionsBtn}
                  onPress={() => setShowVersions(v => !v)}
                  activeOpacity={0.8}
                >
                  <Text style={drm.versionsBtnTxt}>
                    {showVersions ? 'Masquer' : `${doc.previousVersions.length} version${doc.previousVersions.length > 1 ? 's' : ''} précédente${doc.previousVersions.length > 1 ? 's' : ''}`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Version history */}
            {showVersions && (
              <Animated.View entering={FadeIn.duration(200)} style={drm.versionList}>
                {doc.previousVersions.map(v => (
                  <View key={v.version} style={drm.versionRow}>
                    <Text style={drm.versionRowVer}>v{v.version}</Text>
                    <Text style={drm.versionRowDate}>{formatDate(v.updatedAt)}</Text>
                  </View>
                ))}
              </Animated.View>
            )}

            {/* Scroll hint */}
            {!scrolledToBottom && doc.required && !accepted && (
              <View style={drm.scrollHint}>
                <MaterialIcons name="arrow-downward" size={13} color={colors.inkSubtle} />
                <Text style={drm.scrollHintTxt}>
                  {t('hostLegal.scrollToAccept')}
                </Text>
              </View>
            )}

            {/* Content */}
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={drm.contentScroll}
              onScroll={handleScroll}
              scrollEventThrottle={100}
              showsVerticalScrollIndicator
            >
              <Text style={drm.summary}>{doc.summary}</Text>
              <View style={drm.contentDivider} />
              <Text style={drm.content}>{doc.content}</Text>
              <View style={{ height: 24 }} />
            </ScrollView>

            {/* Accept footer */}
            {doc.required && (
              <View style={[drm.footer, { paddingBottom: Math.max(insets.bottom + 8, 20) }]}>
                {accepted ? (
                  <View style={drm.acceptedBanner}>
                    <MaterialIcons name="check-circle" size={18} color={colors.success} />
                    <Text style={drm.acceptedTxt}>
                      {t('hostLegal.acceptedAt')} {formatDateTime(new Date().toISOString())}
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[
                      drm.acceptBtn,
                      (!scrolledToBottom || accepting) && drm.acceptBtnOff,
                    ]}
                    onPress={handleAccept}
                    disabled={!scrolledToBottom || accepting}
                    activeOpacity={0.85}
                  >
                    {accepting ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <>
                        <MaterialIcons name="check" size={16} color={colors.white} />
                        <Text style={drm.acceptBtnTxt}>
                          {scrolledToBottom
                            ? t('hostLegal.acceptVersion') + ' ' + doc.version
                            : t('hostLegal.scrollFirst')}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}
          </>
        )}
      </View>
    </Modal>
  );
};

const drm = StyleSheet.create({
  root:        { flex: 1, backgroundColor: colors.background },
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface, gap: 10 },
  closeBtn:    { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.ink },
  downloadBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  centered:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  errorTxt:    { fontSize: 14, color: colors.inkSubtle },
  metaStrip:   { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.surfaceSunken, borderBottomWidth: 1, borderBottomColor: colors.border },
  metaVersion: { fontSize: 12, fontWeight: '700', color: colors.primary },
  metaDot:     { fontSize: 12, color: colors.inkDisabled },
  metaDate:    { fontSize: 12, color: colors.inkSubtle, flex: 1 },
  versionsBtn: { },
  versionsBtnTxt: { fontSize: 11, fontWeight: '600', color: colors.primary, textDecorationLine: 'underline' },
  versionList: { backgroundColor: colors.surfaceSunken, paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  versionRow:  { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  versionRowVer:  { fontSize: 12, fontWeight: '600', color: colors.inkMid },
  versionRowDate: { fontSize: 12, color: colors.inkSubtle },
  scrollHint:  { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.warning + '14', paddingVertical: 7, paddingHorizontal: 16 },
  scrollHintTxt: { fontSize: 11, color: colors.warning, fontWeight: '500' },
  contentScroll: { padding: 20 },
  summary:     { fontSize: 14, color: colors.inkMid, lineHeight: 20, fontStyle: 'italic', marginBottom: 16 },
  contentDivider: { height: 1, backgroundColor: colors.border, marginBottom: 16 },
  content:     { fontSize: 14, color: colors.ink, lineHeight: 22 },
  footer:      { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: 20, paddingTop: 14 },
  acceptBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14 },
  acceptBtnOff:{ backgroundColor: colors.inkDisabled },
  acceptBtnTxt:{ fontSize: 15, fontWeight: '700', color: colors.white },
  acceptedBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.success + '14', borderRadius: 10, padding: 14 },
  acceptedTxt:    { fontSize: 14, fontWeight: '600', color: colors.success },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
type Tab = 'documents' | 'tax' | 'data';

const HostLegalScreen = () => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const [tab, setTab] = useState<Tab>('documents');
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [consentHistory, setConsentHistory] = useState<ConsentRecord[]>([]);
  const [taxCert, setTaxCert] = useState<TaxCertificate | null>(null);
  const [taxYear, setTaxYear] = useState(CURRENT_YEAR - 1);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingTax, setLoadingTax] = useState(false);
  const [taxError, setTaxError] = useState<string | null>(null);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  // ── Load documents ─────────────────────────────────────────────────────────
  useEffect(() => {
    legalService.getDocuments()
      .then(data => setDocuments(data))
      .catch(() => {})
      .finally(() => setLoadingDocs(false));
  }, []);

  // ── Load consent history ───────────────────────────────────────────────────
  useEffect(() => {
    if (tab !== 'documents') return;
    setLoadingHistory(true);
    legalService.getConsentHistory()
      .then(data => setConsentHistory(data))
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, [tab]);

  // ── Load tax certificate ───────────────────────────────────────────────────
  const loadTax = useCallback(async () => {
    setLoadingTax(true);
    setTaxError(null);
    try {
      const cert = await legalService.getTaxCertificate(taxYear);
      setTaxCert(cert);
    } catch {
      setTaxError(t('hostLegal.taxUnavailable'));
    } finally {
      setLoadingTax(false);
    }
  }, [taxYear, t]);

  useEffect(() => {
    if (tab === 'tax') loadTax();
  }, [tab, loadTax]);

  // ── Consent recorded callback ──────────────────────────────────────────────
  const handleConsentRecorded = (documentId: string, version: string) => {
    const now = new Date().toISOString();
    setConsentHistory(prev => [
      { documentId, documentTitle: documents.find(d => d.id === documentId)?.title ?? '', version, acceptedAt: now, ipAddress: '—' },
      ...prev,
    ]);
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getConsentForDoc = (docId: string) =>
    consentHistory.find(c => c.documentId === docId);

  const formatRWF = (n: number) => n.toLocaleString('fr-FR') + ' RWF';

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={[s.root, { paddingTop: insets.top + 16 }]}>
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(300)} style={s.header}>
        <Text style={s.title}>{t('hostLegal.title')}</Text>
        <Text style={s.subtitle}>{t('hostLegal.subtitle')}</Text>
      </Animated.View>

      {/* Tabs */}
      <View style={s.tabs}>
        {(
          [
            { key: 'documents', label: t('hostLegal.tabDocuments'), icon: 'article' },
            { key: 'tax',       label: t('hostLegal.tabTax'),       icon: 'receipt-long' },
            { key: 'data',      label: t('hostLegal.tabData'),      icon: 'lock-person' },
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

      {/* ── Documents tab ────────────────────────────────────────────────────── */}
      {tab === 'documents' && (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {loadingDocs ? (
            <View style={s.centered}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : documents.length === 0 ? (
            <View style={s.centered}>
              <MaterialIcons name="article" size={36} color={colors.inkDisabled} />
              <Text style={s.emptyTitle}>{t('hostLegal.noDocuments')}</Text>
            </View>
          ) : (
            <>
              <Text style={s.sectionLabel}>{t('hostLegal.sectionDocuments')}</Text>
              {documents.map((doc, i) => {
                const cfg = CATEGORY_CONFIG[doc.category];
                const consent = getConsentForDoc(doc.id);
                return (
                  <Animated.View key={doc.id} entering={FadeInDown.delay(i * 45).duration(280)}>
                    <TouchableOpacity
                      style={s.docCard}
                      onPress={() => setActiveSlug(doc.slug)}
                      activeOpacity={0.82}
                    >
                      <View style={[s.docIcon, { backgroundColor: cfg.color + '18' }]}>
                        <MaterialIcons name={cfg.icon} size={22} color={cfg.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.docTitle}>{doc.title}</Text>
                        <View style={s.docMeta}>
                          <Text style={s.docVersion}>v{doc.version}</Text>
                          <Text style={s.docDot}>·</Text>
                          <Text style={s.docDate}>{formatDate(doc.updatedAt)}</Text>
                        </View>
                        {consent ? (
                          <View style={s.consentRow}>
                            <MaterialIcons name="check-circle" size={12} color={colors.success} />
                            <Text style={s.consentTxt}>
                              {t('hostLegal.acceptedAt')} {formatDate(consent.acceptedAt)}
                            </Text>
                          </View>
                        ) : doc.required ? (
                          <View style={s.consentRow}>
                            <MaterialIcons name="radio-button-unchecked" size={12} color={colors.warning} />
                            <Text style={[s.consentTxt, { color: colors.warning }]}>
                              {t('hostLegal.acceptRequired')}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <MaterialIcons name="chevron-right" size={20} color={colors.inkDisabled} />
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}

              {/* Consent history */}
              {!loadingHistory && consentHistory.length > 0 && (
                <>
                  <Text style={[s.sectionLabel, { marginTop: 24 }]}>{t('hostLegal.consentHistory')}</Text>
                  <View style={s.historyCard}>
                    {consentHistory.map((record, i) => (
                      <View
                        key={`${record.documentId}-${record.version}`}
                        style={[s.historyRow, i < consentHistory.length - 1 && s.historyRowBorder]}
                      >
                        <MaterialIcons name="check-circle" size={14} color={colors.success} />
                        <View style={{ flex: 1 }}>
                          <Text style={s.historyTitle}>{record.documentTitle}</Text>
                          <Text style={s.historyMeta}>
                            {t('hostLegal.version')} {record.version} · {formatDateTime(record.acceptedAt)}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </>
          )}
          <View style={{ height: 110 }} />
        </ScrollView>
      )}

      {/* ── Tax tab ──────────────────────────────────────────────────────────── */}
      {tab === 'tax' && (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <Text style={s.sectionLabel}>{t('hostLegal.taxTitle')}</Text>

          {/* Year selector */}
          <View style={s.yearSelector}>
            <TouchableOpacity
              style={s.yearBtn}
              onPress={() => setTaxYear(y => y - 1)}
              disabled={taxYear <= CURRENT_YEAR - 5}
              activeOpacity={0.7}
            >
              <MaterialIcons name="chevron-left" size={22} color={taxYear <= CURRENT_YEAR - 5 ? colors.inkDisabled : colors.inkMid} />
            </TouchableOpacity>
            <Text style={s.yearValue}>{t('hostLegal.taxExercice')} {taxYear}</Text>
            <TouchableOpacity
              style={s.yearBtn}
              onPress={() => setTaxYear(y => y + 1)}
              disabled={taxYear >= CURRENT_YEAR - 1}
              activeOpacity={0.7}
            >
              <MaterialIcons name="chevron-right" size={22} color={taxYear >= CURRENT_YEAR - 1 ? colors.inkDisabled : colors.inkMid} />
            </TouchableOpacity>
          </View>

          {loadingTax ? (
            <View style={s.centered}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : taxError ? (
            <View style={s.taxEmptyCard}>
              <MaterialIcons name="receipt-long" size={36} color={colors.inkDisabled} />
              <Text style={s.taxEmptyTitle}>{taxError}</Text>
              <Text style={s.taxEmptySub}>
                {t('hostLegal.taxAutoGenerated')}
              </Text>
            </View>
          ) : taxCert ? (
            <Animated.View entering={FadeInDown.duration(300)}>
              <View style={s.taxCard}>
                <View style={s.taxHeader}>
                  <MaterialIcons name="verified" size={24} color={colors.success} />
                  <View>
                    <Text style={s.taxHeaderTitle}>Attestation {taxCert.year}</Text>
                    <Text style={s.taxHeaderSub}>{t('hostLegal.taxGeneratedAt')} {formatDate(taxCert.generatedAt)}</Text>
                  </View>
                </View>
                <View style={s.taxRow}>
                  <Text style={s.taxLbl}>{t('hostLegal.taxGross')}</Text>
                  <Text style={s.taxVal}>{formatRWF(taxCert.totalRevenue)}</Text>
                </View>
                <View style={s.taxRow}>
                  <Text style={s.taxLbl}>{t('hostLegal.taxCommission')}</Text>
                  <Text style={s.taxVal}>{formatRWF(taxCert.commissionPaid)}</Text>
                </View>
                <View style={[s.taxRow, s.taxRowNet]}>
                  <Text style={[s.taxLbl, { fontWeight: '700', color: colors.ink }]}>{t('hostLegal.taxNet')}</Text>
                  <Text style={[s.taxVal, { color: colors.primary, fontWeight: '700' }]}>
                    {formatRWF(taxCert.totalRevenue - taxCert.commissionPaid)}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={s.downloadBtn}
                onPress={() => Linking.openURL(taxCert.downloadUrl).catch(() => {})}
                activeOpacity={0.85}
              >
                <MaterialIcons name="download" size={18} color={colors.white} />
                <Text style={s.downloadBtnTxt}>{t('hostLegal.downloadPdf')}</Text>
              </TouchableOpacity>

              <View style={s.taxInfoBox}>
                <MaterialIcons name="info-outline" size={15} color={colors.inkSubtle} />
                <Text style={s.taxInfoTxt}>
                  {t('hostLegal.taxNote')}
                </Text>
              </View>
            </Animated.View>
          ) : null}
          <View style={{ height: 110 }} />
        </ScrollView>
      )}

      {/* ── Data tab ─────────────────────────────────────────────────────────── */}
      {tab === 'data' && (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <Text style={s.sectionLabel}>{t('hostLegal.dataTitle')}</Text>

          {(
            [
              {
                icon: 'download' as const,
                title: t('hostLegal.rightAccess'),
                desc: t('hostLegal.rightAccessDesc'),
                action: t('hostLegal.requestExport'),
                onPress: () => Linking.openURL('mailto:dpo@locamap.rw?subject=Demande%20export%20données').catch(() => {}),
                color: colors.primary,
              },
              {
                icon: 'edit' as const,
                title: t('hostLegal.rightRectify'),
                desc: t('hostLegal.rightRectifyDesc'),
                action: t('hostLegal.goSettings'),
                onPress: () => {},
                color: colors.inkMid,
              },
              {
                icon: 'delete-outline' as const,
                title: t('hostLegal.rightForget'),
                desc: t('hostLegal.rightForgetDesc'),
                action: t('hostLegal.contactDpo'),
                onPress: () => Linking.openURL(`mailto:${DPO_EMAIL}?subject=Demande%20suppression%20données`).catch(() => {}),
                color: colors.error,
              },
              {
                icon: 'privacy-tip' as const,
                title: t('hostLegal.dpoTitle'),
                desc: `${t('hostLegal.dpoDesc')} ${DPO_EMAIL}`,
                action: t('hostLegal.writeDpo'),
                onPress: () => Linking.openURL(`mailto:${DPO_EMAIL}`).catch(() => {}),
                color: colors.inkSubtle,
              },
            ]
          ).map((item, i) => (
            <Animated.View key={item.title} entering={FadeInDown.delay(i * 60).duration(280)}>
              <View style={s.dataCard}>
                <View style={s.dataCardTop}>
                  <View style={[s.dataIcon, { backgroundColor: item.color + '14' }]}>
                    <MaterialIcons name={item.icon} size={22} color={item.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.dataTitle}>{item.title}</Text>
                    <Text style={s.dataDesc}>{item.desc}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[s.dataActionBtn, { borderColor: item.color + '55' }]}
                  onPress={item.onPress}
                  activeOpacity={0.85}
                >
                  <Text style={[s.dataActionTxt, { color: item.color }]}>{item.action}</Text>
                  <MaterialIcons name="open-in-new" size={13} color={item.color} />
                </TouchableOpacity>
              </View>
            </Animated.View>
          ))}

          <View style={s.rgpdNote}>
            <Text style={s.rgpdNoteTxt}>
              LocaMap traite vos données conformément aux lois rwandaises sur la protection des données personnelles et aux principes du RGPD européen. Vos données ne sont jamais vendues à des tiers.
            </Text>
          </View>
          <View style={{ height: 110 }} />
        </ScrollView>
      )}

      {/* Document reader modal */}
      {activeSlug && (
        <DocumentReaderModal
          slug={activeSlug}
          onClose={() => setActiveSlug(null)}
          onConsent={handleConsentRecorded}
        />
      )}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:     { flex: 1, backgroundColor: colors.background },
  centered: { paddingVertical: 40, alignItems: 'center', gap: 10 },
  header:   { paddingHorizontal: 20, marginBottom: 14 },
  title:    { fontSize: 24, fontWeight: '700', color: colors.ink, letterSpacing: -0.4 },
  subtitle: { fontSize: 13, color: colors.inkSubtle, marginTop: 2 },

  tabs:       { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 14, gap: 6 },
  tab:        { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  tabActive:  { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  tabTxt:     { fontSize: 11, fontWeight: '600', color: colors.inkDisabled },
  tabTxtActive: { color: colors.primary },

  scroll:         { paddingHorizontal: 20 },
  sectionLabel:   { fontSize: 11, fontWeight: '700', color: colors.inkDisabled, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },

  // Document card
  docCard:    { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 10,
    ...Platform.select({
      ios:     { shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
      android: { elevation: 1 },
    }),
  },
  docIcon:    { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  docTitle:   { fontSize: 14, fontWeight: '700', color: colors.ink, marginBottom: 4 },
  docMeta:    { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  docVersion: { fontSize: 11, fontWeight: '700', color: colors.primary },
  docDot:     { fontSize: 11, color: colors.inkDisabled },
  docDate:    { fontSize: 11, color: colors.inkSubtle },
  consentRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  consentTxt: { fontSize: 11, fontWeight: '500', color: colors.success },

  // Consent history
  historyCard:     { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  historyRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14 },
  historyRowBorder:{ borderBottomWidth: 1, borderBottomColor: colors.border },
  historyTitle:    { fontSize: 13, fontWeight: '600', color: colors.ink },
  historyMeta:     { fontSize: 11, color: colors.inkSubtle, marginTop: 2 },

  // Tax
  yearSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 20 },
  yearBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceSunken, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  yearValue:    { fontSize: 17, fontWeight: '700', color: colors.ink, minWidth: 110, textAlign: 'center' },
  taxEmptyCard: { alignItems: 'center', gap: 10, backgroundColor: colors.surfaceSunken, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 32 },
  taxEmptyTitle:{ fontSize: 14, fontWeight: '600', color: colors.inkMid, textAlign: 'center' },
  taxEmptySub:  { fontSize: 12, color: colors.inkSubtle, textAlign: 'center', lineHeight: 18 },
  taxCard:      { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 14 },
  taxHeader:    { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, backgroundColor: colors.success + '0E', borderBottomWidth: 1, borderBottomColor: colors.border },
  taxHeaderTitle: { fontSize: 15, fontWeight: '700', color: colors.ink },
  taxHeaderSub:   { fontSize: 11, color: colors.inkSubtle, marginTop: 1 },
  taxRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  taxRowNet:    { borderBottomWidth: 0, backgroundColor: colors.surfaceSunken },
  taxLbl:       { fontSize: 13, color: colors.inkMid },
  taxVal:       { fontSize: 14, fontWeight: '600', color: colors.ink },
  downloadBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 13, marginBottom: 14 },
  downloadBtnTxt: { fontSize: 15, fontWeight: '700', color: colors.white },
  taxInfoBox:   { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: colors.surfaceSunken, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: colors.border },
  taxInfoTxt:   { flex: 1, fontSize: 12, color: colors.inkSubtle, lineHeight: 17 },

  // Data rights
  dataCard:      { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 12 },
  dataCardTop:   { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  dataIcon:      { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  dataTitle:     { fontSize: 14, fontWeight: '700', color: colors.ink, marginBottom: 4 },
  dataDesc:      { fontSize: 12, color: colors.inkSubtle, lineHeight: 17 },
  dataActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  dataActionTxt: { fontSize: 12, fontWeight: '700' },

  rgpdNote:    { backgroundColor: colors.surfaceSunken, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 14, marginTop: 8 },
  rgpdNoteTxt: { fontSize: 12, color: colors.inkSubtle, lineHeight: 17 },

  emptyTitle:  { fontSize: 15, fontWeight: '700', color: colors.ink },
});

export default HostLegalScreen;
