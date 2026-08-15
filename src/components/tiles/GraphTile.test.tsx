import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { createAppStore, getAppStore } from '../../store';
import { getHistory } from '../../ha/services';
import { entityClick } from '../../tiles/actions';
import { GraphTile } from './GraphTile';

const { chartInstances } = vi.hoisted(() => ({ chartInstances: [] as Array<{ destroy: ReturnType<typeof vi.fn> }> }));

vi.mock('chart.js/auto', () => ({
  default: vi.fn().mockImplementation(function ChartMock() {
    const inst = { destroy: vi.fn() };
    chartInstances.push(inst);
    return inst;
  }),
}));
vi.mock('chartjs-adapter-date-fns', () => ({}));
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
const item = { type: 'graph', id: 'sensor.temp', position: [0, 0] };

describe('GraphTile', () => {
  beforeEach(() => {
    createAppStore(config);
    getAppStore().setEntities([entity]);
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({});
  });
  afterEach(() => {
    cleanup();
    chartInstances.length = 0;
    getHistoryMock.mockReset();
  });

  it('renders a chart once history data loads', async () => {
    getHistoryMock.mockResolvedValue([
      [{ entity_id: 'sensor.temp', state: '20', last_changed: '2024-01-01T00:00:00Z', attributes: { unit_of_measurement: '°C' } }],
    ]);
    render(<GraphTile item={item as never} entity={entity} />);
    await waitFor(() => expect(chartInstances).toHaveLength(1));
  });

  it('clicking a graph tile opens the graph popup', () => {
    entityClick(item as never, entity);
    expect(getAppStore().activeGraph).toEqual({ item });
  });
});
