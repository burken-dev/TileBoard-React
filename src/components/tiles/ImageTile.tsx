import { memo } from 'react';
import type { HaEntity, TileConfig } from '../../config/types';
import { useEntities } from '../../store';
import { parseFieldValue } from '../../utils/fields';

export const ImageTile = memo(function ImageTile({ item, entity }: { item: TileConfig; entity: HaEntity }) {
  const states = useEntities([String(item.id)]);
  const url = parseFieldValue(item.url, states, item, entity);
  if (!url) return null;
  return (
    <div className="item-entity-container">
      <div className="item-image" style={{ backgroundImage: `url(${url})` }} />
    </div>
  );
});