import { memo } from 'react';
import type { HaEntity, TileConfig } from '../../config/types';
import { sendCover } from '../../tiles/actions';

export const CoverTile = memo(function CoverTile({ item, entity }: { item: TileConfig; entity: HaEntity }) {
  const attrs = entity.attributes;
  const openDisabled = entity.state === 'open' && (!attrs.current_position || attrs.current_position === 100);
  const closeDisabled = entity.state === 'closed';

  return (
    <div className="item-entity-container">
      <div className="item-cover">
        <div
          className={'item-cover--button -open' + (openDisabled ? ' -disabled' : '')}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            sendCover('open_cover', item, entity);
          }}
        >
          <i className="mdi mdi-arrow-up" />
        </div>
        <div
          className="item-cover--button -stop"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            sendCover('stop_cover', item, entity);
          }}
        >
          <i className="mdi mdi-stop" />
        </div>
        <div
          className={'item-cover--button -close' + (closeDisabled ? ' -disabled' : '')}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            sendCover('close_cover', item, entity);
          }}
        >
          <i className="mdi mdi-arrow-down" />
        </div>
      </div>
    </div>
  );
});