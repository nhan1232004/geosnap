import { describe, it, expect } from 'vitest';
import { Validators } from '../validators';

describe('Validators', () => {
  it('should validate email correctly', () => {
    expect(Validators.email('test@example.com')).toBe(true);
    expect(Validators.email('invalid-email')).toBe(false);
    expect(Validators.email('')).toBe(false);
  });

  it('should validate password correctly', () => {
    expect(Validators.password('123456')).toBe(true);
    expect(Validators.password('12345')).toBe(false);
    expect(Validators.password('')).toBe(false);
  });

  it('should validate userProfile correctly', () => {
    const validProfile = { uid: '123', email: 'test@example.com', displayName: 'Test User' };
    const result = Validators.userProfile(validProfile);
    expect(result.valid).toBe(true);
    expect(result.data?.uid).toBe('123');

    const invalidProfile = { email: 'test@example.com' };
    const invalidResult = Validators.userProfile(invalidProfile);
    expect(invalidResult.valid).toBe(false);
  });

  it('should validate locationFolder correctly', () => {
    const validFolder = { name: 'My Folder', uid: '123', centerLat: 10, centerLng: 20 };
    const result = Validators.locationFolder(validFolder);
    expect(result.valid).toBe(true);
    expect(result.data?.name).toBe('My Folder');

    const invalidFolder = { uid: '123' };
    const invalidResult = Validators.locationFolder(invalidFolder);
    expect(invalidResult.valid).toBe(false);
  });

  it('should validate post correctly', () => {
    const validPost = { uid: '123', content: 'Hello' };
    const result = Validators.post(validPost);
    expect(result.valid).toBe(true);

    const invalidPost = { content: 'Hello' };
    const invalidResult = Validators.post(invalidPost);
    expect(invalidResult.valid).toBe(false);
  });

  it('should validate loginData correctly', () => {
    const result = Validators.loginData('test@example.com', '123456');
    expect(result.valid).toBe(true);

    const invalidResult = Validators.loginData('test', '123');
    expect(invalidResult.valid).toBe(false);
  });

  it('should validate registerData correctly', () => {
    const result = Validators.registerData('test@example.com', '123456', 'Test');
    expect(result.valid).toBe(true);

    const invalidResult = Validators.registerData('test', '123', '');
    expect(invalidResult.valid).toBe(false);
  });
});
