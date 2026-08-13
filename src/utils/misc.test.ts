import { describe, expect, it, vi } from 'vitest';
import { debounce, escapeClass, leadZero, timeAgo, toAbsoluteServerURL } from './misc';

describe('leadZero', () => {
  it('pads single digits', () => {
    expect(leadZero(5)).toBe('05');
  });

  it('leaves double digits', () => {
    expect(leadZero(15)).toBe(15);
  });
});

describe('toAbsoluteServerURL', () => {
  it('prepends serverUrl', () => {
    expect(toAbsoluteServerURL('/api/x', 'http://h:8123')).toBe('http://h:8123/api/x');
  });

  it('passes absolute urls through', () => {
    expect(toAbsoluteServerURL('http://other/api/x', 'http://h:8123')).toBe(
      'http://other/api/x',
    );
  });

  it('collapses double slashes', () => {
    expect(toAbsoluteServerURL('http://h:8123/api//x', 'x')).toBe('http://h:8123/api/x');
  });
});

describe('escapeClass', () => {
  it('keeps simple values', () => {
    expect(escapeClass('on')).toBe('on');
    expect(escapeClass('not_home')).toBe('not_home');
  });

  it('sanitizes and lowercases', () => {
    expect(escapeClass('A B')).toBe('a_b');
  });

  it('returns non for non-strings', () => {
    expect(escapeClass(undefined)).toBe('non');
    expect(escapeClass(42)).toBe('non');
  });
});

describe('timeAgo', () => {
  it('says just now for recent times', () => {
    expect(timeAgo(Date.now() - 3000)).toBe('just now');
  });

  it('formats minutes', () => {
    expect(timeAgo(Date.now() - 5 * 60 * 1000)).toBe('5 minutes ago');
  });

  it('formats hours', () => {
    expect(timeAgo(Date.now() - 90 * 60 * 1000)).toBe('1 hour ago');
  });
});

describe('debounce', () => {
  it('only runs the last call within the window', () => {
    vi.useFakeTimers();
    try {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);
      debounced('a');
      debounced('b');
      debounced('c');
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('c');
    } finally {
      vi.useRealTimers();
    }
  });
});