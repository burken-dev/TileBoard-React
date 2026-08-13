import type { ReactElement } from 'react';
import type { HaEntity, TileConfig } from '../../config/types';
import { ClimateTile } from './ClimateTile';
import { CoverTile } from './CoverTile';
import { CustomTile } from './CustomTile';
import { DimmerTile } from './DimmerTile';
import { FanTile } from './FanTile';
import { GaugeTile } from './GaugeTile';
import { IconTile } from './IconTile';
import { ImageTile } from './ImageTile';
import { InputDatetimeTile } from './InputDatetimeTile';
import { InputNumberTile } from './InputNumberTile';
import { InputSelectTile } from './InputSelectTile';
import { LightTile } from './LightTile';
import { SensorTile } from './SensorTile';
import { SliderTile } from './SliderTile';
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
    case 'input_number':
      return <InputNumberTile item={item} entity={entity} />;
    case 'input_select':
      return <InputSelectTile item={item} entity={entity} />;
    case 'fan':
      return <FanTile item={item} entity={entity} />;
    case 'climate':
      return <ClimateTile item={item} entity={entity} />;
    case 'cover':
      return <CoverTile item={item} entity={entity} />;
    case 'slider':
      return <SliderTile item={item} entity={entity} />;
    case 'dimmer_switch':
      return <DimmerTile item={item} entity={entity} />;
    case 'light':
      return <LightTile item={item} entity={entity} />;
    case 'input_datetime':
      return <InputDatetimeTile item={item} entity={entity} />;
    default:
      return null;
  }
}