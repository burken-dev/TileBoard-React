import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { memo } from './memo';

describe('memo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1000000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the cached value within the ttl', () => {
    const fn = vi.fn(() => 42);
    expect(memo('a', 60, fn)).toBe(42);
    expect(memo('a', 60, fn)).toBe(42);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('recomputes after the ttl expires', () => {
    const fn = vi.fn(() => 1);
    memo('b', 60, fn);
    vi.advanceTimersByTime(61 * 1000);
    expect(memo('b', 60, fn)).toBe(1);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('treats different keys independently', () => {
    const a = vi.fn(() => 'a');
    const b = vi.fn(() => 'b');
    memo('k1', 60, a);
    memo('k2', 60, b);
    memo('k1', 60, a);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });
});
