import { memo } from 'react';
import type { HaEntity, TileConfig } from '../../config/types';
import { SelectOverlay } from '../SelectOverlay';
import { useAppStore, useEntities } from '../../store';
import {
  decreaseClimateTemp,
  increaseClimateTemp,
  setClimateOption,
} from '../../tiles/actions';
import { callFunction } from '../../utils/functions';
import { entityUnit } from '../../utils/entity';

export function climateTarget(item: TileConfig, entity: HaEntity): unknown {
  const attrs = entity.attributes;
  const value: unknown =
    attrs.temperature ?? [attrs.target_temp_low, attrs.target_temp_high].join(' - ');
  if (typeof item.filter === 'function') return callFunction(item.filter, [value, item, entity]);
  return value;
}

export const ClimateTile = memo(function ClimateTile({ item, entity }: { item: TileConfig; entity: HaEntity }) {
  const states = useEntities([String(item.id)]);
  const activeSelect = useAppStore((s) => s.activeSelect);
  const openSelect = useAppStore((s) => s.openSelect);
  const closeSelect = useAppStore((s) => s.closeSelect);
  const opened = activeSelect?.id === item.id;

  const showButtons = Boolean(entity.attributes.temperature) && entity.state !== 'off';
  const unit = entityUnit(item, entity, states);
  const target = climateTarget(item, entity);
  const presetMode = entity.attributes.preset_mode as string | undefined;
  const presetModes = entity.attributes.preset_modes as string[] | undefined;

  return (
    <div className="item-entity-container">
      <div>
        {showButtons ? (
          <>
            <div
              className="item-button -center-right"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                increaseClimateTemp(item, entity);
              }}
            >
              <i className="mdi mdi-plus" />
            </div>
            <div
              className="item-button -bottom-right"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                decreaseClimateTemp(item, entity);
              }}
            >
              <i className="mdi mdi-minus" />
            </div>
          </>
        ) : null}
      </div>
      <div className="item-climate">
        <div className="item-climate--target">
          <span>{String(target ?? '')}</span>
          {unit ? <span className="item-climate--target--unit">{unit}</span> : null}
        </div>
        {presetMode ? (
          <div
            className="item-climate--mode"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              openSelect(item);
            }}
          >
            <span>{presetMode}</span>
          </div>
        ) : null}
      </div>
      {opened ? (
        <SelectOverlay
          options={presetModes}
          active={entity.state}
          onChoose={(option) => {
            setClimateOption(item, entity, option);
            closeSelect();
          }}
        />
      ) : null}
    </div>
  );
});