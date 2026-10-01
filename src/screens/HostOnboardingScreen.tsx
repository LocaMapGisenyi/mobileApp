import ContentSkeleton from '../components/ContentSkeleton';
import React, { useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  StatusBar,
  Image,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  InputAccessoryView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import LottieView from 'lottie-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, {
  FadeInRight,
  FadeOutLeft,
  FadeInLeft,
  FadeOutRight,
  Easing,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../types';
import { useHostOnboardingStore, PropertyType } from '../store/hostOnboarding';
import { colors, spacing, typography, borderRadius } from '../theme';
import { useFormKeyboardScroll } from '../hooks/useFormKeyboardScroll';
import { HostButton, HostHeader, HostNotice, HostPage } from '../components/host/HostUI';
import { supabase } from '../lib/supabase';
import { useUserStore } from '../store/user';
import { getHostAccessStatus, HostAccessStatus } from '../utils/hostAccess';

// ─── Lottie sources ───────────────────────────────────────────────────────────
const LOTTIE_SOURCES: Record<string, any> = {
  welcome: require('../assets/lottie/welcome.json'),
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
const IDENTITY_KEYBOARD_ACCESSORY = 'locamap-host-identity';

const ProgressPath = ({ current, labels }: { current: number; labels: string[] }) => {
  const { t } = useTranslation();
  return (
    <View
      style={prog.container}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: labels.length, now: current }}
      accessibilityLabel={labels[current - 1]}
    >
      <View style={prog.legend}>
        <Text style={prog.title}>{labels[current - 1]}</Text>
        <Text style={prog.count}>{t('pro.stepCount', { current, total: labels.length })}</Text>
      </View>
      <View style={prog.track}>
        {labels.map((label, i) => (
          <View key={label} style={[prog.segment, i < current && prog.filled]} />
        ))}
      </View>
    </View>
  );
};
const prog = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 12,
  },
  legend: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  title: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.primaryDark },
  count: { fontSize: 13, color: colors.inkSubtle },
  track: { flexDirection: 'row', gap: 5 },
  segment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  filled: { backgroundColor: colors.primary },
});

// ─── KYC Upload Card ──────────────────────────────────────────────────────────
const KycUploadCard = ({
  label,
  description,
  icon,
  uri,
  onPick,
}: {
  label: string;
  description: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  uri: string | null;
  onPick: () => Promise<void>;
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePress = async () => {
    setLoading(true);
    setError('');
    try {
      await onPick();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Sélection du document impossible.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[kyc.card, uri && kyc.cardDone]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      {uri ? (
        <Image source={{ uri }} style={kyc.preview} />
      ) : (
        <View style={kyc.placeholder}>
          <MaterialIcons name={icon} size={28} color={colors.primary} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        {!!error && (
          <Text accessibilityRole="alert" style={{ color: colors.error }}>
            {error}
          </Text>
        )}
        <Text style={kyc.label}>{label}</Text>
        <Text style={kyc.desc}>{description}</Text>
      </View>
      <View style={[kyc.status, uri && kyc.statusDone]}>
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : uri ? (
          <MaterialIcons name="check" size={16} color={colors.white} />
        ) : (
          <MaterialIcons name="add-a-photo" size={16} color={colors.primary} />
        )}
      </View>
    </TouchableOpacity>
  );
};

const kyc = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    backgroundColor: colors.surface,
    gap: 12,
  },
  cardDone: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  placeholder: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: { width: 56, height: 56, borderRadius: 8 },
  label: { fontSize: 14, fontWeight: '700', color: colors.ink, marginBottom: 2 },
  desc: { fontSize: 12, color: colors.inkSubtle, lineHeight: 16 },
  status: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  statusDone: { backgroundColor: colors.primary, borderColor: colors.primary },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function HostOnboardingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { step, data, nextStep, prevStep, updateData, togglePropertyType, complete } =
    useHostOnboardingStore();
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [submitError, setSubmitError] = useState('');
  const formScroll = useFormKeyboardScroll(step);
  const nameInput = useRef<TextInput>(null);
  const birthDateInput = useRef<TextInput>(null);
  const nationalityInput = useRef<TextInput>(null);
  const phoneInput = useRef<TextInput>(null);
  const userId = useUserStore(state => state.authUser?.id ?? null);
  const sessionToken = useUserStore(state => state.session?.access_token);
  const [access, setAccess] = useState<HostAccessStatus | 'loading'>('loading');
  const [accessUser, setAccessUser] = useState<string | null>(null);
  const [accessError, setAccessError] = useState('');
  const [accessRetry, setAccessRetry] = useState(0);
  const [correcting, setCorrecting] = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    setAccess('loading');
    setAccessError('');
    setCorrecting(false);
    void (async () => {
      try {
        if (!userId) throw new Error(t('hostFlow.workspace.statusError'));
        const [profile, application] = await Promise.all([
          supabase.from('profiles').select('is_host,kyc_status').eq('id', userId).single(),
          supabase.from('host_applications').select('status,submitted_at').eq('user_id', userId)
            .order('submitted_at', { ascending: false }).limit(1).maybeSingle(),
        ]);
        if (!active) return;
        if (profile.error) throw profile.error;
        if (application.error) throw application.error;
        const status = getHostAccessStatus(profile.data, application.data);
        setAccessUser(userId);
        setAccess(status);
        if (status === 'verified') navigation.replace('HostDashboard');
      } catch {
        if (active) {
          setAccessUser(userId);
          setAccess('unavailable');
          setAccessError(t('hostFlow.workspace.statusError'));
        }
      }
    })();
    return () => { active = false; };
  }, [userId, sessionToken, accessRetry, navigation, t]));

  const dirRef = useRef<'forward' | 'back'>('forward');

  // Translated step labels
  const STEP_LABELS = [
    t('hostOnboarding.stepWelcome'),
    t('hostOnboarding.stepIdentity'),
    t('hostOnboarding.stepKyc'),
    t('hostOnboarding.stepProperty'),
    t('hostOnboarding.stepLaunch'),
    t('hostOnboarding.stepConfirmed'),
  ];

  // Translated property types
  const PROPERTY_TYPES: { id: PropertyType; label: string; icon: string; desc: string }[] = [
    {
      id: 'villa',
      label: t('hostOnboarding.typeVilla'),
      icon: 'villa',
      desc: t('hostOnboarding.typeVillaDesc'),
    },
    {
      id: 'house',
      label: t('hostOnboarding.typeMaison'),
      icon: 'home',
      desc: t('hostOnboarding.typeMaisonDesc'),
    },
    {
      id: 'apartment',
      label: t('hostOnboarding.typeAppartement'),
      icon: 'apartment',
      desc: t('hostOnboarding.typeAppartementDesc'),
    },
    {
      id: 'studio',
      label: t('hostOnboarding.typeStudio'),
      icon: 'single-bed',
      desc: t('hostOnboarding.typeStudioDesc'),
    },
    {
      id: 'room',
      label: t('hostOnboarding.typeChambre'),
      icon: 'bed',
      desc: t('hostOnboarding.typeChambreDesc'),
    },
  ];

  const handleNext = useCallback(async () => {
    if (submittingRef.current) return;
    if (access !== 'new' && !(access === 'rejected' && correcting)) return;
    Keyboard.dismiss();
    dirRef.current = 'forward';
    if (step === 6) {
      navigation.replace('HostDashboard');
    } else {
      if (step === 5) {
        submittingRef.current = true;
        setSubmitting(true);
        setSubmitError('');
        try {
          await complete();
        } catch (error) {
          setSubmitError(error instanceof Error ? error.message : 'Dossier non envoyé. Réessayez.');
          return;
        } finally {
          submittingRef.current = false;
          setSubmitting(false);
        }
      }
      nextStep();
    }
  }, [step, nextStep, complete, navigation, submitting, access, correcting]);

  const handleBack = useCallback(() => {
    Keyboard.dismiss();
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
    if (step === 2)
      return (
        data.fullName.trim().length >= 2 &&
        data.phone.trim().length >= 8 &&
        data.dateOfBirth.trim().length >= 8 &&
        data.nationality.trim().length >= 2
      );
    if (step === 3)
      return data.kycSelfie !== null && data.kycIdFront !== null && data.kycIdBack !== null;
    if (step === 4) return data.propertyTypes.length > 0;
    return true;
  })();

  const continueLabel = submitting
    ? t('hostOnboarding.submitting')
    : step === 6
      ? t('hostOnboarding.goToDashboard')
      : step === 5
        ? t('hostOnboarding.finish')
        : t('hostOnboarding.continue');

  const entering =
    dirRef.current === 'forward'
      ? FadeInRight.duration(280).easing(Easing.out(Easing.quad))
      : FadeInLeft.duration(280).easing(Easing.out(Easing.quad));

  const exiting =
    dirRef.current === 'forward' ? FadeOutLeft.duration(220) : FadeOutRight.duration(220);

  if (accessUser !== userId || access === 'loading' || access === 'verified' || access === 'unavailable' || access === 'pending' || (access === 'rejected' && !correcting)) {
    const waiting = accessUser !== userId || access === 'loading' || access === 'verified';
    return <HostPage>
      <HostHeader title={t('hostOnboarding.headerTitle')} onBack={() => navigation.goBack()} />
      {waiting ? <ContentSkeleton variant="form" /> : <View style={{ gap: 20 }}>
        {access === 'unavailable' ? <HostNotice message={accessError || t('hostFlow.workspace.statusError')} onRetry={() => setAccessRetry(value => value + 1)} /> : <>
          <Text accessibilityRole="header" style={{ fontSize: 24, lineHeight: 31, fontWeight: '700', color: colors.ink }}>
            {t(access === 'pending' ? 'hostFlow.workspace.pendingTitle' : 'hostFlow.workspace.rejectedTitle')}
          </Text>
          <Text style={{ fontSize: 16, lineHeight: 24, color: colors.inkSubtle }}>
            {t(access === 'pending' ? 'hostFlow.workspace.pendingBody' : 'hostFlow.workspace.rejectedBody')}
          </Text>
          {access === 'rejected' && <HostButton label={t('hostFlow.workspace.correct')} onPress={() => {
            useHostOnboardingStore.getState().setStep(2);
            setCorrecting(true);
          }} />}
          <HostButton label={t('hostFlow.workspace.dashboard')} onPress={() => navigation.replace('HostDashboard')} />
        </>}
        <HostButton label={t('hostFlow.workspace.support')} variant="secondary" onPress={() => navigation.navigate('Support')} />
      </View>}
    </HostPage>;
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={s.root}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

        {/* Header */}
        <View style={{ width: '100%', maxWidth: 600, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 8 }}>
          <HostHeader title={t('hostOnboarding.headerTitle')} onBack={handleBack} />
        </View>

        {/* Progress */}
        <ProgressPath current={step} labels={STEP_LABELS} />

        {/* Step content */}
        <View
          ref={formScroll.viewportRef}
          collapsable={false}
          style={{ flex: 1 }}
          onLayout={formScroll.reveal}
        >
          <ScrollView
            ref={formScroll.scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={s.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            automaticallyAdjustKeyboardInsets={false}
            onScroll={event => formScroll.onScroll(event.nativeEvent.contentOffset.y)}
            scrollEventThrottle={16}
          >
            <Animated.View key={step} entering={entering} exiting={exiting} style={s.stepWrap}>
              {/* ── STEP 1 : Bienvenue ── */}
              {step === 1 && (
                <View style={s.centeredStep}>
                  <Image
                    source={require('../assets/images/gisenyi_header.png')}
                    style={s.welcomeImage}
                  />
                  <Text style={s.stepTitle}>{t('hostOnboarding.step1Title')}</Text>
                  <Text style={s.stepSubtitle}>{t('hostOnboarding.step1Subtitle')}</Text>
                  <View style={s.benefitsList}>
                    {[
                      { icon: 'event-available', text: t('hostOnboarding.benefit1') },
                      { icon: 'verified-user', text: t('hostOnboarding.benefit2') },
                      { icon: 'support-agent', text: t('hostOnboarding.benefit3') },
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

              {/* ── STEP 2 : Identité complète ── */}
              {step === 2 && (
                <View style={s.formStep}>
                  <Text style={s.stepTitle}>{t('hostOnboarding.step2Title')}</Text>
                  <Text style={s.stepSubtitle}>{t('hostOnboarding.step2Subtitle')}</Text>

                  <View style={s.field}>
                    <Text style={s.fieldLabel}>{t('hostOnboarding.fullName')}</Text>
                    <TextInput
                      ref={nameInput}
                      accessibilityLabel={t('hostOnboarding.fullName')}
                      onFocus={() => formScroll.onFocus(nameInput.current)}
                      onBlur={() => formScroll.onBlur(nameInput.current)}
                      returnKeyType="next"
                      submitBehavior="submit"
                      onSubmitEditing={() => birthDateInput.current?.focus()}
                      autoComplete="name"
                      inputAccessoryViewID={IDENTITY_KEYBOARD_ACCESSORY}
                      style={s.input}
                      value={data.fullName}
                      onChangeText={v => updateData({ fullName: v })}
                      placeholder={t('hostOnboarding.fullNamePlaceholder')}
                      placeholderTextColor={colors.inkSubtle}
                      autoCapitalize="words"
                    />
                  </View>

                  <View style={s.field}>
                    <Text style={s.fieldLabel}>{t('hostOnboarding.dateOfBirth')}</Text>
                    <TextInput
                      ref={birthDateInput}
                      accessibilityLabel={t('hostOnboarding.dateOfBirth')}
                      onFocus={() => formScroll.onFocus(birthDateInput.current)}
                      onBlur={() => formScroll.onBlur(birthDateInput.current)}
                      returnKeyType="next"
                      submitBehavior="submit"
                      onSubmitEditing={() => nationalityInput.current?.focus()}
                      inputAccessoryViewID={IDENTITY_KEYBOARD_ACCESSORY}
                      style={s.input}
                      value={data.dateOfBirth}
                      onChangeText={v => updateData({ dateOfBirth: v })}
                      placeholder={t('hostOnboarding.birthDatePlaceholder')}
                      placeholderTextColor={colors.inkSubtle}
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>

                  <View style={s.field}>
                    <Text style={s.fieldLabel}>{t('hostOnboarding.nationality')}</Text>
                    <TextInput
                      ref={nationalityInput}
                      accessibilityLabel={t('hostOnboarding.nationality')}
                      onFocus={() => formScroll.onFocus(nationalityInput.current)}
                      onBlur={() => formScroll.onBlur(nationalityInput.current)}
                      returnKeyType="next"
                      submitBehavior="submit"
                      onSubmitEditing={() => phoneInput.current?.focus()}
                      inputAccessoryViewID={IDENTITY_KEYBOARD_ACCESSORY}
                      style={s.input}
                      value={data.nationality}
                      onChangeText={v => updateData({ nationality: v })}
                      placeholder={t('hostOnboarding.nationalityPlaceholder')}
                      placeholderTextColor={colors.inkSubtle}
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
                        ref={phoneInput}
                        accessibilityLabel={t('hostOnboarding.phone')}
                        onFocus={() => formScroll.onFocus(phoneInput.current)}
                        onBlur={() => formScroll.onBlur(phoneInput.current)}
                        returnKeyType="done"
                        onSubmitEditing={Keyboard.dismiss}
                        autoComplete="tel-national"
                        inputAccessoryViewID={IDENTITY_KEYBOARD_ACCESSORY}
                        style={[s.input, s.phoneInput]}
                        value={data.phone}
                        onChangeText={v => updateData({ phone: v })}
                        placeholder="78 XXX XXXX"
                        placeholderTextColor={colors.inkSubtle}
                        keyboardType="phone-pad"
                      />
                    </View>
                  </View>

                  <View style={s.infoBox}>
                    <MaterialIcons name="info-outline" size={16} color={colors.inkSubtle} />
                    <Text style={s.infoText}>{t('hostOnboarding.identityInfo')}</Text>
                  </View>
                </View>
              )}

              {/* ── STEP 3 : KYC ── */}
              {step === 3 && (
                <View style={s.formStep}>
                  <Text style={s.stepTitle}>{t('hostOnboarding.step3KycTitle')}</Text>
                  <Text style={s.stepSubtitle}>{t('hostOnboarding.step3KycSubtitle')}</Text>

                  <KycUploadCard
                    label={t('hostOnboarding.kycSelfie')}
                    description={t('hostOnboarding.kycSelfieDesc')}
                    icon="face"
                    uri={data.kycSelfie}
                    onPick={async () => {
                      const permission = await ImagePicker.requestCameraPermissionsAsync();
                      if (!permission.granted)
                        throw new Error('Autorisez la caméra pour prendre votre photo.');
                      const result = await ImagePicker.launchCameraAsync({
                        mediaTypes: ['images'],
                        allowsEditing: true,
                        aspect: [1, 1],
                        quality: 0.8,
                      });
                      if (!result.canceled) updateData({ kycSelfie: result.assets[0].uri });
                    }}
                  />

                  <KycUploadCard
                    label={t('hostOnboarding.kycIdFront')}
                    description={t('hostOnboarding.kycIdFrontDesc')}
                    icon="credit-card"
                    uri={data.kycIdFront}
                    onPick={async () => {
                      const result = await ImagePicker.launchImageLibraryAsync({
                        mediaTypes: ['images'],
                        allowsEditing: true,
                        quality: 0.9,
                      });
                      if (!result.canceled) updateData({ kycIdFront: result.assets[0].uri });
                    }}
                  />

                  <KycUploadCard
                    label={t('hostOnboarding.kycIdBack')}
                    description={t('hostOnboarding.kycIdBackDesc')}
                    icon="flip"
                    uri={data.kycIdBack}
                    onPick={async () => {
                      const result = await ImagePicker.launchImageLibraryAsync({
                        mediaTypes: ['images'],
                        allowsEditing: true,
                        quality: 0.9,
                      });
                      if (!result.canceled) updateData({ kycIdBack: result.assets[0].uri });
                    }}
                  />

                  <View style={s.infoBox}>
                    <MaterialIcons name="lock-outline" size={16} color={colors.inkSubtle} />
                    <Text style={s.infoText}>{t('hostOnboarding.kycSecurityInfo')}</Text>
                  </View>
                </View>
              )}

              {/* ── STEP 4 : Logements ── */}
              {step === 4 && (
                <View style={s.formStep}>
                  <Text style={s.stepTitle}>{t('hostOnboarding.step3Title')}</Text>
                  <Text style={s.stepSubtitle}>{t('hostOnboarding.step3Subtitle')}</Text>

                  <View style={s.infoBox}>
                    <MaterialIcons name="info-outline" size={16} color={colors.inkSubtle} />
                    <Text style={s.infoText}>{t('hostOnboarding.step3Info')}</Text>
                  </View>

                  <View style={s.typeGrid}>
                    {PROPERTY_TYPES.map(pt => {
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
                          <Text style={[s.typeLabel, selected && s.typeLabelActive]}>
                            {pt.label}
                          </Text>
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

              {/* ── STEP 5 : Fonctionnement au lancement ── */}
              {step === 5 && (
                <View style={s.formStep}>
                  <View style={s.lottieRow}>
                    <MaterialIcons name="event-available" size={64} color={colors.primary} />
                  </View>
                  <Text style={s.stepTitle}>{t('hostOnboarding.launchTitle')}</Text>
                  <Text style={s.stepSubtitle}>{t('hostOnboarding.launchDescription')}</Text>
                  <View style={s.infoBox}>
                    <MaterialIcons name="info-outline" size={18} color={colors.inkMid} />
                    <Text style={s.launchInfo}>{t('hostOnboarding.launchPaymentInfo')}</Text>
                  </View>
                </View>
              )}

              {/* ── STEP 6 : Confirmé ── */}
              {step === 6 && (
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
                          {data.propertyTypes
                            .map(id => PROPERTY_TYPES.find(p => p.id === id)?.label)
                            .join(' · ')}
                        </Text>
                      </View>
                    )}
                    <View style={s.summaryRow}>
                      <MaterialIcons name="hourglass-empty" size={18} color={colors.warning} />
                      <Text style={[s.summaryText, { color: colors.warning }]}>
                        {t('hostOnboarding.kycPending')}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </Animated.View>
          </ScrollView>
        </View>

        {/* Footer CTA */}
        <View style={s.footer}>
          {!!submitError && (
            <Text accessibilityRole="alert" style={{ color: colors.error, marginBottom: 12 }}>
              {submitError}
            </Text>
          )}
          <TouchableOpacity
            style={[s.ctaBtn, !canContinue && s.ctaBtnDisabled]}
            onPress={canContinue && !submitting ? handleNext : undefined}
            disabled={!canContinue || submitting}
            activeOpacity={canContinue ? 0.85 : 1}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canContinue || submitting, busy: submitting }}
            accessibilityLabel={continueLabel}
          >
            <Text style={s.ctaText}>{continueLabel}</Text>
            {step < 6 && (
              <MaterialIcons
                name="arrow-forward"
                size={20}
                color={colors.onAccent}
                style={{ marginLeft: 8 }}
              />
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
      {Platform.OS === 'ios' && step === 2 && (
        <InputAccessoryView nativeID={IDENTITY_KEYBOARD_ACCESSORY} backgroundColor={colors.surface}>
          <View style={s.keyboardToolbar}>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={Keyboard.dismiss}
              style={s.keyboardDone}
            >
              <Text style={s.keyboardDoneText}>{t('hostOnboarding.keyboardDone')}</Text>
            </TouchableOpacity>
          </View>
        </InputAccessoryView>
      )}
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  welcomeImage: { width: '100%', height: 180, borderRadius: 12, marginBottom: 8 },
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
    width: 44,
    height: 44,
    borderRadius: 12,
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
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    paddingBottom: spacing[6],
  },
  stepWrap: {
    flex: 1,
  },

  // Centered step (1 & 5)
  centeredStep: {
    alignItems: 'stretch',
    paddingHorizontal: spacing[6],
    paddingTop: spacing[4],
  },

  // Form step (2, 3, 4)
  formStep: {
    paddingHorizontal: 24,
    paddingTop: 4,
  },
  lottieRow: {
    alignItems: 'center',
    marginBottom: spacing[4],
  },

  stepTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'left',
    marginTop: spacing[5],
    marginBottom: spacing[3],
    lineHeight: 36,
  },
  stepSubtitle: {
    fontSize: typography.fontSize.base,
    color: colors.inkSubtle,
    textAlign: 'left',
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
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: typography.fontSize.base,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  phonePrefix: {
    minHeight: 52,
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
  launchInfo: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.inkMid,
    lineHeight: 22,
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
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    paddingBottom: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing[3],
  },
  ctaBtn: {
    height: 54,
    backgroundColor: colors.accent,
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
    color: colors.onAccent,
  },
  skipText: {
    textAlign: 'center',
    fontSize: typography.fontSize.sm,
    color: colors.inkSubtle,
    textDecorationLine: 'underline',
  },
  keyboardToolbar: {
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing[4],
    backgroundColor: colors.surface,
  },
  keyboardDone: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing[3] },
  keyboardDoneText: { fontSize: 16, fontWeight: '600', color: colors.primary },
});
