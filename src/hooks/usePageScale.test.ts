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

class FakeMO {
  static instances: FakeMO[] = [];
  cb: MutationCallback;
  constructor(cb: MutationCallback) {
    this.cb = cb;
    FakeMO.instances.push(this);
  }
  observe() {}
  disconnect() {}
  takeRecords(): MutationRecord[] {
    return [];
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  FakeRO.instances = [];
  FakeMO.instances = [];
});

function mockViewport(clientW: number, clientH: number): HTMLElement {
  const el = document.createElement('div');
  Object.defineProperties(el, {
    clientWidth: { value: clientW, configurable: true },
    clientHeight: { value: clientH, configurable: true },
  });
  return el;
}

function mockContent(scrollW: number, scrollH: number): HTMLElement {
  const el = document.createElement('div');
  Object.defineProperties(el, {
    scrollWidth: { value: scrollW, configurable: true },
    scrollHeight: { value: scrollH, configurable: true },
  });
  return el;
}

describe('usePageScale', () => {
  it('returns 1 when disabled', () => {
    vi.stubGlobal('ResizeObserver', FakeRO);
    const viewportRef = { current: mockViewport(1000, 800) };
    const contentRef = { current: mockContent(2000, 1000) };
    const { result } = renderHook(() => usePageScale(viewportRef, contentRef, false, true));
    expect(result.current).toBe(1);
  });

  it('returns 1 and observes nothing when inactive', () => {
    vi.stubGlobal('ResizeObserver', FakeRO);
    vi.stubGlobal('MutationObserver', FakeMO);
    const viewportRef = { current: mockViewport(1000, 800) };
    const contentRef = { current: mockContent(2000, 1000) };
    const { result } = renderHook(() => usePageScale(viewportRef, contentRef, true, false));
    expect(result.current).toBe(1);
    expect(FakeRO.instances).toHaveLength(0);
    expect(FakeMO.instances).toHaveLength(0);
  });

  it('scales content to fit the viewport when enabled', () => {
    vi.stubGlobal('ResizeObserver', FakeRO);
    const viewportRef = { current: mockViewport(1000, 800) };
    const contentRef = { current: mockContent(2000, 1000) };
    const { result } = renderHook(() => usePageScale(viewportRef, contentRef, true, true));
    expect(result.current).toBe(0.5);
  });

  it('recomputes on resize observations', () => {
    vi.stubGlobal('ResizeObserver', FakeRO);
    const content = mockContent(2000, 1000);
    const viewportRef = { current: mockViewport(1000, 800) };
    const contentRef = { current: content };
    const { result } = renderHook(() => usePageScale(viewportRef, contentRef, true, true));
    expect(result.current).toBe(0.5);
    Object.defineProperty(content, 'scrollWidth', { value: 1000, configurable: true });
    const ro = FakeRO.instances[0];
    act(() => {
      ro.cb([] as unknown as ResizeObserverEntry[], ro as unknown as ResizeObserver);
    });
    expect(result.current).toBe(0.8);
  });

  it('recomputes on DOM mutations', () => {
    vi.stubGlobal('ResizeObserver', FakeRO);
    vi.stubGlobal('MutationObserver', FakeMO);
    const content = mockContent(2000, 1000);
    const viewportRef = { current: mockViewport(1000, 800) };
    const contentRef = { current: content };
    const { result } = renderHook(() => usePageScale(viewportRef, contentRef, true, true));
    expect(result.current).toBe(0.5);
    Object.defineProperty(content, 'scrollWidth', { value: 1000, configurable: true });
    const mo = FakeMO.instances[0];
    act(() => {
      mo.cb([], mo as unknown as MutationObserver);
    });
    expect(result.current).toBe(0.8);
  });
});
