import ContentSkeleton from '../components/ContentSkeleton';
import { useNavigation } from '@react-navigation/native';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  TextInput,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme';
import { HostPage, HostHeader } from '../components/host/HostUI';
import {
  referralService,
  ReferralCode,
  ReferralStats,
  ReferralCredits,
  ReferralEntry,
  ReferralStatus,
} from '../services/api';

// ─── Status pipeline ──────────────────────────────────────────────────────────
const STEP_INDEX: Partial<Record<ReferralStatus, number>> = {
  LINK_CLICKED:       0,
  REGISTERED:         1,
  KYC_DONE:           2,
  LISTING_PUBLISHED:  3,
  FIRST_BOOKING_DONE: 4,
  BONUS_CREDITED:     4,
  EXPIRED:           -1,
  FRAUD_DETECTED:    -1,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatRWF = (n: number) => n.toLocaleString('fr-FR') + ' RWF';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

// ─── Step timeline ────────────────────────────────────────────────────────────
const StatusTimeline = ({ status }: { status: ReferralStatus }) => {
  const { t } = useTranslation();
  const current = STEP_INDEX[status] ?? -1;
  const isFailed = status === 'EXPIRED' || status === 'FRAUD_DETECTED';

  const STEPS: { key: ReferralStatus; label: string }[] = [
    { key: 'LINK_CLICKED',       label: t('hostReferral.stepClicked') },
    { key: 'REGISTERED',         label: t('hostReferral.stepRegistered') },
    { key: 'KYC_DONE',           label: t('hostReferral.stepKyc') },
    { key: 'LISTING_PUBLISHED',  label: t('hostReferral.stepListing') },
    { key: 'FIRST_BOOKING_DONE', label: t('hostReferral.stepBooking') },
  ];

  return (
    <View style={tl.wrap}>
      {STEPS.map((step, i) => {
        const done = current >= i;
        const active = current === i;
        return (
          <React.Fragment key={step.key}>
            <View style={tl.stepWrap}>
              <View style={[
                tl.dot,
                done && tl.dotDone,
                active && tl.dotActive,
                isFailed && tl.dotFailed,
              ]}>
                {done && !active
                  ? <MaterialIcons name="check" size={9} color={colors.white} />
                  : <View style={[tl.dotInner, done && tl.dotInnerDone]} />
                }
              </View>
              <Text style={[tl.label, done && tl.labelDone]} numberOfLines={2}>
                {step.label}
              </Text>
            </View>
            {i < STEPS.length - 1 && (
              <View style={[tl.line, current > i && tl.lineDone]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
};

const tl = StyleSheet.create({
  wrap:        { flexDirection: 'row', alignItems: 'flex-start', marginTop: 10 },
  stepWrap:    { alignItems: 'center', width: 52 },
  dot:         { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  dotActive:   { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  dotDone:     { borderColor: colors.primary, backgroundColor: colors.primary },
  dotFailed:   { borderColor: colors.error, backgroundColor: colors.error + '14' },
  dotInner:    { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotInnerDone:{ backgroundColor: colors.primary },
  label:       { fontSize: 9, fontWeight: '500', color: colors.inkDisabled, textAlign: 'center', lineHeight: 12 },
  labelDone:   { color: colors.primary, fontWeight: '700' },
  line:        { flex: 1, height: 2, backgroundColor: colors.border, marginTop: 10 },
  lineDone:    { backgroundColor: colors.primary },
});

// ─── FAQ accordion item ───────────────────────────────────────────────────────
const FaqItem = ({ q, a }: { q: string; a: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <View style={faq.wrap}>
      <TouchableOpacity style={faq.header} onPress={() => setOpen(v => !v)} activeOpacity={0.8}>
        <Text style={faq.q}>{q}</Text>
        <MaterialIcons name={open ? 'expand-less' : 'expand-more'} size={20} color={colors.inkSubtle} />
      </TouchableOpacity>
      {open && <Text style={faq.a}>{a}</Text>}
    </View>
  );
};
const faq = StyleSheet.create({
  wrap:   { borderBottomWidth: 1, borderBottomColor: colors.border },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, paddingHorizontal: 16 },
  q:      { flex: 1, fontSize: 14, fontWeight: '600', color: colors.ink, paddingRight: 8 },
  a:      { fontSize: 13, color: colors.inkMid, lineHeight: 19, paddingHorizontal: 16, paddingBottom: 13 },
});

// ─── Referral card ────────────────────────────────────────────────────────────
const ReferralCard = ({ entry }: { entry: ReferralEntry }) => {
  const { t } = useTranslation();
  const isFailed = entry.status === 'EXPIRED' || entry.status === 'FRAUD_DETECTED';
  const isComplete = entry.status === 'BONUS_CREDITED';

  const STATUS_LABEL: Record<ReferralStatus, string> = {
    LINK_CLICKED:       t('hostReferral.stepClicked'),
    REGISTERED:         t('hostReferral.stepRegistered'),
    KYC_DONE:           t('hostReferral.stepKyc'),
    LISTING_PUBLISHED:  t('hostReferral.stepListing'),
    FIRST_BOOKING_DONE: t('hostReferral.statusBooked'),
    BONUS_CREDITED:     t('hostReferral.statusCredited'),
    EXPIRED:            t('hostReferral.statusExpired'),
    FRAUD_DETECTED:     t('hostReferral.statusFraud'),
  };

  return (
    <View style={rc.card}>
      <View style={rc.top}>
        <View style={rc.avatar}>
          <Text style={rc.avatarTxt}>{entry.refereeName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={rc.name}>{entry.refereeName || 'Membre parrainé'}</Text>
          <Text style={rc.date}>Depuis le {formatDate(entry.startedAt)}</Text>
        </View>
        {isComplete && (
          <View style={rc.bonusBadge}>
            <Text style={rc.bonusTxt}>+{formatRWF(entry.bonusAmount)}</Text>
          </View>
        )}
        {isFailed && (
          <View style={rc.failedBadge}>
            <Text style={rc.failedTxt}>{STATUS_LABEL[entry.status]}</Text>
          </View>
        )}
      </View>
      {!isFailed && <StatusTimeline status={entry.status} />}
    </View>
  );
};
const rc = StyleSheet.create({
  card:        { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 12 },
  top:         { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 4 },
  avatar:      { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarTxt:   { fontSize: 15, fontWeight: '700', color: colors.primary },
  name:        { fontSize: 14, fontWeight: '700', color: colors.ink },
  date:        { fontSize: 13, color: colors.inkSubtle, marginTop: 1 },
  bonusBadge:  { backgroundColor: colors.success + '18', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  bonusTxt:    { fontSize: 12, fontWeight: '700', color: colors.success },
  failedBadge: { backgroundColor: colors.error + '12', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  failedTxt:   { fontSize: 11, fontWeight: '600', color: colors.error },
});

// ─── Screen ───────────────────────────────────────────────────────────────────
const HostReferralScreen = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();

  const [refCode, setRefCode] = useState<ReferralCode | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [credits, setCredits] = useState<ReferralCredits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redeemCode, setRedeemCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [actionNote, setActionNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [code, st, cr] = await Promise.all([
        referralService.getCode(),
        referralService.getStats(),
        referralService.getCredits(),
      ]);
      setRefCode(code ?? null);
      setStats(st ?? null);
      setCredits(cr ?? null);
    } catch {
      setError('Impossible de charger vos données de parrainage');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Share ──────────────────────────────────────────────────────────────────
  const handleShare = async () => {
    if (!refCode) return;
    const msg =
      `Rejoignez LocaMap et publiez votre logement au Rwanda !\n` +
      `Enregistrez mon code ${refCode.code} dans la page Parrainage, avant votre premier séjour terminé.`;
    try {
      await Share.share({ message: msg, title: 'Parrainage LocaMap' });
    } catch { setActionNote('Le partage n’a pas abouti. Le code reste disponible ci-dessous.'); }
  };

  // ── Copy code (visual feedback via Share on mobile) ────────────────────────
  const handleCopyCode = async () => {
    if (!refCode) return;
    try {
      await Share.share({ message: refCode.code });
    } catch { setActionNote('Le partage du code n’a pas abouti.'); }
  };

  // ─── Loading / error ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <HostPage><HostHeader title={t('hostReferral.title')} onBack={() => navigation.goBack()} /><ContentSkeleton variant="dashboard" /></HostPage>
    );
  }

  if (error) {
    return (
      <HostPage scroll={false}><HostHeader title={t('hostReferral.title')} onBack={() => navigation.goBack()} /><View style={[s.root, s.centered]}>
        <MaterialIcons name="cloud-off" size={36} color={colors.inkDisabled} />
        <Text style={s.errorTxt}>{error}</Text>
        <TouchableOpacity style={s.retryBtn} onPress={load} activeOpacity={0.8}>
          <Text style={s.retryTxt}>Réessayer</Text>
        </TouchableOpacity>
      </View></HostPage>
    );
  }

  return (
    <HostPage scroll={false}><View style={s.root}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ paddingHorizontal: 0, paddingTop: 8 }}>
        <HostHeader title={t('hostReferral.title')} subtitle={t('hostReferral.subtitle')} onBack={() => navigation.goBack()} />
      </View>
{/* Credits balance */}
        {credits && (
          <View style={s.creditsCard}>
            <View style={s.creditsLeft}>
              <Text style={s.creditsLbl}>{t('hostReferral.balanceLabel')}</Text>
              <Text style={s.creditsVal}>{formatRWF(credits.balance)}</Text>
              {credits.nextExpiryAmount != null && credits.nextExpiryDate && (
                <Text style={s.creditsExpiry}>
                  {t('hostReferral.expiryNote', { amount: formatRWF(credits.nextExpiryAmount), date: formatDate(credits.nextExpiryDate) })}
                </Text>
              )}
            </View>
            <View style={s.creditsIcon}>
              <MaterialIcons name="account-balance-wallet" size={28} color={colors.primary} />
            </View>
          </View>
        )}

        {/* Stats strip */}
        {stats && (
          <View style={s.statsStrip}>
            <View style={s.statCell}>
              <Text style={s.statVal}>{stats.qualifiedReferrals}</Text>
              <Text style={s.statLbl}>{t('hostReferral.qualified')}</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statCell}>
              <Text style={s.statVal}>{stats.pendingReferrals}</Text>
              <Text style={s.statLbl}>{t('hostReferral.inProgress')}</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statCell}>
              <Text style={s.statVal}>{stats.annualUsed}/{stats.annualCap}</Text>
              <Text style={s.statLbl}>{t('hostReferral.annualQuota')}</Text>
            </View>
          </View>
        )}

        {/* Code + share */}
        <View style={s.codeSection}>
          <Text style={s.sectionLabel}>{t('hostReferral.codeLabel')}</Text>

          {refCode ? (
            <>
              {/* Code pill */}
              <View style={s.codePill}>
                <Text style={s.codeText} selectable>{refCode.code}</Text>
                <TouchableOpacity
                  style={s.copyBtn}
                  onPress={handleCopyCode}
                  activeOpacity={0.8}
                >
                  <MaterialIcons
                    name="share"
                    size={16}
                    color={colors.primary}
                  />
                  <Text style={s.copyTxt}>
                    Partager le code
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Link preview */}
              <Text style={s.linkPreview} numberOfLines={1}>{refCode.link}</Text>

              {/* Share button */}
              <TouchableOpacity
                style={s.shareBtn}
                onPress={handleShare}
                activeOpacity={0.85}
              >
                <MaterialIcons name="share" size={18} color={colors.onAccent} />
                <Text style={s.shareBtnTxt}>{t('hostReferral.share')}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={s.noCodeTxt}>Code non disponible</Text>
          )}
        </View>

        {/* Rewards summary */}
        <View style={s.rewardsCard}>
          <Text style={s.sectionLabel}>Enregistrer le code d’un parrain</Text>
          <TextInput value={redeemCode} onChangeText={setRedeemCode} autoCapitalize="characters" placeholder="LOCA-…" accessibilityLabel="Code de votre parrain" style={{margin:14,padding:12,borderWidth:1,borderColor:colors.border,color:colors.ink}} />
          <TouchableOpacity disabled={!redeemCode.trim() || redeeming} style={[s.shareBtn,{margin:14,opacity:!redeemCode.trim() || redeeming?0.5:1}]} onPress={async () => {
            setRedeeming(true); setActionNote('');
            try { await referralService.redeemCode(redeemCode.trim()); setRedeemCode(''); setActionNote('Code de parrainage enregistré.'); }
            catch (cause) { setActionNote(cause instanceof Error ? cause.message : 'Impossible d’enregistrer ce code.'); }
            finally { setRedeeming(false); }
          }}><Text style={s.shareBtnTxt}>{redeeming ? 'Enregistrement…' : 'Enregistrer le code'}</Text></TouchableOpacity>
          {!!actionNote && <Text accessibilityLiveRegion="polite" style={[s.rewardDetail,{margin:14}]}>{actionNote}</Text>}
        </View>
        <View style={s.rewardsCard}>
          <Text style={s.sectionLabel}>{t('hostReferral.rewardsTitle')}</Text>
          <View style={s.rewardRow}>
            <View style={s.rewardIconWrap}>
              <MaterialIcons name="person" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.rewardTitle}>{t('hostReferral.forReferrer')}</Text>
              <Text style={s.rewardDetail}>Les crédits éventuels sont attribués après vérification par l’équipe. Aucun montant ni délai automatique n’est garanti.</Text>
            </View>
          </View>
          <View style={[s.rewardRow, { borderTopWidth: 1, borderTopColor: colors.border }]}>
            <View style={[s.rewardIconWrap, { backgroundColor: colors.success + '18' }]}>
              <MaterialIcons name="group-add" size={18} color={colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.rewardTitle}>{t('hostReferral.forReferee')}</Text>
              <Text style={s.rewardDetail}>Enregistrez le code avant votre premier séjour terminé. Aucun encaissement ni réduction automatique de commission n’est disponible.</Text>
            </View>
          </View>
        </View>

        {/* Referrals list */}
        {stats && stats.entries.length > 0 && (
          <View>
            <Text style={[s.sectionLabel, { marginBottom: 12 }]}>
              {t('hostReferral.refereesTitle', { count: stats.totalReferrals })}
            </Text>
            {stats.entries.map(entry => (
              <ReferralCard key={entry.id} entry={entry} />
            ))}
          </View>
        )}

        {/* FAQ accordion */}
        <View style={s.faqSection}>
          <Text style={s.sectionLabel}>{t('hostReferral.faqTitle')}</Text>
          <View style={s.faqCard}>
            <FaqItem
              q="Quand est-ce que je reçois mon bonus ?"
              a="Un crédit peut être attribué par l’équipe après un séjour terminé et une vérification. Le montant apparaît dans votre historique uniquement après son attribution."
            />
            <FaqItem
              q="Quelles sont les conditions pour que le bonus soit accordé ?"
              a="Votre filleul doit enregistrer votre code avant son premier séjour terminé. L’équipe vérifie ensuite le séjour et les conditions applicables avant toute attribution."
            />
            <FaqItem
              q="Y a-t-il une limite au nombre de parrainages ?"
              a="Vous pouvez parrainer jusqu'à 20 hôtes qualifiés par an. Les filleuls supplémentaires au-delà de ce plafond ne génèrent pas de bonus."
            />
            <FaqItem
              q="Quelle est la durée de validité des crédits ?"
              a="Les crédits attribués expirent après 12 mois. Leur utilisation pour un paiement n’est pas encore proposée dans l’application."
            />
            <FaqItem
              q="Puis-je parrainer un membre de ma famille ?"
              a="Vous ne pouvez pas utiliser votre propre code. Pour les autres situations, contactez le support avant de compter sur un crédit."
            />
          </View>
        </View>

        {/* Credits history */}
        {credits && credits.history.length > 0 && (
          <View style={{ marginTop: 8 }}>
            <Text style={[s.sectionLabel, { marginBottom: 12 }]}>{t('hostReferral.creditsHistory')}</Text>
            <View style={s.historyCard}>
              {credits.history.map((h, i) => (
                <View
                  key={h.id}
                  style={[
                    s.historyRow,
                    i < credits.history.length - 1 && s.historyRowBorder,
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.historyReason}>{h.reason}</Text>
                    <Text style={s.historyDate}>
                      {formatDate(h.date)} · expire {formatDate(h.expiresAt)}
                    </Text>
                  </View>
                  <Text style={[
                    s.historyAmt,
                    { color: h.amount > 0 ? colors.success : colors.error },
                  ]}>
                    {h.amount > 0 ? '+' : ''}{formatRWF(h.amount)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </View></HostPage>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:     { flex: 1, backgroundColor: colors.background, width: '100%', maxWidth: 760, alignSelf: 'center' },
  centered: { alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  errorTxt: { fontSize: 14, color: colors.inkSubtle, textAlign: 'center' },
  retryBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, borderWidth: 1.5, borderColor: colors.primary },
  retryTxt: { fontSize: 14, fontWeight: '600', color: colors.primary },
  scroll:   { paddingHorizontal: 20 },

  header:   { marginBottom: 20 },
  title:    { fontSize: 24, fontWeight: '700', color: colors.ink, letterSpacing: -0.4 },
  subtitle: { fontSize: 13, color: colors.inkSubtle, marginTop: 3 },

  // Credits balance
  creditsCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.primaryLight, borderRadius: 14,
    padding: 18, marginBottom: 14,
  },
  creditsLeft:   { flex: 1 },
  creditsLbl:    { fontSize: 11, fontWeight: '700', color: colors.primaryDark,  letterSpacing: 0.6 },
  creditsVal:    { fontSize: 24, fontWeight: '700', color: colors.primaryDark, letterSpacing: -0.5, marginTop: 4 },
  creditsExpiry: { fontSize: 11, color: colors.primaryDark, marginTop: 6 },
  creditsIcon:   { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.white + '22', alignItems: 'center', justifyContent: 'center' },

  // Stats strip
  statsStrip:  { flexDirection: 'row', backgroundColor: colors.surfaceSunken, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingVertical: 12, marginBottom: 16 },
  statCell:    { flex: 1, alignItems: 'center' },
  statVal:     { fontSize: 18, fontWeight: '700', color: colors.ink },
  statLbl:     { fontSize: 13, color: colors.inkSubtle, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: colors.border },

  // Code section
  codeSection: { backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 14 },
  sectionLabel:{ fontSize: 14, fontWeight: '600', color: colors.inkSubtle,   marginBottom: 12 },
  codePill:    { flexDirection: 'column', gap: 12, alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.primaryLight, borderRadius: 10, borderWidth: 1.5, borderColor: colors.primary + '44', paddingVertical: 12, paddingHorizontal: 16, marginBottom: 8 },
  codeText:    { fontSize: 18, flexShrink: 1, fontWeight: '800', color: colors.primary, letterSpacing: 2 },
  copyBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1.5, borderColor: colors.primary + '44', backgroundColor: colors.surface },
  copyBtnDone: { borderColor: colors.success + '44', backgroundColor: colors.success + '0E' },
  copyTxt:     { fontSize: 12, fontWeight: '700', color: colors.primary },
  copyTxtDone: { color: colors.success },
  linkPreview: { fontSize: 13, color: colors.inkSubtle, marginBottom: 12 },
  shareBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: colors.accent, borderRadius: 12, minHeight: 48, paddingVertical: 13 },
  shareBtnTxt: { fontSize: 15, fontWeight: '700', color: colors.onAccent },
  noCodeTxt:   { fontSize: 13, color: colors.inkSubtle, textAlign: 'center', paddingVertical: 8 },

  // Rewards
  rewardsCard: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 14 },
  rewardRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14 },
  rewardIconWrap: { width: 44, height: 44, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  rewardTitle: { fontSize: 13, fontWeight: '700', color: colors.ink, marginBottom: 3 },
  rewardDetail:{ fontSize: 12, color: colors.inkMid, lineHeight: 17 },

  // FAQ
  faqSection:  { marginBottom: 14 },
  faqCard:     { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },

  // History
  historyCard:    { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  historyRow:     { flexDirection: 'row', alignItems: 'flex-start', padding: 14 },
  historyRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  historyReason:  { fontSize: 13, fontWeight: '600', color: colors.ink },
  historyDate:    { fontSize: 13, color: colors.inkSubtle, marginTop: 2 },
  historyAmt:     { fontSize: 14, fontWeight: '700' },
});

export default HostReferralScreen;
