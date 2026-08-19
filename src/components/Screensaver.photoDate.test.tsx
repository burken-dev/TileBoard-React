import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Screensaver from './Screensaver';
import { createAppStore } from '../store';
import type { TileBoardConfig } from '../config/types';

const { exifLoad } = vi.hoisted(() => ({
  exifLoad: vi.fn().mockResolvedValue({
    DateTimeOriginal: { value: ['2020:01:02 03:04:05'] },
  }),
}));

vi.mock('exifreader', () => ({
  __esModule: true,
  default: { load: exifLoad },
}));

const config: TileBoardConfig = {
  serverUrl: 'http://h',
  pages: [{ groups: [] }],
  screensaver: {
    timeout: 5,
    slidesTimeout: 1,
    slides: [{ bg: 'a.jpg' }],
    rightBottom: [{ type: 'photo_date' }],
  },
};

describe('Screensaver photo_date', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    createAppStore(config);
  });

  it('renders a global-slot photo_date without slideCacheBust', async () => {
    const { container } = render(<Screensaver />);
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    await act(async () => {});
    const pd = container.querySelector('.screensaver-content--right-bottom .photo-date');
    expect(pd).toBeTruthy();
    expect(pd!.textContent).toContain('2020');
    expect(exifLoad).toHaveBeenCalledWith(new URL('a.jpg', location.href).href);
  });
});
