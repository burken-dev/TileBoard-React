import { useAppStore } from '../../store';
import { getCameraList, getFullscreenEntity } from '../../utils/cameras';
import { entityTitle } from '../../utils/entity';
import { resolveTile } from '../../utils/fields';
import { Camera } from '../cameras/Camera';
import { CameraStream } from '../cameras/CameraStream';
import { CameraThumbnail } from '../cameras/CameraThumbnail';

export default function CameraPopup() {
  const activeCamera = useAppStore((s) => s.activeCamera);
  const closeCamera = useAppStore((s) => s.closeCamera);
  const openCamera = useAppStore((s) => s.openCamera);
  const entities = useAppStore((s) => s.entities);
  const config = useAppStore((s) => s.config);

  if (!activeCamera) return null;
  const entity = getFullscreenEntity(activeCamera, entities);
  if (!entity || !activeCamera.fullscreen) return null;
  const fullscreen = resolveTile(activeCamera.fullscreen, entity, entities);

  return (
    <div className="camera-popup">
      <div className="camera-popup-container">
        <div className="camera-popup-title">
          <div className="camera-popup-close" onClick={() => closeCamera()}>
            <i className="mdi mdi-close" />
          </div>
          {entityTitle(activeCamera, entity, entities)}
        </div>

        <div className="camera-popup--list">
          {getCameraList(config.pages).map((item, index) => {
            const e = getFullscreenEntity(item, entities);
            if (!e) return null;
            return (
              <div
                key={index}
                className={'camera-popup--list-item' + (activeCamera === item ? ' -active' : '')}
                onClick={() => openCamera(item)}
              >
                <span>{entityTitle(item, e, entities)}</span>
              </div>
            );
          })}
        </div>

        <div className="camera-popup--camera">
          {fullscreen.type === 'camera' && (
            <Camera item={fullscreen} entity={entity} freezed={false} />
          )}
          {fullscreen.type === 'camera_thumbnail' && (
            <CameraThumbnail item={fullscreen} entity={entity} freezed={false} />
          )}
          {fullscreen.type === 'camera_stream' && (
            <CameraStream item={fullscreen} entity={entity} freezed={false} />
          )}
        </div>
      </div>
    </div>
  );
}