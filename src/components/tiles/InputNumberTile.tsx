import { memo } from 'react';
import type { HaEntity, TileConfig } from '../../config/types';
import { useEntities } from '../../store';
import { decreaseNumber, increaseNumber } from '../../tiles/actions';
import { entityUnit, entityValue } from '../../utils/entity';

export const InputNumberTile = memo(function InputNumberTile({ item, entity }: { item: TileConfig; entity: HaEntity }) {
  const states = useEntities([String(item.id)]);
  const unit = entityUnit(item, entity, states);
  return (
    <div className="item-entity-container">
      <div>
        <div
          className="item-button -center-right"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            increaseNumber(item, entity);
          }}
        >
          <i className="mdi mdi-plus" />
        </div>
        <div
          className="item-button -bottom-right"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            decreaseNumber(item, entity);
          }}
        >
          <i className="mdi mdi-minus" />
        </div>
      </div>
      <div className="item-entity">
        <span className="item-entity--value">{String(entityValue(item, entity, states) ?? '')}</span>
        {unit ? <span className="item-entity--unit">{unit}</span> : null}
      </div>
    </div>
  );
});