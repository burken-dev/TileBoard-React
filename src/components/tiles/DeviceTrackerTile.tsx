import type { HaEntity, PageConfig, TileConfig } from '../../config/types';
import { useAppStore } from '../../store';
import { staticMapUrl } from '../../utils/maps';
import { toAbsoluteServerURL } from '../../utils/misc';

interface DeviceTrackerTileProps {
  item: TileConfig;
  entity: HaEntity;
  page: PageConfig;
}

export function DeviceTrackerTile({ item, entity, page }: DeviceTrackerTileProps) {
  const config = useAppStore((s) => s.config);
  const attrs = entity.attributes;
  const hasCoords = !!attrs.longitude || !!attrs.latitude;
  const tileSize = page.tileSize ?? config.tileSize ?? 100;
  const widthPx = tileSize * (item.width ?? 1);
  const heightPx = tileSize * (item.height ?? 1);
  const zoomLevels = item.zoomLevels ?? [9, 13];
  const showBg = !!attrs.entity_picture && !item.hideEntityPicture;
  const count = zoomLevels.length + (showBg ? 1 : 0);

  if (hasCoords) {
    return (
      <div className="item-entity-container -below">
        <div className="item-slides-container">
          <div
            className={'item-slides -c' + count}
            style={{
              animationDelay: `${item.slidesDelay ?? 0}s`,
              ...(item.bgOpacity ? { opacity: item.bgOpacity as number } : {}),
            }}
          >
            {showBg && (
              <div
                className="item-slide -bg"
                style={{
                  backgroundImage: `url("${toAbsoluteServerURL(String(attrs.entity_picture), config.serverUrl)}")`,
                }}
              />
            )}
            {zoomLevels.map((zoom, index) => {
              const url = staticMapUrl({
                provider: item.map ?? 'google',
                lat: Number(attrs.latitude),
                lon: Number(attrs.longitude),
                zoom,
                widthPx,
                heightPx,
                state: entity.state,
                friendlyName: String(attrs.friendly_name ?? ' '),
                googleApiKey: config.googleApiKey,
                mapboxToken: config.mapboxToken,
                mapboxStyle: config.mapboxStyle,
              });
              return url ? (
                <div
                  key={index}
                  className="item-slide -map"
                  style={{ backgroundImage: `url('${url}')`, backgroundSize: 'cover' }}
                />
              ) : null;
            })}
          </div>
        </div>
      </div>
    );
  }

  if (attrs.entity_picture) {
    return (
      <div className="item-entity-container -below">
        <div
          className="item-background"
          style={{
            backgroundImage: `url("${toAbsoluteServerURL(String(attrs.entity_picture), config.serverUrl)}")`,
          }}
        />
      </div>
    );
  }

  return null;
}