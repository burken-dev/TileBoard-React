import { memo } from 'react';
import type { HaEntity, TileConfig } from '../../config/types';
import { SelectOverlay } from '../SelectOverlay';
import { useAppStore, useEntities } from '../../store';
import { setFanSpeed } from '../../tiles/actions';
import { entityIcon } from '../../utils/entity';

export const FanTile = memo(function FanTile({ item, entity }: { item: TileConfig; entity: HaEntity }) {
  const states = useEntities([String(item.id)]);
  const activeSelect = useAppStore((s) => s.activeSelect);
  const openSelect = useAppStore((s) => s.openSelect);
  const closeSelect = useAppStore((s) => s.closeSelect);
  const opened = activeSelect?.id === item.id;
  const icon = entityIcon(item, entity, states);
  const speedList = entity.attributes.speed_list as string[] | undefined;
  const speed = String(entity.attributes.speed ?? '');

  return (
    <div className="item-entity-container">
      {icon ? (
        <div className={'item-entity' + (speedList ? ' -with-select' : '')}>
          <span className={'item-entity--icon mdi ' + icon} />
        </div>
      ) : null}
      {speedList ? (
        <div className="item-fan">
          <div
            className="item-fan--speed"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              openSelect(item);
            }}
          >
            <span>{speed}</span>
          </div>
        </div>
      ) : null}
      {opened ? (
        <SelectOverlay
          options={speedList}
          active={speed}
          onChoose={(option) => {
            setFanSpeed(item, entity, option);
            closeSelect();
          }}
        />
      ) : null}
    </div>
  );
});