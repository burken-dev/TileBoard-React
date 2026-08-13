import { describe, expect, it } from 'vitest';
import { createAppStore, getAppStore } from './index';
import type { TileBoardConfig } from '../config/types';

const minimalConfig: TileBoardConfig = {
  serverUrl: 'http://h:8123',
  pages: [
    {
      groups: [
        {
          items: [
            {
              type: 'switch',
              id: 'switch.test',
              position: [0, 0],
            },
          ],
        },
      ],
    },
  ],
};

describe('app store', () => {
  it('setEntities indexes by entity_id', () => {
    createAppStore(minimalConfig);
    getAppStore().setEntities([
      { entity_id: 'a.b', state: 'on', attributes: {} },
    ]);
    expect(getAppStore().entities['a.b'].state).toBe('on');
  });

  it('updateEntity replaces the map entry with new identity', () => {
    createAppStore(minimalConfig);
    getAppStore().setEntities([
      { entity_id: 'a.b', state: 'on', attributes: {} },
    ]);
    const before = getAppStore().entities['a.b'];
    getAppStore().updateEntity({ entity_id: 'a.b', state: 'off', attributes: {} });
    const after = getAppStore().entities['a.b'];
    expect(after.state).toBe('off');
    expect(after).not.toBe(before);
  });

  it('setStatus updates status', () => {
    createAppStore(minimalConfig);
    expect(getAppStore().status).toBe('loading');
    getAppStore().setStatus('ready');
    expect(getAppStore().status).toBe('ready');
  });

  it('stores config', () => {
    createAppStore(minimalConfig);
    expect(getAppStore().config.serverUrl).toBe('http://h:8123');
  });
});