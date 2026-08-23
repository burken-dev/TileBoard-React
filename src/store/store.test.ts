import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createAppStore, getAppStore, useEntitiesSelector } from './index';
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

describe('useEntitiesSelector', () => {
  it('returns only the entities for the specified IDs', () => {
    createAppStore(minimalConfig);
    getAppStore().setEntities([
      { entity_id: 'sensor.a', state: '20', attributes: { unit: 'C' } },
      { entity_id: 'sensor.b', state: '50', attributes: { unit: '%' } },
      { entity_id: 'sensor.c', state: '100', attributes: {} },
    ]);

    const { result } = renderHook(() => useEntitiesSelector(['sensor.a', 'sensor.b']));

    expect(result.current).toEqual({
      'sensor.a': { entity_id: 'sensor.a', state: '20', attributes: { unit: 'C' } },
      'sensor.b': { entity_id: 'sensor.b', state: '50', attributes: { unit: '%' } },
    });
    expect(result.current['sensor.c']).toBeUndefined();
  });

  it('returns the exact same object reference when unrelated entities in the store update', () => {
    createAppStore(minimalConfig);
    const entityA = { entity_id: 'sensor.a', state: '20', attributes: {} };
    const entityB = { entity_id: 'sensor.b', state: '50', attributes: {} };
    const entityC = { entity_id: 'sensor.c', state: '100', attributes: {} };

    getAppStore().setEntities([entityA, entityB, entityC]);

    const { result } = renderHook(() => useEntitiesSelector(['sensor.a']));
    const snapshotBefore = result.current;

    // Update entityB which is not in the selector
    act(() => {
      getAppStore().updateEntity({ entity_id: 'sensor.b', state: '55', attributes: {} });
    });

    expect(result.current).toBe(snapshotBefore);

    // Update entityC via setEntities without modifying entityA
    act(() => {
      getAppStore().setEntities([
        entityA,
        { entity_id: 'sensor.b', state: '55', attributes: {} },
        { entity_id: 'sensor.c', state: '105', attributes: {} },
      ]);
    });

    expect(result.current).toBe(snapshotBefore);
  });

  it('returns a new object reference when one of the subscribed entities updates', () => {
    createAppStore(minimalConfig);
    const entityA = { entity_id: 'sensor.a', state: '20', attributes: {} };
    const entityB = { entity_id: 'sensor.b', state: '50', attributes: {} };

    getAppStore().setEntities([entityA, entityB]);

    const { result } = renderHook(() => useEntitiesSelector(['sensor.a']));
    const snapshotBefore = result.current;

    act(() => {
      getAppStore().updateEntity({ entity_id: 'sensor.a', state: '21', attributes: {} });
    });

    expect(result.current).not.toBe(snapshotBefore);
    expect(result.current['sensor.a'].state).toBe('21');
  });

  it('returns a new object reference when a subscribed entity arrives later', () => {
    createAppStore(minimalConfig);
    getAppStore().setEntities([
      { entity_id: 'sensor.a', state: '20', attributes: {} },
    ]);

    const { result } = renderHook(() => useEntitiesSelector(['sensor.missing']));
    expect(result.current).toEqual({});
    const snapshotBefore = result.current;

    act(() => {
      getAppStore().setEntities([
        { entity_id: 'sensor.a', state: '20', attributes: {} },
        { entity_id: 'sensor.missing', state: 'present', attributes: {} },
      ]);
    });

    expect(result.current).not.toBe(snapshotBefore);
    expect(result.current['sensor.missing'].state).toBe('present');
  });
});