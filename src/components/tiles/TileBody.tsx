import { lazy, Suspense, type ReactElement } from 'react';
import type { HaEntity, PageConfig, TileConfig } from '../../config/types';
import { Camera } from '../cameras/Camera';
import { CameraStream } from '../cameras/CameraStream';
import { CameraThumbnail } from '../cameras/CameraThumbnail';
import { ClimateTile } from './ClimateTile';
import { CoverTile } from './CoverTile';
import { CustomTile } from './CustomTile';
import { DeviceTrackerTile } from './DeviceTrackerTile';
import { DimmerTile } from './DimmerTile';
import { FanTile } from './FanTile';
import { GaugeTile } from './GaugeTile';
import { IconTile } from './IconTile';
import { IframeTile } from './IframeTile';
import { ImageTile } from './ImageTile';
import { InputDatetimeTile } from './InputDatetimeTile';
import { InputNumberTile } from './InputNumberTile';
import { InputSelectTile } from './InputSelectTile';
import { LightTile } from './LightTile';
import { MediaPlayerTile } from './MediaPlayerTile';
import { SensorTile } from './SensorTile';
import { SliderTile } from './SliderTile';
import { TextListTile } from './TextListTile';
import { WeatherListTile } from './WeatherListTile';
import { WeatherTile } from './WeatherTile';

const GraphTile = lazy(() =>
  import('./GraphTile').then((m) => ({ default: m.GraphTile })),
);

export function TileBody({
  item,
  entity,
  freezed,
  page,
}: {
  item: TileConfig;
  entity: HaEntity;
  freezed: boolean;
  page: PageConfig;
}): ReactElement | null {
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
    case 'graph':
      return (
        <Suspense fallback={null}>
          <GraphTile item={item} entity={entity} />
        </Suspense>
      );
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
    case 'camera':
      return (
        <div className="item-entity-container -below">
          <div className="item-camera">
            <Camera item={item} entity={entity} freezed={freezed} />
          </div>
        </div>
      );
    case 'camera_thumbnail':
      return (
        <div className="item-entity-container -below">
          <div className="item-camera">
            <CameraThumbnail item={item} entity={entity} freezed={freezed} />
          </div>
        </div>
      );
    case 'camera_stream':
      return (
        <div className="item-entity-container -below">
          <div className="item-camera">
            <CameraStream item={item} entity={entity} freezed={freezed} />
          </div>
        </div>
      );
    case 'media_player':
      return <MediaPlayerTile item={item} entity={entity} />;
    case 'weather':
      return <WeatherTile item={item} entity={entity} />;
    case 'weather_list':
      return <WeatherListTile item={item} entity={entity} />;
    case 'device_tracker':
      return <DeviceTrackerTile item={item} entity={entity} page={page} />;
    case 'iframe':
      return <IframeTile item={item} entity={entity} />;
    case 'popup_iframe':
      return <CustomTile item={item} entity={entity} />;
    case 'alarm':
    case 'door_entry':
      return <IconTile item={item} entity={entity} />;
    default:
      return null;
  }
}