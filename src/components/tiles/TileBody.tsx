import type { ReactElement } from 'react';
import type { HaEntity, TileConfig } from '../../config/types';
import { CustomTile } from './CustomTile';
import { GaugeTile } from './GaugeTile';
import { IconTile } from './IconTile';
import { ImageTile } from './ImageTile';
import { SensorTile } from './SensorTile';
import { TextListTile } from './TextListTile';

export function TileBody({ item, entity }: { item: TileConfig; entity: HaEntity }): ReactElement | null {
  switch (item.type) {
    case 'sensor':
      return <SensorTile item={item} entity={entity} />;
    case 'switch':
    case 'lock':
    case 'cover_toggle':
    case 'script':
    case 'automation':
    case 'vacuum':
    case 'sensor_icon':
    case 'input_boolean':
    case 'scene':
      return <IconTile item={item} entity={entity} />;
    case 'custom':
      return <CustomTile item={item} entity={entity} />;
    case 'text_list':
      return <TextListTile item={item} entity={entity} />;
    case 'image':
      return <ImageTile item={item} entity={entity} />;
    case 'gauge':
      return <GaugeTile item={item} entity={entity} />;
    default:
      return null;
  }
}