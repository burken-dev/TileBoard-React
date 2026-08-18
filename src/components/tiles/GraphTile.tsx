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
  if (isLoading || error || !model) {
    return (
      <div className="item-graph" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
        {isLoading ? 'Loading...' : error || 'No history data'}
      </div>
    );
  }
  return (
    <div className="item-graph">
      <Graph model={model} options={options} />
    </div>
  );
});
