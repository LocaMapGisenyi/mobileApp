import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Platform,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  StatusBar,
  Dimensions,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeInDown, FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, borderRadius } from '../theme';
import { RootStackParamList } from '../types';
import { NewListingFormData, useHostListingsStore } from '../store/hostListings';

type Nav = NativeStackNavigationProp<RootStackParamList, 'CreateListing'>;

// ─── Static constants (no i18n needed) ────────────────────────────────────────
const PROPERTY_TYPE_VALUES = [
  { value: 'appartement', icon: 'apartment' as const },
  { value: 'maison',      icon: 'home' as const },
  { value: 'studio',      icon: 'single-bed' as const },
  { value: 'villa',       icon: 'villa' as const },
  { value: 'chambre',     icon: 'bed' as const },
];

const ACCOMMODATION_TYPE_VALUES = [
  { value: 'entier' },
  { value: 'privee' },
  { value: 'partagee' },
];

const AMENITY_ICONS: { key: string; icon: React.ComponentProps<typeof MaterialIcons>['name'] }[] = [
  { key: 'wifi',              icon: 'wifi' },
  { key: 'water',             icon: 'water-drop' },
  { key: 'hotWater',          icon: 'hot-tub' },
  { key: 'electricity',       icon: 'bolt' },
  { key: 'generator',         icon: 'electrical-services' },
  { key: 'kitchen',           icon: 'kitchen' },
  { key: 'fridge',            icon: 'kitchen' },
  { key: 'tv',                icon: 'tv' },
  { key: 'ac',                icon: 'ac-unit' },
  { key: 'fan',               icon: 'air' },
  { key: 'parking',           icon: 'local-parking' },
  { key: 'security',          icon: 'security' },
  { key: 'balcony',           icon: 'balcony' },
  { key: 'lakeView',          icon: 'water' },
  { key: 'garden',            icon: 'grass' },
  { key: 'washer',            icon: 'local-laundry-service' },
  { key: 'furnished',         icon: 'chair' },
  { key: 'regideso',          icon: 'plumbing' },
];

const MIN_DURATION_VALUES = [
  { value: 1 },
  { value: 3 },
  { value: 6 },
  { value: 12 },
];

const NOTICE_PERIOD_VALUES = [
  { value: 15 },
  { value: 30 },
  { value: 60 },
];

const COMMISSION = 0.12;

const HOUSE_RULE_KEYS: { key: string; ruleKey: string; icon: React.ComponentProps<typeof MaterialIcons>['name'] }[] = [
  { key: 'smoking',   ruleKey: 'smokingAllowed',  icon: 'smoking-rooms' },
  { key: 'pets',      ruleKey: 'petsAllowed',     icon: 'pets' },
  { key: 'visitors',  ruleKey: 'visitorsAllowed', icon: 'people' },
  { key: 'noise',     ruleKey: 'noiseAfter22',    icon: 'nights-stay' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const Counter = ({
  value,
  onDecrement,
  onIncrement,
  min = 1,
}: {
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  min?: number;
}) => (
  <View style={ct.wrap}>
    <TouchableOpacity
      style={[ct.btn, value <= min && ct.btnDisabled]}
      onPress={onDecrement}
      disabled={value <= min}
      activeOpacity={0.7}
    >
      <MaterialIcons name="remove" size={16} color={value <= min ? colors.inkDisabled : colors.inkMid} />
    </TouchableOpacity>
    <Text style={ct.value}>{value}</Text>
    <TouchableOpacity style={ct.btn} onPress={onIncrement} activeOpacity={0.7}>
      <MaterialIcons name="add" size={16} color={colors.inkMid} />
    </TouchableOpacity>
  </View>
);
const ct = StyleSheet.create({
  wrap:       { flexDirection: 'row', alignItems: 'center', gap: 0 },
  btn:        { width: 36, height: 36, borderRadius: 8, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  btnDisabled:{ borderColor: colors.border, backgroundColor: colors.surfaceSunken },
  value:      { width: 44, textAlign: 'center', fontSize: 16, fontWeight: '700', color: colors.ink },
});

const FieldInput = ({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  suffix,
  error,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'numeric' | 'default';
  suffix?: string;
  error?: string;
}) => (
  <View style={fi.wrap}>
    <Text style={fi.label}>{label}</Text>
    <View style={[fi.inputRow, !!error && fi.inputRowError]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.inkDisabled}
        style={[fi.input, multiline && fi.inputMulti]}
        multiline={multiline}
        keyboardType={keyboardType ?? 'default'}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
      {suffix && <Text style={fi.suffix}>{suffix}</Text>}
    </View>
    {!!error && <Text style={fi.errorTxt}>{error}</Text>}
  </View>
);
const fi = StyleSheet.create({
  wrap:           { marginBottom: 16 },
  label:          { fontSize: 13, fontWeight: '600', color: colors.inkMid, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
  inputRow:       { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceSunken, borderRadius: 8, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 12 },
  inputRowError:  { borderColor: colors.error },
  input:          { flex: 1, fontSize: 15, color: colors.ink, paddingVertical: 11 },
  inputMulti:     { minHeight: 100, paddingTop: 12 },
  suffix:         { fontSize: 13, fontWeight: '600', color: colors.inkSubtle, marginLeft: 6 },
  errorTxt:       { fontSize: 11, color: colors.error, marginTop: 4 },
});

// ─── Progress indicator ────────────────────────────────────────────────────────
const ProgressRail = ({
  step,
  total,
  labels,
}: {
  step: number;
  total: number;
  labels: string[];
}) => (
  <View style={pr.outer}>
    {/* Dots + line row */}
    <View style={pr.rail}>
      {Array.from({ length: total }).map((_, i) => (
        <React.Fragment key={i}>
          <View style={[pr.dot, i < step && pr.dotDone, i === step && pr.dotActive]}>
            {i < step
              ? <MaterialIcons name="check" size={11} color={colors.white} />
              : <Text style={[pr.dotNum, i === step && pr.dotNumActive]}>{i + 1}</Text>
            }
          </View>
          {i < total - 1 && (
            <View style={[pr.line, i < step && pr.lineDone]} />
          )}
        </React.Fragment>
      ))}
    </View>
    {/* Labels row — aligned under each dot */}
    <View style={pr.labelsRow}>
      {labels.map((lbl, i) => (
        <View key={i} style={pr.labelCell}>
          <Text style={[pr.labelTxt, i === step && pr.labelActive]}>{lbl}</Text>
        </View>
      ))}
    </View>
  </View>
);
const pr = StyleSheet.create({
  outer:       { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 6 },
  rail:        { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  dot:         { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  dotDone:     { backgroundColor: colors.primary },
  dotActive:   { backgroundColor: colors.primary, borderWidth: 3, borderColor: colors.primaryLight },
  dotNum:      { fontSize: 11, fontWeight: '700', color: colors.inkDisabled },
  dotNumActive:{ color: colors.white },
  line:        { flex: 1, height: 2, backgroundColor: colors.border, marginHorizontal: 3 },
  lineDone:    { backgroundColor: colors.primary },
  labelsRow:   { flexDirection: 'row' },
  labelCell:   { flex: 1, alignItems: 'center' },
  labelTxt:    { fontSize: 10, fontWeight: '500', color: colors.inkDisabled, textTransform: 'uppercase', letterSpacing: 0.4 },
  labelActive: { color: colors.primary, fontWeight: '700' },
});

// Gisenyi / Rubavu centre-ville
const GISENYI_REGION: Region = {
  latitude: -1.6977,
  longitude: 29.2558,
  latitudeDelta: 0.04,
  longitudeDelta: 0.04,
};

const MAP_HEIGHT = Dimensions.get('window').width * 0.55;

// ─── Screen ───────────────────────────────────────────────────────────────────
const CreateListingScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { addListing } = useHostListingsStore();
  const mapRef = useRef<MapView>(null);
  const { t } = useTranslation();

  // ── Translated dynamic data (computed inside component) ───────────────────
  const STEPS = useMemo(() => [
    { label: t('createListing.stepType'),    icon: 'home' as const },
    { label: t('createListing.stepAddress'), icon: 'location-on' as const },
    { label: t('createListing.stepDetails'), icon: 'list' as const },
    { label: t('createListing.stepFinish'),  icon: 'photo-library' as const },
  ], [t]);

  const PROPERTY_TYPES = useMemo(() => [
    { label: t('createListing.propAppartement'), value: 'appartement', icon: 'apartment' as const },
    { label: t('createListing.propMaison'),      value: 'maison',      icon: 'home' as const },
    { label: t('createListing.propStudio'),      value: 'studio',      icon: 'single-bed' as const },
    { label: t('createListing.propVilla'),       value: 'villa',       icon: 'villa' as const },
    { label: t('createListing.propChambre'),     value: 'chambre',     icon: 'bed' as const },
  ], [t]);

  const ACCOMMODATION_TYPES = useMemo(() => [
    { label: t('createListing.accomEntire'),  value: 'entier',   sub: t('createListing.accomEntireSub') },
    { label: t('createListing.accomPrivate'), value: 'privee',   sub: t('createListing.accomPrivateSub') },
    { label: t('createListing.accomShared'),  value: 'partagee', sub: t('createListing.accomSharedSub') },
  ], [t]);

  const AMENITIES = useMemo<{ label: string; icon: React.ComponentProps<typeof MaterialIcons>['name'] }[]>(() => [
    { label: t('createListing.amenityWifi'),       icon: 'wifi' },
    { label: t('createListing.amenityWater'),      icon: 'water-drop' },
    { label: t('createListing.amenityHotWater'),   icon: 'hot-tub' },
    { label: t('createListing.amenityElec'),       icon: 'bolt' },
    { label: t('createListing.amenityGenerator'),  icon: 'electrical-services' },
    { label: t('createListing.amenityKitchen'),    icon: 'kitchen' },
    { label: t('createListing.amenityFridge'),     icon: 'kitchen' },
    { label: t('createListing.amenityTV'),         icon: 'tv' },
    { label: t('createListing.amenityAC'),         icon: 'ac-unit' },
    { label: t('createListing.amenityFan'),        icon: 'air' },
    { label: t('createListing.amenityParking'),    icon: 'local-parking' },
    { label: t('createListing.amenitySecurity'),   icon: 'security' },
    { label: t('createListing.amenityBalcony'),    icon: 'balcony' },
    { label: t('createListing.amenityLakeView'),   icon: 'water' },
    { label: t('createListing.amenityGarden'),     icon: 'grass' },
    { label: t('createListing.amenityWasher'),     icon: 'local-laundry-service' },
    { label: t('createListing.amenityFurnished'),  icon: 'chair' },
    { label: t('createListing.amenityRegideso'),   icon: 'plumbing' },
  ], [t]);

  const MIN_DURATIONS = useMemo(() => [
    { label: t('createListing.duration1m'),  value: 1 },
    { label: t('createListing.duration3m'),  value: 3 },
    { label: t('createListing.duration6m'),  value: 6 },
    { label: t('createListing.duration1y'),  value: 12 },
  ], [t]);

  const NOTICE_PERIODS = useMemo(() => [
    { label: t('createListing.notice15d'), value: 15 },
    { label: t('createListing.notice1m'),  value: 30 },
    { label: t('createListing.notice2m'),  value: 60 },
  ], [t]);

  const HOUSE_RULES = useMemo<{ key: string; label: string; sub: string; icon: React.ComponentProps<typeof MaterialIcons>['name'] }[]>(() => [
    { key: 'smokingAllowed',  label: t('createListing.ruleSmoking'),   sub: t('createListing.ruleSmokingSub'),   icon: 'smoking-rooms' },
    { key: 'petsAllowed',     label: t('createListing.rulePets'),      sub: t('createListing.rulePetsSub'),      icon: 'pets' },
    { key: 'visitorsAllowed', label: t('createListing.ruleVisitors'),  sub: t('createListing.ruleVisitorsSub'), icon: 'people' },
    { key: 'noiseAfter22',    label: t('createListing.ruleNoise'),     sub: t('createListing.ruleNoiseSub'),    icon: 'nights-stay' },
  ], [t]);

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [locating, setLocating] = useState(false);

  const [form, setForm] = useState<NewListingFormData & { accommodationType: string }>({
    title: '',
    description: '',
    price: 0,
    currency: 'CDF',
    bedrooms: 1,
    bathrooms: 1,
    size: 0,
    amenities: [],
    type: 'appartement',
    accommodationType: 'entier',
    address: '',
    city: 'Gisenyi',
    district: '',
    images: [],
    maxGuests: 2,
    smokingAllowed: false,
    petsAllowed: false,
    latitude: GISENYI_REGION.latitude,
    longitude: GISENYI_REGION.longitude,
    // Long-term rental specific
    minDurationMonths: 1,
    noticePeriodDays: 30,
    depositMonths: 1,
    visitorsAllowed: true,
    noiseAfter22: false,
  } as any);

  const patch = (key: string, value: unknown) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const detectLocation = useCallback(async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrors(prev => ({ ...prev, location: t('createListing.permissionDenied') }));
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = pos.coords;
      patch('latitude', latitude);
      patch('longitude', longitude);
      // Reverse geocoding
      const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geo.length > 0) {
        const g = geo[0];
        if (g.street) patch('address', g.street);
        if (g.subregion || g.district) patch('district', g.subregion ?? g.district ?? '');
        if (g.city) patch('city', g.city);
      }
      mapRef.current?.animateToRegion(
        { latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 },
        600,
      );
    } catch {
      setErrors(prev => ({ ...prev, location: t('createListing.locationError') }));
    } finally {
      setLocating(false);
    }
  }, [t]);

  const toggleAmenity = (a: string) => {
    patch('amenities',
      form.amenities.includes(a)
        ? form.amenities.filter(x => x !== a)
        : [...form.amenities, a],
    );
  };

  // ── Validation per step ────────────────────────────────────────────────────
  const validateStep = (): boolean => {
    const e: Record<string, string> = {};
    if (step === 0) {
      if (form.title.trim().length < 10) e.title = t('createListing.validTitle');
      if (form.description.trim().length < 50) e.description = t('createListing.validDesc');
    }
    if (step === 1) {
      if (!form.district.trim()) e.district = t('createListing.validDistrict');
      if (!form.address.trim()) e.address = t('createListing.validAddress');
    }
    if (step === 2) {
      if (!form.price || form.price < 20000) e.price = t('createListing.validPrice');
    }
    if (step === 3) {
      if (form.images.length < 1) e.images = t('createListing.validImages');
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const goNext = () => {
    if (!validateStep()) return;
    if (step < 3) setStep(s => s + 1);
    else handleSave('draft');
  };

  const goBack = () => {
    if (step > 0) setStep(s => s - 1);
    else navigation.goBack();
  };

  const handleSave = async (mode: 'draft' | 'publish') => {
    if (!validateStep()) return;
    setSaving(true);
    try {
      addListing(form);
      navigation.navigate('HostDashboard');
    } catch {
      setErrors({ submit: t('createListing.submitError') });
    } finally {
      setSaving(false);
    }
  };

  // ── Step content ───────────────────────────────────────────────────────────
  const renderStep0 = () => (
    <Animated.View entering={FadeInDown.duration(320)}>
      <Text style={s.stepTitle}>{t('createListing.step0Title')}</Text>
      <Text style={s.stepSub}>{t('createListing.step0Sub')}</Text>

      <View style={s.typeGrid}>
        {PROPERTY_TYPES.map(pt => (
          <TouchableOpacity
            key={pt.value}
            style={[s.typeCard, form.type === pt.value && s.typeCardActive]}
            onPress={() => patch('type', pt.value)}
            activeOpacity={0.8}
          >
            <MaterialIcons
              name={pt.icon}
              size={26}
              color={form.type === pt.value ? colors.primary : colors.inkSubtle}
            />
            <Text style={[s.typeLabel, form.type === pt.value && s.typeLabelActive]}>
              {pt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[s.fieldGroupLabel, { marginTop: 24 }]}>{t('createListing.accomTypeLabel')}</Text>
      {ACCOMMODATION_TYPES.map(at => (
        <TouchableOpacity
          key={at.value}
          style={[s.accomRow, form.accommodationType === at.value && s.accomRowActive]}
          onPress={() => patch('accommodationType', at.value)}
          activeOpacity={0.8}
        >
          <View style={s.accomRadio}>
            {form.accommodationType === at.value && <View style={s.accomRadioInner} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.accomLabel, form.accommodationType === at.value && s.accomLabelActive]}>
              {at.label}
            </Text>
            <Text style={s.accomSub}>{at.sub}</Text>
          </View>
        </TouchableOpacity>
      ))}

      <View style={{ marginTop: 24 }}>
        <FieldInput
          label={t('createListing.titleLabel')}
          value={form.title}
          onChangeText={v => patch('title', v)}
          placeholder={t('createListing.titlePlaceholder')}
          error={errors.title}
        />
        <FieldInput
          label={t('createListing.descriptionLabel')}
          value={form.description}
          onChangeText={v => patch('description', v)}
          placeholder={t('createListing.descriptionPlaceholder')}
          multiline
          error={errors.description}
        />
        {form.description.length > 0 && (
          <Text style={s.charCount}>{form.description.length} / 500 {t('createListing.chars')}</Text>
        )}
      </View>
    </Animated.View>
  );

  const renderStep1 = () => (
    <Animated.View entering={FadeInDown.duration(320)}>
      <Text style={s.stepTitle}>{t('createListing.step1Title')}</Text>
      <Text style={s.stepSub}>{t('createListing.step1Sub')}</Text>

      {/* Auto-localisation */}
      <TouchableOpacity
        style={[s.locateBtn, locating && s.locateBtnLoading]}
        onPress={detectLocation}
        disabled={locating}
        activeOpacity={0.8}
      >
        {locating
          ? <ActivityIndicator size="small" color={colors.primary} />
          : <MaterialIcons name="my-location" size={16} color={colors.primary} />
        }
        <Text style={s.locateTxt}>
          {locating ? t('createListing.locating') : t('createListing.locateBtn')}
        </Text>
      </TouchableOpacity>
      {errors.location && (
        <Text style={[s.errorInline, { marginBottom: 10 }]}>{errors.location}</Text>
      )}

      {/* Carte */}
      <View style={s.mapWrap}>
        <MapView
          ref={mapRef}
          style={s.map}
          initialRegion={GISENYI_REGION}
          showsUserLocation
          showsMyLocationButton={false}
          onPress={e => {
            const { latitude, longitude } = e.nativeEvent.coordinate;
            patch('latitude', latitude);
            patch('longitude', longitude);
          }}
        >
          {form.latitude != null && form.longitude != null && (
            <Marker
              coordinate={{ latitude: form.latitude, longitude: form.longitude }}
              draggable
              onDragEnd={e => {
                patch('latitude', e.nativeEvent.coordinate.latitude);
                patch('longitude', e.nativeEvent.coordinate.longitude);
              }}
              pinColor={colors.primary}
            />
          )}
        </MapView>
        <View style={s.mapHintBadge}>
          <MaterialIcons name="touch-app" size={13} color={colors.white} />
          <Text style={s.mapHintTxt}>{t('createListing.mapHint')}</Text>
        </View>
      </View>

      {/* Coordonnées affichées */}
      {form.latitude != null && (
        <View style={s.coordsRow}>
          <MaterialIcons name="gps-fixed" size={12} color={colors.inkSubtle} />
          <Text style={s.coordsTxt}>
            {form.latitude.toFixed(5)}, {form.longitude?.toFixed(5)}
          </Text>
        </View>
      )}

      {/* Champs texte */}
      <View style={{ marginTop: 16 }}>
        <FieldInput
          label={t('createListing.quarterLabel')}
          value={form.district}
          onChangeText={v => patch('district', v)}
          placeholder={t('createListing.quarterPlaceholder')}
          error={errors.district}
        />
        <FieldInput
          label={t('createListing.addressLabel')}
          value={form.address}
          onChangeText={v => patch('address', v)}
          placeholder={t('createListing.addressPlaceholder')}
          error={errors.address}
        />
        <FieldInput
          label={t('createListing.cityLabel')}
          value={form.city}
          onChangeText={v => patch('city', v)}
          placeholder="Gisenyi"
        />
      </View>
    </Animated.View>
  );

  const renderStep2 = () => {
    const netMonthly = form.price > 0
      ? Math.round(form.price * (1 - COMMISSION))
      : 0;

    return (
      <Animated.View entering={FadeInDown.duration(320)}>
        <Text style={s.stepTitle}>{t('createListing.step2Title')}</Text>
        <Text style={s.stepSub}>{t('createListing.step2Sub')}</Text>

        {/* Capacité */}
        <Text style={s.fieldGroupLabel}>{t('createListing.capacityLabel')}</Text>
        <View style={s.counterGrid}>
          {[
            { label: t('createListing.bedroomsLabel'),   key: 'bedrooms',  value: form.bedrooms },
            { label: t('createListing.bathroomsLabel'),  key: 'bathrooms', value: form.bathrooms },
          ].map(item => (
            <View key={item.key} style={[s.counterRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
              <Text style={s.counterLabel}>{item.label}</Text>
              <Counter
                value={item.value}
                onDecrement={() => patch(item.key, Math.max(1, item.value - 1))}
                onIncrement={() => patch(item.key, item.value + 1)}
              />
            </View>
          ))}
        </View>

        {/* Loyer */}
        <Text style={[s.fieldGroupLabel, { marginTop: 20 }]}>{t('createListing.rentLabel')}</Text>
        <FieldInput
          label={t('createListing.priceLabel')}
          value={form.price > 0 ? String(form.price) : ''}
          onChangeText={v => patch('price', parseInt(v.replace(/\D/g, '')) || 0)}
          placeholder={t('createListing.pricePlaceholder')}
          keyboardType="numeric"
          suffix="RWF"
          error={errors.price}
        />
        {form.price > 0 && (
          <View style={s.pricePreview}>
            <View style={s.pricePreviewRow}>
              <Text style={s.pricePreviewLbl}>{t('createListing.grossRent')}</Text>
              <Text style={s.pricePreviewVal}>{form.price.toLocaleString('fr-FR')} RWF</Text>
            </View>
            <View style={s.pricePreviewRow}>
              <Text style={s.pricePreviewLbl}>{t('createListing.commission')}</Text>
              <Text style={[s.pricePreviewVal, { color: colors.inkSubtle }]}>
                − {Math.round(form.price * COMMISSION).toLocaleString('fr-FR')} RWF
              </Text>
            </View>
            <View style={[s.pricePreviewRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, marginTop: 4 }]}>
              <Text style={[s.pricePreviewLbl, { fontWeight: '700', color: colors.ink }]}>{t('createListing.netRent')}</Text>
              <Text style={[s.pricePreviewVal, { color: colors.primary, fontWeight: '700' }]}>
                {netMonthly.toLocaleString('fr-FR')} RWF
              </Text>
            </View>
          </View>
        )}

        {/* Caution */}
        <Text style={[s.fieldGroupLabel, { marginTop: 20 }]}>{t('createListing.depositLabel')}</Text>
        <View style={s.counterGrid}>
          <View style={s.counterRow}>
            <View>
              <Text style={s.counterLabel}>{t('createListing.depositMonths')}</Text>
              <Text style={s.counterSub}>{t('createListing.depositNote')}</Text>
            </View>
            <Counter
              value={(form as any).depositMonths ?? 1}
              onDecrement={() => patch('depositMonths', Math.max(1, ((form as any).depositMonths ?? 1) - 1))}
              onIncrement={() => patch('depositMonths', Math.min(3, ((form as any).depositMonths ?? 1) + 1))}
              min={1}
            />
          </View>
        </View>

        {/* Durée minimale */}
        <Text style={[s.fieldGroupLabel, { marginTop: 20 }]}>{t('createListing.minDurationLabel')}</Text>
        <View style={s.chipRow}>
          {MIN_DURATIONS.map(d => {
            const active = (form as any).minDurationMonths === d.value;
            return (
              <TouchableOpacity
                key={d.value}
                style={[s.selectChip, active && s.selectChipActive]}
                onPress={() => patch('minDurationMonths', d.value)}
                activeOpacity={0.8}
              >
                <Text style={[s.selectChipTxt, active && s.selectChipTxtActive]}>{d.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Préavis */}
        <Text style={[s.fieldGroupLabel, { marginTop: 20 }]}>{t('createListing.noticeLabel')}</Text>
        <View style={s.chipRow}>
          {NOTICE_PERIODS.map(n => {
            const active = (form as any).noticePeriodDays === n.value;
            return (
              <TouchableOpacity
                key={n.value}
                style={[s.selectChip, active && s.selectChipActive]}
                onPress={() => patch('noticePeriodDays', n.value)}
                activeOpacity={0.8}
              >
                <Text style={[s.selectChipTxt, active && s.selectChipTxtActive]}>{n.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>
    );
  };

  const renderStep3 = () => (
    <Animated.View entering={FadeInDown.duration(320)}>
      <Text style={s.stepTitle}>{t('createListing.step3Title')}</Text>
      <Text style={s.stepSub}>{t('createListing.step3Sub')}</Text>

      {/* Équipements */}
      <Text style={s.fieldGroupLabel}>{t('createListing.amenitiesLabel')}</Text>
      <View style={s.amenitiesGrid}>
        {AMENITIES.map(a => {
          const active = form.amenities.includes(a.label);
          return (
            <TouchableOpacity
              key={a.label}
              style={[s.amenityChip, active && s.amenityChipActive]}
              onPress={() => toggleAmenity(a.label)}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name={a.icon}
                size={14}
                color={active ? colors.primary : colors.inkSubtle}
              />
              <Text style={[s.amenityTxt, active && s.amenityTxtActive]}>{a.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {form.amenities.length < 5 && (
        <Text style={s.amenityHint}>{t('createListing.amenitiesHint')}</Text>
      )}

      {/* Règles */}
      <Text style={[s.fieldGroupLabel, { marginTop: 24 }]}>{t('createListing.rulesLabel')}</Text>
      <View style={s.rulesCard}>
        {HOUSE_RULES.map((rule, i) => {
          const active = (form as any)[rule.key] ?? false;
          return (
            <TouchableOpacity
              key={rule.key}
              style={[s.ruleRow, i < HOUSE_RULES.length - 1 && s.ruleRowBorder]}
              onPress={() => patch(rule.key, !active)}
              activeOpacity={0.8}
            >
              <View style={s.ruleIconWrap}>
                <MaterialIcons name={rule.icon} size={18} color={active ? colors.primary : colors.inkDisabled} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.ruleLabel}>{rule.label}</Text>
                <Text style={s.ruleSub}>{rule.sub}</Text>
              </View>
              <View style={[s.toggle, active && s.toggleOn]}>
                <View style={[s.toggleThumb, active && s.toggleThumbOn]} />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Photos */}
      <Text style={[s.fieldGroupLabel, { marginTop: 24 }]}>
        {t('createListing.photosLabel')}{' '}
        <Text style={{ color: colors.inkDisabled, textTransform: 'none', letterSpacing: 0 }}>
          ({form.images.length} / 10)
        </Text>
      </Text>
      {errors.images && <Text style={s.errorInline}>{errors.images}</Text>}
      <View style={s.photosGrid}>
        {form.images.map((uri, i) => (
          <View key={i} style={s.photoThumb}>
            <Image source={{ uri }} style={s.photoImg} resizeMode="cover" />
            {i === 0 && (
              <View style={s.coverBadge}>
                <Text style={s.coverBadgeTxt}>{t('createListing.photoCover')}</Text>
              </View>
            )}
            <TouchableOpacity
              style={s.photoRemove}
              onPress={() => patch('images', form.images.filter((_, j) => j !== i))}
            >
              <MaterialIcons name="close" size={13} color={colors.white} />
            </TouchableOpacity>
          </View>
        ))}
        {form.images.length < 10 && (
          <TouchableOpacity
            style={s.photoAdd}
            onPress={() => {
              patch('images', [...form.images, `https://picsum.photos/seed/${form.images.length + 1}/800/600`]);
            }}
            activeOpacity={0.8}
          >
            <MaterialIcons name="add-photo-alternate" size={26} color={colors.inkDisabled} />
            <Text style={s.photoAddTxt}>{t('createListing.photoAdd')}</Text>
          </TouchableOpacity>
        )}
      </View>
      <Text style={s.photoHint}>{t('createListing.photoHint')}</Text>

      {errors.submit && (
        <View style={s.submitError}>
          <MaterialIcons name="error-outline" size={15} color={colors.error} />
          <Text style={s.submitErrorTxt}>{errors.submit}</Text>
        </View>
      )}
    </Animated.View>
  );

  const STEP_RENDERERS = [renderStep0, renderStep1, renderStep2, renderStep3];
  const isLastStep = step === STEPS.length - 1;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={goBack} activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={22} color={colors.ink} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('createListing.headerTitle')}</Text>
        <TouchableOpacity
          style={s.draftBtn}
          onPress={() => handleSave('draft')}
          activeOpacity={0.8}
        >
          <Text style={s.draftTxt}>{t('createListing.draftBtn')}</Text>
        </TouchableOpacity>
      </View>

      {/* Progress + labels */}
      <ProgressRail
        step={step}
        total={STEPS.length}
        labels={STEPS.map(st => st.label)}
      />

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      >
        {STEP_RENDERERS[step]()}
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Footer */}
      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom + 8, 20) }]}>
        {isLastStep ? (
          <View style={s.footerRow}>
            <TouchableOpacity
              style={s.secondaryFooterBtn}
              onPress={() => handleSave('draft')}
              disabled={saving}
              activeOpacity={0.8}
            >
              <Text style={s.secondaryFooterTxt}>{t('createListing.save')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.primaryFooterBtn, saving && s.btnDisabled]}
              onPress={() => handleSave('publish')}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <Text style={s.primaryFooterTxt}>{t('createListing.publish')}</Text>
                  <MaterialIcons name="arrow-forward" size={16} color={colors.white} />
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={s.primaryFooterBtnFull}
            onPress={goNext}
            activeOpacity={0.85}
          >
            <Text style={s.primaryFooterTxt}>
              {t('createListing.continueStep', { stepName: STEPS[step + 1 < STEPS.length ? step + 1 : step].label })}
            </Text>
            <MaterialIcons name="arrow-forward" size={16} color={colors.white} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const PHOTO_SIZE = 100;

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: colors.background },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
  headerTitle:  { fontSize: 16, fontWeight: '700', color: colors.ink },
  draftBtn:     { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border },
  draftTxt:     { fontSize: 12, fontWeight: '600', color: colors.inkMid },



  scrollContent:  { paddingHorizontal: 20, paddingTop: 8 },
  stepTitle:      { fontSize: 20, fontWeight: '700', color: colors.ink, marginBottom: 6, letterSpacing: -0.3 },
  stepSub:        { fontSize: 13, color: colors.inkSubtle, marginBottom: 24, lineHeight: 18 },
  fieldGroupLabel:{ fontSize: 11, fontWeight: '700', color: colors.inkDisabled, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  charCount:      { fontSize: 11, color: colors.inkDisabled, textAlign: 'right', marginTop: -8, marginBottom: 16 },
  errorInline:    { fontSize: 12, color: colors.error, marginBottom: 8 },

  // Property type grid
  typeGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  typeCard:     { width: '30%', aspectRatio: 1, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', gap: 6 },
  typeCardActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  typeLabel:    { fontSize: 11, fontWeight: '600', color: colors.inkSubtle, textAlign: 'center' },
  typeLabelActive: { color: colors.primary },

  // Accommodation type
  accomRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, marginBottom: 10, backgroundColor: colors.surface },
  accomRowActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  accomRadio:     { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  accomRadioInner:{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  accomLabel:     { fontSize: 14, fontWeight: '600', color: colors.ink, marginBottom: 2 },
  accomLabelActive:{ color: colors.primary },
  accomSub:       { fontSize: 12, color: colors.inkSubtle, lineHeight: 16 },

  // Location
  locateBtn:      { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primaryLight, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 14, borderWidth: 1.5, borderColor: colors.primary + '44' },
  locateBtnLoading: { opacity: 0.7 },
  locateTxt:      { fontSize: 13, fontWeight: '600', color: colors.primary },
  mapWrap:        { borderRadius: 14, overflow: 'hidden', height: MAP_HEIGHT, marginBottom: 8, borderWidth: 1.5, borderColor: colors.border, position: 'relative' },
  map:            { width: '100%', height: '100%' },
  mapHintBadge:   { position: 'absolute', bottom: 10, left: '50%', transform: [{ translateX: -80 }], flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(15,31,31,0.65)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  mapHintTxt:     { fontSize: 11, color: colors.white, fontWeight: '500' },
  coordsRow:      { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  coordsTxt:      { fontSize: 11, color: colors.inkSubtle, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },

  // Counter grid
  counterGrid:  { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 8 },
  counterRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  counterLabel: { fontSize: 14, fontWeight: '500', color: colors.ink },

  // Counter sub-label
  counterSub:     { fontSize: 11, color: colors.inkSubtle, marginTop: 2 },

  // Chip selector (duration, notice)
  chipRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selectChip:     { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  selectChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  selectChipTxt:  { fontSize: 13, fontWeight: '600', color: colors.inkSubtle },
  selectChipTxtActive: { color: colors.primary },

  // Price preview
  pricePreview:    { backgroundColor: colors.surfaceSunken, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 14, marginTop: 4, marginBottom: 8 },
  pricePreviewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
  pricePreviewLbl: { fontSize: 12, color: colors.inkSubtle },
  pricePreviewVal: { fontSize: 13, fontWeight: '600', color: colors.ink },

  // Amenities
  amenitiesGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amenityChip:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  amenityChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  amenityTxt:     { fontSize: 12, fontWeight: '500', color: colors.inkMid },
  amenityTxtActive: { color: colors.primary, fontWeight: '600' },
  amenityHint:    { fontSize: 11, color: colors.warning, marginTop: 8 },

  // Rules
  rulesCard:    { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  ruleRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 14 },
  ruleRowBorder:{ borderBottomWidth: 1, borderBottomColor: colors.border },
  ruleIconWrap: { width: 34, height: 34, borderRadius: 8, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
  ruleLabel:    { fontSize: 14, fontWeight: '600', color: colors.ink },
  ruleSub:      { fontSize: 11, color: colors.inkSubtle, marginTop: 1 },
  toggle:       { width: 44, height: 24, borderRadius: 12, backgroundColor: colors.border, justifyContent: 'center', paddingHorizontal: 2 },
  toggleOn:     { backgroundColor: colors.primary },
  toggleThumb:  { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.white },
  toggleThumbOn:{ transform: [{ translateX: 20 }] },

  // Photos
  photosGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoThumb:   { width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  photoImg:     { width: '100%', height: '100%' },
  coverBadge:   { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.primary + 'CC', paddingVertical: 3, alignItems: 'center' },
  coverBadgeTxt:{ fontSize: 9, fontWeight: '700', color: colors.white },
  photoRemove:  { position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.ink + 'BB', alignItems: 'center', justifyContent: 'center' },
  photoAdd:     { width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: colors.surfaceSunken },
  photoAddTxt:  { fontSize: 11, color: colors.inkDisabled },
  photoHint:    { fontSize: 11, color: colors.inkSubtle, marginTop: 8, lineHeight: 16 },

  // Submit error
  submitError:  { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.error + '12', borderRadius: 8, padding: 10, marginTop: 16 },
  submitErrorTxt: { fontSize: 13, color: colors.error, fontWeight: '500' },

  // Footer
  footer:              { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: 20, paddingTop: 14 },
  footerRow:           { flexDirection: 'row', gap: 10 },
  // Bouton plein dans footerRow (last step)
  primaryFooterBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14 },
  // Bouton pleine largeur (steps 1-3)
  primaryFooterBtnFull:{ width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 15 },
  primaryFooterTxt:    { fontSize: 15, fontWeight: '700', color: colors.white },
  secondaryFooterBtn:  { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  secondaryFooterTxt:  { fontSize: 14, fontWeight: '600', color: colors.inkMid },
  btnDisabled:         { opacity: 0.45 },
});

export default CreateListingScreen;
