import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { TileConfig } from '../../config/types';
import { createAppStore, getAppStore } from '../../store';
import { getHistory } from '../../ha/services';
import GraphPopup from './GraphPopup';

const { chartInstances, ChartMock } = vi.hoisted(() => {
  const chartInstances = [] as Array<{ destroy: ReturnType<typeof vi.fn> }>;
  const ChartMock = vi.fn().mockImplementation(function ChartMock() {
    const inst = { destroy: vi.fn() };
    chartInstances.push(inst);
    return inst as unknown;
  }) as unknown as ReturnType<typeof vi.fn> & { register: ReturnType<typeof vi.fn> };
  (ChartMock as unknown as { register: unknown }).register = vi.fn();
  return { chartInstances, ChartMock };
});

vi.mock('chart.js', () => ({
  Chart: ChartMock,
  BarController: {},
  BarElement: {},
  CategoryScale: {},
  Decimation: {},
  Filler: {},
  Legend: {},
  LineController: {},
  LineElement: {},
  LinearScale: {},
  PointElement: {},
  TimeScale: {},
  Title: {},
  Tooltip: {},
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
// ponytail: TileType has no 'graph' yet (graph tile is a later task); cast keeps the test typed.
const item = { type: 'graph', id: 'sensor.temp', position: [0, 0] } as unknown as TileConfig;

describe('GraphPopup', () => {
  beforeEach(() => {
    createAppStore(config);
    getAppStore().setEntities([entity]);
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({});
  });
  afterEach(() => {
    cleanup();
    chartInstances.length = 0;
    getHistoryMock.mockReset();
    getAppStore().closeGraph();
  });

  it('renders nothing when closed', () => {
    const { container } = render(<GraphPopup />);
    expect(container.firstChild).toBeNull();
  });

  it('loads history and renders the graph with a title', async () => {
    getHistoryMock.mockResolvedValue([
      [{ entity_id: 'sensor.temp', state: '20', last_changed: '2024-01-01T00:00:00Z', attributes: { unit_of_measurement: '°C' } }],
    ]);
    getAppStore().openGraph(item, entity);
    render(<GraphPopup />);
    expect(await screen.findByText('Temp')).toBeDefined();
    await waitFor(() => expect(chartInstances).toHaveLength(1));
  });

  it('closes the popup on the close button', async () => {
    getHistoryMock.mockResolvedValue([]);
    getAppStore().openGraph(item, entity);
    const { container } = render(<GraphPopup />);
    await screen.findByText('No history data found');
    fireEvent.click(container.querySelector('.history-popup-close') as HTMLElement);
    expect(getAppStore().activeGraph).toBeNull();
  });
});