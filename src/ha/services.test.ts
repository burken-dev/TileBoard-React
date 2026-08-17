import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Connection } from 'home-assistant-js-websocket';
import { createAppStore, getAppStore } from '../store';
import { callService, getHistory, setConnection, setMockMode } from './services';

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

  it('fetches history via websocket and expands compressed states', async () => {
    createAppStore({ serverUrl: 'http://h', pages: [] });
    const sendMessagePromise = vi.fn<(msg: unknown) => Promise<Record<string, unknown[]>>>(async () => ({
      'sensor.temp': [{ c: '20', a: { unit_of_measurement: '°C' }, lu: 1704067200 }],
    }));
    setConnection({ sendMessagePromise } as unknown as Connection);
    const result = await getHistory('2024-01-01T00:00:00Z', 'sensor.temp', '2024-01-02T00:00:00Z');
    const sent = sendMessagePromise.mock.calls[0][0] as Record<string, unknown>;
    expect(sent.type).toBe('history/history_during_period');
    expect(sent.entity_ids).toEqual(['sensor.temp']);
    expect(sent.start_time).toBe('2024-01-01T00:00:00Z');
    expect(sent.significant_changes_only).toBe(false);
    expect(result).toEqual([
      [
        {
          entity_id: 'sensor.temp',
          state: '20',
          attributes: { unit_of_measurement: '°C' },
          last_changed: '2024-01-01T00:00:00.000Z',
          last_updated: '2024-01-01T00:00:00.000Z',
        },
      ],
    ]);
  });

  it('drops entities that have no recorded history', async () => {
    createAppStore({ serverUrl: 'http://h', pages: [] });
    const sendMessagePromise = vi.fn<(msg: unknown) => Promise<Record<string, unknown[]>>>(async () => ({}));
    setConnection({ sendMessagePromise } as unknown as Connection);
    const result = await getHistory('2024-01-01T00:00:00Z', ['sensor.missing', 'sensor.empty']);
    expect(result).toEqual([]);
  });
});