import ContentSkeleton from '../components/ContentSkeleton';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import {
  HostButton,
  HostHeader,
  HostNotice,
  HostPage,
  HostRow,
  HostStatus,
  hostStyles,
} from '../components/host/HostUI';
import { propertyService } from '../services/api/property.service';
import { hostService } from '../services/api/host.service';
import { createListingAction, nextListingStatus } from '../utils/hostListingForm';
import { onAccountChange } from '../lib/accountScope';
import type { HostListingSection, Property, RootStackParamList } from '../types';
import { colors } from '../theme';

export default function HostListingScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'HostListing'>>();
  const {
    params: { propertyId, saveResult },
  } = useRoute<RouteProp<RootStackParamList, 'HostListing'>>();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<'detailError' | 'statusError' | 'archiveError' | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [success, setSuccess] = useState(false);
  const [saveNotice, setSaveNotice] = useState<'draft' | 'publish' | null>(null);
  const generation = useRef(0);
  const run = useRef(createListingAction()).current;
  useEffect(
    () =>
      onAccountChange(() => {
        generation.current++;
        setProperty(null);
        setSuccess(false);
        setSaveNotice(null);
        setConfirmArchive(false);
      }),
    [],
  );

  const load = useCallback(async () => {
    const request = ++generation.current;
    setError(null);
    setProperty(current => (current?.id === propertyId ? current : null));
    setLoading(true);
    try {
      const data = await propertyService.getById(propertyId);
      if (generation.current === request) setProperty(data);
    } catch {
      if (generation.current === request) setError('detailError');
    } finally {
      if (generation.current === request) setLoading(false);
    }
  }, [propertyId]);
  useFocusEffect(
    useCallback(() => {
      setSuccess(false);
      void load();
      return () => {
        generation.current++;
        setSaveNotice(null);
      };
    }, [load]),
  );
  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(false), 5000);
    return () => clearTimeout(timer);
  }, [success]);
  useEffect(() => {
    if (!saveResult) return;
    setSaveNotice(saveResult);
    navigation.setParams({ saveResult: undefined });
  }, [navigation, saveResult]);
  useEffect(() => {
    if (!saveNotice) return;
    const timer = setTimeout(() => setSaveNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [saveNotice]);

  const mutate = async (action: 'status' | 'archive') => {
    if (!property || !property.status) return;
    const next = nextListingStatus(property.status);
    if (action === 'status' && !next) return;
    const request = generation.current;
    try {
      await run(
        async () => {
          setBusy(true);
          setError(null);
          setSuccess(false);
          try {
            if (action === 'archive') await hostService.archiveListing(propertyId);
            else if (next) await hostService.updateListingStatus(propertyId, next);
            const updated = await propertyService.getById(propertyId);
            if (updated.status !== (action === 'archive' ? 'ARCHIVED' : next))
              throw new Error('Status not confirmed');
            return updated;
          } finally {
            setBusy(false);
          }
        },
        updated => {
          if (generation.current === request) {
            setProperty(updated);
            setConfirmArchive(false);
            setSuccess(true);
          }
        },
      );
    } catch {
      if (generation.current === request)
        setError(action === 'archive' ? 'archiveError' : 'statusError');
    }
  };
  const back = () =>
    navigation.canGoBack()
      ? navigation.goBack()
      : navigation.navigate('HostDashboard', { screen: 'HostProperties' });
  const status = property?.status;
  const canEdit = !busy && !!status && status !== 'SUSPENDED' && status !== 'ARCHIVED';
  const edit = (section: HostListingSection) =>
    canEdit ? () => navigation.navigate('CreateListing', { propertyId, section }) : undefined;
  const price = property?.price
    ? `${new Intl.NumberFormat(i18n.language).format(property.price)} ${property.currency} ${t('hostFlow.listings.monthly')}`
    : t('hostFlow.listings.noPrice');

  return (
    <HostPage>
      <HostHeader title={property?.title || t('hostFlow.listings.manage')} onBack={back} />
      {saveNotice && (
        <HostNotice
          tone="success"
          message={`${t(saveNotice === 'draft' ? 'hostFlow.editor.saved' : 'hostFlow.editor.submitted')}. ${t(saveNotice === 'draft' ? 'hostFlow.editor.savedHint' : 'hostFlow.editor.submittedHint')}`}
        />
      )}
      {error && !confirmArchive && (
        <HostNotice
          tone="error"
          message={t(`hostFlow.listings.${error}`)}
          onRetry={() =>
            error === 'detailError'
              ? void load()
              : void mutate(error === 'archiveError' ? 'archive' : 'status')
          }
        />
      )}
      {loading && !property && <ContentSkeleton variant="detail" />}
      {property && (
        <>
          {property.images[0] ? (
            <Image
              source={{ uri: property.images[0] }}
              style={s.cover}
              accessibilityLabel={property.title}
            />
          ) : (
            <View style={[s.cover, s.placeholder]}>
              <MaterialIcons name="photo-camera" size={36} color={colors.inkSubtle} />
              <Text style={hostStyles.muted}>{t('hostFlow.listings.noPhoto')}</Text>
            </View>
          )}
          <View style={s.overview}>
            <Text style={hostStyles.body}>
              {[property.location.district, property.location.city].filter(Boolean).join(', ') ||
                t('hostFlow.listings.noPlace')}
            </Text>
            <Text style={s.price}>{price}</Text>
            <HostStatus
              label={
                status
                  ? t(`hostFlow.listings.statuses.${status}`)
                  : t('hostFlow.listings.unknownStatus')
              }
              tone={
                status === 'ACTIVE'
                  ? 'success'
                  : status === 'SUSPENDED'
                    ? 'error'
                    : status === 'PENDING_REVIEW'
                      ? 'warning'
                      : 'neutral'
              }
            />
          </View>
          {success && (
            <HostNotice
              tone="success"
              message={t(
                status === 'ARCHIVED' ? 'hostFlow.listings.archived' : 'hostFlow.listings.updated',
              )}
            />
          )}
          <View style={s.sections}>
            <HostRow
              icon="photo-library"
              title={t('hostFlow.listings.photos')}
              description={t('hostFlow.listings.photosCount', { count: property.images.length })}
              onPress={edit('photos')}
            />
            <HostRow
              icon="home-work"
              title={t('hostFlow.listings.information')}
              description={t('hostFlow.listings.informationSummary', {
                bedrooms: property.bedrooms ?? 0,
                bathrooms: property.bathrooms ?? 0,
              })}
              onPress={edit('information')}
            />
            <HostRow
              icon="location-on"
              title={t('hostFlow.listings.location')}
              description={[
                property.location.address,
                property.location.district,
                property.location.city,
              ]
                .filter(Boolean)
                .join(', ')}
              onPress={edit('location')}
            />
            <HostRow
              icon="payments"
              title={t('hostFlow.listings.pricing')}
              description={price}
              onPress={edit('pricing')}
            />
            <HostRow
              icon="rule"
              title={t('hostFlow.listings.rules')}
              description={t('hostFlow.listings.rulesSummary', {
                duration: property.minDurationMonths ?? 1,
                notice: property.noticePeriodDays ?? 30,
              })}
              onPress={edit('rules')}
            />
            <HostRow
              icon="visibility"
              title={t('hostFlow.listings.status')}
              description={
                status
                  ? t(`hostFlow.listings.statusDescriptions.${status}`)
                  : t('hostFlow.listings.unknownStatus')
              }
            />
          </View>
          <View style={s.actions}>
            {status === 'DRAFT' && (
              <HostButton
                label={t('hostFlow.listings.continue')}
                onPress={() => navigation.navigate('CreateListing', { propertyId })}
                disabled={busy}
              />
            )}
            {status !== 'ARCHIVED' && (
              <HostButton
                variant="secondary"
                icon="calendar-today"
                label={t('hostFlow.listings.calendar')}
                onPress={() => navigation.navigate('HostCalendar', { propertyId })}
                disabled={busy}
              />
            )}
            {status && nextListingStatus(status) && (
              <HostButton
                variant="secondary"
                icon="pause"
                label={t('hostFlow.listings.pause')}
                onPress={() => void mutate('status')}
                busy={busy && !confirmArchive}
                disabled={busy}
              />
            )}
            {status === 'PAUSED' && (
              <HostButton
                variant="secondary"
                label={t('hostFlow.listings.resume')}
                onPress={() => navigation.navigate('CreateListing', { propertyId })}
                disabled={busy}
              />
            )}
            {status === 'SUSPENDED' && (
              <HostButton
                variant="secondary"
                label={t('hostFlow.listings.support')}
                onPress={() => navigation.navigate('Support')}
              />
            )}
            {status && !['ARCHIVED', 'SUSPENDED'].includes(status) && (
              <HostButton
                variant="quiet"
                label={t('hostFlow.listings.archive')}
                onPress={() => setConfirmArchive(true)}
                disabled={busy}
              />
            )}
            {status === 'ARCHIVED' && (
              <HostButton
                label={t('hostFlow.listings.backToListings')}
                onPress={() => navigation.navigate('HostDashboard', { screen: 'HostProperties' })}
              />
            )}
          </View>
        </>
      )}
      <Modal
        transparent
        visible={confirmArchive}
        animationType="fade"
        onRequestClose={() => {
          if (!busy) setConfirmArchive(false);
        }}
      >
        <View style={s.backdrop}>
          <View style={s.dialog} accessibilityViewIsModal>
            <ScrollView contentContainerStyle={s.dialogContent}>
              <Text style={hostStyles.title}>{t('hostFlow.listings.archiveTitle')}</Text>
              <Text style={hostStyles.body}>
                {t('hostFlow.listings.archiveDescription', { title: property?.title })}
              </Text>
              {error === 'archiveError' && (
                <HostNotice tone="error" message={t('hostFlow.listings.archiveError')} />
              )}
              <HostButton
                variant="danger"
                label={t('hostFlow.listings.archive')}
                busy={busy}
                onPress={() => void mutate('archive')}
              />
              <HostButton
                variant="secondary"
                label={t('hostFlow.listings.cancel')}
                disabled={busy}
                onPress={() => setConfirmArchive(false)}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </HostPage>
  );
}
const s = StyleSheet.create({
  cover: {
    width: '100%',
    aspectRatio: 1.7,
    borderRadius: 14,
    backgroundColor: colors.surfaceSunken,
  },
  placeholder: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  overview: { gap: 10, marginVertical: 24 },
  price: { fontSize: 20, color: colors.ink, fontWeight: '700' },
  sections: { marginBottom: 24 },
  actions: { gap: 12, marginBottom: 16 },
  skeleton: { height: 240, borderRadius: 14, backgroundColor: colors.border },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  dialog: {
    maxWidth: 440,
    maxHeight: '90%',
    width: '100%',
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  dialogContent: { padding: 24, gap: 20 },
});
