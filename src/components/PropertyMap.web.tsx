import ContentSkeleton from './ContentSkeleton';
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { Map as WebMap, Marker, setWorkerUrl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { tomtomStyle } from '../lib/tomtomMap';
import { validCoordinate } from '../lib/mapTypes';
import type { Region } from '../lib/mapTypes';
import type { PropertyMapHandle, PropertyMapProps } from './PropertyMap.types';
import { colors } from '../theme';
export type { PropertyMapHandle, Region } from './PropertyMap.types';

function fitRegion(map: WebMap, region: Region, duration = 0) {
  if (!validCoordinate(region)) return;
  map.fitBounds([
    [region.longitude - region.longitudeDelta / 2, Math.max(-85, region.latitude - region.latitudeDelta / 2)],
    [region.longitude + region.longitudeDelta / 2, Math.min(85, region.latitude + region.latitudeDelta / 2)],
  ], { padding: 0, duration });
}

const PropertyMap = forwardRef<PropertyMapHandle, PropertyMapProps>(function PropertyMap(props, ref) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<WebMap | null>(null);
  const latest = useRef(props); latest.current = props;
  const [initial] = useState(props.initialRegion);
  const queued = useRef<Region | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const { t } = useTranslation();

  useImperativeHandle(ref, () => ({ animateToRegion(region, duration) {
    queued.current = region;
    if (map.current) fitRegion(map.current, region, duration);
  } }), []);

  useEffect(() => {
    let instance: WebMap | null = null;
    let observer: ResizeObserver | undefined;
    setReady(false); setError(false);
    try {
      if (!container.current) return;
      // Metro rewrites import.meta.url; serve the matching module worker from
      // Expo's public directory instead of MapLibre's inferred bundle URL.
      setWorkerUrl('/maplibre/maplibre-gl-worker.mjs');
      instance = new WebMap({ container: container.current,
        style: tomtomStyle(process.env.EXPO_PUBLIC_TOMTOM_MAPS_API_KEY ?? ''),
        center: [initial.longitude, initial.latitude], zoom: 14,
        interactive: latest.current.interactive !== false,
        attributionControl: { compact: true },
        maxZoom: 22, pitchWithRotate: false,
      });
      map.current = instance;
      instance.on('load', () => setReady(true));
      instance.on('error', () => setError(true));
      instance.on('click', event => {
        if (latest.current.interactive !== false) {
          const point = event.lngLat.wrap();
          latest.current.onMapPress?.({ latitude: point.lat, longitude: point.lng });
        }
      });
      instance.on('moveend', () => {
        if (!instance) return;
        const center = instance.getCenter().wrap(); const bounds = instance.getBounds();
        latest.current.onRegionChangeComplete?.({ latitude: center.lat, longitude: center.lng,
          latitudeDelta: Math.min(180, bounds.getNorth() - bounds.getSouth()),
          longitudeDelta: Math.min(360, bounds.getEast() - bounds.getWest()) });
      });
      fitRegion(instance, queued.current ?? initial);
      observer = new ResizeObserver(() => instance?.resize());
      observer.observe(container.current);
    } catch { setError(true); }
    return () => { observer?.disconnect(); map.current = null; instance?.remove(); };
  }, [attempt, initial]);

  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance) return;
    const markers = props.markers.filter(validCoordinate).map(point => {
      const element = document.createElement('button');
      element.type = 'button'; element.textContent = point.label || '●';
      element.setAttribute('aria-label', point.title || point.label || t('map.locationMarker'));
      element.title = point.title || '';
      Object.assign(element.style, { border: `1px solid ${colors.primary}`, borderRadius: '18px', padding: '6px 10px',
        minHeight: '36px', font: '600 13px system-ui', cursor: 'pointer', whiteSpace: 'nowrap',
        background: point.selected ? colors.primary : colors.surface, color: point.selected ? colors.onPrimary : colors.primaryDark });
      element.addEventListener('click', event => {
        event.stopPropagation();
        if (latest.current.interactive !== false) latest.current.onMarkerPress?.(point.id);
      });
      const marker = new Marker({ element, draggable: props.interactive !== false && !!point.draggable })
        .setLngLat([point.longitude, point.latitude]).addTo(instance);
      marker.on('dragend', () => {
        const position = marker.getLngLat().wrap();
        latest.current.onMarkerDragEnd?.(point.id, { latitude: position.lat, longitude: position.lng });
      });
      return marker;
    });
    return () => markers.forEach(marker => marker.remove());
  }, [ready, props.markers, props.interactive, t]);

  return <View style={[styles.root, props.style]}>
    <div ref={container} aria-label={t('map.title')} style={{ position: 'absolute', inset: 0 }} />
    {!ready && !error && <ContentSkeleton variant="map" style={styles.loading} />}
    {error && <View style={styles.error}>
      <Text accessibilityRole="alert">{t('map.networkError')}</Text>
      <Button onPress={() => setAttempt(value => value + 1)}>{t('common.retry')}</Button>
    </View>}
  </View>;
});

const styles = StyleSheet.create({
  root: { overflow: 'hidden', backgroundColor: colors.surface },
  loading: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: colors.surface },
  error: { position: 'absolute', top: 8, left: 8, right: 8, padding: 12, borderRadius: 8, backgroundColor: colors.white },
});
export default PropertyMap;
