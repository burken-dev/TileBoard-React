import type { HaEntity, TileConfig } from '../../config/types';
import { useAppStore } from '../../store';
import { entityIcon } from '../../utils/entity';

export function IconTile({ item, entity }: { item: TileConfig; entity: HaEntity }) {
  const states = useAppStore((s) => s.entities);
  const icon = entityIcon(item, entity, states);
  return (
    <div className="item-entity-container">
      <div className="item-entity">
        <span className={'item-entity--icon mdi ' + (icon ?? '')} />
      </div>
    </div>
  );
}