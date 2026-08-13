import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from './App';
import { createAppStore } from './store';
import type { TileBoardConfig } from './config/types';

vi.mock('./ha/connection', () => ({ initConnection: vi.fn() }));
vi.mock('./ha/services', () => ({
  callService: vi.fn(() => Promise.resolve()),
  sendMessage: vi.fn(() => Promise.resolve()),
  getHistory: vi.fn(() => Promise.resolve([])),
}));

const themes = [
  'transparent',
  'material',
  'win95',
  'winphone',
  'mobile',
  'compact',
  'homekit',
  'fresh-air',
  'white-paper',
];

describe('themes', () => {
  it('applies every legacy theme class to the body', () => {
    const config: TileBoardConfig = {
      serverUrl: 'http://h',
      pages: [{ groups: [] }],
      customTheme: themes,
    };
    createAppStore(config);
    const { container } = render(<App config={config} />);
    const cls = document.body.className;
    themes.forEach((theme) => expect(cls).toContain('-theme-' + theme));
    expect(container.querySelector('.page-container')).toBeTruthy();
  });

  it('applies a single customTheme string', () => {
    const config: TileBoardConfig = {
      serverUrl: 'http://h',
      pages: [{ groups: [] }],
      customTheme: 'homekit',
    };
    createAppStore(config);
    render(<App config={config} />);
    expect(document.body.classList.contains('-theme-homekit')).toBe(true);
  });
});