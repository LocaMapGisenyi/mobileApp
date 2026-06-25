import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Text,
  Modal,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { useSearchStore, SearchFilters } from '../store/search';
import { colors, spacing, typography, borderRadius } from '../theme';

const PROPERTY_TYPES = [
  { id: 'apartment', name: 'Appartement' },
  { id: 'house', name: 'Maison' },
  { id: 'villa', name: 'Villa' },
  { id: 'studio', name: 'Studio' },
  { id: 'room', name: 'Chambre' },
];
const AMENITIES = [
  { id: 'wifi', name: 'Wifi' },
  { id: 'parking', name: 'Parking' },
  { id: 'ac', name: 'Climatisation' },
  { id: 'pool', name: 'Piscine' },
  { id: 'kitchen', name: 'Cuisine équipée' },
  { id: 'washing_machine', name: 'Machine à laver' },
  { id: 'security', name: 'Sécurité' },
  { id: 'lake_view', name: 'Vue sur le lac' },
];
const POINTS_OF_INTEREST = [
  { id: 'lake', name: 'Lac Kivu' },
  { id: 'center', name: 'Centre-ville' },
  { id: 'airport', name: 'Aéroport' },
  { id: 'university', name: 'Université' },
  { id: 'market', name: 'Marché' },
];

interface SearchFiltersModalProps {
  visible: boolean;
  onDismiss: () => void;
}

const SORT_OPTIONS: { value: SearchFilters['sortBy']; label: string; icon: string }[] = [
  { value: 'price_asc',   label: 'Prix ↑',      icon: 'arrow-upward' },
  { value: 'price_desc',  label: 'Prix ↓',      icon: 'arrow-downward' },
  { value: 'date_newest', label: 'Plus récent',  icon: 'fiber-new' },
  { value: 'date_oldest', label: 'Plus ancien',  icon: 'history' },
];

const BEDROOM_OPTIONS = [1, 2, 3, 4, 5] as const;

// ─── Sub-components ──────────────────────────────────────────────────────────

const SectionTitle = ({ children }: { children: string }) => (
  <Text style={s.sectionTitle}>{children}</Text>
);

const FilterChip = ({ label, selected, onPress }: {
  label: string; selected: boolean; onPress: () => void;
}) => (
  <TouchableOpacity
    style={[s.chip, selected && s.chipActive]}
    onPress={onPress}
    activeOpacity={0.7}
    accessibilityRole="button"
    accessibilityState={{ selected }}
  >
    <Text style={[s.chipText, selected && s.chipTextActive]}>{label}</Text>
  </TouchableOpacity>
);

const BedroomBtn = ({ value, selected, onPress }: {
  value: number; selected: boolean; onPress: () => void;
}) => (
  <TouchableOpacity
    style={[s.bedroomBtn, selected && s.bedroomBtnActive]}
    onPress={onPress}
    activeOpacity={0.7}
    accessibilityRole="button"
    accessibilityState={{ selected }}
  >
    <Text style={[s.bedroomText, selected && s.bedroomTextActive]}>
      {value === 5 ? '5+' : String(value)}
    </Text>
  </TouchableOpacity>
);

const PriceInput = ({ placeholder, value, onChange }: {
  placeholder: string; value: string; onChange: (v: string) => void;
}) => (
  <View style={s.priceInputWrap}>
    <Text style={s.pricePrefix}>$</Text>
    <TextInput
      style={s.priceInput}
      placeholder={placeholder}
      placeholderTextColor={colors.gray[400]}
      keyboardType="numeric"
      value={value}
      onChangeText={onChange}
      returnKeyType="done"
    />
  </View>
);

// ─── Main modal ───────────────────────────────────────────────────────────────

const SearchFiltersModal = ({ visible, onDismiss }: SearchFiltersModalProps) => {
  const { height: screenHeight } = useWindowDimensions();
  const { filters, setFilters, resetFilters, applyFilters } = useSearchStore();

  const [modalMounted, setModalMounted] = useState(false);
  const [local, setLocal] = useState<SearchFilters>({ ...filters });
  const [minPrice, setMinPrice] = useState(filters.minPrice ? String(filters.minPrice) : '');
  const [maxPrice, setMaxPrice] = useState(filters.maxPrice ? String(filters.maxPrice) : '');

  // Animation : translateY 0 = visible, screenHeight = hors écran
  const translateY = useSharedValue(screenHeight);
  const backdropOpacity = useSharedValue(0);

  const openSheet = useCallback(() => {
    translateY.value = withTiming(0, {
      duration: 380,
      easing: Easing.out(Easing.exp),
    });
    backdropOpacity.value = withTiming(1, { duration: 300 });
  }, []);

  const closeSheet = useCallback((cb?: () => void) => {
    backdropOpacity.value = withTiming(0, { duration: 250 });
    translateY.value = withTiming(screenHeight, {
      duration: 320,
      easing: Easing.in(Easing.exp),
    }, (finished) => {
      if (finished && cb) runOnJS(cb)();
    });
  }, [screenHeight]);

  useEffect(() => {
    if (visible) {
      setLocal({ ...filters });
      setMinPrice(filters.minPrice ? String(filters.minPrice) : '');
      setMaxPrice(filters.maxPrice ? String(filters.maxPrice) : '');
      setModalMounted(true);
      // Lancer l'animation après le premier rendu du Modal
      setTimeout(openSheet, 10);
    } else {
      if (modalMounted) {
        closeSheet(() => setModalMounted(false));
      }
    }
  }, [visible]);

  const handleDismiss = () => {
    closeSheet(onDismiss);
  };

  const update = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) =>
    setLocal(prev => ({ ...prev, [key]: value }));

  const toggleArr = <K extends keyof SearchFilters>(key: K, id: string, current: string[] = []) => {
    const next = current.includes(id) ? current.filter(v => v !== id) : [...current, id];
    update(key, next as SearchFilters[K]);
  };

  const handleApply = () => {
    setFilters({
      ...local,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
    });
    applyFilters();
    closeSheet(onDismiss);
  };

  const handleReset = () => {
    setLocal({ query: '' });
    setMinPrice('');
    setMaxPrice('');
    resetFilters();
    closeSheet(onDismiss);
  };

  const activeCount = [
    minPrice,
    maxPrice,
    local.propertyType?.length,
    local.bedrooms,
    local.amenities?.length,
    local.nearbyPointOfInterest,
    local.sortBy && local.sortBy !== 'price_asc',
  ].filter(Boolean).length;

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!modalMounted) return null;

  return (
    <Modal
      visible={modalMounted}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      {/* Backdrop */}
      <Animated.View style={[s.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleDismiss} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={[s.sheet, { height: screenHeight }, sheetStyle]}>
        {/* Handle */}
        <View style={s.handleWrap}>
          <View style={s.handle} />
        </View>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={handleDismiss} style={s.closeBtn} accessibilityRole="button" accessibilityLabel="Fermer">
            <MaterialIcons name="close" size={22} color={colors.gray[700]} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Filtres</Text>
          <TouchableOpacity onPress={handleReset} accessibilityRole="button" accessibilityLabel="Tout effacer">
            <Text style={s.clearAll}>Tout effacer</Text>
          </TouchableOpacity>
        </View>

        {/* Scroll content */}
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Prix */}
          <View style={s.section}>
            <SectionTitle>Fourchette de prix / mois</SectionTitle>
            <View style={s.priceRow}>
              <PriceInput placeholder="Min" value={minPrice} onChange={setMinPrice} />
              <View style={s.priceDash}><Text style={s.priceDashText}>—</Text></View>
              <PriceInput placeholder="Max" value={maxPrice} onChange={setMaxPrice} />
            </View>
          </View>

          <View style={s.sep} />

          {/* Type */}
          <View style={s.section}>
            <SectionTitle>Type de logement</SectionTitle>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
              {PROPERTY_TYPES.map(t => (
                <FilterChip
                  key={t.id}
                  label={t.name}
                  selected={local.propertyType?.includes(t.id) ?? false}
                  onPress={() => toggleArr('propertyType', t.id, local.propertyType)}
                />
              ))}
            </ScrollView>
          </View>

          <View style={s.sep} />

          {/* Chambres */}
          <View style={s.section}>
            <SectionTitle>Nombre de chambres minimum</SectionTitle>
            <View style={s.bedroomRow}>
              {BEDROOM_OPTIONS.map(n => (
                <BedroomBtn
                  key={n}
                  value={n}
                  selected={local.bedrooms === n}
                  onPress={() => update('bedrooms', local.bedrooms === n ? undefined : n)}
                />
              ))}
            </View>
          </View>

          <View style={s.sep} />

          {/* Commodités */}
          <View style={s.section}>
            <SectionTitle>Commodités</SectionTitle>
            <View style={s.amenityGrid}>
              {AMENITIES.map(a => (
                <FilterChip
                  key={a.id}
                  label={a.name}
                  selected={local.amenities?.includes(a.id) ?? false}
                  onPress={() => toggleArr('amenities', a.id, local.amenities)}
                />
              ))}
            </View>
          </View>

          <View style={s.sep} />

          {/* Proximité */}
          <View style={s.section}>
            <SectionTitle>À proximité de</SectionTitle>
            <View style={s.amenityGrid}>
              {POINTS_OF_INTEREST.map(p => (
                <FilterChip
                  key={p.id}
                  label={p.name}
                  selected={local.nearbyPointOfInterest === p.id}
                  onPress={() => update('nearbyPointOfInterest', local.nearbyPointOfInterest === p.id ? undefined : p.id)}
                />
              ))}
            </View>
          </View>

          <View style={s.sep} />

          {/* Tri */}
          <View style={s.section}>
            <SectionTitle>Trier par</SectionTitle>
            <View style={s.sortGrid}>
              {SORT_OPTIONS.map(opt => {
                const active = (local.sortBy ?? 'price_asc') === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[s.sortBtn, active && s.sortBtnActive]}
                    onPress={() => update('sortBy', opt.value)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <MaterialIcons name={opt.icon as any} size={18} color={active ? colors.white : colors.gray[600]} />
                    <Text style={[s.sortText, active && s.sortTextActive]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Footer */}
        <View style={s.footer}>
          <TouchableOpacity style={s.resetBtn} onPress={handleReset} activeOpacity={0.8} accessibilityRole="button">
            <Text style={s.resetText}>Réinitialiser</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.applyBtn} onPress={handleApply} activeOpacity={0.8} accessibilityRole="button">
            <Text style={s.applyText}>
              Voir les résultats{activeCount > 0 ? ` (${activeCount})` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
};

const s = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,31,31,0.55)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    flexDirection: 'column',
    overflow: 'hidden',
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gray[200],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gray[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.ink,
  },
  clearAll: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[5],
  },
  section: {
    paddingVertical: spacing[5],
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
    color: colors.gray[700],
    marginBottom: spacing[4],
    letterSpacing: 0.2,
  },
  sep: {
    height: 1,
    backgroundColor: colors.gray[100],
  },

  // Prix
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  priceInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    height: 52,
    backgroundColor: colors.gray[50],
  },
  pricePrefix: {
    fontSize: typography.fontSize.base,
    color: colors.gray[500],
    marginRight: 6,
    fontWeight: '500',
  },
  priceInput: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.ink,
    fontWeight: '500',
  },
  priceDash: { alignItems: 'center' },
  priceDashText: { color: colors.gray[400], fontSize: typography.fontSize.lg },

  // Chips
  chipRow: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingBottom: 4,
  },
  chip: {
    paddingHorizontal: spacing[4],
    paddingVertical: 10,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    backgroundColor: colors.white,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  chipText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[700],
    fontWeight: '500',
  },
  chipTextActive: {
    color: colors.white,
    fontWeight: '600',
  },

  // Amenities grid
  amenityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },

  // Chambres
  bedroomRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  bedroomBtn: {
    flex: 1,
    height: 44,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  bedroomBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  bedroomText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.gray[700],
  },
  bedroomTextActive: { color: colors.white },

  // Tri
  sortGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing[4],
    paddingVertical: 10,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    backgroundColor: colors.white,
  },
  sortBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  sortText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[700],
    fontWeight: '500',
  },
  sortTextActive: { color: colors.white, fontWeight: '600' },

  // Footer
  footer: {
    flexDirection: 'row',
    gap: spacing[3],
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[8],
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  resetBtn: {
    flex: 1,
    height: 52,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.gray[300],
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  resetText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.gray[700],
  },
  applyBtn: {
    flex: 2,
    height: 52,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyText: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    color: colors.white,
  },
});

export default SearchFiltersModal;
