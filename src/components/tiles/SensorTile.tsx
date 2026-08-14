import { memo } from 'react';
import type { HaEntity, TileConfig } from '../../config/types';
import { useEntities } from '../../store';
import { entityUnit, entityValue } from '../../utils/entity';

export const SensorTile = memo(function SensorTile({ item, entity }: { item: TileConfig; entity: HaEntity }) {
  const states = useEntities([String(item.id)]);
  const unit = entityUnit(item, entity, states);
  return (
    <div className="item-entity-container">
      <div className="item-entity">
        <span className="item-entity--value">{String(entityValue(item, entity, states) ?? '')}</span>
        {unit ? <span className="item-entity--unit">{unit}</span> : null}
      </div>
    </div>
  );
});