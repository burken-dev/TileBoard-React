import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PhotoDate from './PhotoDate';
import { createAppStore } from '../store';

vi.mock('exifreader', () => {
  const load = vi.fn(() =>
    Promise.resolve({
      DateTimeOriginal: { value: ['2023:04:12 10:30:00'], description: '2023-04-12 10:30:00' },
    }),
  );
  return { load, default: { load } };
});

import { load } from 'exifreader';

const loadMock = vi.mocked(load);

describe('PhotoDate', () => {
  beforeEach(() => {
    createAppStore({ serverUrl: 'http://h', locale: 'sv-se', pages: [{ groups: [] }] });
  });

  afterEach(() => cleanup());

  it('renders the formatted photo date', async () => {
    render(<PhotoDate bg="a.jpg" />);
    expect(await screen.findByText('12 april 2023')).toBeTruthy();
  });

  it('renders nothing without a bg', () => {
    render(<PhotoDate />);
    expect(screen.queryByText(/./)).toBeNull();
  });

  it('renders nothing when EXIF has no DateTimeOriginal', async () => {
    loadMock.mockResolvedValueOnce({} as never);
    render(<PhotoDate bg="b.jpg" />);
    expect(await Promise.resolve()).toBeUndefined();
    expect(screen.queryByText(/./)).toBeNull();
  });
});
