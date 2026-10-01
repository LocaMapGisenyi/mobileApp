import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo, Animated, AppState, Platform, ScrollView, StyleSheet, View,
  type DimensionValue, type StyleProp, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme';

export type SkeletonVariant = 'list' | 'cards' | 'detail' | 'form' | 'calendar' | 'dashboard' | 'conversation' | 'profile' | 'article' | 'map';
type Props = { variant?: SkeletonVariant; count?: number; columns?: number; style?: StyleProp<ViewStyle> };

function Block({ width = '100%', height = 16, round = 6 }: { width?: DimensionValue; height?: number; round?: number }) {
  return <View style={{ width, height, borderRadius: round, backgroundColor: colors.border }} />;
}
function Lines() {
  return <View style={s.lines}><Block width="76%" /><Block width="52%" height={12} /></View>;
}
function Rows({ count }: { count: number }) {
  return <>{Array.from({ length: count }, (_, index) => <View key={index} style={s.row}>
    <Block width={48} height={48} round={12} /><View style={s.flex}><Lines /><Block width="88%" height={12} /></View>
  </View>)}</>;
}
function Calendar() {
  return <View style={s.calendar}>{Array.from({ length: 35 }, (_, index) =>
    <View key={index} style={s.day}><Block width="72%" height={28} /></View>)}</View>;
}

/** A single animation per loading region; static until reduced-motion is known. */
export default function ContentSkeleton({ variant = 'list', count = 3, columns = 1, style }: Props) {
  const { t } = useTranslation();
  const opacity = useRef(new Animated.Value(1)).current;
  const [reduceMotion, setReduceMotion] = useState(true);
  const [active, setActive] = useState(AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
  useEffect(() => {
    let mounted = true;
    let preferenceChanged = false;
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', value => {
      preferenceChanged = true;
      setReduceMotion(value);
    });
    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (mounted && !preferenceChanged) setReduceMotion(value);
    }).catch(() => {});
    const state = AppState.addEventListener('change', value => setActive(value === 'active'));
    return () => { mounted = false; motion.remove(); state.remove(); };
  }, []);
  useEffect(() => {
    if (reduceMotion || !active) { opacity.setValue(1); return; }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 0.52, duration: 850, useNativeDriver: Platform.OS !== 'web', isInteraction: false }),
      Animated.timing(opacity, { toValue: 1, duration: 850, useNativeDriver: Platform.OS !== 'web', isInteraction: false }),
    ]));
    animation.start();
    return () => { animation.stop(); opacity.setValue(1); };
  }, [active, opacity, reduceMotion]);

  return <View accessible accessibilityRole="progressbar" accessibilityLabel={t('common.loading')}
    accessibilityState={{ busy: true }} style={[s.root, style]} pointerEvents="none">
    <Animated.View style={[s.shapes, { opacity }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {variant === 'list' && <Rows count={count} />}
      {variant === 'cards' && <View style={s.cardGrid}>{Array.from({ length: count }, (_, index) =>
        <View key={index} style={[s.cardColumn, { width: `${100 / Math.max(1, columns)}%` }]}><View style={s.card}>
          <View style={s.cover} /><Lines /><Block width="34%" height={20} />
        </View></View>)}</View>}
      {variant === 'detail' && <><Block height={240} round={12} /><Block width="82%" height={28} /><Lines />
        <View style={s.row}><Block width={48} height={48} round={24} /><View style={s.flex}><Lines /></View></View>
        <Block height={1} /><Rows count={2} /></>}
      {variant === 'form' && <><Block width="64%" height={26} />{Array.from({ length: count }, (_, index) =>
        <View key={index} style={s.field}><Block width="36%" height={14} /><Block height={50} round={10} /></View>)}</>}
      {variant === 'calendar' && <Calendar />}
      {variant === 'dashboard' && <><Block width="66%" height={24} /><Rows count={2} />
        <View style={s.row}><View style={s.flex}><Block height={120} round={12} /></View>
          <View style={s.flex}><Block height={120} round={12} /></View></View><Rows count={2} /></>}
      {variant === 'conversation' && <>{Array.from({ length: 4 }, (_, index) => <View key={index}
        style={[s.bubble, index % 2 === 1 && { alignSelf: 'flex-end', width: '65%' }]}>
        <Block height={64} round={12} /><Block width="28%" height={10} />
      </View>)}</>}
      {variant === 'profile' && <><View style={s.row}><Block width={64} height={64} round={32} /><View style={s.flex}><Lines /></View></View>
        <Rows count={count} /></>}
      {variant === 'article' && <><Block width="84%" height={26} /><Block width="48%" height={14} />
        {Array.from({ length: count }, (_, index) => <View key={index} style={s.lines}>
          <Block /><Block /><Block width="72%" />
        </View>)}</>}
      {variant === 'map' && <View style={s.map}><Block width="34%" height={34} round={17} />
        <View style={{ alignItems: 'flex-end' }}><Block width="26%" height={34} round={17} /></View>
        <Block width="42%" height={34} round={17} /></View>}
    </Animated.View>
  </View>;
}

export function SkeletonScreen(props: Props) {
  return <SafeAreaView style={s.screen}><ScrollView contentContainerStyle={s.screenContent}>
    <ContentSkeleton {...props} />
  </ScrollView></SafeAreaView>;
}

const s = StyleSheet.create({
  root: { width: '100%', minWidth: 0, paddingVertical: 16 },
  shapes: { gap: 22 }, lines: { gap: 12 }, flex: { flex: 1, minWidth: 0, gap: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 8 },
  card: { gap: 16 }, cardGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -8 },
  cardColumn: { paddingHorizontal: 8, paddingBottom: 28 },
  cover: { width: '100%', aspectRatio: 1.55, maxHeight: 280, borderRadius: 12, backgroundColor: colors.border },
  field: { gap: 12, paddingVertical: 4 }, map: { gap: 48, padding: 24 },
  calendar: { flexDirection: 'row', flexWrap: 'wrap' },
  day: { width: '14.2857%', height: 48, alignItems: 'center', justifyContent: 'center' },
  bubble: { width: '78%', gap: 10 }, screen: { flex: 1, backgroundColor: colors.surface },
  screenContent: { flexGrow: 1, width: '100%', maxWidth: 1000, alignSelf: 'center', padding: 20 },
});
