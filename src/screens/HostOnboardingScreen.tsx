import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  StatusBar,
  useWindowDimensions,
  Pressable,
} from 'react-native';
import LottieView from 'lottie-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, {
  FadeInRight,
  FadeOutLeft,
  FadeInLeft,
  FadeOutRight,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../types';
import {
  useHostOnboardingStore,
  PropertyType,
  PaymentMethod,
} from '../store/hostOnboarding';
import { colors, spacing, typography, borderRadius } from '../theme';

// ─── Lottie sources ───────────────────────────────────────────────────────────
const LOTTIE_SOURCES: Record<string, any> = {
  welcome: require('../assets/lottie/welcome.json'),
  wallet:  require('../assets/lottie/wallet.json'),
  success: require('../assets/lottie/success.json'),
};

const LottieAnim = ({ name, size = 180 }: { name: string; size?: number }) => (
  <LottieView
    source={LOTTIE_SOURCES[name]}
    autoPlay
    loop={name !== 'success'}
    style={{ width: size, height: size }}
  />
);

// ─── Progress path indicator ──────────────────────────────────────────────────
// Step labels are now resolved inside the component via t()
const STEP_COUNT = 5;

const ProgressPath = ({ current, labels }: { current: number; labels: string[] }) => {
  return (
    <View style={prog.row}>
      {labels.map((label, i) => {
        const done = i + 1 < current;
        const active = i + 1 === current;
        return (
          <View key={i} style={prog.stepWrap}>
            {/* Connector line before dot (skip first) */}
            {i > 0 && (
              <View style={[prog.line, done && prog.lineDone]} />
            )}
            {/* Dot */}
            <View style={[prog.dot, done && prog.dotDone, active && prog.dotActive]}>
              {done ? (
                <MaterialIcons name="check" size={10} color={colors.white} />
              ) : (
                <Text style={[prog.dotText, active && prog.dotTextActive]}>
                  {i + 1}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const prog = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
  },
  stepWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  line: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: 2,
  },
  lineDone: {
    backgroundColor: colors.primary,
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotDone: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dotActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  dotText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.inkDisabled,
  },
  dotTextActive: {
    color: colors.primary,
  },
});

// ─── Static payment options (label/sub resolved inside component) ─────────────
const PAYMENT_OPTION_DEFS: { id: PaymentMethod; color: string; icon: string }[] = [
  { id: 'mtn_momo',     color: '#FFCC00', icon: 'smartphone' },
  { id: 'airtel_money', color: '#E4002B', icon: 'smartphone' },
  { id: 'bank',         color: colors.primary, icon: 'account-balance' },
];

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function HostOnboardingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { step, data, nextStep, prevStep, updateData, togglePropertyType, togglePaymentMethod, complete } =
    useHostOnboardingStore();
  const { t } = useTranslation();

  const { width } = useWindowDimensions();
  const dirRef = useRef<'forward' | 'back'>('forward');

  // Translated step labels
  const STEP_LABELS = [
    t('hostOnboarding.stepWelcome'),
    t('hostOnboarding.stepIdentity'),
    t('hostOnboarding.stepProperty'),
    t('hostOnboarding.stepPayment'),
    t('hostOnboarding.stepConfirmed'),
  ];

  // Translated property types
  const PROPERTY_TYPES: { id: PropertyType; label: string; icon: string; desc: string }[] = [
    { id: 'villa',     label: t('hostOnboarding.typeVilla'),        icon: 'villa',      desc: t('hostOnboarding.typeVillaDesc') },
    { id: 'house',     label: t('hostOnboarding.typeMaison'),       icon: 'home',       desc: t('hostOnboarding.typeMaisonDesc') },
    { id: 'apartment', label: t('hostOnboarding.typeAppartement'),  icon: 'apartment',  desc: t('hostOnboarding.typeAppartementDesc') },
    { id: 'studio',    label: t('hostOnboarding.typeStudio'),       icon: 'single-bed', desc: t('hostOnboarding.typeStudioDesc') },
    { id: 'room',      label: t('hostOnboarding.typeChambre'),      icon: 'bed',        desc: t('hostOnboarding.typeChambreDesc') },
  ];

  // Translated payment options
  const PAYMENT_OPTIONS: { id: PaymentMethod; label: string; color: string; icon: string; sub: string }[] = [
    { id: 'mtn_momo',     label: 'MTN MoMo',                  color: '#FFCC00',      icon: 'smartphone',      sub: t('hostOnboarding.mtnSub') },
    { id: 'airtel_money', label: 'Airtel Money',              color: '#E4002B',      icon: 'smartphone',      sub: t('hostOnboarding.airtelSub') },
    { id: 'bank',         label: t('hostOnboarding.bankName'),     color: colors.primary, icon: 'account-balance', sub: t('hostOnboarding.bankSub') },
  ];

  const handleNext = useCallback(() => {
    dirRef.current = 'forward';
    if (step === 5) {
      navigation.replace('HostDashboard');
    } else {
      nextStep();
    }
  }, [step, nextStep, navigation]);

  const handleBack = useCallback(() => {
    if (step === 1) {
      navigation.goBack();
    } else {
      dirRef.current = 'back';
      prevStep();
    }
  }, [step, prevStep, navigation]);

  // Validation per step
  const canContinue = (() => {
    if (step === 1) return true;
    if (step === 2) return data.fullName.trim().length >= 2 && data.phone.trim().length >= 8;
    if (step === 3) return data.propertyTypes.length > 0;
    if (step === 4) {
      if (data.paymentMethods.length === 0) return false;
      if (data.paymentMethods.includes('mtn_momo') && !data.mtnNumber.trim()) return false;
      if (data.paymentMethods.includes('airtel_money') && !data.airtelNumber.trim()) return false;
      if (data.paymentMethods.includes('bank') && (!data.bankName.trim() || !data.bankAccount.trim())) return false;
      return true;
    }
    return true;
  })();

  const entering = dirRef.current === 'forward'
    ? FadeInRight.duration(280).easing(Easing.out(Easing.quad))
    : FadeInLeft.duration(280).easing(Easing.out(Easing.quad));

  const exiting = dirRef.current === 'forward'
    ? FadeOutLeft.duration(220)
    : FadeOutRight.duration(220);

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={handleBack} style={s.backBtn} accessibilityRole="button" accessibilityLabel={t('hostOnboarding.back')}>
          <MaterialIcons name="arrow-back" size={22} color={colors.ink} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('hostOnboarding.headerTitle')}</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Progress */}
      <ProgressPath current={step} labels={STEP_LABELS} />

      {/* Step content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View key={step} entering={entering} exiting={exiting} style={s.stepWrap}>

          {/* ── STEP 1 : Bienvenue ── */}
          {step === 1 && (
            <View style={s.centeredStep}>
              <View style={s.waveTop} />
              <LottieAnim name="welcome" size={160} />
              <Text style={s.stepTitle}>{t('hostOnboarding.step1Title')}</Text>
              <Text style={s.stepSubtitle}>{t('hostOnboarding.step1Subtitle')}</Text>
              <View style={s.benefitsList}>
                {[
                  { icon: 'payments',       text: t('hostOnboarding.benefit1') },
                  { icon: 'verified-user',  text: t('hostOnboarding.benefit2') },
                  { icon: 'support-agent',  text: t('hostOnboarding.benefit3') },
                ].map((b, i) => (
                  <View key={i} style={s.benefitRow}>
                    <View style={s.benefitIcon}>
                      <MaterialIcons name={b.icon as any} size={18} color={colors.primary} />
                    </View>
                    <Text style={s.benefitText}>{b.text}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── STEP 2 : Identité ── */}
          {step === 2 && (
            <View style={s.formStep}>
              <Text style={s.stepTitle}>{t('hostOnboarding.step2Title')}</Text>
              <Text style={s.stepSubtitle}>{t('hostOnboarding.step2Subtitle')}</Text>

              <View style={s.field}>
                <Text style={s.fieldLabel}>{t('hostOnboarding.fullName')}</Text>
                <TextInput
                  style={s.input}
                  value={data.fullName}
                  onChangeText={(v) => updateData({ fullName: v })}
                  placeholder={t('hostOnboarding.fullNamePlaceholder')}
                  placeholderTextColor={colors.inkDisabled}
                  autoCapitalize="words"
                />
              </View>

              <View style={s.field}>
                <Text style={s.fieldLabel}>{t('hostOnboarding.phone')}</Text>
                <View style={s.phoneRow}>
                  <View style={s.phonePrefix}>
                    <Text style={s.phonePrefixText}>🇷🇼 +250</Text>
                  </View>
                  <TextInput
                    style={[s.input, s.phoneInput]}
                    value={data.phone}
                    onChangeText={(v) => updateData({ phone: v })}
                    placeholder="78 XXX XXXX"
                    placeholderTextColor={colors.inkDisabled}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <View style={[s.infoBox]}>
                <MaterialIcons name="info-outline" size={16} color={colors.inkSubtle} />
                <Text style={s.infoText}>{t('hostOnboarding.phoneInfo')}</Text>
              </View>
            </View>
          )}

          {/* ── STEP 3 : Logements ── */}
          {step === 3 && (
            <View style={s.formStep}>
              <Text style={s.stepTitle}>{t('hostOnboarding.step3Title')}</Text>
              <Text style={s.stepSubtitle}>{t('hostOnboarding.step3Subtitle')}</Text>

              <View style={s.infoBox}>
                <MaterialIcons name="info-outline" size={16} color={colors.inkSubtle} />
                <Text style={s.infoText}>{t('hostOnboarding.step3Info')}</Text>
              </View>

              <View style={s.typeGrid}>
                {PROPERTY_TYPES.map((pt) => {
                  const selected = data.propertyTypes.includes(pt.id);
                  return (
                    <TouchableOpacity
                      key={pt.id}
                      style={[s.typeCard, selected && s.typeCardActive]}
                      onPress={() => togglePropertyType(pt.id)}
                      activeOpacity={0.8}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                    >
                      {selected && (
                        <View style={s.typeCheckBadge}>
                          <MaterialIcons name="check" size={11} color={colors.white} />
                        </View>
                      )}
                      <MaterialIcons
                        name={pt.icon as any}
                        size={28}
                        color={selected ? colors.white : colors.primary}
                      />
                      <Text style={[s.typeLabel, selected && s.typeLabelActive]}>{pt.label}</Text>
                      <Text style={[s.typeDesc, selected && s.typeDescActive]}>{pt.desc}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {data.propertyTypes.length > 0 && (
                <View style={s.selectionSummary}>
                  <MaterialIcons name="check-circle" size={16} color={colors.primary} />
                  <Text style={s.selectionSummaryText}>
                    {t('hostOnboarding.selectionCount', {
                      count: data.propertyTypes.length,
                    })}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* ── STEP 4 : Paiement ── */}
          {step === 4 && (
            <View style={s.formStep}>
              <View style={s.lottieRow}>
                <LottieAnim name="wallet" size={100} />
              </View>
              <Text style={s.stepTitle}>{t('hostOnboarding.step4Title')}</Text>
              <Text style={s.stepSubtitle}>{t('hostOnboarding.step4Subtitle')}</Text>

              {PAYMENT_OPTIONS.map((opt) => {
                const selected = data.paymentMethods.includes(opt.id);
                return (
                  <View key={opt.id}>
                    <TouchableOpacity
                      style={[s.payCard, selected && s.payCardActive]}
                      onPress={() => togglePaymentMethod(opt.id)}
                      activeOpacity={0.85}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                    >
                      <View style={[s.payIconWrap, { backgroundColor: opt.color + '22' }]}>
                        <MaterialIcons name={opt.icon as any} size={24} color={opt.color} />
                      </View>
                      <View style={{ flex: 1, marginLeft: spacing[3] }}>
                        <Text style={s.payLabel}>{opt.label}</Text>
                        <Text style={s.paySub}>{opt.sub}</Text>
                      </View>
                      <View style={[s.payCheck, selected && s.payCheckActive]}>
                        {selected && <MaterialIcons name="check" size={14} color={colors.white} />}
                      </View>
                    </TouchableOpacity>

                    {/* Champs conditionnels */}
                    {selected && opt.id === 'mtn_momo' && (
                      <View style={s.subField}>
                        <Text style={s.fieldLabel}>{t('hostOnboarding.mtnNumber')}</Text>
                        <View style={s.phoneRow}>
                          <View style={s.phonePrefix}>
                            <Text style={s.phonePrefixText}>+250</Text>
                          </View>
                          <TextInput
                            style={[s.input, s.phoneInput]}
                            value={data.mtnNumber}
                            onChangeText={(v) => updateData({ mtnNumber: v })}
                            placeholder="78 XXX XXXX"
                            placeholderTextColor={colors.inkDisabled}
                            keyboardType="phone-pad"
                          />
                        </View>
                      </View>
                    )}

                    {selected && opt.id === 'airtel_money' && (
                      <View style={s.subField}>
                        <Text style={s.fieldLabel}>{t('hostOnboarding.airtelNumber')}</Text>
                        <View style={s.phoneRow}>
                          <View style={s.phonePrefix}>
                            <Text style={s.phonePrefixText}>+250</Text>
                          </View>
                          <TextInput
                            style={[s.input, s.phoneInput]}
                            value={data.airtelNumber}
                            onChangeText={(v) => updateData({ airtelNumber: v })}
                            placeholder="73 XXX XXXX"
                            placeholderTextColor={colors.inkDisabled}
                            keyboardType="phone-pad"
                          />
                        </View>
                      </View>
                    )}

                    {selected && opt.id === 'bank' && (
                      <View style={s.subField}>
                        <Text style={s.fieldLabel}>{t('hostOnboarding.bankNameField')}</Text>
                        <TextInput
                          style={s.input}
                          value={data.bankName}
                          onChangeText={(v) => updateData({ bankName: v })}
                          placeholder={t('hostOnboarding.bankNamePlaceholder')}
                          placeholderTextColor={colors.inkDisabled}
                        />
                        <Text style={[s.fieldLabel, { marginTop: spacing[3] }]}>{t('hostOnboarding.bankAccount')}</Text>
                        <TextInput
                          style={s.input}
                          value={data.bankAccount}
                          onChangeText={(v) => updateData({ bankAccount: v })}
                          placeholder="XXXX XXXX XXXX"
                          placeholderTextColor={colors.inkDisabled}
                          keyboardType="numeric"
                        />
                      </View>
                    )}
                  </View>
                );
              })}

              <View style={s.infoBox}>
                <MaterialIcons name="lock-outline" size={16} color={colors.inkSubtle} />
                <Text style={s.infoText}>{t('hostOnboarding.paymentSecurityInfo')}</Text>
              </View>
            </View>
          )}

          {/* ── STEP 5 : Confirmé ── */}
          {step === 5 && (
            <View style={s.centeredStep}>
              <LottieAnim name="success" size={160} />
              <Text style={s.stepTitle}>{t('hostOnboarding.step5Title')}</Text>
              <Text style={s.stepSubtitle}>{t('hostOnboarding.step5Subtitle')}</Text>
              <View style={s.summaryCard}>
                <View style={s.summaryRow}>
                  <MaterialIcons name="person" size={18} color={colors.primary} />
                  <Text style={s.summaryText}>{data.fullName}</Text>
                </View>
                <View style={s.summaryRow}>
                  <MaterialIcons name="phone" size={18} color={colors.primary} />
                  <Text style={s.summaryText}>+250 {data.phone}</Text>
                </View>
                {data.propertyTypes.length > 0 && (
                  <View style={s.summaryRow}>
                    <MaterialIcons name="home" size={18} color={colors.primary} />
                    <Text style={s.summaryText}>
                      {data.propertyTypes.map(id =>
                        PROPERTY_TYPES.find(p => p.id === id)?.label
                      ).join(' · ')}
                    </Text>
                  </View>
                )}
                <View style={s.summaryRow}>
                  <MaterialIcons name="account-balance-wallet" size={18} color={colors.primary} />
                  <Text style={s.summaryText}>
                    {data.paymentMethods.map(m =>
                      PAYMENT_OPTIONS.find(p => p.id === m)?.label
                    ).join(' · ')}
                  </Text>
                </View>
              </View>
            </View>
          )}

        </Animated.View>
      </ScrollView>

      {/* Footer CTA */}
      <View style={s.footer}>
        <TouchableOpacity
          style={[s.ctaBtn, !canContinue && s.ctaBtnDisabled]}
          onPress={canContinue ? handleNext : undefined}
          activeOpacity={canContinue ? 0.85 : 1}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canContinue }}
          accessibilityLabel={step === 5 ? t('hostOnboarding.goToDashboard') : t('hostOnboarding.continue')}
        >
          <Text style={s.ctaText}>
            {step === 5
              ? t('hostOnboarding.goToDashboard')
              : step === 4
                ? t('hostOnboarding.finish')
                : t('hostOnboarding.continue')}
          </Text>
          {step < 5 && <MaterialIcons name="arrow-forward" size={20} color={colors.white} style={{ marginLeft: 8 }} />}
        </TouchableOpacity>
        {step > 1 && step < 5 && (
          <Text style={s.skipText} onPress={handleNext}>
            {t('hostOnboarding.skip')}
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceSunken,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    color: colors.ink,
  },
  scrollContent: {
    paddingBottom: spacing[6],
  },
  stepWrap: {
    flex: 1,
  },

  // Centered step (1 & 5)
  centeredStep: {
    alignItems: 'center',
    paddingHorizontal: spacing[6],
    paddingTop: spacing[4],
  },
  waveTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: colors.primaryLight,
    borderBottomLeftRadius: 60,
    borderBottomRightRadius: 60,
  },

  // Form step (2, 3, 4)
  formStep: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[5],
  },
  lottieRow: {
    alignItems: 'center',
    marginBottom: spacing[4],
  },

  stepTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '800',
    color: colors.ink,
    textAlign: 'center',
    marginTop: spacing[5],
    marginBottom: spacing[3],
    lineHeight: 36,
  },
  stepSubtitle: {
    fontSize: typography.fontSize.base,
    color: colors.inkSubtle,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing[6],
  },

  // Benefits
  benefitsList: {
    width: '100%',
    marginTop: spacing[2],
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing[4],
  },
  benefitIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
    flexShrink: 0,
  },
  benefitText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.inkMid,
    lineHeight: 20,
    paddingTop: 8,
  },

  // Fields
  field: {
    marginBottom: spacing[5],
  },
  fieldLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.inkMid,
    marginBottom: spacing[2],
    letterSpacing: 0.1,
  },
  input: {
    height: 52,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[4],
    fontSize: typography.fontSize.base,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  phonePrefix: {
    height: 52,
    paddingHorizontal: spacing[3],
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceSunken,
  },
  phonePrefixText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.inkMid,
  },
  phoneInput: {
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    backgroundColor: colors.surfaceSunken,
    borderRadius: borderRadius.md,
    padding: spacing[4],
    marginTop: spacing[2],
    marginBottom: spacing[4],
  },
  infoText: {
    flex: 1,
    fontSize: typography.fontSize.xs,
    color: colors.inkSubtle,
    lineHeight: 18,
  },

  // Property types grid
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    marginBottom: spacing[5],
  },
  typeCard: {
    width: '30%',
    aspectRatio: 0.85,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.card,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[2],
    backgroundColor: colors.surface,
  },
  typeCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  typeLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    color: colors.ink,
    marginTop: spacing[2],
    textAlign: 'center',
  },
  typeLabelActive: { color: colors.white },
  typeDesc: {
    fontSize: 10,
    color: colors.inkSubtle,
    textAlign: 'center',
    marginTop: 2,
  },
  typeDescActive: { color: 'rgba(255,255,255,0.8)' },
  typeCheckBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[2],
    marginBottom: spacing[2],
  },
  selectionSummaryText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: '600',
  },

  // Counter (kept for potential reuse)
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  counterBtn: {
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceSunken,
  },
  counterValue: {
    paddingHorizontal: spacing[6],
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.ink,
  },

  // Payment cards
  payCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.card,
    padding: spacing[4],
    marginBottom: spacing[3],
    backgroundColor: colors.surface,
  },
  payCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  payIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  payLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    color: colors.ink,
  },
  paySub: {
    fontSize: typography.fontSize.xs,
    color: colors.inkSubtle,
    marginTop: 2,
  },
  payCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  payCheckActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  subField: {
    marginLeft: spacing[4],
    marginTop: -spacing[1],
    marginBottom: spacing[3],
    paddingLeft: spacing[4],
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
  },

  // Summary card (step 5)
  summaryCard: {
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.card,
    padding: spacing[5],
    marginTop: spacing[4],
    backgroundColor: colors.surfaceSunken,
    gap: spacing[3],
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  summaryText: {
    fontSize: typography.fontSize.sm,
    color: colors.inkMid,
    fontWeight: '500',
  },

  // Footer
  footer: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    paddingBottom: spacing[6],
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing[3],
  },
  ctaBtn: {
    height: 54,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBtnDisabled: {
    backgroundColor: colors.inkDisabled,
  },
  ctaText: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    color: colors.white,
  },
  skipText: {
    textAlign: 'center',
    fontSize: typography.fontSize.sm,
    color: colors.inkSubtle,
    textDecorationLine: 'underline',
  },
});
