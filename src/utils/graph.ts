export interface ChartModel {
  type?: 'line' | 'bar';
  datasets: Array<{
    label: string;
    data: Array<{ x: number; y: number | string }>;
    yAxisID: string;
    stepped?: boolean;
    pointRadius?: number;
    pointHitRadius?: number;
    borderWidth?: number;
  }>;
  yAxes: Record<string, { type: 'linear' | 'category'; labels?: string[]; ticks?: { maxTicksLimit?: number } }>;
  interactionMode: 'nearest' | 'index';
}

export interface SeriesMeta {
  name: string;
  unit?: string;
  currentState?: string;
}

export function buildHistoryModel(
  response: Array<Array<{ state: string; last_changed: string }>>,
  seriesMeta: SeriesMeta[],
  now: number,
): ChartModel {
  const datasets: ChartModel['datasets'] = [];
  const yAxes: ChartModel['yAxes'] = {};
  const seenUnits = new Set<string>();

  response.forEach((states, seriesIndex) => {
    const meta = seriesMeta[seriesIndex] ?? { name: '' };
    const data: Array<{ x: number; y: number | string }> = states.map((state) => ({
      x: new Date(state.last_changed).getTime(),
      y: state.state,
    }));
    data.push({ x: now, y: meta.currentState ?? data[data.length - 1]?.y ?? '' });

    const lastY = data[data.length - 1].y;
    const isNumeric = !Number.isNaN(parseFloat(String(lastY)));
    const yAxisType: 'linear' | 'category' = isNumeric ? 'linear' : 'category';

    if (isNumeric) {
      for (const pt of data) pt.y = Number(pt.y);
    }
    const yAxisId = yAxisType + '-' + (meta.unit ?? '');

    let createYAxis = false;
    if (meta.unit && !seenUnits.has(meta.unit)) {
      seenUnits.add(meta.unit);
      createYAxis = true;
    } else if (!meta.unit) {
      createYAxis = true;
    }

    if (createYAxis) {
      let yLabels: string[] = [];
      if (yAxisType === 'category') {
        data.forEach((value) => {
          if (yLabels.indexOf(String(value.y)) === -1) yLabels.push(String(value.y));
        });
        yLabels.sort().reverse();
        if (yLabels.length === 1) {
          if (['on', 'off'].indexOf(yLabels[0]) !== -1) {
            yLabels = ['on', 'off'];
          } else {
            yLabels.push('');
            yLabels.unshift('');
          }
        }
      }
      yAxes[yAxisId] = { type: yAxisType, labels: yLabels.length ? yLabels : undefined };
    }

    datasets.push({
      label: meta.unit ? `${meta.name} / ${meta.unit}` : meta.name,
      data,
      yAxisID: yAxisId,
      stepped: true,
      pointRadius: 0,
      pointHitRadius: 5,
      borderWidth: 1,
    });
  });

  return {
    datasets,
    yAxes,
    interactionMode: datasets.length > 1 ? 'nearest' : 'index',
  };
}

export interface GraphStyleObject {
  bg?: string;
  lineColor?: string;
  fillColor?: string;
  textColor?: string;
  secondaryTextColor?: string;
  gridColor?: string;
}

const GRAPH_STYLE_PRESETS: Record<string, GraphStyleObject> = {
  green: {
    bg: '#335744',
    lineColor: '#7EE787',
    fillColor: 'rgba(126,231,135,0.2)',
    textColor: '#FFFFFF',
    secondaryTextColor: '#C6DACD',
    gridColor: '#4B6B58',
  },
  blue: {
    bg: '#3A4A5E',
    lineColor: '#64B5FF',
    fillColor: 'rgba(100,181,255,0.2)',
    textColor: '#FFFFFF',
    secondaryTextColor: '#B8C4D8',
    gridColor: '#5C6E82',
  },
  brown: {
    bg: '#5A4521',
    lineColor: '#FFC857',
    fillColor: 'rgba(255,200,87,0.2)',
    textColor: '#FFFFFF',
    secondaryTextColor: '#E1D3A6',
    gridColor: '#7D6330',
  },
};

export function resolveGraphStyle(value: string | GraphStyleObject | undefined): GraphStyleObject {
  if (!value) return GRAPH_STYLE_PRESETS.green;
  if (typeof value === 'string') return GRAPH_STYLE_PRESETS[value] ?? GRAPH_STYLE_PRESETS.green;
  return { ...GRAPH_STYLE_PRESETS.green, ...value };
}

export function deepMerge<T>(base: T, extra: unknown): T {
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