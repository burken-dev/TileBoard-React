import { useEffect, useRef } from 'react';
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Decimation,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  TimeScale,
  Title,
  Tooltip,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import type { ChartConfiguration } from 'chart.js';
import { useAppStore } from '../../store';
import { deepMerge } from '../../utils/graph';
import type { ChartModel } from '../../utils/graph';

Chart.register(
  BarController,
  BarElement,
  CategoryScale,
  Decimation,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  TimeScale,
  Title,
  Tooltip,
);

const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

export default function Graph({
  model,
  options,
}: {
  model: ChartModel;
  options?: Record<string, unknown>;
}) {
  const timeFormat = useAppStore((s) => s.config.timeFormat);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    chartRef.current?.destroy();
    const c24 = timeFormat !== 12;
    const timeFormats = {
      datetime: c24 ? 'MMM d, yyyy, H:mm:ss' : 'MMM d, yyyy, h:mm:ss a',
      hour: c24 ? 'H:mm' : 'h:mm a',
      millisecond: c24 ? 'H:mm:ss.SSS' : 'h:mm:ss.SSS a',
      minute: c24 ? 'H:mm' : 'h:mm a',
      second: c24 ? 'H:mm:ss' : 'h:mm:ss a',
    };

    const baseOptions: Record<string, unknown> = {
      animation: false,
      devicePixelRatio: dpr,
      maintainAspectRatio: false,
      responsive: true,
      interaction: {
        mode: model.interactionMode,
        intersect: false,
      },
      scales: {
        x: { type: 'time', time: { displayFormats: timeFormats } },
        ...Object.fromEntries(
          Object.entries(model.yAxes).map(([id, axis]) => [
            id,
            { ...axis, ticks: { maxTicksLimit: 7, ...axis.ticks } },
          ]),
        ),
      },
      plugins: {
        legend: { align: 'start' },
        tooltip: {
          displayColors: false,
          intersect: false,
          mode: model.interactionMode,
        },
      },
    };

    const chart = new Chart(
      ctx,
      {
        type: model.type ?? 'line',
        data: { datasets: model.datasets },
        options: deepMerge(baseOptions, options ?? {}),
      } as ChartConfiguration,
    );
    chartRef.current = chart;
    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [model, options, timeFormat]);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'stretch' }}>
      <canvas ref={canvasRef} className="chart chart-line" style={{ width: '100%', height: '100%' }} />
    </div>
  );
}