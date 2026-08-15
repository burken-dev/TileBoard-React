import { memo, useRef } from 'react';
import type { HaEntity, TileConfig } from '../../config/types';
import { FEATURES } from '../../config/constants';
import { useAppStore, useEntities } from '../../store';
import {
  decreaseBrightness,
  increaseBrightness,
  setLightColor,
} from '../../tiles/actions';
import { entityIcon } from '../../utils/entity';
import { debounce } from '../../utils/misc';
import { getLightSliderConf, sendSliderValue } from '../../utils/sliders';
import { SliderInput } from './SliderInput';
import { RgbColorPicker } from 'react-colorful';
import { supportsFeature } from '../../utils/entity';

export const LightTile = memo(function LightTile({ item, entity }: { item: TileConfig; entity: HaEntity }) {
  const states = useEntities([String(item.id)]);
  const lightControls = useAppStore((s) => s.lightControls);
  const closeLightControls = useAppStore((s) => s.closeLightControls);
  const controlsEnabled = [...lightControls].some((c) => c.id === item.id);

  const onColorChange = useRef(
    debounce((color: { r: number; g: number; b: number }) => {
      setLightColor(item, [color.r, color.g, color.b]);
    }, 250),
  ).current;

  if (controlsEnabled) {
    const rgb = entity.attributes.rgb_color as [number, number, number] | undefined;
    const color = rgb ? { r: rgb[0], g: rgb[1], b: rgb[2] } : { r: 255, g: 255, b: 255 };
    return (
      <div
        className="item-entity-sliders"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {item.sliders?.map((slider, index) => {
          const conf = getLightSliderConf(slider, entity, states);
          return (
            <div className="item-slider-container" key={index}>
              {conf.title ? (
                <div className="item-slider-title">
                  <span>{String(conf.title)}</span>: <span>{slider.formatValue ? slider.formatValue(conf) : conf.value}</span>
                </div>
              ) : null}
              <SliderInput conf={conf} onChange={(value) => sendSliderValue(item, { ...conf, value })} />
            </div>
          );
        })}
        {(item.colorpicker as boolean) ? (
          <div className="item-entity-colorpicker">
            <span>Color:</span>
            <RgbColorPicker color={color} onChange={onColorChange} />
          </div>
        ) : null}
        <div
          className="item-entity--back-button"
          onClick={(e) => {
            e.stopPropagation();
            closeLightControls(item);
          }}
        >
          <i className="mdi mdi-chevron-left" /> Back
        </div>
      </div>
    );
  }

  const showButtons =
    supportsFeature(FEATURES.LIGHT.BRIGHTNESS, entity) && entity.state !== 'off';

  return (
    <div className="item-entity-container">
      {showButtons ? (
        <div>
          <div
            className="item-button -center-right"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              increaseBrightness(item, entity);
            }}
          >
            <i className="mdi mdi-plus" />
          </div>
          <div
            className="item-button -bottom-right"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              decreaseBrightness(item, entity);
            }}
          >
            <i className="mdi mdi-minus" />
          </div>
        </div>
      ) : null}
      <div className="item-entity">
        <span className={'item-entity--icon mdi ' + (entityIcon(item, entity, states) ?? '')} />
      </div>
    </div>
  );
});