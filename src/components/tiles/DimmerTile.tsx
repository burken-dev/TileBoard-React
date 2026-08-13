import type { HaEntity, TileConfig } from '../../config/types';
import { useAppStore } from '../../store';
import { dimmerAction } from '../../tiles/actions';
import { entityIcon, entityState } from '../../utils/entity';

export function DimmerTile({ item, entity }: { item: TileConfig; entity: HaEntity }) {
  const states = useAppStore((s) => s.entities);
  const icon = entityIcon(item, entity, states);
  const showButtons = Boolean(entityState(item, entity, states)) && entity.state !== 'off';

  return (
    <div className="item-entity-container">
      {showButtons ? (
        <div>
          <div
            className="item-button -center-right"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              dimmerAction('plus', item, entity);
            }}
          >
            <i className="mdi mdi-plus" />
          </div>
          <div
            className="item-button -bottom-right"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              dimmerAction('minus', item, entity);
            }}
          >
            <i className="mdi mdi-minus" />
          </div>
        </div>
      ) : null}
      <div className="item-entity">
        <span className={'item-entity--icon mdi ' + (icon ?? '')} />
      </div>
    </div>
  );
}