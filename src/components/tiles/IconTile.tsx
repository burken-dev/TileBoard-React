import { memo } from 'react';
import type { HaEntity, TileConfig } from '../../config/types';
import { useEntities } from '../../store';
import { entityIcon } from '../../utils/entity';

export const IconTile = memo(function IconTile({ item, entity }: { item: TileConfig; entity: HaEntity }) {
  const states = useEntities([String(item.id)]);
  const icon = entityIcon(item, entity, states);
  return (
    <div className="item-entity-container">
      <div className="item-entity">
        <span className={'item-entity--icon mdi ' + (icon ?? '')} />
      </div>
    </div>
  );
});