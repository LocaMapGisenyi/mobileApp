import ContentSkeleton from '../components/ContentSkeleton';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Modal,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { HostPage, HostHeader, HostNotice, HostEmpty } from '../components/host/HostUI';
import { Text } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { colors } from '../theme';
import { useUserStore } from '../store/user';
import {
  hostService,
  CalendarDay,
  CalendarDayStatus,
  BlockReason,
  HostListing,
  CalendarBulkPatch,
} from '../services/api';

// ─── Constants ────────────────────────────────────────────────────────────────
const MIN_PRICE = 5000;
type ActionMode = 'available' | 'blocked';

export function getCalendarListingType(type: string | null | undefined, fallback: string, labels: Record<string, string> = {}) {
  const code = type?.trim();
  const label = code ? labels[code] || code : fallback;
  return { label, initial: label.charAt(0).toUpperCase() };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const toKey = (year: number, month: number, day: number): string => {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
};

const formatFC = (n: number | undefined | null) =>
  (typeof n === 'number' ? n : 0).toLocaleString('fr-FR') + ' RWF';

const getDayCells = (year: number, month: number): (number | null)[] => {
  const firstWeekday = new Date(year, month, 1).getDay();
  const offset = firstWeekday === 0 ? 6 : firstWeekday - 1;
  const total = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= total; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
};

const isWeekend = (year: number, month: number, day: number): boolean => {
  const dow = new Date(year, month, day).getDay();
  return dow === 0 || dow === 6;
};

interface CalendarState {
  scope: string;
  dayMap: Record<string, CalendarDay>;
  loading: boolean;
  saving: boolean;
  ready: boolean;
  error: string | null;
}
const emptyCalendar: CalendarState = { scope: '', dayMap: {}, loading: false, saving: false, ready: false, error: null };
const calendarError = (error: unknown): string =>
  error && typeof error === 'object' && 'message' in error ? String(error.message) : '';

// One generation covers both reads and writes; an older response cannot update a new view.
export function createCalendarSession(
  onChange: (state: CalendarState) => void,
  service: Pick<typeof hostService, 'getCalendar' | 'bulkUpdateCalendar'> = hostService,
) {
  let generation = 0;
  let state = emptyCalendar;
  const publish = (next: CalendarState) => { state = next; onChange(next); };
  const readDays = async (propertyId: string, month: string) => {
    const days = await service.getCalendar(propertyId, month);
    return Object.fromEntries(days.map(day => [day.date, day]));
  };
  return {
    invalidate() { ++generation; state = emptyCalendar; },
    async load(scope: string, propertyId: string, month: string) {
      const request = ++generation;
      publish({ ...emptyCalendar, scope, loading: true });
      try {
        const dayMap = await readDays(propertyId, month);
        if (request === generation) publish({ ...state, dayMap, loading: false, ready: true });
      } catch (error) {
        if (request === generation) publish({ ...state, loading: false, ready: false, error: calendarError(error) });
      }
    },
    async save(scope: string, propertyId: string, month: string, patch: CalendarBulkPatch): Promise<boolean> {
      if (state.scope !== scope || !state.ready || state.loading || state.saving) return false;
      const request = ++generation;
      publish({ ...state, saving: true, error: null });
      try {
        await service.bulkUpdateCalendar(propertyId, patch);
        if (request !== generation) return false;
        const dayMap = await readDays(propertyId, month);
        if (request !== generation) return false;
        publish({ ...state, dayMap, saving: false, ready: true });
        return true;
      } catch (error) {
        if (request === generation) publish({ ...state, saving: false, ready: false, error: calendarError(error) });
        return false;
      }
    },
  };
}

interface CalendarListingsState {
  userId: string | null;
  listings: HostListing[];
  selectedListing: HostListing | null;
  loading: boolean;
  error: string | null;
}

// Focus changes invalidate both listing requests and the existing calendar
// read/write session. Selection is restored only from the fresh eligible rows.
export function createCalendarFocusSession(
  onChange: (state: CalendarListingsState) => void,
  calendar: { invalidate: () => void },
  service: Pick<typeof hostService, 'getHostListings'> = hostService,
) {
  let generation = 0;
  return {
    invalidate() { ++generation; calendar.invalidate(); },
    async load({ userId, preferredId, requestedId }: { userId: string | null; preferredId?: string; requestedId?: string }) {
      const request = ++generation;
      calendar.invalidate();
      const empty: CalendarListingsState = { userId, listings: [], selectedListing: null, loading: true, error: null };
      onChange(empty);
      try {
        const listings = userId ? await service.getHostListings() : [];
        if (request !== generation) return;
        const selectedListing = listings.find(row => row.id === preferredId)
          ?? listings.find(row => row.id === requestedId) ?? listings[0] ?? null;
        onChange({ ...empty, listings, selectedListing, loading: false });
      } catch (error) {
        if (request === generation) onChange({ ...empty, loading: false, error: calendarError(error) });
      }
    },
  };
}

// ─── Component ────────────────────────────────────────────────────────────────
const HostCalendarScreen = ({ route, navigation }: { route?: { name?: string; params?: { propertyId?: string } }; navigation?: { goBack: () => void } }) => {
  const { t, i18n } = useTranslation();
  const focused = useIsFocused();
  const dedicated = route?.name === 'HostCalendar';
  const locale = i18n.language;
  const formatDate = (date: Date, options: Intl.DateTimeFormatOptions) => date.toLocaleDateString(locale, { timeZone: 'Africa/Kigali', ...options });
  const weekdays = Array.from({ length: 7 }, (_, day) => formatDate(new Date(Date.UTC(2026, 0, 5 + day, 12)), { weekday: 'narrow' }));
  const userId = useUserStore(state => state.authUser?.id ?? null);

  // ── View state ─────────────────────────────────────────────────────────────
  const [viewDate, setViewDate] = useState(() => {
    const parts = new Intl.DateTimeFormat('en', { timeZone: 'Africa/Kigali', year: 'numeric', month: 'numeric' }).formatToParts(new Date());
    return new Date(Number(parts.find(p => p.type === 'year')!.value), Number(parts.find(p => p.type === 'month')!.value) - 1, 1);
  });
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // ── Data state ─────────────────────────────────────────────────────────────
  const [listings, setListings] = useState<HostListing[]>([]);
  const [selectedListing, setSelectedListing] = useState<HostListing | null>(null);
  const [calendar, setCalendar] = useState<CalendarState>(emptyCalendar);
  const session = useRef<ReturnType<typeof createCalendarSession> | null>(null);
  if (!session.current) session.current = createCalendarSession(setCalendar);
  const [listingsUserId, setListingsUserId] = useState<string | null>(null);
  const [loadingListings, setLoadingListings] = useState(true);
  const [listingsError, setListingsError] = useState<string | null>(null);
  const [listingsRetry, setListingsRetry] = useState(0);
  const [calendarRetry, setCalendarRetry] = useState(0);
  const lastSelection = useRef<{ userId: string | null; id?: string }>({ userId: null });
  const lastRequestedProperty = useRef(route?.params?.propertyId);
  const focusGeneration = useRef(0);
  const listingsLoadingRef = useRef(true);
  const focusSession = useRef<ReturnType<typeof createCalendarFocusSession> | null>(null);
  if (!focusSession.current) focusSession.current = createCalendarFocusSession(next => {
    listingsLoadingRef.current = next.loading;
    setListings(next.listings);
    setSelectedListing(next.selectedListing);
    setListingsUserId(next.userId);
    setLoadingListings(next.loading);
    setListingsError(next.error);
    if (next.selectedListing) lastSelection.current = { userId: next.userId, id: next.selectedListing.id };
  }, session.current);
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
  const calendarScope = `${userId}:${selectedListing?.id}:${monthStr}`;
  const currentScope = useRef(calendarScope);
  currentScope.current = calendarScope;
  const calendarMatches = calendar.scope === calendarScope;
  const calendarReady = focused && !loadingListings && calendarMatches && calendar.ready;
  const loadingCalendar = !calendarMatches || calendar.loading;
  const saving = calendarMatches && calendar.saving;
  const calendarFailure = calendarMatches && calendar.error !== null;
  const dayMap = calendarMatches ? calendar.dayMap : {};

  // ── UI state ───────────────────────────────────────────────────────────────
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [tooltipKey, setTooltipKey] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);

  // Edit panel state
  const [priceInput, setPriceInput] = useState('');
  const [minNights, setMinNights] = useState(1);
  const [actionMode, setActionMode] = useState<ActionMode>('available');
  const [blockReason, setBlockReason] = useState<BlockReason>('personal');

  // Tabs stay mounted: every visit refreshes both eligible properties and days.
  useFocusEffect(useCallback(() => {
    ++focusGeneration.current;
    const requestedId = route?.params?.propertyId;
    const routeChanged = lastRequestedProperty.current !== requestedId;
    lastRequestedProperty.current = requestedId;
    const preferredId = routeChanged ? requestedId : lastSelection.current.userId === userId ? lastSelection.current.id : undefined;
    void focusSession.current?.load({ userId, preferredId, requestedId });
    return () => {
      ++focusGeneration.current;
      focusSession.current?.invalidate();
      setCalendar(emptyCalendar);
    };
  }, [userId, listingsRetry, route?.params?.propertyId]));

  // ── Load calendar when listing or month changes ────────────────────────────
  useEffect(() => {
    setSelectedDates([]);
    setTooltipKey(null);
    setApplySuccess(false);
    setPriceInput('');
    setMinNights(1);
    if (focused && !listingsLoadingRef.current && !loadingListings && listingsError === null && selectedListing && userId && listingsUserId === userId) {
      void session.current?.load(calendarScope, selectedListing.id, monthStr);
    }
    return () => session.current?.invalidate();
  }, [calendarScope, selectedListing, monthStr, userId, listingsUserId, calendarRetry, focused, loadingListings, listingsError]);

  useEffect(() => {
    if (!applySuccess) return;
    const timeout = setTimeout(() => setApplySuccess(false), 2200);
    return () => clearTimeout(timeout);
  }, [applySuccess]);

  // ── Month navigation ───────────────────────────────────────────────────────
  const goToPrevMonth = () =>
    setViewDate(new Date(year, month - 1, 1));
  const goToNextMonth = () =>
    setViewDate(new Date(year, month + 1, 1));

  // ── Calendar grid ──────────────────────────────────────────────────────────
  const cells = useMemo(() => getDayCells(year, month), [year, month]);

  const handleDayPress = useCallback(
    (day: number) => {
      if (!calendarReady || saving) return;
      const key = toKey(year, month, day);
      const data = dayMap[key];
      if (data?.status === 'booked') {
        setTooltipKey(prev => (prev === key ? null : key));
        setSelectedDates([]);
        return;
      }
      setTooltipKey(null);
      setSelectedDates(prev =>
        prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key],
      );
    },
    [year, month, dayMap, calendarReady, saving],
  );

  // ── Apply changes ──────────────────────────────────────────────────────────
  const applyChanges = async () => {
    if (!selectedListing || selectedDates.length === 0 || !calendarReady || saving) return;
    const scope = calendarScope;
    const focus = focusGeneration.current;
    setApplySuccess(false);

    const patch = {
      dates: selectedDates,
      status: actionMode === 'blocked' ? 'blocked' as CalendarDayStatus : 'available' as CalendarDayStatus,
      ...(actionMode === 'available' && selectedListing?.canSetPricing && parseInt(priceInput) >= MIN_PRICE
        ? { priceOverride: parseInt(priceInput) }
        : {}),
      ...(actionMode === 'available' && selectedListing?.canSetPricing && minNights > 1 ? { minNights } : {}),
      ...(actionMode === 'blocked' ? { blockReason } : {}),
    };

    const saved = await session.current?.save(scope, selectedListing.id, monthStr, patch);
    if (currentScope.current === scope && focusGeneration.current === focus) {
      setSelectedDates([]);
      if (saved) setApplySuccess(true);
    }
  };

  // ── Month stats ────────────────────────────────────────────────────────────
  const monthStats = useMemo(() => {
    const total = new Date(year, month + 1, 0).getDate();
    let booked = 0;
    let blocked = 0;
    for (let d = 1; d <= total; d++) {
      const status = dayMap[toKey(year, month, d)]?.status;
      if (status === 'booked') booked++;
      else if (status === 'blocked') blocked++;
    }
    return { total, booked, blocked };
  }, [year, month, dayMap]);

  // ── Cell style helpers ─────────────────────────────────────────────────────
  const getCellStyles = (day: number) => {
    const key = toKey(year, month, day);
    const status = dayMap[key]?.status ?? 'available';
    const isSelected = selectedDates.includes(key);
    const weekend = isWeekend(year, month, day);
    const cell: object[] = [s.dayCell];
    const text: object[] = [s.dayCellText];
    if (isSelected) { cell.push(s.dayCellSelected); text.push(s.dayCellTextSelected); }
    else if (status === 'booked') { cell.push(s.dayCellBooked); text.push(s.dayCellTextBooked); }
    else if (status === 'blocked') { cell.push(s.dayCellBlocked); text.push(s.dayCellTextBlocked); }
    else if (weekend) cell.push(s.dayCellWeekend);
    if (tooltipKey === key) cell.push(s.dayCellTooltipActive);
    return { cell, text };
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loadingListings || listingsUserId !== userId || listingsError !== null || listings.length === 0) {
    return <HostPage bottomSafe={dedicated}>
      <HostHeader title={t('hostCalendar.title')} onBack={dedicated ? navigation?.goBack : undefined} />
      {loadingListings || listingsUserId !== userId ? <ContentSkeleton variant="calendar" />
        : listingsError !== null ? <HostNotice message={listingsError || t('hostCalendar.errorListings')} onRetry={() => setListingsRetry(value => value + 1)} />
        : <HostEmpty icon="calendar-today" title={t('hostCalendar.publishFirst')} />}
    </HostPage>;
  }

  return (
    <HostPage scroll={false} bottomSafe={dedicated}>
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView
          contentContainerStyle={[
            s.scroll,
            { paddingTop: 8, paddingBottom: 24, width: '100%', maxWidth: 760, alignSelf: 'center' },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Header ── */}
          <HostHeader title={t('hostCalendar.title')} onBack={dedicated ? navigation?.goBack : undefined} />
          <View style={s.header}>
            <TouchableOpacity
              style={s.listingPicker}
              accessibilityRole="button" accessibilityLabel={t('hostCalendar.chooseListing')}
              disabled={saving}
              onPress={() => setDropdownOpen(true)}
              activeOpacity={0.8}
            >
              <Text style={s.listingPickerText} numberOfLines={1}>
                {selectedListing?.title ?? '—'}
              </Text>
              <MaterialIcons name="keyboard-arrow-down" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* ── Stats strip ── */}
          {calendarReady && <View style={s.statsStrip}>
            <View style={s.statItem}>
              <View style={[s.statDot, { backgroundColor: colors.primary }]} />
              <Text style={s.statText}>{t('hostFlow.calendar.bookedDays', { count: monthStats.booked })}</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <View style={[s.statDot, { backgroundColor: colors.inkDisabled }]} />
              <Text style={s.statText}>{t('hostFlow.calendar.blockedDays', { count: monthStats.blocked })}</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <View style={[s.statDot, { backgroundColor: colors.success }]} />
              <Text style={s.statText}>
                {t('hostFlow.calendar.availableDays', { count: monthStats.total - monthStats.booked - monthStats.blocked })}
              </Text>
            </View>
          </View>}

          {/* ── Month navigator ── */}
          <View style={s.monthNav}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('hostFlow.calendar.previousMonth')} onPress={goToPrevMonth} disabled={saving} style={s.monthNavBtn} activeOpacity={0.7}>
              <MaterialIcons name="chevron-left" size={26} color={colors.inkMid} />
            </TouchableOpacity>
            <Text style={s.monthLabel}>{formatDate(new Date(Date.UTC(year, month, 1, 12)), { month: 'long', year: 'numeric' })}</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('hostFlow.calendar.nextMonth')} onPress={goToNextMonth} disabled={saving} style={s.monthNavBtn} activeOpacity={0.7}>
              <MaterialIcons name="chevron-right" size={26} color={colors.inkMid} />
            </TouchableOpacity>
          </View>

          {/* ── Day headers ── */}
          <View style={s.dayHeaders}>
            {weekdays.map((d, i) => (
              <Text
                key={i}
                style={[s.dayHeader, (i === 5 || i === 6) && s.dayHeaderWeekend]}
              >
                {d}
              </Text>
            ))}
          </View>

          {/* ── Grid ── */}
          {loadingCalendar ? (
            <ContentSkeleton variant="calendar" />
          ) : calendarFailure ? (
            <View style={s.centered}>
              <Text accessibilityRole="alert" style={{ color: colors.error }}>{calendar.error || t('common.error')}</Text>
              <TouchableOpacity onPress={() => setCalendarRetry(value => value + 1)} accessibilityRole="button">
                <Text style={s.hint}>{t('common.retry')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.calendarGrid}>
              {cells.map((day, idx) => {
                if (day === null) return <View key={`e-${idx}`} style={s.dayCellEmpty} />;
                const key = toKey(year, month, day);
                const { cell, text } = getCellStyles(day);
                const data = dayMap[key];
                return (
                  <TouchableOpacity
                    key={key}
                    accessibilityRole="button"
                    accessibilityLabel={`${formatDate(new Date(`${key}T12:00:00Z`), { day: 'numeric', month: 'long', year: 'numeric' })}, ${t(`hostFlow.calendar.${data?.status ?? 'available'}`)}`}
                    accessibilityState={{ selected: selectedDates.includes(key), disabled: saving || !calendarReady }}
                    onPress={() => handleDayPress(day)}
                    disabled={saving || !calendarReady}
                    activeOpacity={0.75}
                    style={cell}
                  >
                    <Text style={text}>{day}</Text>
                    {data?.status === 'booked' && data.guestName && (
                      <View style={s.bookedDot}>
                        <Text style={s.bookedDotText}>
                          {data.guestName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    {data?.status === 'blocked' && <View style={s.blockedStripe} />}
                    {selectedDates.includes(key) && (
                      <View style={s.selectedCheck}>
                        <MaterialIcons name="check" size={7} color={colors.primary} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* ── Booking tooltip ── */}
          {calendarReady && tooltipKey && dayMap[tooltipKey] && (
            <View style={s.tooltip}>
              <View style={s.tooltipHeader}>
                <MaterialIcons name="event" size={14} color={colors.primary} />
                <Text style={s.tooltipTitle}>{t('hostCalendar.confirmedBooking')}</Text>
              </View>
              <Text style={s.tooltipGuest}>{dayMap[tooltipKey]!.guestName}</Text>
              {dayMap[tooltipKey]!.nights != null && (
                <Text style={s.tooltipMeta}>
                  {t('hostFlow.calendar.nights', { count: dayMap[tooltipKey]!.nights })}
                </Text>
              )}
              {dayMap[tooltipKey]!.amount != null && (
                <Text style={s.tooltipAmount}>{formatFC(dayMap[tooltipKey]!.amount!)}</Text>
              )}
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('common.close')} style={s.tooltipClose} onPress={() => setTooltipKey(null)}>
                <MaterialIcons name="close" size={15} color={colors.inkSubtle} />
              </TouchableOpacity>
            </View>
          )}

          {/* ── Legend ── */}
          <View style={s.legend}>
            <Text style={s.legendTitle}>{t('hostCalendar.legend')}</Text>
            <View style={s.legendRow}>
              <View style={s.legendItem}>
                <View style={[s.legendSwatch, s.swatchAvailable]} />
                <Text style={s.legendLabel}>{t('hostCalendar.legendFree')}</Text>
              </View>
              <View style={s.legendItem}>
                <View style={[s.legendSwatch, s.swatchBooked]} />
                <Text style={s.legendLabel}>{t('hostCalendar.legendBooked')}</Text>
              </View>
              <View style={s.legendItem}>
                <View style={[s.legendSwatch, s.swatchBlocked]} />
                <Text style={s.legendLabel}>{t('hostCalendar.legendBlocked')}</Text>
              </View>
              <View style={s.legendItem}>
                <View style={[s.legendSwatch, s.swatchSelected]} />
                <Text style={s.legendLabel}>{t('hostCalendar.legendSelected')}</Text>
              </View>
            </View>
          </View>

          {calendarReady && selectedDates.length === 0 && !tooltipKey && (
            <Text style={s.hint}>{t('hostCalendar.tapHint')}</Text>
          )}

          {applySuccess && (
            <View style={s.toast}>
              <MaterialIcons name="check-circle" size={15} color={colors.success} />
              <Text style={s.toastText}>{t('hostCalendar.saved')}</Text>
            </View>
          )}

        {/* Editing stays in the scroll flow, only while dates are selected. */}
        {calendarReady && selectedDates.length > 0 && <View pointerEvents={saving ? 'none' : 'auto'} style={s.actionPanel}>

          <View style={s.actionHeaderRow}>
            <View>
              <Text style={s.actionLabel}>{t('hostCalendar.selection')}</Text>
              <Text style={s.actionSelection}>{t('hostFlow.calendar.selected', { count: selectedDates.length })}</Text>
            </View>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('common.cancel')} onPress={() => setSelectedDates([])} style={s.clearBtn}>
              <MaterialIcons name="close" size={17} color={colors.inkSubtle} />
            </TouchableOpacity>
          </View>

          {/* Mode toggle */}
          <View style={s.modeToggle}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('hostCalendar.available')}
              accessibilityState={{ selected: actionMode === 'available', disabled: saving }}
              disabled={saving}
              style={[s.modeBtn, actionMode === 'available' && s.modeBtnActive]}
              onPress={() => setActionMode('available')}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name="check-circle-outline"
                size={14}
                color={actionMode === 'available' ? colors.primary : colors.inkDisabled}
              />
              <Text style={[s.modeBtnText, actionMode === 'available' && s.modeBtnTextActive]}>
                {t('hostCalendar.available')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('hostCalendar.block')}
              accessibilityState={{ selected: actionMode === 'blocked', disabled: saving }}
              disabled={saving}
              style={[s.modeBtn, actionMode === 'blocked' && s.modeBtnBlockActive]}
              onPress={() => setActionMode('blocked')}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name="block"
                size={14}
                color={actionMode === 'blocked' ? colors.white : colors.inkDisabled}
              />
              <Text
                style={[s.modeBtnText, actionMode === 'blocked' && s.modeBtnTextBlock]}
              >
                {t('hostCalendar.block')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Available fields */}
          {actionMode === 'available' && selectedListing?.canSetPricing && (
            <View style={s.fieldsRow}>
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>{t('hostCalendar.priceNight')}</Text>
                <View style={s.priceInputWrap}>
                  <TextInput
                    accessibilityLabel={t('hostCalendar.priceNight') + ' (RWF)'}
                    editable={!saving}
                    style={s.priceInput}
                    value={priceInput}
                    onChangeText={v => setPriceInput(v.replace(/\D/g, ''))}
                    keyboardType="numeric"
                    placeholder={String(MIN_PRICE)}
                    placeholderTextColor={colors.inkSubtle}
                  />
                  <Text style={s.priceSuffix}>RWF</Text>
                </View>
                {priceInput !== '' && parseInt(priceInput) < MIN_PRICE && (
                  <Text style={s.priceWarning}>{t('hostCalendar.minPrice')} {formatFC(MIN_PRICE)}</Text>
                )}
              </View>
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>{t('hostCalendar.minStay')}</Text>
                <View style={s.stepper}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={t('hostFlow.calendar.decreaseStay')}
                    disabled={minNights <= 1 || saving}
                    style={s.stepperBtn}
                    onPress={() => setMinNights(n => Math.max(1, n - 1))}
                  >
                    <MaterialIcons name="remove" size={15} color={colors.inkMid} />
                  </TouchableOpacity>
                  <Text style={s.stepperValue}>{minNights}</Text>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={t('hostFlow.calendar.increaseStay')}
                    disabled={minNights >= 30 || saving}
                    style={s.stepperBtn}
                    onPress={() => setMinNights(n => Math.min(30, n + 1))}
                  >
                    <MaterialIcons name="add" size={15} color={colors.inkMid} />
                  </TouchableOpacity>
                </View>
                <Text style={s.stepperUnit}>{minNights > 1 ? t('hostCalendar.nights') : t('hostCalendar.night')}</Text>
              </View>
            </View>
          )}

          {/* Blocked reason chips */}
          {actionMode === 'blocked' && (
            <View style={s.blockReasonRow}>
              {(
                [
                  { key: 'personal' as BlockReason, label: t('hostCalendar.personal') },
                  { key: 'maintenance' as BlockReason, label: t('hostCalendar.maintenance') },
                  { key: 'other' as BlockReason, label: t('hostCalendar.other') },
                ]
              ).map(r => (
                <TouchableOpacity
                  key={r.key}
                  accessibilityRole="button"
                  accessibilityLabel={r.label}
                  accessibilityState={{ selected: blockReason === r.key, disabled: saving }}
                  disabled={saving}
                  style={[s.reasonChip, blockReason === r.key && s.reasonChipActive]}
                  onPress={() => setBlockReason(r.key)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[s.reasonChipText, blockReason === r.key && s.reasonChipTextActive]}
                  >
                    {r.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Apply */}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t(selectedDates.length > 1 ? 'hostCalendar.applyToPlural' : 'hostCalendar.applyTo', { count: selectedDates.length })}
            accessibilityState={{ busy: saving }}
            style={[
              s.applyBtn,
              actionMode === 'blocked' && s.applyBtnBlocked,
              (selectedDates.length === 0 || saving) && s.applyBtnDisabled,
            ]}
            onPress={applyChanges}
            disabled={
              selectedDates.length === 0 ||
              saving ||
              (actionMode === 'available' && selectedListing?.canSetPricing &&
                priceInput !== '' &&
                parseInt(priceInput) < MIN_PRICE)
            }
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={[s.applyBtnText, actionMode === 'blocked' && { color: colors.white }]}>
                {selectedDates.length > 1
                  ? t('hostCalendar.applyToPlural', { count: selectedDates.length })
                  : t('hostCalendar.applyTo', { count: selectedDates.length })}
              </Text>
            )}
          </TouchableOpacity>
        </View>}

        </ScrollView>

        {/* ── Listing picker modal ── */}
        <Modal
          visible={dropdownOpen && !saving}
          transparent
          animationType="fade"
          onRequestClose={() => setDropdownOpen(false)}
        >
          <TouchableOpacity
            style={s.overlay}
            activeOpacity={1}
            onPress={() => setDropdownOpen(false)}
          >
            <ScrollView style={s.dropdownCard} keyboardShouldPersistTaps="handled">
              <Text style={s.dropdownTitle}>{t('hostCalendar.chooseListing')}</Text>
              {listings.map(l => {
                const type = getCalendarListingType(l.type, t('hostFlow.calendar.unspecifiedType'), t('property.types', { returnObjects: true }) as Record<string, string>);
                return (
                <TouchableOpacity
                  key={l.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${l.title}, ${type.label}`}
                  accessibilityState={{ selected: selectedListing?.id === l.id }}
                  style={[
                    s.dropdownItem,
                    selectedListing?.id === l.id && s.dropdownItemActive,
                  ]}
                  onPress={() => {
                    lastSelection.current = { userId, id: l.id };
                    setSelectedListing(l);
                    setDropdownOpen(false);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={s.dropdownItemLeft}>
                    <View style={s.dropdownTypeChip}>
                      <Text style={s.dropdownTypeInitial}>
                        {type.initial}
                      </Text>
                    </View>
                    <View>
                      <Text style={s.dropdownItemTitle}>{l.title}</Text>
                      <Text style={s.dropdownItemSub}>{type.label}</Text>
                    </View>
                  </View>
                  {selectedListing?.id === l.id && (
                    <MaterialIcons name="check" size={17} color={colors.primary} />
                  )}
                </TouchableOpacity>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </Modal>
      </View>
    </KeyboardAvoidingView>
    </HostPage>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const CELL_W = `${(100 / 7).toFixed(4)}%` as `${number}%`;

const s = StyleSheet.create({
  scroll: {
    paddingHorizontal: 20,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: colors.inkSubtle,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.4,
  },
  listingPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryLight,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    maxWidth: '100%',
    minHeight: 48,
  },
  listingPickerText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    flexShrink: 1,
  },

  // Stats strip
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSunken,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statText: {
    fontSize: 12,
    color: colors.inkMid,
    fontWeight: '500',
    flexShrink: 1,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: colors.border,
  },

  // Month nav
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  monthNavBtn: {
    width: 44,
    height: 44,
    borderRadius: 18,
    backgroundColor: colors.surfaceSunken,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.2,
  },

  // Day headers
  dayHeaders: {
    flexDirection: 'row',
    marginHorizontal: -14,
    marginBottom: 8,
  },
  dayHeader: {
    width: CELL_W,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: colors.inkSubtle,
    paddingVertical: 4,
  },
  dayHeaderWeekend: {
    color: colors.primary,
  },

  // Grid
  gridLoader: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -14,
    marginBottom: 16,
  },
  dayCellEmpty: {
    width: CELL_W,
    aspectRatio: 1,
  },
  dayCell: {
    width: CELL_W,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginVertical: 2,
    position: 'relative',
  },
  dayCellWeekend: {
    backgroundColor: colors.primaryLight + '44',
  },
  dayCellSelected: {
    backgroundColor: colors.primaryLight,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  dayCellBooked: {
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  dayCellBlocked: {
    backgroundColor: colors.surfaceSunken,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayCellTooltipActive: {
    borderWidth: 2,
    borderColor: colors.primaryDark,
  },
  dayCellText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.ink,
  },
  dayCellTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  dayCellTextBooked: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 13,
  },
  dayCellTextBlocked: {
    color: colors.inkDisabled,
  },
  bookedDot: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookedDotText: {
    fontSize: 6,
    fontWeight: '700',
    color: colors.white,
  },
  blockedStripe: {
    position: 'absolute',
    top: '50%',
    left: '15%',
    right: '15%',
    height: 1.5,
    backgroundColor: colors.inkDisabled,
    transform: [{ rotate: '-30deg' }],
  },
  selectedCheck: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Tooltip
  tooltip: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 16,
  },
  tooltipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  tooltipTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink,
  },
  tooltipGuest: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 3,
  },
  tooltipMeta: {
    fontSize: 12,
    color: colors.inkSubtle,
    marginBottom: 2,
  },
  tooltipAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  tooltipClose: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Legend
  legend: {
    marginBottom: 12,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.inkSubtle,
    marginBottom: 8,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendSwatch: {
    width: 14,
    height: 14,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 13,
    color: colors.inkSubtle,
  },
  swatchAvailable: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  swatchBooked: { backgroundColor: colors.primary },
  swatchBlocked: {
    backgroundColor: colors.surfaceSunken,
    borderWidth: 1,
    borderColor: colors.border,
  },
  swatchSelected: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },

  hint: {
    fontSize: 12,
    color: colors.inkSubtle,
    textAlign: 'center',
    marginTop: 8,
  },

  // Toasts
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.success + '14',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.success + '38',
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 12,
    alignSelf: 'center',
  },
  toastError: {
    backgroundColor: colors.error + '10',
    borderColor: colors.error + '30',
  },
  toastText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.success,
  },

  // Action panel
  actionPanel: {
    marginTop: 24,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  actionHandle: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 14,
  },
  actionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.inkSubtle,
  },
  actionSelection: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
    marginTop: 2,
  },
  clearBtn: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Mode toggle
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSunken,
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  modeBtn: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 8,
  },
  modeBtnActive: { backgroundColor: colors.primaryLight },
  modeBtnBlockActive: { backgroundColor: colors.error },
  modeBtnText: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.inkDisabled,
  },
  modeBtnTextActive: { color: colors.primary },
  modeBtnTextBlock: { color: colors.white },

  // Fields
  fieldsRow: {
    flexDirection: 'column',
    gap: 16,
    marginBottom: 16,
  },
  fieldGroup: { flex: 1 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.inkSubtle,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  priceInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSunken,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 10,
    height: 48,
  },
  priceInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
    padding: 0,
  },
  priceSuffix: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.inkSubtle,
    marginLeft: 4,
  },
  priceWarning: {
    fontSize: 10,
    color: colors.warning,
    marginTop: 3,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSunken,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
    height: 48,
    overflow: 'hidden',
  },
  stepperBtn: {
    width: 44,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  stepperValue: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  stepperUnit: {
    fontSize: 10,
    color: colors.inkSubtle,
    marginTop: 3,
  },
  blockReasonRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  reasonChip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: colors.surfaceSunken,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  reasonChipActive: {
    backgroundColor: colors.error + '14',
    borderColor: colors.error,
  },
  reasonChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.inkSubtle,
  },
  reasonChipTextActive: { color: colors.error },

  // Apply button
  applyBtn: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  applyBtnBlocked: { backgroundColor: colors.error },
  applyBtnDisabled: { opacity: 0.4 },
  applyBtnText: {
    color: colors.onAccent,
    fontSize: 14,
    fontWeight: '700',
  },

  // Listing picker modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 31, 31, 0.42)',
    justifyContent: 'flex-end',
    padding: 16,
    paddingBottom: 24,
  },
  dropdownCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dropdownTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.inkSubtle,
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 4,
  },
  dropdownItemActive: { backgroundColor: colors.primaryLight },
  dropdownItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dropdownTypeChip: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownTypeInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  dropdownItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
  },
  dropdownItemSub: {
    fontSize: 12,
    color: colors.inkSubtle,
    marginTop: 1,
  },
});

export default HostCalendarScreen;
