import { describe, expect, it, vi } from 'vitest';
import type { Connection } from 'home-assistant-js-websocket';
import { callService, setConnection } from './services';

describe('services', () => {
  it('rejects before setConnection', async () => {
    await expect(
      callService('switch', 'toggle', { entity_id: 'a' }),
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