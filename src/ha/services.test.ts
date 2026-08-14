import { afterEach, describe, expect, it } from 'vitest';
import { createAppStore, getAppStore } from '../store';
import { callService, setMockMode } from './services';

afterEach(() => {
  setMockMode(false);
});

describe('callService mock routing', () => {
  it('routes to the mock implementation when mock mode is enabled', async () => {
    createAppStore({ serverUrl: 'http://mock', pages: [] });
    getAppStore().setEntities([{ entity_id: 'switch.kitchen', state: 'off', attributes: {} }]);
    setMockMode(true);
    await callService('switch', 'toggle', { entity_id: 'switch.kitchen' });
    expect(getAppStore().entities['switch.kitchen'].state).toBe('on');
  });

  it('rejects when not connected and mock mode is off', async () => {
    createAppStore({ serverUrl: 'http://mock', pages: [] });
    setMockMode(false);
    await expect(
      callService('switch', 'toggle', { entity_id: 'switch.kitchen' }),
    ).rejects.toThrow('not connected');
  });
});