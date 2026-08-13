import type { HaEntity, TileConfig } from '../../config/types';
import { useAppStore } from '../../store';
import { parseFieldValue } from '../../utils/fields';

export function ImageTile({ item, entity }: { item: TileConfig; entity: HaEntity }) {
  const states = useAppStore((s) => s.entities);
  const url = parseFieldValue(item.url, states, item, entity);
  if (!url) return null;
  return (
    <div className="item-entity-container">
      <div className="item-image" style={{ backgroundImage: `url(${url})` }} />
    </div>
  );
}