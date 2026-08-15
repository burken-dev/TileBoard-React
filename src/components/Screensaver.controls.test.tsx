import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Screensaver from './Screensaver';
import { createAppStore, getAppStore } from '../store';
import type { FunctionContext, ScreensaverButtonContext, TileBoardConfig } from '../config/types';

const seen: Array<{ ctx: ScreensaverButtonContext; slide: string | null }> = [];
const customAction = function (this: FunctionContext, ctx: ScreensaverButtonContext) {
  seen.push({ ctx, slide: this.slide });
};

const config: TileBoardConfig = {
  serverUrl: 'http://h',
  pages: [{ groups: [] }],
  screensaver: {
    timeout: 5,
    slidesTimeout: 1,
    slideCacheBust: 60,
    slides: [{ bg: 'a.jpg' }, { bg: 'b.jpg' }],
    buttonsPosition: 'bottom-right',
    buttons: [
      { type: 'previous', icon: 'mdi-arrow-left' },
      { type: 'play_pause' },
      { type: 'next' },
      { icon: 'mdi-lightbulb', action: customAction },
      { icon: 'mdi-x', action: customAction, enabled: false },
    ],
  },
};

describe('Screensaver controls', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    createAppStore(config);
    getAppStore().setScreensaverSlide(0);
    getAppStore().setScreensaverPaused(false);
    getAppStore().setScreensaverShown(false);
    getAppStore().setScreensaverBg(null);
    seen.length = 0;
  });

  afterEach(() => cleanup());

  it('renders enabled buttons in order with their icons and position', () => {
    const { container } = render(<Screensaver />);
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    const controls = container.querySelector('.screensaver-controls')!;
    expect(controls.className).toContain('--bottom-right');
    const buttons = controls.querySelectorAll('.screensaver-button');
    expect(buttons).toHaveLength(4);
    expect(buttons[0].querySelector('.mdi')!.className).toContain('mdi-arrow-left');
    expect(buttons[1].querySelector('.mdi')!.className).toContain('mdi-pause');
  });

  it('next button advances the active slide', () => {
    const { container } = render(<Screensaver />);
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    fireEvent.click(container.querySelectorAll('.screensaver-button')[2]);
    const slides = container.querySelectorAll('.screensaver-slide');
    expect(slides[1].classList.contains('-active')).toBe(true);
  });

  it('previous button wraps to the last slide', () => {
    const { container } = render(<Screensaver />);
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    fireEvent.click(container.querySelectorAll('.screensaver-button')[0]);
    const slides = container.querySelectorAll('.screensaver-slide');
    expect(slides[1].classList.contains('-active')).toBe(true);
  });

  it('play/pause stops and resumes auto-advance', () => {
    const { container } = render(<Screensaver />);
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    const buttons = container.querySelectorAll('.screensaver-button');
    fireEvent.click(buttons[1]);
    expect(buttons[1].querySelector('.mdi')!.className).toContain('mdi-play');
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    let slides = container.querySelectorAll('.screensaver-slide');
    expect(slides[0].classList.contains('-active')).toBe(true);
    fireEvent.click(container.querySelectorAll('.screensaver-button')[1]);
    expect(container.querySelectorAll('.screensaver-button')[1].querySelector('.mdi')!.className).toContain('mdi-pause');
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    slides = container.querySelectorAll('.screensaver-slide');
    expect(slides[1].classList.contains('-active')).toBe(true);
  });

  it('clicking the controls does not hide the screensaver', () => {
    const { container } = render(<Screensaver />);
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    fireEvent.click(container.querySelector('.screensaver-controls')!);
    expect(container.querySelector('.screensaver')).toBeTruthy();
  });
});
