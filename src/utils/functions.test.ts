import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppStore, getAppStore } from '../store';
import type { TileBoardConfig } from '../config/types';
import { getContext } from './functions';

const config: TileBoardConfig = {
  serverUrl: 'http://h',
  pages: [{ groups: [] }],
  screensaver: { timeout: 5, slides: [{ bg: 'a.jpg' }, { bg: 'b.jpg' }] },
};

describe('getContext', () => {
  beforeEach(() => {
    createAppStore(config);
  });

  it('delegates addNotification to the store', () => {
    const spy = vi.spyOn(getAppStore(), 'addNotification');
    getContext().addNotification({ type: 'error', title: 'T', message: 'M', id: 'x' });
    expect(spy).toHaveBeenCalledWith({ type: 'error', title: 'T', message: 'M', id: 'x' });
  });

  it('exposes the current screensaver slide from the store', () => {
    getAppStore().setScreensaverShown(true);
    getAppStore().setScreensaverSlide(1);
    getAppStore().setScreensaverBg('b.jpg?t=0');
    const ctx = getContext();
    expect(ctx.slide).toBe('b.jpg?t=0');
    expect(ctx.slideIndex).toBe(1);
    expect(ctx.slideCount).toBe(2);
  });

  it('exposes null slide fields while the screensaver is hidden', () => {
    getAppStore().setScreensaverShown(false);
    const ctx = getContext();
    expect(ctx.slide).toBeNull();
    expect(ctx.slideIndex).toBeNull();
    expect(ctx.slideCount).toBeNull();
  });
});