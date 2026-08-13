import type { HaEntity, TileConfig } from '../../config/types';
import { useAppStore } from '../../store';
import { entityValue } from '../../utils/entity';

export function InputDatetimeTile({ item, entity }: { item: TileConfig; entity: HaEntity }) {
  const states = useAppStore((s) => s.entities);
  return (
    <div className="item-entity-container">
      <div className="item-entity">
        <span className="item-entity--value -datetime">
          {String(entityValue(item, entity, states) ?? '')}
        </span>
      </div>
    </div>
  );
}