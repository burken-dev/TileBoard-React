import type { HaEntity, TileConfig } from '../../config/types';
import { SelectOverlay, selectStyles } from '../SelectOverlay';
import { useAppStore } from '../../store';
import { setSelectOption } from '../../tiles/actions';
import { entityIcon, entityUnit, entityValue } from '../../utils/entity';

export function InputSelectTile({ item, entity }: { item: TileConfig; entity: HaEntity }) {
  const states = useAppStore((s) => s.entities);
  const activeSelect = useAppStore((s) => s.activeSelect);
  const closeSelect = useAppStore((s) => s.closeSelect);
  const opened = activeSelect === item;
  const options = entity.attributes.options as string[] | undefined;
  const icon = item.icons ? entityIcon(item, entity, states) : null;
  const unit = entityUnit(item, entity, states);

  return (
    <div className="item-entity-container">
      {opened ? (
        <SelectOverlay
          options={options}
          active={entity.state}
          style={selectStyles(options)}
          onChoose={(option) => {
            setSelectOption(item, entity, option);
            closeSelect();
          }}
        />
      ) : null}
      <div className="item-triangle" />
      {item.icons ? (
        <div className="item-entity">
          <span className={'item-entity--icon mdi ' + (icon ?? '')} />
        </div>
      ) : (
        <div className="item-entity -select">
          <span className="item-entity--value">
            <span>{String(entityValue(item, entity, states) ?? '')}</span>
          </span>
          {unit ? <span className="item-entity--unit">{unit}</span> : null}
        </div>
      )}
    </div>
  );
}