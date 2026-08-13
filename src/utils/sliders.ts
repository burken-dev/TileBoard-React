import type { HaEntity, SliderConfig, TileConfig } from '../config/types';
import { callService } from '../ha/services';
import { withLoading } from '../tiles/actions';
import { debounce } from './misc';

export interface SliderRuntime extends SliderConfig {
  value: number;
  min: number;
  max: number;
  step: number;
}

const num = (v: unknown): number => (typeof v === 'number' ? v : Number(v)) || 0;

export function getSliderConf(item: TileConfig, entity: HaEntity): SliderRuntime {
  const def = item.slider ?? {};
  const attrs = entity.attributes ?? {};
  const field = def.field ?? 'value';
  return {
    ...def,
    max: num(attrs.max) || def.max || 100,
    min: num(attrs.min) || def.min || 0,
    step: def.step || num(attrs.step) || 1,
    value: num(attrs[field]) || num(entity.state) || def.value || 0,
    request: def.request ?? { domain: 'input_number', service: 'set_value', field: 'value' },
  };
}

export function getLightSliderConf(slider: SliderConfig, entity: HaEntity): SliderRuntime {
  const def = slider ?? {};
  const attrs = entity.attributes ?? {};
  const field = def.field ?? 'value';
  return {
    ...def,
    max: def.max || num(attrs.max) || 100,
    min: def.min || num(attrs.min) || 0,
    step: def.step || num(attrs.step) || 1,
    value: num(attrs[field]) || num(def.min) || num(attrs.min) || 0,
    request: def.request ?? { domain: 'input_number', service: 'set_value', field },
  };
}

function sendSliderValueFn(item: TileConfig, conf: SliderRuntime): void {
  const { request } = conf;
  if (!request) return;
  const data: Record<string, unknown> = { entity_id: item.id };
  data[request.field ?? 'value'] = conf.value;
  withLoading(item, () => callService(request.domain, request.service, data));
}

export const sendSliderValue = debounce(sendSliderValueFn, 250);