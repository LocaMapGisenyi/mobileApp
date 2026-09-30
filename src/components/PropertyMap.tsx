import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';
import { nativeMapProvider } from '../lib/nativeMapProvider';
import { validCoordinate } from '../lib/mapTypes';
import { colors } from '../theme';
import type { PropertyMapHandle, PropertyMapProps, Region } from './PropertyMap.types';
export type { PropertyMapHandle, Region } from './PropertyMap.types';

const PropertyMap = forwardRef<PropertyMapHandle, PropertyMapProps>(function PropertyMap(props, ref) {
  const map = useRef<MapView>(null);
  const ready = useRef(false);
  const queuedRegion = useRef<{ region: Region; duration?: number } | null>(null);
  const interactive = props.interactive !== false;

  useImperativeHandle(ref, () => ({
    animateToRegion(region, duration) {
      queuedRegion.current = { region, duration };
      if (ready.current) map.current?.animateToRegion(region, duration);
    },
  }), []);

  return <MapView
    ref={map}
    style={props.style}
    provider={nativeMapProvider(Platform.OS) === 'apple' ? PROVIDER_DEFAULT : PROVIDER_GOOGLE}
    initialRegion={props.initialRegion}
    scrollEnabled={interactive}
    zoomEnabled={interactive}
    rotateEnabled={interactive}
    pitchEnabled={false}
    zoomControlEnabled={interactive}
    toolbarEnabled={false}
    moveOnMarkerPress={false}
    showsMyLocationButton={false}
    showsCompass={false}
    onMapReady={() => {
      ready.current = true;
      const queued = queuedRegion.current;
      if (queued) map.current?.animateToRegion(queued.region, queued.duration);
    }}
    onRegionChangeComplete={props.onRegionChangeComplete}
    onPress={event => {
      if (interactive && event.nativeEvent.action !== 'marker-press') props.onMapPress?.(event.nativeEvent.coordinate);
    }}
  >
    {props.markers.filter(validCoordinate).map(point => (
      <Marker
        key={point.id}
        identifier={point.id}
        coordinate={{ latitude: point.latitude, longitude: point.longitude }}
        title={point.title}
        draggable={interactive && point.draggable}
        pinColor={colors.primary}
        stopPropagation
        onPress={() => { if (interactive) props.onMarkerPress?.(point.id); }}
        onDragEnd={event => props.onMarkerDragEnd?.(point.id, event.nativeEvent.coordinate)}
      >
        {point.label ? <View style={[styles.price, point.selected && styles.selected]}>
          <Text style={[styles.label, point.selected && styles.selectedLabel]}>{point.label}</Text>
        </View> : undefined}
      </Marker>
    ))}
  </MapView>;
});

const styles = StyleSheet.create({
  price: { backgroundColor: colors.white, borderColor: colors.primary, borderWidth: 1, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6 },
  selected: { backgroundColor: colors.primary },
  label: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  selectedLabel: { color: colors.white },
});

export default PropertyMap;
