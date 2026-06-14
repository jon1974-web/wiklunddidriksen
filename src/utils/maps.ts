import { GOOGLE_MAPS_API_KEY } from '../constants/api';
import { MAP_ZOOM, MAP_SIZE } from '../constants/limits';

export function getStaticMapUrl(address: string, zoom?: number, size?: string): string {
  return `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(address)}&zoom=${zoom ?? MAP_ZOOM}&size=${size ?? MAP_SIZE}&markers=color:red%7C${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`;
}

export function getGoogleMapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
