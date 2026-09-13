import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { usePageScale } from './usePageScale';

class FakeRO {
  static instances: FakeRO[] = [];
  cb: ResizeObserverCallback;
  constructor(cb: ResizeObserverCallback) {
    this.cb = cb;
    FakeRO.instances.push(this);
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

afterEach(() => {
  vi.unstubAllGlobals();
  FakeRO.instances = [];
});

function mockEl(scrollW: number, scrollH: number, clientW: number, clientH: number): HTMLElement {
  const el = document.createElement('div');
  Object.defineProperties(el, {
    scrollWidth: { value: scrollW, configurable: true },
    scrollHeight: { value: scrollH, configurable: true },
    clientWidth: { value: clientW, configurable: true },
    clientHeight: { value: clientH, configurable: true },
  });
  return el;
}

describe('usePageScale', () => {
  it('returns 1 when disabled', () => {
    vi.stubGlobal('ResizeObserver', FakeRO);
    const ref = { current: mockEl(2000, 1000, 1000, 800) };
    const { result } = renderHook(() => usePageScale(ref, false));
    expect(result.current).toBe(1);
  });

  it('scales content to fit when enabled', () => {
    vi.stubGlobal('ResizeObserver', FakeRO);
    const ref = { current: mockEl(2000, 1000, 1000, 800) };
    const { result } = renderHook(() => usePageScale(ref, true));
    expect(result.current).toBe(0.5);
  });

  it('recomputes on resize observations', () => {
    vi.stubGlobal('ResizeObserver', FakeRO);
    const el = mockEl(2000, 1000, 1000, 800);
    const ref = { current: el };
    const { result } = renderHook(() => usePageScale(ref, true));
    expect(result.current).toBe(0.5);
    Object.defineProperty(el, 'scrollWidth', { value: 1000, configurable: true });
    const ro = FakeRO.instances[0];
    act(() => {
      ro.cb([] as unknown as ResizeObserverEntry[], ro as unknown as ResizeObserver);
    });
    expect(result.current).toBe(0.8);
  });
});
