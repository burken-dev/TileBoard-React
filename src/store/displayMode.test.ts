import { describe, expect, it, vi } from 'vitest';
import type { DisplayMode, TileBoardConfig } from '../config/types';

let createAppStore: typeof import('./index').createAppStore;
let getAppStore: typeof import('./index').getAppStore;

const pages: TileBoardConfig['pages'] = [{ groups: [] }];

async function freshStore(config: TileBoardConfig) {
  vi.resetModules();
  ({ createAppStore, getAppStore } = await import('./index'));
  createAppStore(config);
}

describe('displayMode', () => {
  it('defaults to fixed when the config omits it', async () => {
    await freshStore({ serverUrl: 'http://h', pages });
    expect(getAppStore().displayMode).toBe('fixed');
  });

  it('initializes from the config', async () => {
    await freshStore({ serverUrl: 'http://h', pages, displayMode: 'scale' });
    expect(getAppStore().displayMode).toBe('scale');
  });

  it('sanitizes bogus displayMode to fixed on init', async () => {
    await freshStore({ serverUrl: 'http://h', pages, displayMode: 'bogus' as DisplayMode });
    expect(getAppStore().displayMode).toBe('fixed');
  });

  it('setDisplayMode accepts both modes and ignores garbage', async () => {
    await freshStore({ serverUrl: 'http://h', pages });
    getAppStore().setDisplayMode('scale');
    expect(getAppStore().displayMode).toBe('scale');
    getAppStore().setDisplayMode('bogus' as DisplayMode);
    expect(getAppStore().displayMode).toBe('scale');
  });

  it('toggleDisplayMode flips both ways', async () => {
    await freshStore({ serverUrl: 'http://h', pages });
    getAppStore().toggleDisplayMode();
    expect(getAppStore().displayMode).toBe('scale');
    getAppStore().toggleDisplayMode();
    expect(getAppStore().displayMode).toBe('fixed');
  });

  it('exposes window globals that call through to the store', async () => {
    await freshStore({ serverUrl: 'http://h', pages });
    window.setDisplayMode!('scale');
    expect(getAppStore().displayMode).toBe('scale');
    window.toggleDisplayMode!();
    expect(getAppStore().displayMode).toBe('fixed');
    delete window.setDisplayMode;
    delete window.toggleDisplayMode;
  });
});
