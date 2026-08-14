import { memo } from 'react';
import type { HaEntity, TileConfig } from '../../config/types';
import { useEntities } from '../../store';
import { listField } from '../../utils/entity';

export const TextListTile = memo(function TextListTile({ item, entity: _entity }: { item: TileConfig; entity: HaEntity }) {
  const states = useEntities([String(item.id)]);
  return (
    <div className="item-entity-container">
      <div className="item-list">
        {item.list?.map((line, index) => (
          <div className="item-list--item" key={index}>
            <div className="item-list--name">
              {line.icon ? (
                <i className={'mdi ' + String(listField('icon', line, item, states) ?? '')} />
              ) : null}
              <span>{String(listField('title', line, item, states) ?? '')}</span>
            </div>
            <div className="item-list--value">
              <span>{String(listField('value', line, item, states) ?? '')}</span>
              <span>{String(listField('unit', line, item, states) ?? '')}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});