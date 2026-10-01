import ContentSkeleton from '../components/ContentSkeleton';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  useNavigation,
  usePreventRemove,
  useRoute,
  type NavigationAction,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import PropertyMap, { type PropertyMapHandle, type Region } from '../components/PropertyMap';
import {
  HostButton,
  HostHeader,
  HostNotice,
  HostPage,
  HostRow,
  hostStyles,
} from '../components/host/HostUI';
import { useFormKeyboardScroll } from '../hooks/useFormKeyboardScroll';
import { getPropertyById } from '../services/property.service';
import { NewListingFormData, toForm, useHostListingsStore } from '../store/hostListings';
import {
  createListingAction,
  createListingForm,
  listingValidation,
  listingSaveAction,
} from '../utils/hostListingForm';
import { onAccountChange } from '../lib/accountScope';
import type { HostListingSection, RootStackParamList } from '../types';
import { colors } from '../theme';

const GISENYI: Region = {
  latitude: -1.6977,
  longitude: 29.2558,
  latitudeDelta: 0.04,
  longitudeDelta: 0.04,
};
const STEPS = ['information', 'location', 'photos', 'pricing'] as const;
const SECTION_STEP: Record<HostListingSection, number> = {
  information: 0,
  location: 1,
  photos: 2,
  pricing: 3,
  rules: 3,
};
const TYPES = [
  ['apartment', 'propAppartement', 'apartment'],
  ['house', 'propMaison', 'home'],
  ['studio', 'propStudio', 'single-bed'],
  ['villa', 'propVilla', 'villa'],
  ['room', 'propChambre', 'bed'],
] as const;
const ACCOMMODATION = [
  ['entier', 'accomEntire', 'accomEntireSub'],
  ['privee', 'accomPrivate', 'accomPrivateSub'],
  ['partagee', 'accomShared', 'accomSharedSub'],
] as const;
const AMENITIES = [
  ['wifi', 'amenityWifi'],
  ['water', 'amenityWater'],
  ['hotWater', 'amenityHotWater'],
  ['electricity', 'amenityElec'],
  ['generator', 'amenityGenerator'],
  ['kitchen', 'amenityKitchen'],
  ['fridge', 'amenityFridge'],
  ['tv', 'amenityTV'],
  ['ac', 'amenityAC'],
  ['fan', 'amenityFan'],
  ['parking', 'amenityParking'],
  ['security', 'amenitySecurity'],
  ['balcony', 'amenityBalcony'],
  ['lake_view', 'amenityLakeView'],
  ['garden', 'amenityGarden'],
  ['washing_machine', 'amenityWasher'],
  ['furnished', 'amenityFurnished'],
  ['regideso', 'amenityRegideso'],
] as const;
const RULES = [
  ['smokingAllowed', 'ruleSmoking', 'ruleSmokingSub'],
  ['petsAllowed', 'rulePets', 'rulePetsSub'],
  ['visitorsAllowed', 'ruleVisitors', 'ruleVisitorsSub'],
  ['noiseAfter22', 'ruleNoise', 'ruleNoiseSub'],
] as const;

type Visibility = ReturnType<typeof useFormKeyboardScroll>;
function Field({
  label,
  value,
  onChangeText,
  error,
  multiline,
  numeric,
  placeholder,
  visibility,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  multiline?: boolean;
  numeric?: boolean;
  placeholder?: string;
  visibility: Visibility;
}) {
  const ref = useRef<TextInput>(null);
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.inkSubtle}
        multiline={multiline}
        keyboardType={numeric ? 'numeric' : 'default'}
        style={[s.input, multiline && s.multiline, !!error && s.invalid]}
        onFocus={() => visibility.onFocus(ref.current)}
        onBlur={() => visibility.onBlur(ref.current)}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
      {error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
    </View>
  );
}
function Counter({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  const { t } = useTranslation();
  return (
    <View style={s.counter}>
      <Text style={[s.label, s.grow]}>{label}</Text>
      <View style={s.counterControls}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('hostFlow.editor.decrease', { label })}
          accessibilityState={{ disabled: value <= min }}
          disabled={value <= min}
          onPress={() => onChange(Math.max(min, value - 1))}
          style={[s.counterButton, value <= min && s.disabled]}
        >
          <MaterialIcons name="remove" size={20} color={colors.ink} />
        </Pressable>
        <Text style={s.counterValue}>{value}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('hostFlow.editor.increase', { label })}
          accessibilityState={{ disabled: value >= max }}
          disabled={value >= max}
          onPress={() => onChange(Math.min(max, value + 1))}
          style={[s.counterButton, value >= max && s.disabled]}
        >
          <MaterialIcons name="add" size={20} color={colors.ink} />
        </Pressable>
      </View>
    </View>
  );
}

export default function CreateListingScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'CreateListing'>>();
  const propertyId = route.params?.propertyId;
  const initialSection = route.params?.section;
  const [section, setSection] = useState<HostListingSection | undefined>(initialSection);
  const [step, setStep] = useState(initialSection ? SECTION_STEP[initialSection] : 0);
  const [form, setForm] = useState<NewListingFormData>(createListingForm);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(!!propertyId);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState<'draft' | 'publish' | null>(null);
  const [saved, setSaved] = useState<{ id: string; mode: 'draft' | 'publish' } | null>(null);
  const [amenitiesExpanded, setAmenitiesExpanded] = useState(!!propertyId);
  const [wasPublished, setWasPublished] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [exitAction, setExitAction] = useState<NavigationAction | null>(null);
  const [locating, setLocating] = useState(false);
  const [picking, setPicking] = useState(false);
  const generation = useRef(0);
  const busy = useRef(false);
  const lastSaveMode = useRef<'draft' | 'publish'>('draft');
  const mediaBusy = useRef(false);
  const locationBusy = useRef(false);
  const run = useRef(createListingAction()).current;
  const mapRef = useRef<PropertyMapHandle>(null);
  const visibility = useFormKeyboardScroll(step);
  const { addListing, resetDraft } = useHostListingsStore();

  useEffect(
    () =>
      onAccountChange(() => {
        generation.current++;
        setForm(createListingForm());
        setDirty(false);
        setSaved(null);
        setExitAction(null);
        setLoadFailed(true);
      }),
    [],
  );
  const load = useCallback(async () => {
    const request = ++generation.current;
    if (!propertyId) return;
    setLoading(true);
    setLoadFailed(false);
    setErrors({});
    try {
      const row = await getPropertyById(propertyId);
      if (!row) throw new Error('Missing property');
      const loaded = toForm(row);
      if (request === generation.current) {
        setForm(loaded);
        setWasPublished(row.status === 'ACTIVE');
        setDirty(false);
        if (row.status === 'PAUSED' && !initialSection) setStep(4);
      }
    } catch {
      if (request === generation.current) setLoadFailed(true);
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, [propertyId, initialSection]);
  useEffect(() => {
    resetDraft();
    setForm(createListingForm());
    setDirty(false);
    setSaved(null);
    setWasPublished(false);
    setAmenitiesExpanded(!!propertyId);
    setSection(initialSection);
    setStep(initialSection ? SECTION_STEP[initialSection] : 0);
    void load();
    return () => {
      generation.current++;
    };
  }, [propertyId, initialSection, load, resetDraft]);

  usePreventRemove(dirty || !!saving, ({ data }) => {
    if (busy.current) return;
    Keyboard.dismiss();
    setExitAction(data.action);
  });
  // The committed render has already disabled removal prevention before this
  // effect sends the intentional return action to the native stack.
  useEffect(() => {
    if (!saved || dirty || saving) return;
    const state = navigation.getState();
    navigation.dispatch(
      listingSaveAction(state.routes.slice(0, state.index), saved.id, saved.mode),
    );
  }, [dirty, navigation, saved, saving]);
  const patch = <K extends keyof NewListingFormData>(key: K, value: NewListingFormData[K]) => {
    if (busy.current || loadFailed || saved) return;
    setDirty(true);
    setForm(previous => ({ ...previous, [key]: value }));
    setErrors(previous => {
      const next = { ...previous };
      delete next[key];
      delete next.submit;
      return next;
    });
  };
  const changeSection = (next: HostListingSection) => {
    setSection(next);
    setStep(SECTION_STEP[next]);
  };
  const back = () => {
    if (busy.current || saved) return;
    if (!section && step > 0) {
      setStep(value => value - 1);
      return;
    }
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.replace('HostDashboard', { screen: 'HostProperties' });
  };

  const save = async (mode: 'draft' | 'publish') => {
    if (saved || loading || loadFailed || busy.current || mediaBusy.current || locationBusy.current)
      return;
    const validation = listingValidation(form, mode);
    if (Object.keys(validation).length) {
      setErrors(
        Object.fromEntries(
          Object.entries(validation).map(([key, value]) => [
            key,
            t(`hostFlow.editor.validation.${value}`),
          ]),
        ),
      );
      setSection(undefined);
      setStep(4);
      visibility.scrollRef.current?.scrollTo({ y: 0, animated: false });
      return;
    }
    const request = generation.current;
    try {
      await run(
        async () => {
          busy.current = true;
          lastSaveMode.current = mode;
          setSaving(mode);
          setErrors({});
          Keyboard.dismiss();
          try {
            return await addListing(form, mode, propertyId);
          } finally {
            busy.current = false;
            setSaving(null);
          }
        },
        id => {
          if (request !== generation.current) return;
          setDirty(false);
          setExitAction(null);
          setSaved({ id, mode });
          resetDraft();
        },
      );
    } catch {
      if (request === generation.current)
        setErrors(previous => ({ ...previous, submit: t('hostFlow.editor.submitError') }));
    }
  };
  const pickPhotos = async () => {
    if (mediaBusy.current || busy.current || form.images.length >= 10) return;
    mediaBusy.current = true;
    setPicking(true);
    const request = generation.current;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 10 - form.images.length,
        quality: 0.85,
      });
      if (!result.canceled && request === generation.current) {
        setDirty(true);
        setForm(previous => ({
          ...previous,
          images: [
            ...new Set([...previous.images, ...result.assets.map(asset => asset.uri)]),
          ].slice(0, 10),
          imageMimeTypes: {
            ...previous.imageMimeTypes,
            ...Object.fromEntries(
              result.assets.map(asset => [asset.uri, asset.mimeType ?? 'image/jpeg']),
            ),
          },
        }));
        setErrors(previous => {
          const next = { ...previous };
          delete next.images;
          return next;
        });
      }
    } catch {
      if (request === generation.current)
        setErrors(previous => ({ ...previous, images: t('hostFlow.editor.photoError') }));
    } finally {
      mediaBusy.current = false;
      setPicking(false);
    }
  };
  const detectLocation = async () => {
    if (locationBusy.current || busy.current) return;
    locationBusy.current = true;
    setLocating(true);
    const request = generation.current;
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (request !== generation.current) return;
      if (permission.status !== 'granted') {
        setErrors(previous => ({ ...previous, location: t('createListing.permissionDenied') }));
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (request !== generation.current) return;
      const { latitude, longitude } = position.coords;
      setDirty(true);
      setForm(previous => ({ ...previous, latitude, longitude }));
      setErrors(previous => {
        const next = { ...previous };
        delete next.location;
        return next;
      });
      mapRef.current?.animateToRegion(
        { latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 },
        300,
      );
      const addresses = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (request !== generation.current || !addresses[0]) return;
      const address = addresses[0];
      setForm(previous => ({
        ...previous,
        address: previous.address || address.street || '',
        district: previous.district || address.subregion || address.district || '',
        city: address.city || previous.city,
      }));
    } catch {
      if (request === generation.current)
        setErrors(previous => ({ ...previous, location: t('createListing.locationError') }));
    } finally {
      locationBusy.current = false;
      setLocating(false);
    }
  };
  const field = (
    key: 'title' | 'description' | 'address' | 'district' | 'city',
    label: string,
    multiline = false,
  ) => (
    <Field
      key={key}
      label={label}
      value={form[key]}
      onChangeText={value => patch(key, value)}
      error={errors[key]}
      multiline={multiline}
      visibility={visibility}
    />
  );
  const numericField = (key: 'price' | 'size', label: string) => (
    <Field
      label={label}
      value={form[key] ? String(form[key]) : ''}
      numeric
      onChangeText={value => patch(key, Number(value.replace(/[^0-9]/g, '')) || 0)}
      error={errors[key]}
      visibility={visibility}
    />
  );
  const renderInformation = () => (
    <>
      {field('title', t('createListing.titleLabel'))}
      <Text style={s.sectionLabel}>{t('createListing.stepType')}</Text>
      <View style={s.options}>
        {TYPES.map(([value, label, icon]) => (
          <Pressable
            key={value}
            accessibilityRole="radio"
            accessibilityState={{ checked: form.type === value }}
            onPress={() => patch('type', value)}
            style={[s.option, form.type === value && s.selected]}
          >
            <MaterialIcons
              name={icon}
              size={22}
              color={form.type === value ? colors.primary : colors.inkSubtle}
            />
            <Text style={s.optionText}>{t(`createListing.${label}`)}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={s.sectionLabel}>{t('createListing.accomTypeLabel')}</Text>
      {ACCOMMODATION.map(([value, label, hint]) => (
        <Pressable
          key={value}
          accessibilityRole="radio"
          accessibilityState={{ checked: form.accommodationType === value }}
          onPress={() => patch('accommodationType', value)}
          style={[s.accommodation, form.accommodationType === value && s.selected]}
        >
          <MaterialIcons
            name={
              form.accommodationType === value ? 'radio-button-checked' : 'radio-button-unchecked'
            }
            size={22}
            color={colors.primary}
          />
          <View style={s.grow}>
            <Text style={s.label}>{t(`createListing.${label}`)}</Text>
            <Text style={hostStyles.muted}>{t(`createListing.${hint}`)}</Text>
          </View>
        </Pressable>
      ))}
      <Text style={s.sectionLabel}>{t('createListing.capacityLabel')}</Text>
      <Counter
        label={t('createListing.bedroomsLabel')}
        value={form.bedrooms}
        onChange={value => patch('bedrooms', value)}
        max={20}
      />
      <Counter
        label={t('createListing.bathroomsLabel')}
        value={form.bathrooms}
        onChange={value => patch('bathrooms', value)}
        max={20}
      />
      <Counter
        label={t('hostFlow.editor.guests')}
        value={form.maxGuests}
        min={1}
        onChange={value => patch('maxGuests', value)}
      />
      {numericField('size', t('hostFlow.editor.size'))}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: amenitiesExpanded }}
        onPress={() => setAmenitiesExpanded(expanded => !expanded)}
        style={s.amenitiesToggle}
      >
        <View style={s.grow}>
          <Text style={s.label}>{t('hostFlow.editor.optionalAmenities')}</Text>
          <Text style={hostStyles.muted}>
            {t('hostFlow.editor.amenitiesSelected', { count: form.amenities.length })}
          </Text>
        </View>
        <MaterialIcons
          name={amenitiesExpanded ? 'expand-less' : 'expand-more'}
          size={24}
          color={colors.ink}
        />
      </Pressable>
      {amenitiesExpanded && (
        <View style={s.options}>
          {AMENITIES.map(([key, label]) => (
            <Pressable
              key={key}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: form.amenities.includes(key) }}
              onPress={() =>
                patch(
                  'amenities',
                  form.amenities.includes(key)
                    ? form.amenities.filter(item => item !== key)
                    : [...form.amenities, key],
                )
              }
              style={[s.option, form.amenities.includes(key) && s.selected]}
            >
              <MaterialIcons
                name={form.amenities.includes(key) ? 'check-box' : 'check-box-outline-blank'}
                size={20}
                color={colors.primary}
              />
              <Text style={s.optionText}>{t(`createListing.${label}`)}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </>
  );
  const renderLocation = () => (
    <>
      <HostButton
        variant="secondary"
        icon="my-location"
        label={t('createListing.locateBtn')}
        busy={locating}
        onPress={() => void detectLocation()}
      />
      {errors.location && (
        <Text accessibilityRole="alert" style={s.error}>
          {errors.location}
        </Text>
      )}
      <View style={s.map}>
        <PropertyMap
          ref={mapRef}
          style={s.fill}
          initialRegion={
            form.latitude != null && form.longitude != null
              ? { ...GISENYI, latitude: form.latitude, longitude: form.longitude }
              : GISENYI
          }
          markers={
            form.latitude != null && form.longitude != null
              ? [
                  {
                    id: 'listing',
                    latitude: form.latitude,
                    longitude: form.longitude,
                    draggable: true,
                  },
                ]
              : []
          }
          onMapPress={({ latitude, longitude }) => {
            patch('latitude', latitude);
            patch('longitude', longitude);
            setErrors(previous => {
              const next = { ...previous };
              delete next.location;
              return next;
            });
          }}
          onMarkerDragEnd={(_id, { latitude, longitude }) => {
            patch('latitude', latitude);
            patch('longitude', longitude);
          }}
        />
      </View>
      <Text style={hostStyles.muted}>{t('createListing.mapHint')}</Text>
      {field('district', t('createListing.quarterLabel'))}
      {field('address', t('createListing.addressLabel'))}
      {field('city', t('createListing.cityLabel'))}
    </>
  );
  const renderPhotos = () => (
    <>
      {field('description', t('createListing.descriptionLabel'), true)}
      <Text style={s.sectionLabel}>
        {t('createListing.photosLabel')} ({form.images.length}/10)
      </Text>
      <Text style={hostStyles.muted}>{t('createListing.photoHint')}</Text>
      {errors.images && (
        <Text accessibilityRole="alert" style={s.error}>
          {errors.images}
        </Text>
      )}
      <View style={s.photos}>
        {form.images.map((uri, index) => (
          <View key={uri} style={s.photoItem}>
            <View style={s.photoFrame}>
              <Image source={{ uri }} style={s.fill} />
              <Pressable
                style={s.removePhoto}
                accessibilityRole="button"
                accessibilityLabel={t('hostFlow.editor.removePhoto', { number: index + 1 })}
                onPress={() =>
                  patch(
                    'images',
                    form.images.filter(image => image !== uri),
                  )
                }
              >
                <MaterialIcons name="close" size={22} color={colors.white} />
              </Pressable>
            </View>
            {index === 0 ? (
              <Text style={s.coverText}>{t('createListing.photoCover')}</Text>
            ) : (
              <Pressable
                accessibilityRole="button"
                style={s.coverAction}
                onPress={() =>
                  patch('images', [uri, ...form.images.filter(image => image !== uri)])
                }
              >
                <Text style={s.coverText}>{t('hostFlow.editor.makeCover')}</Text>
              </Pressable>
            )}
          </View>
        ))}
      </View>
      {form.images.length < 10 && (
        <HostButton
          variant="secondary"
          icon="add-photo-alternate"
          label={t('createListing.photoAdd')}
          busy={picking}
          onPress={() => void pickPhotos()}
        />
      )}
    </>
  );
  const renderPricing = () => (
    <>
      {numericField('price', `${t('createListing.priceLabel')} (RWF)`)}
      <Counter
        label={t('createListing.depositMonths')}
        value={form.depositMonths ?? 1}
        min={0}
        max={12}
        onChange={value => patch('depositMonths', value)}
      />
      <Counter
        label={t('hostFlow.editor.minimumMonths')}
        value={form.minDurationMonths ?? 1}
        min={1}
        max={120}
        onChange={value => patch('minDurationMonths', value)}
      />
      <Counter
        label={t('hostFlow.editor.noticeDays')}
        value={form.noticePeriodDays ?? 30}
        min={0}
        max={365}
        onChange={value => patch('noticePeriodDays', value)}
      />
    </>
  );
  const renderRules = () => (
    <View>
      {RULES.map(([key, label, hint]) => (
        <View key={key} style={s.rule}>
          <View style={s.grow}>
            <Text style={s.label}>{t(`createListing.${label}`)}</Text>
            <Text style={hostStyles.muted}>{t(`createListing.${hint}`)}</Text>
          </View>
          <Switch
            accessibilityLabel={t(`createListing.${label}`)}
            value={!!form[key]}
            onValueChange={value => patch(key, value)}
            trackColor={{ false: colors.borderMid, true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>
      ))}
    </View>
  );
  const missing = t('hostFlow.editor.missing');
  const price = form.price
    ? `${new Intl.NumberFormat(i18n.language).format(form.price)} RWF ${t('hostFlow.listings.monthly')}`
    : missing;
  const renderReview = () => (
    <>
      {Object.keys(errors).some(key => key !== 'submit') && (
        <HostNotice tone="error" message={t('hostFlow.editor.validationError')} />
      )}
      {form.images[0] && <Image source={{ uri: form.images[0] }} style={s.reviewImage} />}
      <HostRow
        title={t('hostFlow.listings.information')}
        description={`${form.title || missing}\n${t('hostFlow.listings.informationSummary', { bedrooms: form.bedrooms, bathrooms: form.bathrooms })}`}
        onPress={() => changeSection('information')}
      />
      {errors.title && <Text style={s.error}>{errors.title}</Text>}
      <HostRow
        title={t('hostFlow.listings.location')}
        description={[form.address, form.district, form.city].filter(Boolean).join(', ') || missing}
        onPress={() => changeSection('location')}
      />
      {['address', 'district', 'city', 'location']
        .filter(key => errors[key])
        .map(key => (
          <Text key={key} style={s.error}>
            {errors[key]}
          </Text>
        ))}
      <HostRow
        title={t('hostFlow.editor.photos')}
        description={`${t('hostFlow.listings.photosCount', { count: form.images.length })}\n${form.description || missing}`}
        onPress={() => changeSection('photos')}
      />
      {['description', 'images']
        .filter(key => errors[key])
        .map(key => (
          <Text key={key} style={s.error}>
            {errors[key]}
          </Text>
        ))}
      <HostRow
        title={t('hostFlow.listings.pricing')}
        description={`${price}\n${t('hostFlow.listings.rulesSummary', { duration: form.minDurationMonths ?? 1, notice: form.noticePeriodDays ?? 30 })}`}
        onPress={() => changeSection('pricing')}
      />
      {errors.price && <Text style={s.error}>{errors.price}</Text>}
      <HostRow
        title={t('hostFlow.listings.rules')}
        description={RULES.map(
          ([key, label]) =>
            `${t(`createListing.${label}`)} : ${t(form[key] ? 'common.yes' : 'common.no')}`,
        ).join('\n')}
        onPress={() => changeSection('rules')}
      />
    </>
  );
  const content =
    step === 4 ? (
      renderReview()
    ) : step === 0 ? (
      renderInformation()
    ) : step === 1 ? (
      renderLocation()
    ) : step === 2 ? (
      renderPhotos()
    ) : (
      <>
        {section !== 'rules' && renderPricing()}
        {section !== 'pricing' && (
          <>
            <Text style={s.sectionLabel}>{t('hostFlow.editor.rules')}</Text>
            {renderRules()}
          </>
        )}
      </>
    );
  const stage = step === 4 ? 'review' : section === 'rules' ? 'rules' : STEPS[step];
  const blocked = !!saved || !!saving || loading || loadFailed || picking || locating;

  return (
    <HostPage scroll={false}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
        <View
          ref={visibility.viewportRef}
          collapsable={false}
          onLayout={visibility.reveal}
          style={s.flex}
        >
          <ScrollView
            ref={visibility.scrollRef}
            onScroll={event => visibility.onScroll(event.nativeEvent.contentOffset.y)}
            scrollEventThrottle={16}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={s.content}
          >
            <HostHeader
              title={t(propertyId ? 'hostFlow.editor.editTitle' : 'hostFlow.editor.title')}
              onBack={back}
            />
            <>
              {loading ? (
                <ContentSkeleton variant="form" count={4} />
              ) : loadFailed ? (
                <HostNotice
                  tone="error"
                  message={t('hostFlow.editor.loadError')}
                  onRetry={() => void load()}
                />
              ) : (
                <>
                  {!section && step < 4 && (
                    <Text style={s.progress}>
                      {t('hostFlow.editor.step', { current: step + 1, total: 4 })}
                    </Text>
                  )}
                  <Text accessibilityRole="header" style={hostStyles.section}>
                    {t(`hostFlow.editor.${stage}`)}
                  </Text>
                  {stage !== 'rules' && (
                    <Text style={s.hint}>{t(`hostFlow.editor.${stage}Hint`)}</Text>
                  )}
                  {wasPublished && <HostNotice tone="info" message={t('hostFlow.editor.editHint')} />}
                  <View pointerEvents={saving || saved ? 'none' : 'auto'} style={s.fields}>
                    {content}
                  </View>
                  {errors.submit && (
                    <HostNotice
                      tone="error"
                      message={errors.submit}
                      onRetry={() => void save(lastSaveMode.current)}
                    />
                  )}
                  <View style={s.actions}>
                    {step === 4 ? (
                      <HostButton
                        label={t('hostFlow.editor.publish')}
                        busy={saving === 'publish'}
                        disabled={blocked && saving !== 'publish'}
                        onPress={() => void save('publish')}
                      />
                    ) : (
                      <HostButton
                        label={t(
                          section || step === 3
                            ? 'hostFlow.editor.reviewButton'
                            : 'hostFlow.editor.next',
                        )}
                        disabled={blocked}
                        onPress={() => {
                          setStep(section || step === 3 ? 4 : step + 1);
                          setSection(undefined);
                        }}
                      />
                    )}
                    <HostButton
                      variant="secondary"
                      label={t('hostFlow.editor.saveQuit')}
                      busy={saving === 'draft' && !exitAction}
                      disabled={blocked}
                      onPress={() => void save('draft')}
                    />
                    {!propertyId && (
                      <Text style={hostStyles.muted}>{t('hostFlow.editor.draftHint')}</Text>
                    )}
                  </View>
                </>
              )}
            </>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
      <Modal
        visible={!!exitAction}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!busy.current) setExitAction(null);
        }}
      >
        <View style={s.backdrop}>
          <View accessibilityViewIsModal style={s.dialog}>
            <ScrollView contentContainerStyle={s.dialogContent} keyboardShouldPersistTaps="handled">
              <Text style={hostStyles.title}>{t('hostFlow.editor.exitTitle')}</Text>
              <Text style={hostStyles.body}>{t('hostFlow.editor.exitHint')}</Text>
              {errors.submit && <HostNotice tone="error" message={errors.submit} />}
              <HostButton
                label={t('hostFlow.editor.saveQuit')}
                busy={!!saving}
                onPress={() => void save('draft')}
              />
              <HostButton
                variant="secondary"
                label={t('hostFlow.editor.stay')}
                disabled={!!saving}
                onPress={() => setExitAction(null)}
              />
              <HostButton
                variant="quiet"
                label={t('hostFlow.editor.discard')}
                disabled={!!saving}
                onPress={() => {
                  const action = exitAction;
                  setDirty(false);
                  setExitAction(null);
                  if (action) navigation.dispatch(action);
                }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </HostPage>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  grow: { flex: 1, minWidth: 0 },
  fill: { width: '100%', height: '100%' },
  content: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingBottom: 32,
    flexGrow: 1,
  },
  progress: { color: colors.primaryDark, fontSize: 14, fontWeight: '600', marginBottom: 10 },
  hint: { color: colors.inkSubtle, fontSize: 16, lineHeight: 24, marginTop: 8, marginBottom: 24 },
  fields: { gap: 16 },
  field: { gap: 8, marginTop: 4 },
  label: { fontSize: 16, fontWeight: '500', lineHeight: 23, color: colors.ink },
  input: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: colors.borderMid,
    borderRadius: 10,
    backgroundColor: colors.surface,
    color: colors.ink,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
  },
  multiline: { minHeight: 150 },
  invalid: { borderColor: colors.error },
  error: { color: colors.error, fontSize: 14, lineHeight: 21, marginVertical: 4 },
  sectionLabel: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 26,
    color: colors.ink,
    marginTop: 16,
  },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.borderMid,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    maxWidth: '100%',
  },
  optionText: { fontSize: 15, color: colors.ink, flexShrink: 1 },
  selected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  accommodation: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  counter: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  counterControls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  counterButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderMid,
  },
  counterValue: {
    minWidth: 32,
    textAlign: 'center',
    fontSize: 16,
    color: colors.ink,
    fontWeight: '600',
  },
  disabled: { opacity: 0.4 },
  map: { height: 260, overflow: 'hidden', borderRadius: 12, backgroundColor: colors.surfaceSunken },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  photoItem: { width: 124 },
  photoFrame: { width: 124, height: 124, borderRadius: 10, overflow: 'hidden' },
  removePhoto: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverAction: { minHeight: 44, justifyContent: 'center' },
  coverText: { color: colors.primaryDark, fontSize: 14, lineHeight: 20, paddingVertical: 8 },
  rule: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  reviewImage: { width: '100%', aspectRatio: 1.8, borderRadius: 12 },
  actions: { gap: 12, paddingTop: 32 },
  amenitiesToggle: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  skeleton: { height: 250, borderRadius: 12, backgroundColor: colors.border },
  backdrop: {
    flex: 1,
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialog: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  dialogContent: { padding: 24, gap: 18 },
});
