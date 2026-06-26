import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from 'react-native-paper';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme';
import {
  resourcesService,
  ArticleListItem,
  Course,
  CourseStep,
  ResourceLevel,
  ResourceLang,
} from '../services/api';

// ─── Static key arrays (labels resolved inside component via t()) ──────────────
const CATEGORY_KEYS = [
  { key: '',                tKey: 'hostResources.catAll' },
  { key: 'getting-started', tKey: 'hostResources.catGettingStarted' },
  { key: 'listing',         tKey: 'hostResources.catListing' },
  { key: 'pricing',         tKey: 'hostResources.catPricing' },
  { key: 'guest-relations', tKey: 'hostResources.catGuests' },
  { key: 'legal',           tKey: 'hostResources.catLegal' },
  { key: 'safety',          tKey: 'hostResources.catSafety' },
  { key: 'partners',        tKey: 'hostResources.catPartners' },
];

const LEVEL_KEYS: { key: ResourceLevel | ''; tKey: string; color: string }[] = [
  { key: '',             tKey: 'hostResources.levelAll',          color: colors.inkSubtle },
  { key: 'beginner',     tKey: 'hostResources.levelBeginner',     color: colors.success },
  { key: 'intermediate', tKey: 'hostResources.levelIntermediate', color: colors.warning },
  { key: 'advanced',     tKey: 'hostResources.levelAdvanced',     color: colors.primary },
];

const LANG_KEYS: { key: ResourceLang | ''; tKey: string }[] = [
  { key: '',   tKey: 'hostResources.langAll' },
  { key: 'fr', tKey: 'hostResources.langFr' },
  { key: 'en', tKey: 'hostResources.langEn' },
  { key: 'rw', tKey: 'hostResources.langRw' },
];

const LEVEL_COLOR: Record<ResourceLevel, string> = {
  beginner:     colors.success,
  intermediate: colors.warning,
  advanced:     colors.primary,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatMinutes = (n: number) =>
  n < 60 ? `${n} min` : `${Math.floor(n / 60)}h${n % 60 > 0 ? ` ${n % 60}` : ''}`;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-RW', { day: 'numeric', month: 'short', year: 'numeric' });

// ─── Level badge ──────────────────────────────────────────────────────────────
const LevelBadge = ({ level }: { level: ResourceLevel }) => {
  const { t } = useTranslation();
  const LEVEL_LABEL: Record<ResourceLevel, string> = {
    beginner:     t('hostResources.levelBeginner'),
    intermediate: t('hostResources.levelIntermediate'),
    advanced:     t('hostResources.levelAdvanced'),
  };
  return (
    <View style={[lb.wrap, { backgroundColor: LEVEL_COLOR[level] + '18' }]}>
      <Text style={[lb.txt, { color: LEVEL_COLOR[level] }]}>{LEVEL_LABEL[level]}</Text>
    </View>
  );
};
const lb = StyleSheet.create({
  wrap: { borderRadius: 4, paddingHorizontal: 7, paddingVertical: 2 },
  txt:  { fontSize: 10, fontWeight: '700' },
});

// ─── Article card ─────────────────────────────────────────────────────────────
const ArticleCard = ({
  item,
  bookmarked,
  onPress,
  onBookmark,
}: {
  item: ArticleListItem;
  bookmarked: boolean;
  onPress: () => void;
  onBookmark: () => void;
}) => {
  const { t } = useTranslation();
  return (
    <TouchableOpacity style={ac.card} onPress={onPress} activeOpacity={0.82}>
      <View style={ac.top}>
        <View style={{ flex: 1 }}>
          <View style={ac.meta}>
            <LevelBadge level={item.level} />
            {item.hasVideo && (
              <View style={ac.videoBadge}>
                <MaterialIcons name="play-circle-outline" size={11} color={colors.primary} />
                <Text style={ac.videoBadgeTxt}>{t('hostResources.videoLabel')}</Text>
              </View>
            )}
          </View>
          <Text style={ac.title} numberOfLines={2}>{item.title}</Text>
          <Text style={ac.summary} numberOfLines={2}>{item.summary}</Text>
        </View>
      </View>
      <View style={ac.bottom}>
        <Text style={ac.readTime}>
          <MaterialIcons name="schedule" size={11} color={colors.inkDisabled} />{' '}
          {formatMinutes(item.readMinutes)}
        </Text>
        <Text style={ac.date}>{formatDate(item.publishedAt)}</Text>
        <TouchableOpacity onPress={onBookmark} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons
            name={bookmarked ? 'bookmark' : 'bookmark-border'}
            size={20}
            color={bookmarked ? colors.primary : colors.inkDisabled}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};
const ac = StyleSheet.create({
  card:       { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 12 },
  top:        { marginBottom: 10 },
  meta:       { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 7 },
  videoBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.primaryLight, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  videoBadgeTxt: { fontSize: 10, fontWeight: '600', color: colors.primary },
  title:      { fontSize: 15, fontWeight: '700', color: colors.ink, lineHeight: 20, marginBottom: 4 },
  summary:    { fontSize: 12, color: colors.inkSubtle, lineHeight: 17 },
  bottom:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  readTime:   { fontSize: 11, color: colors.inkDisabled, flex: 1 },
  date:       { fontSize: 11, color: colors.inkDisabled },
});

// ─── Course progress bar ──────────────────────────────────────────────────────
const CourseProgressBar = ({ completed, total }: { completed: number; total: number }) => {
  const pct = total > 0 ? (completed / total) * 100 : 0;
  return (
    <View style={cpb.track}>
      <View style={[cpb.fill, { width: `${pct}%` as `${number}%` }]} />
    </View>
  );
};
const cpb = StyleSheet.create({
  track: { height: 4, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' },
  fill:  { height: '100%', backgroundColor: colors.primary, borderRadius: 2 },
});

// ─── Course card ──────────────────────────────────────────────────────────────
const CourseCard = ({
  course,
  onPress,
}: {
  course: Course;
  onPress: () => void;
}) => {
  const { t } = useTranslation();
  const pct = course.totalSteps > 0
    ? Math.round((course.completedSteps / course.totalSteps) * 100)
    : 0;
  const done = pct === 100;

  return (
    <TouchableOpacity style={cc.card} onPress={onPress} activeOpacity={0.82}>
      <View style={cc.headerRow}>
        <View style={cc.iconWrap}>
          <MaterialIcons
            name={done ? 'emoji-events' : 'school'}
            size={24}
            color={done ? '#B8860B' : colors.primary}
          />
        </View>
        <View style={{ flex: 1 }}>
          <View style={cc.metaRow}>
            <LevelBadge level={course.level} />
            {done && (
              <View style={cc.certBadge}>
                <MaterialIcons name="verified" size={11} color="#B8860B" />
                <Text style={cc.certTxt}>{t('hostResources.certified')}</Text>
              </View>
            )}
          </View>
          <Text style={cc.title} numberOfLines={2}>{course.title}</Text>
        </View>
      </View>
      <Text style={cc.desc} numberOfLines={2}>{course.description}</Text>
      <View style={cc.progressRow}>
        <CourseProgressBar completed={course.completedSteps} total={course.totalSteps} />
        <Text style={cc.progressTxt}>{pct}%</Text>
      </View>
      <Text style={cc.stepCount}>
        {course.completedSteps}/{course.totalSteps} étapes
      </Text>
    </TouchableOpacity>
  );
};
const cc = StyleSheet.create({
  card:         { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 14, marginRight: 12, width: 260 },
  headerRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  iconWrap:     { width: 44, height: 44, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  metaRow:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
  certBadge:    { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FFF8E1', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  certTxt:      { fontSize: 10, fontWeight: '700', color: '#B8860B' },
  title:        { fontSize: 14, fontWeight: '700', color: colors.ink, lineHeight: 19 },
  desc:         { fontSize: 12, color: colors.inkSubtle, lineHeight: 17, marginBottom: 10 },
  progressRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  progressTxt:  { fontSize: 11, fontWeight: '700', color: colors.primary, minWidth: 28 },
  stepCount:    { fontSize: 11, color: colors.inkDisabled },
});

// ─── Course detail modal ──────────────────────────────────────────────────────
const CourseDetailModal = ({
  course,
  onClose,
  onStepComplete,
}: {
  course: Course;
  onClose: () => void;
  onStepComplete: (stepId: string) => void;
}) => {
  const { t } = useTranslation();

  const STEP_ICON: Record<CourseStep['type'], React.ComponentProps<typeof MaterialIcons>['name']> = {
    article: 'article',
    video:   'play-circle-outline',
    quiz:    'quiz',
  };

  const getStepTypeLabel = (type: CourseStep['type']): string => {
    if (type === 'article') return t('hostResources.typeArticle');
    if (type === 'video') return t('hostResources.typeVideo');
    return t('hostResources.typeQuiz');
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={cdm.root}>
        {/* Close bar */}
        <View style={cdm.bar}>
          <TouchableOpacity style={cdm.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <MaterialIcons name="close" size={22} color={colors.ink} />
          </TouchableOpacity>
          <Text style={cdm.barTitle} numberOfLines={1}>{course.title}</Text>
        </View>

        <ScrollView contentContainerStyle={cdm.scroll} showsVerticalScrollIndicator={false}>
          {/* Course header */}
          <View style={cdm.header}>
            <LevelBadge level={course.level} />
            <Text style={cdm.title}>{course.title}</Text>
            <Text style={cdm.desc}>{course.description}</Text>
            <View style={cdm.progressSection}>
              <View style={cdm.progressRow}>
                <CourseProgressBar
                  completed={course.completedSteps}
                  total={course.totalSteps}
                />
                <Text style={cdm.progressTxt}>
                  {course.completedSteps}/{course.totalSteps} étapes
                </Text>
              </View>
              {course.completedSteps === course.totalSteps && (
                <View style={cdm.certBanner}>
                  <MaterialIcons name="emoji-events" size={18} color="#B8860B" />
                  <Text style={cdm.certTxt}>
                    {t('hostResources.courseComplete')}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Steps */}
          <Text style={cdm.stepsLabel}>{t('hostResources.stepsLabel')}</Text>
          {course.steps.map((step, i) => (
            <TouchableOpacity
              key={step.id}
              style={[cdm.stepRow, step.completed && cdm.stepRowDone]}
              onPress={() => !step.completed && onStepComplete(step.id)}
              activeOpacity={step.completed ? 1 : 0.82}
            >
              <View style={[cdm.stepNum, step.completed && cdm.stepNumDone]}>
                {step.completed
                  ? <MaterialIcons name="check" size={14} color={colors.white} />
                  : <Text style={cdm.stepNumTxt}>{i + 1}</Text>
                }
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[cdm.stepTitle, step.completed && cdm.stepTitleDone]}>
                  {step.title}
                </Text>
                <View style={cdm.stepMeta}>
                  <MaterialIcons name={STEP_ICON[step.type]} size={12} color={colors.inkDisabled} />
                  <Text style={cdm.stepMetaTxt}>
                    {getStepTypeLabel(step.type)}{' '}
                    · {formatMinutes(step.durationMinutes)}
                  </Text>
                </View>
              </View>
              {!step.completed && (
                <MaterialIcons name="chevron-right" size={20} color={colors.inkDisabled} />
              )}
            </TouchableOpacity>
          ))}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
};
const cdm = StyleSheet.create({
  root:         { flex: 1, backgroundColor: colors.background },
  bar:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  closeBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
  barTitle:     { flex: 1, fontSize: 15, fontWeight: '700', color: colors.ink },
  scroll:       { padding: 20 },
  header:       { marginBottom: 24 },
  title:        { fontSize: 20, fontWeight: '700', color: colors.ink, marginTop: 8, marginBottom: 6, letterSpacing: -0.3 },
  desc:         { fontSize: 14, color: colors.inkMid, lineHeight: 20, marginBottom: 14 },
  progressSection: { gap: 10 },
  progressRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressTxt:  { fontSize: 12, fontWeight: '600', color: colors.inkSubtle },
  certBanner:   { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF8E1', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#E8D070' },
  certTxt:      { fontSize: 13, fontWeight: '600', color: '#8B6914', flex: 1 },
  stepsLabel:   { fontSize: 11, fontWeight: '700', color: colors.inkDisabled, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  stepRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  stepRowDone:  { opacity: 0.65 },
  stepNum:      { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  stepNumDone:  { backgroundColor: colors.primary, borderColor: colors.primary },
  stepNumTxt:   { fontSize: 12, fontWeight: '700', color: colors.inkSubtle },
  stepTitle:    { fontSize: 14, fontWeight: '600', color: colors.ink, marginBottom: 3 },
  stepTitleDone:{ textDecorationLine: 'line-through', color: colors.inkSubtle },
  stepMeta:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stepMetaTxt:  { fontSize: 11, color: colors.inkDisabled },
});

// ─── Screen ───────────────────────────────────────────────────────────────────
type MainTab = 'articles' | 'courses' | 'bookmarks';

const HostResourcesScreen = () => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  // Build translated filter arrays inside component
  const CATEGORIES = useMemo(() =>
    CATEGORY_KEYS.map(c => ({ key: c.key, label: t(c.tKey) })),
  [t]);

  const LEVELS = useMemo<{ key: ResourceLevel | ''; label: string; color: string }[]>(() =>
    LEVEL_KEYS.map(l => ({ key: l.key, label: t(l.tKey), color: l.color })),
  [t]);

  const LANGS = useMemo<{ key: ResourceLang | ''; label: string }[]>(() =>
    LANG_KEYS.map(l => ({ key: l.key, label: t(l.tKey) })),
  [t]);

  const [mainTab, setMainTab] = useState<MainTab>('articles');
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedCat, setSelectedCat] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<ResourceLevel | ''>('');
  const [selectedLang, setSelectedLang] = useState<ResourceLang | ''>('fr');

  // Course detail
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);

  // ── Load ───────────────────────────────────────────────────────────────────
  const loadArticles = useCallback(async () => {
    setLoadingArticles(true);
    setError(null);
    try {
      const data = await resourcesService.getArticles({
        category: selectedCat || undefined,
        level: selectedLevel || undefined,
        lang: selectedLang || undefined,
      });
      setArticles(data);
    } catch {
      setError(t('hostResources.errorLoadArticles'));
    } finally {
      setLoadingArticles(false);
    }
  }, [selectedCat, selectedLevel, selectedLang, t]);

  const loadCourses = useCallback(async () => {
    setLoadingCourses(true);
    try {
      const data = await resourcesService.getCourses();
      setCourses(data);
    } catch {/* silent — use cache */} finally {
      setLoadingCourses(false);
    }
  }, []);

  const loadBookmarks = useCallback(async () => {
    const bm = await resourcesService.getBookmarks();
    setBookmarks(bm);
  }, []);

  useEffect(() => { loadArticles(); }, [loadArticles]);
  useEffect(() => { loadCourses(); loadBookmarks(); }, []);

  // ── Bookmark toggle ────────────────────────────────────────────────────────
  const handleBookmark = async (slug: string) => {
    const nowBookmarked = await resourcesService.toggleBookmark(slug);
    setBookmarks(prev =>
      nowBookmarked ? [...prev, slug] : prev.filter(s => s !== slug),
    );
  };

  // ── Step complete ──────────────────────────────────────────────────────────
  const handleStepComplete = async (stepId: string) => {
    if (!activeCourse) return;
    try {
      await resourcesService.markStepComplete(activeCourse.id, stepId);
    } catch {/* optimistic regardless */}
    setActiveCourse(prev => {
      if (!prev) return null;
      const steps = prev.steps.map(s => s.id === stepId ? { ...s, completed: true } : s);
      const completedSteps = steps.filter(s => s.completed).length;
      return { ...prev, steps, completedSteps };
    });
    setCourses(prev =>
      prev.map(c => {
        if (c.id !== activeCourse.id) return c;
        const steps = c.steps.map(s => s.id === stepId ? { ...s, completed: true } : s);
        return { ...c, steps, completedSteps: steps.filter(s => s.completed).length };
      }),
    );
  };

  // ── Filtered articles ──────────────────────────────────────────────────────
  const displayedArticles = useMemo(() => {
    const list = mainTab === 'bookmarks'
      ? articles.filter(a => bookmarks.includes(a.slug))
      : articles;
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      a =>
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q),
    );
  }, [articles, bookmarks, mainTab, search]);

  // ── Main tabs definition ───────────────────────────────────────────────────
  const MAIN_TABS = useMemo<{ key: MainTab; label: string; icon: React.ComponentProps<typeof MaterialIcons>['name'] }[]>(() => [
    { key: 'articles',  label: t('hostResources.tabArticles'),   icon: 'article' },
    { key: 'courses',   label: t('hostResources.tabCourses'),    icon: 'school' },
    { key: 'bookmarks', label: t('hostResources.tabBookmarks'),  icon: 'bookmark' },
  ], [t]);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={[s.root, { paddingTop: insets.top + 16 }]}>
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(300)} style={s.header}>
        <View>
          <Text style={s.title}>{t('hostResources.title')}</Text>
          <Text style={s.subtitle}>{t('hostResources.subtitle')}</Text>
        </View>
      </Animated.View>

      {/* Search */}
      <View style={[s.searchBar, searchFocused && s.searchBarFocused]}>
        <MaterialIcons name="search" size={18} color={colors.inkSubtle} />
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder={t('hostResources.searchPlaceholder')}
          placeholderTextColor={colors.inkDisabled}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <MaterialIcons name="close" size={16} color={colors.inkSubtle} />
          </TouchableOpacity>
        )}
      </View>

      {/* Main tabs */}
      <View style={s.mainTabs}>
        {MAIN_TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[s.mainTab, mainTab === tab.key && s.mainTabActive]}
            onPress={() => setMainTab(tab.key)}
            activeOpacity={0.8}
          >
            <MaterialIcons
              name={tab.icon}
              size={15}
              color={mainTab === tab.key ? colors.primary : colors.inkDisabled}
            />
            <Text style={[s.mainTabTxt, mainTab === tab.key && s.mainTabTxtActive]}>
              {tab.label}
            </Text>
            {tab.key === 'bookmarks' && bookmarks.length > 0 && (
              <View style={s.tabBadge}>
                <Text style={s.tabBadgeTxt}>{bookmarks.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Articles & Bookmarks tab ───────────────────────────────────────── */}
      {(mainTab === 'articles' || mainTab === 'bookmarks') && (
        <>
          {/* Filter chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.filterScroll}
          >
            {/* Category */}
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.key}
                style={[s.filterChip, selectedCat === cat.key && s.filterChipActive]}
                onPress={() => setSelectedCat(cat.key)}
                activeOpacity={0.8}
              >
                <Text style={[s.filterChipTxt, selectedCat === cat.key && s.filterChipTxtActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Level + lang mini filters */}
          <View style={s.miniFilters}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {LEVELS.map(lvl => (
                <TouchableOpacity
                  key={lvl.key}
                  style={[s.miniChip, selectedLevel === lvl.key && { borderColor: lvl.color, backgroundColor: lvl.color + '14' }]}
                  onPress={() => setSelectedLevel(lvl.key)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.miniChipTxt, selectedLevel === lvl.key && { color: lvl.color, fontWeight: '700' }]}>
                    {lvl.label}
                  </Text>
                </TouchableOpacity>
              ))}
              <View style={s.miniDivider} />
              {LANGS.map(lang => (
                <TouchableOpacity
                  key={lang.key}
                  style={[s.miniChip, selectedLang === lang.key && s.miniChipActive]}
                  onPress={() => setSelectedLang(lang.key)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.miniChipTxt, selectedLang === lang.key && s.miniChipTxtActive]}>
                    {lang.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* List */}
          {loadingArticles ? (
            <View style={s.centered}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : error ? (
            <View style={s.centered}>
              <MaterialIcons name="cloud-off" size={36} color={colors.inkDisabled} />
              <Text style={s.errorTxt}>{error}</Text>
              <TouchableOpacity style={s.retryBtn} onPress={loadArticles} activeOpacity={0.8}>
                <Text style={s.retryTxt}>{t('hostResources.retry')}</Text>
              </TouchableOpacity>
            </View>
          ) : displayedArticles.length === 0 ? (
            <View style={s.centered}>
              <MaterialIcons
                name={mainTab === 'bookmarks' ? 'bookmark-border' : 'search-off'}
                size={40}
                color={colors.inkDisabled}
              />
              <Text style={s.emptyTitle}>
                {mainTab === 'bookmarks'
                  ? t('hostResources.emptyBookmarks')
                  : t('hostResources.emptySearch')}
              </Text>
              <Text style={s.emptySubtitle}>
                {mainTab === 'bookmarks'
                  ? t('hostResources.emptyBookmarksSub')
                  : t('hostResources.emptySearchSub')}
              </Text>
            </View>
          ) : (
            <FlatList
              data={displayedArticles}
              keyExtractor={a => a.slug}
              contentContainerStyle={s.listContent}
              showsVerticalScrollIndicator={false}
              renderItem={({ item, index }) => (
                <Animated.View entering={FadeInDown.delay(index * 40).duration(260)}>
                  <ArticleCard
                    item={item}
                    bookmarked={bookmarks.includes(item.slug)}
                    onPress={() => {/* article detail — future screen */}}
                    onBookmark={() => handleBookmark(item.slug)}
                  />
                </Animated.View>
              )}
            />
          )}
        </>
      )}

      {/* ── Courses tab ───────────────────────────────────────────────────── */}
      {mainTab === 'courses' && (
        <ScrollView
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
        >
          {loadingCourses ? (
            <View style={s.centered}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : courses.length === 0 ? (
            <View style={s.centered}>
              <MaterialIcons name="school" size={40} color={colors.inkDisabled} />
              <Text style={s.emptyTitle}>{t('hostResources.emptyCourses')}</Text>
              <Text style={s.emptySubtitle}>{t('hostResources.emptyCoursesSub')}</Text>
            </View>
          ) : (
            <>
              {/* Horizontal featured scroll */}
              <Text style={s.sectionLabel}>{t('hostResources.sectionInProgress')}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.courseScroll}
              >
                {courses
                  .filter(c => c.completedSteps > 0 && c.completedSteps < c.totalSteps)
                  .map(c => (
                    <CourseCard key={c.id} course={c} onPress={() => setActiveCourse(c)} />
                  ))
                }
                {courses.filter(c => c.completedSteps > 0 && c.completedSteps < c.totalSteps).length === 0 && (
                  <View style={s.noInProgressCard}>
                    <Text style={s.noInProgressTxt}>{t('hostResources.noInProgress')}</Text>
                  </View>
                )}
              </ScrollView>

              <Text style={[s.sectionLabel, { marginTop: 20 }]}>{t('hostResources.sectionAllCourses')}</Text>
              {courses.map((c, i) => (
                <Animated.View key={c.id} entering={FadeInDown.delay(i * 50).duration(280)}>
                  <TouchableOpacity
                    style={s.courseRow}
                    onPress={() => setActiveCourse(c)}
                    activeOpacity={0.82}
                  >
                    <View style={[s.courseIconWrap, c.completedSteps === c.totalSteps && s.courseIconWrapDone]}>
                      <MaterialIcons
                        name={c.completedSteps === c.totalSteps ? 'emoji-events' : 'school'}
                        size={20}
                        color={c.completedSteps === c.totalSteps ? '#B8860B' : colors.primary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={s.courseRowTop}>
                        <Text style={s.courseRowTitle} numberOfLines={1}>{c.title}</Text>
                        <LevelBadge level={c.level} />
                      </View>
                      <CourseProgressBar completed={c.completedSteps} total={c.totalSteps} />
                      <Text style={s.courseRowMeta}>
                        {c.completedSteps}/{c.totalSteps} étapes
                      </Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color={colors.inkDisabled} />
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </>
          )}
          <View style={{ height: 110 }} />
        </ScrollView>
      )}

      {/* Course detail modal */}
      {activeCourse && (
        <CourseDetailModal
          course={activeCourse}
          onClose={() => setActiveCourse(null)}
          onStepComplete={handleStepComplete}
        />
      )}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:     { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  errorTxt: { fontSize: 14, color: colors.inkSubtle, textAlign: 'center' },
  retryBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, borderWidth: 1.5, borderColor: colors.primary },
  retryTxt: { fontSize: 14, fontWeight: '600', color: colors.primary },
  header:   { paddingHorizontal: 20, marginBottom: 14 },
  title:    { fontSize: 24, fontWeight: '700', color: colors.ink, letterSpacing: -0.4 },
  subtitle: { fontSize: 13, color: colors.inkSubtle, marginTop: 2 },

  // Search
  searchBar:       { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 12, backgroundColor: colors.surfaceSunken, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  searchBarFocused:{ borderColor: colors.primary },
  searchInput:     { flex: 1, fontSize: 14, color: colors.ink, padding: 0 },

  // Main tabs
  mainTabs:       { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 10, gap: 6 },
  mainTab:        { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  mainTabActive:  { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  mainTabTxt:     { fontSize: 12, fontWeight: '600', color: colors.inkDisabled },
  mainTabTxtActive: { color: colors.primary },
  tabBadge:       { backgroundColor: colors.primary, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  tabBadgeTxt:    { fontSize: 9, fontWeight: '700', color: colors.white },

  // Filter chips
  filterScroll:   { paddingHorizontal: 20, paddingBottom: 6, gap: 6 },
  filterChip:     { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  filterChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  filterChipTxt:  { fontSize: 12, fontWeight: '600', color: colors.inkSubtle },
  filterChipTxtActive: { color: colors.primary },

  // Mini filters
  miniFilters:    { paddingHorizontal: 20, marginBottom: 10 },
  miniChip:       { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  miniChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  miniChipTxt:    { fontSize: 11, fontWeight: '500', color: colors.inkSubtle },
  miniChipTxtActive: { color: colors.primary, fontWeight: '700' },
  miniDivider:    { width: 1, backgroundColor: colors.border, marginHorizontal: 2 },

  // Content
  listContent:    { paddingHorizontal: 20, paddingBottom: 110 },
  sectionLabel:   { fontSize: 11, fontWeight: '700', color: colors.inkDisabled, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },

  // Courses
  courseScroll:   { paddingBottom: 4, gap: 0 },
  noInProgressCard: { width: 220, backgroundColor: colors.surfaceSunken, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', padding: 20 },
  noInProgressTxt:  { fontSize: 13, color: colors.inkDisabled, textAlign: 'center', lineHeight: 18 },
  courseRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border },
  courseIconWrap: { width: 42, height: 42, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  courseIconWrapDone: { backgroundColor: '#FFF8E1' },
  courseRowTop:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  courseRowTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.ink },
  courseRowMeta:  { fontSize: 11, color: colors.inkDisabled, marginTop: 3 },

  // Empty
  emptyTitle:    { fontSize: 16, fontWeight: '700', color: colors.ink },
  emptySubtitle: { fontSize: 13, color: colors.inkSubtle, textAlign: 'center', lineHeight: 19, maxWidth: 260 },
});

export default HostResourcesScreen;
