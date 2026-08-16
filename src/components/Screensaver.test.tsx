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
    slides: [{ bg: 'a.jpg' }, { bg: 'b.jpg' }],
    rightTop: [{ type: 'datetime' }],
  },
};

describe('Screensaver', () => {
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

  it('is not visible before the timeout', () => {
    const { container } = render(<Screensaver />);
    expect(container.querySelector('.screensaver')).toBeNull();
  });

  it('becomes visible after inactivity past the timeout', () => {
    const { container } = render(<Screensaver />);
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(container.querySelector('.screensaver')).toBeTruthy();
  });

  it('click hides and resets the idle timer', () => {
    const { container } = render(<Screensaver />);
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(container.querySelector('.screensaver')).toBeTruthy();
    fireEvent.click(container.querySelector('.screensaver')!);
    expect(container.querySelector('.screensaver')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(container.querySelector('.screensaver')).toBeNull();
  });

  it('rotates slides with -active/-prev classes', () => {
    const { container } = render(<Screensaver />);
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    let slides = container.querySelectorAll('.screensaver-slide');
    expect(slides[0].classList.contains('-active')).toBe(true);
    expect(slides[1].classList.contains('-prev')).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    slides = container.querySelectorAll('.screensaver-slide');
    expect(slides[0].classList.contains('-prev')).toBe(true);
    expect(slides[1].classList.contains('-active')).toBe(true);
  });

  it('renders corner items', () => {
    const { container } = render(<Screensaver />);
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(container.querySelector('.screensaver-content--right-top .clock--h')).toBeTruthy();
  });

  it('appends a rolling cache-bust query to slide backgrounds', () => {
    const { container } = render(<Screensaver />);
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    const slide = container.querySelector('.screensaver-slide') as HTMLElement;
    expect(slide.style.backgroundImage).toContain('a.jpg?t=0');
  });

  it('renders the default control buttons bar', () => {
    const { container } = render(<Screensaver />);
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    const controls = container.querySelector('.screensaver-controls');
    expect(controls).toBeTruthy();
    expect(controls!.className).toContain('--bottom-center');
    expect(controls!.querySelectorAll('.screensaver-button')).toHaveLength(3);
  });

  it('sets the ambient container background to the active slide when ambient_backdrop is on', async () => {
    vi.resetModules(); // createAppStore is a no-op once a store exists (singleton guard), so re-import for a fresh store
    const { createAppStore: createAmbientStore } = await import('../store');
    const { default: AmbientScreensaver } = await import('./Screensaver');
    createAmbientStore({
      ...config,
      screensaver: { ...config.screensaver!, ambient_backdrop: true },
    });
    const { container } = render(<AmbientScreensaver />);
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    const slides = container.querySelector('.screensaver-slides') as HTMLElement;
    expect(slides.classList.contains('-ambient')).toBe(true);
    expect(slides.style.backgroundImage).toContain('a.jpg?t=0');
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(slides.style.backgroundImage).toContain('b.jpg?t=0');
  });

  it('does not render ambient backdrops by default', () => {
    const { container } = render(<Screensaver />);
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    const slides = container.querySelector('.screensaver-slides') as HTMLElement;
    expect(slides.classList.contains('-ambient')).toBe(false);
    expect(slides.style.backgroundImage).toBe('');
    expect(container.querySelectorAll('.screensaver-slide-backdrop')).toHaveLength(0);
  });
});
