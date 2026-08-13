import type { HaEntity, TileConfig } from '../../config/types';
import { SelectOverlay } from '../SelectOverlay';
import { useAppStore } from '../../store';
import { setFanSpeed } from '../../tiles/actions';
import { entityIcon } from '../../utils/entity';

export function FanTile({ item, entity }: { item: TileConfig; entity: HaEntity }) {
  const states = useAppStore((s) => s.entities);
  const activeSelect = useAppStore((s) => s.activeSelect);
  const openSelect = useAppStore((s) => s.openSelect);
  const closeSelect = useAppStore((s) => s.closeSelect);
  const opened = activeSelect === item;
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
}