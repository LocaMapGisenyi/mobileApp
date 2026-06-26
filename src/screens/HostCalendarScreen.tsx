import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from 'react-native-paper';
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  Easing,
} from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme';
import {
  hostService,
  CalendarDay,
  CalendarDayStatus,
  BlockReason,
  HostListing,
} from '../services/api';

// ─── Constants ────────────────────────────────────────────────────────────────
const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];
const DAYS_FR = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MIN_PRICE = 5000;
type ActionMode = 'available' | 'blocked';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const toKey = (year: number, month: number, day: number): string => {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
};

const formatFC = (n: number | undefined | null) =>
  (typeof n === 'number' ? n : 0).toLocaleString('fr-FR') + ' FC';

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

const formatSelectionLabel = (dates: string[]): string => {
  if (dates.length === 0) return '';
  if (dates.length === 1) {
    const parts = dates[0].split('-');
    return `${parseInt(parts[2])} ${MONTHS_FR[parseInt(parts[1]) - 1]}`;
  }
  const sorted = [...dates].sort();
  const isContiguous = sorted.every((dk, i) => {
    if (i === 0) return true;
    const a = new Date(sorted[i - 1]);
    const b = new Date(dk);
    return (b.getTime() - a.getTime()) / 86400000 === 1;
  });
  const fmtShort = (dk: string) => {
    const p = dk.split('-');
    return `${parseInt(p[2])} ${MONTHS_FR[parseInt(p[1]) - 1].slice(0, 4)}.`;
  };
  if (isContiguous) return `${fmtShort(sorted[0])} – ${fmtShort(sorted[sorted.length - 1])}`;
  return `${dates.length} dates`;
};

// ─── Component ────────────────────────────────────────────────────────────────
const HostCalendarScreen = () => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  // ── View state ─────────────────────────────────────────────────────────────
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // ── Data state ─────────────────────────────────────────────────────────────
  const [listings, setListings] = useState<HostListing[]>([]);
  const [selectedListing, setSelectedListing] = useState<HostListing | null>(null);
  const [dayMap, setDayMap] = useState<Record<string, CalendarDay>>({});
  const [loadingListings, setLoadingListings] = useState(true);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [listingsError, setListingsError] = useState<string | null>(null);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [tooltipKey, setTooltipKey] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  // Edit panel state
  const [priceInput, setPriceInput] = useState('25000');
  const [minNights, setMinNights] = useState(1);
  const [actionMode, setActionMode] = useState<ActionMode>('available');
  const [blockReason, setBlockReason] = useState<BlockReason>('personal');

  // ── Panel slide animation ──────────────────────────────────────────────────
  const panelY = useSharedValue(300);
  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: panelY.value }],
  }));

  useEffect(() => {
    panelY.value = withTiming(selectedDates.length > 0 ? 0 : 300, {
      duration: 320,
      easing: Easing.out(Easing.cubic),
    });
  }, [selectedDates.length]);

  // ── Load listings on mount ─────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        setListingsError(null);
        const data = await hostService.getHostListings();
        setListings(Array.isArray(data) ? data : []);
        if (data.length > 0) setSelectedListing(data[0]);
      } catch {
        setListingsError(t('hostCalendar.errorListings'));
      } finally {
        setLoadingListings(false);
      }
    })();
  }, []);

  // ── Load calendar when listing or month changes ────────────────────────────
  useEffect(() => {
    if (!selectedListing) return;
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
    setLoadingCalendar(true);
    setDayMap({});
    setSelectedDates([]);
    setTooltipKey(null);

    hostService.getCalendar(selectedListing.id, monthStr)
      .then(days => {
        const map: Record<string, CalendarDay> = {};
        (Array.isArray(days) ? days : []).forEach(d => { map[d.date] = d; });
        setDayMap(map);
      })
      .catch(() => {/* calendar load error — show empty grid */})
      .finally(() => setLoadingCalendar(false));
  }, [selectedListing, year, month]);

  // ── Month navigation ───────────────────────────────────────────────────────
  const goToPrevMonth = () =>
    setViewDate(new Date(year, month - 1, 1));
  const goToNextMonth = () =>
    setViewDate(new Date(year, month + 1, 1));

  // ── Calendar grid ──────────────────────────────────────────────────────────
  const cells = useMemo(() => getDayCells(year, month), [year, month]);

  const handleDayPress = useCallback(
    (day: number) => {
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
    [year, month, dayMap],
  );

  // ── Apply changes ──────────────────────────────────────────────────────────
  const applyChanges = async () => {
    if (!selectedListing || selectedDates.length === 0) return;
    setSaving(true);
    setApplyError(null);

    const patch = {
      dates: selectedDates,
      status: actionMode === 'blocked' ? 'blocked' as CalendarDayStatus : 'available' as CalendarDayStatus,
      ...(actionMode === 'available' && parseInt(priceInput) >= MIN_PRICE
        ? { priceOverride: parseInt(priceInput) }
        : {}),
      ...(actionMode === 'available' && minNights > 1 ? { minNights } : {}),
      ...(actionMode === 'blocked' ? { blockReason } : {}),
    };

    // Optimistic update
    setDayMap(prev => {
      const next = { ...prev };
      selectedDates.forEach(k => {
        next[k] = { ...(prev[k] ?? { date: k }), ...patch, date: k };
      });
      return next;
    });
    setSelectedDates([]);

    try {
      await hostService.bulkUpdateCalendar(selectedListing.id, patch);
      setApplySuccess(true);
      setTimeout(() => setApplySuccess(false), 2200);
    } catch {
      setApplyError(t('hostCalendar.saveError'));
      // Rollback: refetch
      const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
      hostService.getCalendar(selectedListing.id, monthStr)
        .then(days => {
          const map: Record<string, CalendarDay> = {};
          (Array.isArray(days) ? days : []).forEach(d => { map[d.date] = d; });
          setDayMap(map);
        })
        .catch(() => {});
    } finally {
      setSaving(false);
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
  if (loadingListings) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (listingsError || listings.length === 0) {
    return (
      <View style={s.centered}>
        <MaterialIcons name="home-work" size={40} color={colors.inkDisabled} />
        <Text style={s.emptyText}>
          {listingsError ?? t('hostCalendar.publishFirst')}
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView
          contentContainerStyle={[
            s.scroll,
            { paddingTop: insets.top + 20, paddingBottom: 200 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Header ── */}
          <Animated.View entering={FadeInDown.duration(340)} style={s.header}>
            <Text style={s.headerTitle}>{t('hostCalendar.title')}</Text>
            <TouchableOpacity
              style={s.listingPicker}
              onPress={() => setDropdownOpen(true)}
              activeOpacity={0.8}
            >
              <Text style={s.listingPickerText} numberOfLines={1}>
                {selectedListing?.title ?? '—'}
              </Text>
              <MaterialIcons name="keyboard-arrow-down" size={18} color={colors.primary} />
            </TouchableOpacity>
          </Animated.View>

          {/* ── Stats strip ── */}
          <Animated.View entering={FadeInDown.delay(60).duration(320)} style={s.statsStrip}>
            <View style={s.statItem}>
              <View style={[s.statDot, { backgroundColor: colors.primary }]} />
              <Text style={s.statText}>{monthStats.booked} {t('hostCalendar.booked')}</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <View style={[s.statDot, { backgroundColor: colors.inkDisabled }]} />
              <Text style={s.statText}>{monthStats.blocked} {t('hostCalendar.blocked')}</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <View style={[s.statDot, { backgroundColor: colors.success }]} />
              <Text style={s.statText}>
                {monthStats.total - monthStats.booked - monthStats.blocked} {t('hostCalendar.free')}
              </Text>
            </View>
          </Animated.View>

          {/* ── Month navigator ── */}
          <Animated.View entering={FadeInDown.delay(100).duration(320)} style={s.monthNav}>
            <TouchableOpacity onPress={goToPrevMonth} style={s.monthNavBtn} activeOpacity={0.7}>
              <MaterialIcons name="chevron-left" size={26} color={colors.inkMid} />
            </TouchableOpacity>
            <Text style={s.monthLabel}>{MONTHS_FR[month]} {year}</Text>
            <TouchableOpacity onPress={goToNextMonth} style={s.monthNavBtn} activeOpacity={0.7}>
              <MaterialIcons name="chevron-right" size={26} color={colors.inkMid} />
            </TouchableOpacity>
          </Animated.View>

          {/* ── Day headers ── */}
          <View style={s.dayHeaders}>
            {DAYS_FR.map((d, i) => (
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
            <View style={s.gridLoader}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : (
            <Animated.View entering={FadeInDown.delay(140).duration(320)} style={s.calendarGrid}>
              {cells.map((day, idx) => {
                if (day === null) return <View key={`e-${idx}`} style={s.dayCellEmpty} />;
                const key = toKey(year, month, day);
                const { cell, text } = getCellStyles(day);
                const data = dayMap[key];
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => handleDayPress(day)}
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
            </Animated.View>
          )}

          {/* ── Booking tooltip ── */}
          {tooltipKey && dayMap[tooltipKey] && (
            <Animated.View entering={FadeInDown.duration(240)} style={s.tooltip}>
              <View style={s.tooltipHeader}>
                <MaterialIcons name="event" size={14} color={colors.primary} />
                <Text style={s.tooltipTitle}>{t('hostCalendar.confirmedBooking')}</Text>
              </View>
              <Text style={s.tooltipGuest}>{dayMap[tooltipKey]!.guestName}</Text>
              {dayMap[tooltipKey]!.nights != null && (
                <Text style={s.tooltipMeta}>
                  {dayMap[tooltipKey]!.nights} nuit{dayMap[tooltipKey]!.nights! > 1 ? 's' : ''}
                </Text>
              )}
              {dayMap[tooltipKey]!.amount != null && (
                <Text style={s.tooltipAmount}>{formatFC(dayMap[tooltipKey]!.amount!)}</Text>
              )}
              <TouchableOpacity style={s.tooltipClose} onPress={() => setTooltipKey(null)}>
                <MaterialIcons name="close" size={15} color={colors.inkSubtle} />
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* ── Legend ── */}
          <Animated.View entering={FadeInDown.delay(200).duration(320)} style={s.legend}>
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
          </Animated.View>

          {selectedDates.length === 0 && !tooltipKey && (
            <Text style={s.hint}>{t('hostCalendar.tapHint')}</Text>
          )}

          {applySuccess && (
            <Animated.View entering={FadeIn.duration(200)} style={s.toast}>
              <MaterialIcons name="check-circle" size={15} color={colors.success} />
              <Text style={s.toastText}>{t('hostCalendar.saved')}</Text>
            </Animated.View>
          )}
          {applyError && (
            <Animated.View entering={FadeIn.duration(200)} style={[s.toast, s.toastError]}>
              <MaterialIcons name="error-outline" size={15} color={colors.error} />
              <Text style={[s.toastText, { color: colors.error }]}>{applyError}</Text>
            </Animated.View>
          )}
        </ScrollView>

        {/* ── Action panel ── */}
        <Animated.View style={[s.actionPanel, panelStyle]}>
          <View style={s.actionHandle} />

          <View style={s.actionHeaderRow}>
            <View>
              <Text style={s.actionLabel}>{t('hostCalendar.selection')}</Text>
              <Text style={s.actionSelection}>{formatSelectionLabel(selectedDates)}</Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedDates([])} style={s.clearBtn}>
              <MaterialIcons name="close" size={17} color={colors.inkSubtle} />
            </TouchableOpacity>
          </View>

          {/* Mode toggle */}
          <View style={s.modeToggle}>
            <TouchableOpacity
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
          {actionMode === 'available' && (
            <View style={s.fieldsRow}>
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>{t('hostCalendar.priceNight')}</Text>
                <View style={s.priceInputWrap}>
                  <TextInput
                    style={s.priceInput}
                    value={priceInput}
                    onChangeText={v => setPriceInput(v.replace(/\D/g, ''))}
                    keyboardType="numeric"
                    placeholder={String(MIN_PRICE)}
                    placeholderTextColor={colors.inkDisabled}
                  />
                  <Text style={s.priceSuffix}>FC</Text>
                </View>
                {priceInput !== '' && parseInt(priceInput) < MIN_PRICE && (
                  <Text style={s.priceWarning}>{t('hostCalendar.minPrice')} {formatFC(MIN_PRICE)}</Text>
                )}
              </View>
              <View style={[s.fieldGroup, { marginLeft: 12 }]}>
                <Text style={s.fieldLabel}>{t('hostCalendar.minStay')}</Text>
                <View style={s.stepper}>
                  <TouchableOpacity
                    style={s.stepperBtn}
                    onPress={() => setMinNights(n => Math.max(1, n - 1))}
                  >
                    <MaterialIcons name="remove" size={15} color={colors.inkMid} />
                  </TouchableOpacity>
                  <Text style={s.stepperValue}>{minNights}</Text>
                  <TouchableOpacity
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
            style={[
              s.applyBtn,
              actionMode === 'blocked' && s.applyBtnBlocked,
              (selectedDates.length === 0 || saving) && s.applyBtnDisabled,
            ]}
            onPress={applyChanges}
            disabled={
              selectedDates.length === 0 ||
              saving ||
              (actionMode === 'available' &&
                priceInput !== '' &&
                parseInt(priceInput) < MIN_PRICE)
            }
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={s.applyBtnText}>
                {selectedDates.length > 1
                  ? t('hostCalendar.applyToPlural', { count: selectedDates.length })
                  : t('hostCalendar.applyTo', { count: selectedDates.length })}
              </Text>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* ── Listing picker modal ── */}
        <Modal
          visible={dropdownOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setDropdownOpen(false)}
        >
          <TouchableOpacity
            style={s.overlay}
            activeOpacity={1}
            onPress={() => setDropdownOpen(false)}
          >
            <Animated.View entering={FadeInDown.duration(220)} style={s.dropdownCard}>
              <Text style={s.dropdownTitle}>{t('hostCalendar.chooseListing')}</Text>
              {listings.map(l => (
                <TouchableOpacity
                  key={l.id}
                  style={[
                    s.dropdownItem,
                    selectedListing?.id === l.id && s.dropdownItemActive,
                  ]}
                  onPress={() => {
                    setSelectedListing(l);
                    setDropdownOpen(false);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={s.dropdownItemLeft}>
                    <View style={s.dropdownTypeChip}>
                      <Text style={s.dropdownTypeInitial}>
                        {l.type.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text style={s.dropdownItemTitle}>{l.title}</Text>
                      <Text style={s.dropdownItemSub}>{l.type}</Text>
                    </View>
                  </View>
                  {selectedListing?.id === l.id && (
                    <MaterialIcons name="check" size={17} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </Animated.View>
          </TouchableOpacity>
        </Modal>
      </View>
    </KeyboardAvoidingView>
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
    maxWidth: 180,
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
    width: 36,
    height: 36,
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
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.09,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
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
    width: 28,
    height: 28,
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
    fontSize: 10,
    fontWeight: '700',
    color: colors.inkDisabled,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  legendRow: {
    flexDirection: 'row',
    gap: 16,
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
    fontSize: 11,
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
    color: colors.inkDisabled,
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
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.13,
        shadowRadius: 18,
      },
      android: { elevation: 12 },
    }),
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
    fontSize: 10,
    fontWeight: '700',
    color: colors.inkDisabled,
    letterSpacing: 1,
  },
  actionSelection: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
    marginTop: 2,
  },
  clearBtn: {
    width: 30,
    height: 30,
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
    fontSize: 13,
    fontWeight: '600',
    color: colors.inkDisabled,
  },
  modeBtnTextActive: { color: colors.primary },
  modeBtnTextBlock: { color: colors.white },

  // Fields
  fieldsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  fieldGroup: { flex: 1 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.inkSubtle,
    marginBottom: 6,
    textTransform: 'uppercase',
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
    height: 42,
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
    height: 42,
    overflow: 'hidden',
  },
  stepperBtn: {
    width: 34,
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
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  applyBtnBlocked: { backgroundColor: colors.error },
  applyBtnDisabled: { opacity: 0.4 },
  applyBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },

  // Listing picker modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 31, 31, 0.42)',
    justifyContent: 'flex-end',
    padding: 16,
    paddingBottom: 120,
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
    textTransform: 'uppercase',
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
