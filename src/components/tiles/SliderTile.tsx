import { memo } from 'react';
import type { HaEntity, TileConfig } from '../../config/types';
import { useEntities } from '../../store';
import { getSliderConf, sendSliderValue } from '../../utils/sliders';
import { entityUnit, entityValue } from '../../utils/entity';
import { SliderInput } from './SliderInput';

export const SliderTile = memo(function SliderTile({ item, entity }: { item: TileConfig; entity: HaEntity }) {
  const states = useEntities([String(item.id)]);
  const conf = getSliderConf(item, entity);
  const unit = entityUnit(item, entity, states);

  return (
    <div className={'item-entity-container' + ((item.bottom as boolean) ? ' -slider-bottom' : '')}>
      <div className="item-entity">
        <span className="item-entity--value">{String(entityValue(item, entity, states) ?? '')}</span>
        {unit ? <span className="item-entity--unit">{unit}</span> : null}
      </div>
      <SliderInput conf={conf} onChange={(value) => sendSliderValue(item, { ...conf, value })} />
    </div>
  );
});