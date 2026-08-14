import { describe, expect, it } from 'vitest';
import { getDateLocale } from './locale';

describe('getDateLocale', () => {
  it('returns the locale for a bare name', () => {
    expect(getDateLocale('sv')?.code).toBe('sv');
  });

  it('strips the region suffix', () => {
    expect(getDateLocale('sv-se')?.code).toBe('sv');
  });

  it('is case insensitive', () => {
    expect(getDateLocale('SV-SE')?.code).toBe('sv');
  });

  it('returns undefined for an unknown or missing locale', () => {
    expect(getDateLocale('xx')).toBeUndefined();
    expect(getDateLocale(undefined)).toBeUndefined();
  });
});
