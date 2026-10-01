import ContentSkeleton from '../components/ContentSkeleton';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
  HostButton,
  HostEmpty,
  HostHeader,
  HostNotice,
  HostPage,
  HostStatus,
  hostStyles,
} from '../components/host/HostUI';
import { hostService, type ListingCard, type ListingStatus } from '../services/api/host.service';
import { colors } from '../theme';
import type { RootStackParamList } from '../types';
import { onAccountChange } from '../lib/accountScope';

const FILTERS = ['ALL', 'ACTIVE', 'DRAFT', 'PENDING_REVIEW', 'PAUSED', 'SUSPENDED'] as const;
type Filter = (typeof FILTERS)[number];
function statusTone(status: ListingStatus) {
  return status === 'ACTIVE'
    ? 'success'
    : status === 'SUSPENDED'
      ? 'error'
      : status === 'PENDING_REVIEW'
        ? 'warning'
        : 'neutral';
}

export default function HostListingsScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [listings, setListings] = useState<ListingCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');
  const generation = useRef(0);
  useEffect(
    () =>
      onAccountChange(() => {
        generation.current++;
        setListings([]);
        setQuery('');
        setFilter('ALL');
      }),
    [],
  );

  const load = useCallback(async () => {
    const request = ++generation.current;
    setError(false);
    try {
      const data = await hostService.getListings();
      if (generation.current === request)
        setListings(data.filter(item => item.status !== 'ARCHIVED'));
    } catch {
      if (generation.current === request) setError(true);
    } finally {
      if (generation.current === request) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        generation.current++;
      };
    }, [load]),
  );
  const filtered = useMemo(
    () =>
      listings.filter(
        item =>
          (filter === 'ALL' || item.status === filter) &&
          `${item.title} ${item.city}`
            .toLocaleLowerCase()
            .includes(query.trim().toLocaleLowerCase()),
      ),
    [listings, filter, query],
  );

  const header = (
    <View style={s.header}>
      <HostHeader title={t('hostFlow.listings.title')} subtitle={t('hostFlow.listings.subtitle')} />
      <HostButton
        label={t('hostFlow.listings.new')}
        icon="add"
        onPress={() => navigation.navigate('CreateListing')}
      />
      <View style={s.search}>
        <MaterialIcons name="search" size={22} color={colors.inkSubtle} />
        <TextInput
          accessibilityLabel={t('hostFlow.listings.search')}
          placeholder={t('hostFlow.listings.search')}
          placeholderTextColor={colors.inkSubtle}
          value={query}
          onChangeText={setQuery}
          style={s.input}
          returnKeyType="search"
        />
      </View>
      <View style={s.filters}>
        {FILTERS.map(value => (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === value }}
            onPress={() => setFilter(value)}
            style={[s.filter, filter === value && s.selected]}
          >
            <Text style={[s.filterText, filter === value && s.selectedText]}>
              {t(value === 'ALL' ? 'hostFlow.listings.all' : `hostFlow.listings.statuses.${value}`)}
            </Text>
          </Pressable>
        ))}
      </View>
      {error && (
        <HostNotice
          message={t('hostFlow.listings.loadError')}
          tone="error"
          onRetry={() => void load()}
        />
      )}
      {!loading && (
        <Text style={hostStyles.muted}>
          {t('hostFlow.listings.count', { count: filtered.length })}
        </Text>
      )}
    </View>
  );

  return (
    <HostPage scroll={false} bottomSafe={false}>
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={s.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={header}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          loading ? (
            <ContentSkeleton />
          ) : !error ? (
            <HostEmpty
              icon="home-work"
              title={t(listings.length ? 'hostFlow.listings.noResults' : 'hostFlow.listings.empty')}
              description={!listings.length ? t('hostFlow.listings.emptyDescription') : undefined}
              action={
                listings.length ? (
                  <HostButton
                    variant="secondary"
                    label={t('hostFlow.listings.clear')}
                    onPress={() => {
                      setQuery('');
                      setFilter('ALL');
                    }}
                  />
                ) : undefined
              }
            />
          ) : null
        }
        renderItem={({ item }) => (
          <View style={s.property}>
            <View style={s.propertyTop}>
              {item.coverPhotoUrl ? (
                <Image
                  source={{ uri: item.coverPhotoUrl }}
                  accessibilityLabel={item.title}
                  style={s.photo}
                />
              ) : (
                <View style={[s.photo, s.noPhoto]}>
                  <MaterialIcons name="photo-camera" size={28} color={colors.inkSubtle} />
                  <Text style={s.photoLabel}>{t('hostFlow.listings.noPhoto')}</Text>
                </View>
              )}
              <View style={s.propertyBody}>
                <HostStatus
                  label={t(`hostFlow.listings.statuses.${item.status}`)}
                  tone={statusTone(item.status)}
                />
                <Text style={s.title}>{item.title || t('hostFlow.listings.noTitle')}</Text>
                <Text style={hostStyles.muted}>{item.city || t('hostFlow.listings.noPlace')}</Text>
                <Text style={s.price}>
                  {item.pricePerMonth
                    ? `${new Intl.NumberFormat(i18n.language).format(item.pricePerMonth)} ${item.currency} ${t('hostFlow.listings.monthly')}`
                    : t('hostFlow.listings.noPrice')}
                </Text>
              </View>
            </View>
            <View style={s.actions}>
              <HostButton
                label={t(
                  item.status === 'DRAFT'
                    ? 'hostFlow.listings.continue'
                    : 'hostFlow.listings.manage',
                )}
                variant="secondary"
                onPress={() =>
                  item.status === 'DRAFT'
                    ? navigation.navigate('CreateListing', { propertyId: item.id })
                    : navigation.navigate('HostListing', { propertyId: item.id })
                }
              />
              <HostButton
                label={t('hostFlow.listings.calendar')}
                icon="calendar-today"
                variant="quiet"
                onPress={() => navigation.navigate('HostCalendar', { propertyId: item.id })}
              />
            </View>
          </View>
        )}
      />
    </HostPage>
  );
}

const s = StyleSheet.create({
  list: {
    width: '100%',
    maxWidth: 860,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  header: { gap: 16, paddingBottom: 24 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderMid,
    borderRadius: 10,
    paddingHorizontal: 14,
  },
  input: { flex: 1, minHeight: 52, fontSize: 16, color: colors.ink },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filter: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 11,
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  filterText: { fontSize: 14, color: colors.ink },
  selectedText: { color: colors.primaryDark, fontWeight: '700' },
  property: { paddingVertical: 24, borderTopWidth: 1, borderColor: colors.border, gap: 16 },
  propertyTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  photo: { width: 94, height: 112, borderRadius: 10, backgroundColor: colors.surfaceSunken },
  noPhoto: { justifyContent: 'center', alignItems: 'center', gap: 8, padding: 6 },
  photoLabel: { fontSize: 12, textAlign: 'center', color: colors.inkSubtle },
  propertyBody: { flex: 1, gap: 8 },
  title: { fontSize: 18, fontWeight: '700', color: colors.ink, lineHeight: 24 },
  price: { fontSize: 16, fontWeight: '600', color: colors.ink, lineHeight: 23 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  skeleton: { gap: 16, paddingVertical: 16 },
  skeletonPhoto: { height: 120, borderRadius: 10, backgroundColor: colors.border },
  skeletonLine: { height: 18, width: '70%', borderRadius: 4, backgroundColor: colors.border },
});
