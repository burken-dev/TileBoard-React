import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import 'chartjs-adapter-date-fns';
import type { CSSProperties } from 'react';
import type { ChartConfiguration } from 'chart.js';
import { useAppStore } from '../../store';
import { entityTitle, getItemEntity } from '../../utils/entity';
import { getItemFieldValue } from '../../utils/fields';

function deepMerge<T>(base: T, extra: unknown): T {
  if (extra === null || typeof extra !== 'object' || Array.isArray(extra)) {
    return extra as T;
  }
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const key of Object.keys(extra as Record<string, unknown>)) {
    const value = (extra as Record<string, unknown>)[key];
    out[key] = key in out ? deepMerge(out[key], value) : value;
  }
  return out as T;
}

export default function HistoryPopup() {
  const activeHistory = useAppStore((s) => s.activeHistory);
  const closeHistory = useAppStore((s) => s.closeHistory);
  const states = useAppStore((s) => s.entities);
  const config = useAppStore((s) => s.config);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!activeHistory || !activeHistory.model || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    chartRef.current?.destroy();
    const c24 = config.timeFormat !== 12;
    const timeFormats = {
      datetime: c24 ? 'MMM D, YYYY, H:mm:ss' : 'MMM D, YYYY, h:mm:ss a',
      hour: c24 ? 'H:mm' : 'h:mm a',
      millisecond: c24 ? 'H:mm:ss.SSS' : 'h:mm:ss.SSS a',
      minute: c24 ? 'H:mm' : 'h:mm a',
      second: c24 ? 'H:mm:ss' : 'h:mm:ss a',
    };

    const baseOptions: Record<string, unknown> = {
      maintainAspectRatio: false,
      responsive: true,
      interaction: {
        mode: activeHistory.model.interactionMode,
        intersect: false,
      },
      scales: {
        x: { type: 'time', time: { displayFormats: timeFormats } },
        ...activeHistory.model.yAxes,
      },
      plugins: {
        legend: { align: 'start' },
        tooltip: {
          displayColors: false,
          intersect: false,
          mode: activeHistory.model.interactionMode,
        },
      },
    };
    const options = deepMerge(baseOptions, activeHistory.options);

    const chart = new Chart(
      ctx,
      {
        type: 'line',
        data: { datasets: activeHistory.model.datasets },
        options,
      } as ChartConfiguration,
    );
    chartRef.current = chart;
    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [activeHistory, config.timeFormat]);

  if (!activeHistory) return null;
  const entity = getItemEntity(activeHistory.item, states);
  if (!entity) return null;

  const classes = getItemFieldValue('history.classes', states, activeHistory.item, entity);
  const styles = (getItemFieldValue(
    'history.styles',
    states,
    activeHistory.item,
    entity,
  ) ?? {}) as CSSProperties;

  return (
    <div
      className={
        'history-popup' +
        (classes ? ' ' + (Array.isArray(classes) ? classes.join(' ') : String(classes)) : '')
      }
    >
      <div className="history-popup-container" style={styles}>
        <div className="history-popup-title">
          <div className="history-popup-close" onClick={() => closeHistory()}>
            <i className="mdi mdi-close" />
          </div>
          {entityTitle(activeHistory.item, entity, states)}
        </div>
        <div className="history-popup-container history-popup-container--canvas">
          <div className="history-popup--canvas">
            <div className="history-popup--placeholder">
              {activeHistory.isLoading && !activeHistory.errorText && (
                <span>Loading history data...</span>
              )}
              {activeHistory.errorText && <span>{activeHistory.errorText}</span>}
            </div>
            {!activeHistory.isLoading && !activeHistory.errorText && (
              <canvas ref={canvasRef} className="chart chart-line" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}