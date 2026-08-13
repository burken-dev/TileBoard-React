import type { HaEntity, PageConfig } from '../../config/types';
import { useAppStore } from '../../store';
import { Camera } from '../cameras/Camera';
import { CameraStream } from '../cameras/CameraStream';
import { CameraThumbnail } from '../cameras/CameraThumbnail';
import Tile from '../Tile';
import { getItemEntity, entityTitle } from '../../utils/entity';

export default function DoorEntryPopup() {
  const activeDoorEntry = useAppStore((s) => s.activeDoorEntry);
  const closeDoorEntry = useAppStore((s) => s.closeDoorEntry);
  const states = useAppStore((s) => s.entities);
  const config = useAppStore((s) => s.config);
  const activePage = useAppStore((s) => s.activePage);

  if (!activeDoorEntry) return null;
  const layout = activeDoorEntry.layout;
  if (!layout) return null;
  const camera = layout.camera;
  const cameraId = camera.id;
  const cameraEntity: HaEntity | null =
    typeof cameraId === 'object' ? cameraId : states[cameraId] ?? null;
  if (!cameraEntity) return null;

  const page: PageConfig =
    layout.page ?? config.pages[activePage] ?? config.pages[0] ?? { tiles: [] };

  const cameraView =
    camera.type === 'camera' ? (
      <Camera item={camera} entity={cameraEntity} freezed={false} />
    ) : camera.type === 'camera_thumbnail' ? (
      <CameraThumbnail item={camera} entity={cameraEntity} freezed={false} />
    ) : (
      <CameraStream item={camera} entity={cameraEntity} freezed={false} />
    );

  return (
    <div className="door-entry-popup">
      <div className="door-entry-popup-container">
        <div className="door-entry-popup-title">
          <div className="door-entry-popup-close" onClick={() => closeDoorEntry()}>
            <i className="mdi mdi-close" />
          </div>
          {entityTitle(activeDoorEntry, getItemEntity(activeDoorEntry, states), states)}
        </div>
        <div className="door-entry-popup-container">
          <div className="door-entry-popup--camera">{cameraView}</div>
          <div className="door-entry-popup--tiles">
            {(layout.tiles ?? []).map((tile, index) => (
              <Tile key={index} item={tile} page={page} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}