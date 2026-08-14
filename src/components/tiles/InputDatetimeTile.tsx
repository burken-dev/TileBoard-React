import { memo } from 'react';
import type { HaEntity, TileConfig } from '../../config/types';
import { useEntities } from '../../store';
import { entityValue } from '../../utils/entity';

export const InputDatetimeTile = memo(function InputDatetimeTile({ item, entity }: { item: TileConfig; entity: HaEntity }) {
  const states = useEntities([String(item.id)]);
  return (
    <div className="item-entity-container">
      <div className="item-entity">
        <span className="item-entity--value -datetime">
          {String(entityValue(item, entity, states) ?? '')}
        </span>
      </div>
    </div>
  );
});