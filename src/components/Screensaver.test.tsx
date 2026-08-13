import { act, fireEvent, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Screensaver from './Screensaver';
import { createAppStore } from '../store';
import type { TileBoardConfig } from '../config/types';

const config: TileBoardConfig = {
  serverUrl: 'http://h',
  pages: [{ groups: [] }],
  screensaver: {
    timeout: 5,
    slidesTimeout: 1,
    slides: [{ bg: 'a.jpg' }, { bg: 'b.jpg' }],
    rightTop: [{ type: 'datetime' }],
  },
};

describe('Screensaver', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    createAppStore(config);
  });

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
});