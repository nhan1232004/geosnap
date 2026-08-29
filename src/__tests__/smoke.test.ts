import { describe, it, expect } from 'vitest';

describe('GeoSnap Smoke Tests', () => {
  it('should have correct environment', () => {
    expect(typeof window).toBe('object');
    expect(typeof document).toBe('object');
  });

  it('should have localStorage available', () => {
    localStorage.setItem('test', 'value');
    expect(localStorage.getItem('test')).toBe('value');
    localStorage.removeItem('test');
  });
});
