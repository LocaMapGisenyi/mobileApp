import type { StyleProp, ViewStyle } from 'react-native';
import type { Coordinate, MapMarker, Region } from '../lib/mapTypes';
export type { Region } from '../lib/mapTypes';

export interface PropertyMapHandle { animateToRegion(region: Region, duration?: number): void }
export interface PropertyMapProps {
  style?: StyleProp<ViewStyle>;
  initialRegion: Region;
  markers: MapMarker[];
  interactive?: boolean;
  onMarkerPress?: (id: string) => void;
  onMapPress?: (point: Coordinate) => void;
  onMarkerDragEnd?: (id: string, point: Coordinate) => void;
  onRegionChangeComplete?: (region: Region) => void;
}
