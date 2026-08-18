import { memo } from 'react';
import type { HaEntity, TileConfig } from '../../config/types';
import Graph from '../charts/Graph';
import { useGraphData } from '../charts/useGraphData';
import { deepMerge, resolveGraphStyle } from '../../utils/graph';
import { getItemFieldValue } from '../../utils/fields';
import { useAppStore } from '../../store';

export const GraphTile = memo(function GraphTile({
  item,
  entity,
}: {
  item: TileConfig;
  entity: HaEntity;
}) {
  const states = useAppStore((s) => s.entities);
  const { model, options, isLoading, error } = useGraphData(item, entity, 'graph');

  const styleValue = item.graph?.style
    ? (getItemFieldValue('graph.style', states, item, entity) as string | Record<string, string>)
    : undefined;
  const style = resolveGraphStyle(styleValue);

  if (isLoading || error || !model) {
    return (
      <div className="item-graph" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '14px', backgroundColor: style.bg }}>
        {isLoading ? 'Loading...' : error || 'No history data'}
      </div>
    );
  }

  const styledDatasets = model.datasets.map((ds) => ({
    ...ds,
    borderColor: style.lineColor,
    backgroundColor: style.fillColor,
    pointBackgroundColor: style.lineColor,
  }));

  const yScaleColors: Record<string, unknown> = {};
  for (const id of Object.keys(model.yAxes)) {
    yScaleColors[id] = {
      grid: { color: style.gridColor },
      ticks: { color: style.secondaryTextColor },
    };
  }

  const colorOptions = deepMerge(options ?? {}, {
    scales: {
      x: {
        grid: { color: style.gridColor },
        ticks: { color: style.secondaryTextColor },
      },
      ...yScaleColors,
    },
    plugins: {
      legend: { labels: { color: style.textColor } },
      tooltip: { titleColor: style.textColor, bodyColor: style.textColor },
    },
  });

  return (
    <div className="item-graph" style={{ backgroundColor: style.bg }}>
      <Graph model={{ ...model, datasets: styledDatasets }} options={colorOptions} />
    </div>
  );
});
