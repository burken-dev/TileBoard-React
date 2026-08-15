import { memo } from 'react';
import type { HaEntity, TileConfig } from '../../config/types';
import Graph from '../charts/Graph';
import { useGraphData } from '../charts/useGraphData';

export const GraphTile = memo(function GraphTile({
  item,
  entity,
}: {
  item: TileConfig;
  entity: HaEntity;
}) {
  const { model, options, isLoading, error } = useGraphData(item, entity, 'graph');
  if (isLoading || error || !model) return <div className="item-graph" />;
  return (
    <div className="item-graph">
      <Graph model={model} options={options} />
    </div>
  );
});
