import { describe, it, expect, vi } from 'vitest';
import { findMatchingFolder } from '../clustering';
import * as utils from '../utils';

// Mock getDistanceMeters
vi.mock('../utils', () => ({
  getDistanceMeters: vi.fn((lat1, lng1, lat2, lng2) => {
    // Simple mock distance
    if (lat1 === lat2 && lng1 === lng2) return 0;
    if (lat1 === 10 && lat2 === 20) return 1000;
    return 100; // default close distance
  })
}));

describe('Clustering', () => {
  it('should return null for empty folders', () => {
    expect(findMatchingFolder(10, 10, [])).toBeNull();
  });

  it('should find matching folder when within radius', () => {
    const folders = [{ id: '1', centerLat: 10, centerLng: 10 }];
    const match = findMatchingFolder(10, 10, folders);
    expect(match).toEqual(folders[0]);
  });

  it('should return null when no folder within radius', () => {
    const folders = [{ id: '1', centerLat: 20, centerLng: 20 }];
    const match = findMatchingFolder(10, 10, folders);
    expect(match).toBeNull();
  });
});
