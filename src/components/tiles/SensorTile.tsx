import type { HaEntity, TileConfig } from '../../config/types';
import { useAppStore } from '../../store';
import { entityUnit, entityValue } from '../../utils/entity';

export function SensorTile({ item, entity }: { item: TileConfig; entity: HaEntity }) {
  const states = useAppStore((s) => s.entities);
  const unit = entityUnit(item, entity, states);
  return (
    <div className="item-entity-container">
      <div className="item-entity">
        <span className="item-entity--value">{String(entityValue(item, entity, states) ?? '')}</span>
        {unit ? <span className="item-entity--unit">{unit}</span> : null}
      </div>
    </div>
  );
}