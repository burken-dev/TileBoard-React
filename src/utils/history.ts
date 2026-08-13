export interface HistoryChartModel {
  datasets: Array<{
    label: string;
    data: Array<{ x: number; y: number | string }>;
    yAxisID: string;
  }>;
  yAxes: Record<string, { type: 'linear' | 'category'; labels?: string[] }>;
  interactionMode: 'nearest' | 'index';
}

export interface SeriesMeta {
  name: string;
  unit?: string;
  currentState?: string;
}

export function buildHistoryDatasets(
  response: Array<Array<{ state: string; last_changed: string }>>,
  seriesMeta: SeriesMeta[],
  now: number,
): HistoryChartModel {
  const datasets: HistoryChartModel['datasets'] = [];
  const yAxes: HistoryChartModel['yAxes'] = {};
  const seenUnits = new Set<string>();

  response.forEach((states, seriesIndex) => {
    const meta = seriesMeta[seriesIndex] ?? { name: '' };
    const data = states.map((state) => ({
      x: new Date(state.last_changed).getTime(),
      y: state.state,
    }));
    data.push({ x: now, y: meta.currentState ?? '' });

    const lastY = data[data.length - 1].y;
    const yAxisType: 'linear' | 'category' = Number.isNaN(parseFloat(String(lastY)))
      ? 'category'
      : 'linear';
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
    });
  });

  return {
    datasets,
    yAxes,
    interactionMode: datasets.length > 1 ? 'nearest' : 'index',
  };
}