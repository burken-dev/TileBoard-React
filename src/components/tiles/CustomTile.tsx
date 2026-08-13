import type { HaEntity, TileConfig } from '../../config/types';
import { useAppStore } from '../../store';
import { parseFieldValue } from '../../utils/fields';
import { IconTile } from './IconTile';

export function CustomTile({ item, entity }: { item: TileConfig; entity: HaEntity }) {
  const states = useAppStore((s) => s.entities);
  if (item.customHtml) {
    const html = parseFieldValue(item.customHtml, states, item, entity);
    return (
      <div className="item-entity-container">
        <div dangerouslySetInnerHTML={{ __html: String(html ?? '') }} />
      </div>
    );
  }
  return <IconTile item={item} entity={entity} />;
}