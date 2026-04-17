import { getDistanceMeters } from './utils';

// DBSCAN-like parameters: epsilon 200m
const CLUSTER_RADIUS_METERS = 200;

export function findMatchingFolder(lat: number, lng: number, folders: any[]): any | null {
  for (const folder of folders) {
    const dist = getDistanceMeters(lat, lng, folder.centerLat, folder.centerLng);
    if (dist <= CLUSTER_RADIUS_METERS) {
      return folder;
    }
  }
  return null;
}
