import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppStore, getAppStore } from '../store';
import type { TileBoardConfig } from '../config/types';
import { getContext } from './functions';

const config: TileBoardConfig = { serverUrl: 'http://h', pages: [{ groups: [] }] };

describe('getContext', () => {
  beforeEach(() => {
    createAppStore(config);
  });

  it('delegates addNotification to the store', () => {
    const spy = vi.spyOn(getAppStore(), 'addNotification');
    getContext().addNotification({ type: 'error', title: 'T', message: 'M', id: 'x' });
    expect(spy).toHaveBeenCalledWith({ type: 'error', title: 'T', message: 'M', id: 'x' });
  });
});