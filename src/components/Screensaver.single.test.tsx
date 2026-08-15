import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Screensaver from './Screensaver';
import { createAppStore, getAppStore } from '../store';
import type { TileBoardConfig } from '../config/types';

const config: TileBoardConfig = {
  serverUrl: 'http://h',
  pages: [{ groups: [] }],
  screensaver: {
    timeout: 5,
    slidesTimeout: 1,
    slideCacheBust: 60,
    slides: [{ bg: 'a.jpg' }],
  },
};

describe('Screensaver single slide', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    createAppStore(config);
    getAppStore().setScreensaverSlide(0);
    getAppStore().setScreensaverPaused(false);
    getAppStore().setScreensaverShown(false);
    getAppStore().setScreensaverBg(null);
  });

  afterEach(() => cleanup());

  it('previous and next are no-ops with a single slide', () => {
    const { container } = render(<Screensaver />);
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    let slides = container.querySelectorAll('.screensaver-slide');
    expect(slides[0].classList.contains('-active')).toBe(true);

    fireEvent.click(container.querySelectorAll('.screensaver-button')[2]);
    slides = container.querySelectorAll('.screensaver-slide');
    expect(slides[0].classList.contains('-active')).toBe(true);

    fireEvent.click(container.querySelectorAll('.screensaver-button')[0]);
    slides = container.querySelectorAll('.screensaver-slide');
    expect(slides[0].classList.contains('-active')).toBe(true);
  });
});
