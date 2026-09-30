export interface Coordinate { latitude: number; longitude: number }
export interface Region extends Coordinate { latitudeDelta: number; longitudeDelta: number }
export interface MapMarker extends Coordinate { id: string; title?: string; label?: string; draggable?: boolean; selected?: boolean }

export function validCoordinate(point: Coordinate): boolean {
  return Number.isFinite(point.latitude) && Math.abs(point.latitude) <= 90
    && Number.isFinite(point.longitude) && Math.abs(point.longitude) <= 180;
}
