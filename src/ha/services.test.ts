import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Connection } from 'home-assistant-js-websocket';
import { createAppStore, getAppStore } from '../store';
import { callService, setConnection, setMockMode } from './services';

afterEach(() => {
  setMockMode(false);
});

describe('services', () => {
  it('rejects before setConnection', async () => {
    await expect(
      callService('switch', 'toggle', { entity_id: 'a' }),
    ).rejects.toThrow('not connected');
  });

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

  it('calls the connection with given args', async () => {
    const sendMessagePromise = vi.fn<(msg: unknown) => Promise<void>>(async () => undefined);
    setConnection({ sendMessagePromise } as unknown as Connection);
    await callService('switch', 'toggle', { entity_id: 'a' });
    const sent = sendMessagePromise.mock.calls[0][0] as Record<string, unknown>;
    expect(sent.type).toBe('call_service');
    expect(sent.domain).toBe('switch');
    expect(sent.service).toBe('toggle');
    expect(sent.service_data).toEqual({ entity_id: 'a' });
  });
});