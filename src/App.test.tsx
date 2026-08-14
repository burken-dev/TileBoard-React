import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { createAppStore } from './store';
import type { TileBoardConfig } from './config/types';

vi.mock('./ha/connection', () => ({ initConnection: vi.fn() }));

const config: TileBoardConfig = {
  serverUrl: 'http://h',
  autoReloadInterval: 1,
  pages: [{ groups: [] }],
};

describe('App autoReloadInterval', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    createAppStore(config);
  });

  it('reloads the page after the configured interval', () => {
    const setInterval = vi.spyOn(window, 'setInterval');
    render(<App config={config} />);
    expect(
      setInterval.mock.calls.some(([, delay]) => delay === config.autoReloadInterval! * 1000),
    ).toBe(true);
    setInterval.mockRestore();
  });

  it('does not reload when the option is absent', () => {
    createAppStore({ serverUrl: 'http://h', pages: [{ groups: [] }] });
    const setInterval = vi.spyOn(window, 'setInterval');
    render(<App config={{ serverUrl: 'http://h', pages: [{ groups: [] }] }} />);
    expect(
      setInterval.mock.calls.some(([, delay]) => delay === config.autoReloadInterval! * 1000),
    ).toBe(false);
    setInterval.mockRestore();
  });
});
