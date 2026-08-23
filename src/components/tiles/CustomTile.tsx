import { memo, useMemo } from 'react';
import type { HaEntity, TileConfig } from '../../config/types';
import { useEntitiesSelector } from '../../store';
import { parseFieldValue } from '../../utils/fields';
import { parseHtmlToReact } from '../../utils/htmlParser';
import { IconTile } from './IconTile';

interface CustomTileProps {
  item: TileConfig;
  entity: HaEntity;
}

function getDependencyIds(item: TileConfig): string[] {
  if (Array.isArray(item.entities) && item.entities.length > 0) {
    return item.entities;
  }
  return item.id && typeof item.id === 'string' ? [item.id] : [];
}

function areEqual(prev: CustomTileProps, next: CustomTileProps): boolean {
  if (prev.item.id !== next.item.id) return false;
  if (prev.item.customHtml !== next.item.customHtml) return false;
  if (prev.item.customStyles !== next.item.customStyles) return false;
  if (prev.item.entities !== next.item.entities) return false;
  if (prev.entity?.state !== next.entity?.state) return false;
  if (prev.entity?.last_updated !== next.entity?.last_updated) return false;
  return true;
}

export const CustomTile = memo(function CustomTile({
  item,
  entity,
}: CustomTileProps) {
  const depIds = useMemo(() => getDependencyIds(item), [item]);
  const states = useEntitiesSelector(depIds);

  if (item.customHtml) {
    const rawHtml = parseFieldValue(item.customHtml, states, item, entity);
    const content = parseHtmlToReact(typeof rawHtml === 'string' ? rawHtml : '');

    return (
      <div className="item-entity-container">
        {content}
      </div>
    );
  }
  return <IconTile item={item} entity={entity} />;
}, areEqual);