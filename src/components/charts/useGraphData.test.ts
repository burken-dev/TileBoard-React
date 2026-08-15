import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppStore, getAppStore } from '../../store';
import type { TileConfig } from '../../config/types';
import { loadGraphModel } from './useGraphData';
import { getHistory } from '../../ha/services';

vi.mock('../../ha/services', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../ha/services')>();
  return { ...actual, getHistory: vi.fn() };
});

const getHistoryMock = vi.mocked(getHistory);
const config = { serverUrl: 'http://h', pages: [{ groups: [] }] };

const entity = {
  entity_id: 'sensor.temp',
  state: '22',
  attributes: { friendly_name: 'Temp', unit_of_measurement: '°C' },
};

function item(extra: Record<string, unknown> = {}): TileConfig {
  return { type: 'graph', id: 'sensor.temp', position: [0, 0], ...extra } as unknown as TileConfig;
}

describe('loadGraphModel', () => {
  beforeEach(() => {
    createAppStore(config);
    getAppStore().setEntities([entity]);
  });
  afterEach(() => {
    getHistoryMock.mockReset();
  });

  it('returns an error when no entity can be resolved', async () => {
    const result = await loadGraphModel(item({ id: 'sensor.missing' }), null, getAppStore().entities, 'history');
    expect(result).toEqual({ error: 'No entity was specified' });
  });

  it('uses a graph.data function directly and skips history fetch', async () => {
    const custom = {
      datasets: [{ label: 'Price', data: [{ x: 1, y: 2 }], yAxisID: 'y' }],
      yAxes: { y: { type: 'linear' as const } },
      interactionMode: 'index' as const,
    };
    const result = await loadGraphModel(
      item({ graph: { data: () => custom, options: { animation: false } } }),
      entity,
      getAppStore().entities,
      'graph',
    );
    expect(getHistoryMock).not.toHaveBeenCalled();
    expect(result).toEqual({ model: custom, options: { animation: false } });
  });

  it('fetches history with the graph.offset range', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-02T00:00:00Z'));
    getHistoryMock.mockResolvedValue([
      [{ entity_id: 'sensor.temp', state: '20', last_changed: '2024-01-01T00:00:00Z', attributes: { unit_of_measurement: '°C' } }],
    ]);
    const result = await loadGraphModel(
      item({ graph: { offset: 60 * 60 * 1000 } }),
      entity,
      getAppStore().entities,
      'graph',
    );
    vi.useRealTimers();
    expect(getHistoryMock).toHaveBeenCalledWith('2024-01-01T23:00:00.000Z', 'sensor.temp');
    expect(result).toHaveProperty('model');
  });

  it('falls back to a 1-day offset for the history scope', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-02T00:00:00Z'));
    getHistoryMock.mockResolvedValue([]);
    const result = await loadGraphModel(item(), entity, getAppStore().entities, 'history');
    vi.useRealTimers();
    expect(getHistoryMock).toHaveBeenCalledWith('2024-01-01T00:00:00.000Z', 'sensor.temp');
    expect(result).toEqual({ error: 'No history data found' });
  });
});