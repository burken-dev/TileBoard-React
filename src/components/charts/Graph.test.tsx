import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { createAppStore } from '../../store';
import type { TileBoardConfig } from '../../config/types';
import Graph from './Graph';

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

const config: TileBoardConfig = { serverUrl: 'http://h', pages: [{ groups: [] }] };
const model = {
  datasets: [{ label: 'T', data: [{ x: 0, y: 1 }], yAxisID: 'y' }],
  yAxes: { y: { type: 'linear' as const } },
  interactionMode: 'index' as const,
};

describe('Graph', () => {
  beforeEach(() => {
    createAppStore(config);
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({});
  });
  afterEach(() => {
    cleanup();
    chartInstances.length = 0;
  });

  it('creates a chart with the model datasets and merged options', async () => {
    const { Chart } = await import('chart.js');
    const ChartMock = Chart as unknown as ReturnType<typeof vi.fn>;
    render(<Graph model={model} options={{ plugins: { legend: { display: false } } }} />);
    expect(ChartMock).toHaveBeenCalledTimes(1);
    const configArg = ChartMock.mock.calls[0][1];
    expect(configArg.data.datasets).toEqual(model.datasets);
    expect(configArg.type).toBe('line');
    expect(configArg.options.plugins.legend.align).toBe('start');
    expect(configArg.options.plugins.legend.display).toBe(false);
    expect(configArg.options.scales.x.type).toBe('time');
  });

  it('destroys the chart on unmount', () => {
    const { unmount } = render(<Graph model={model} />);
    expect(chartInstances).toHaveLength(1);
    unmount();
    expect(chartInstances[0].destroy).toHaveBeenCalledTimes(1);
  });
});