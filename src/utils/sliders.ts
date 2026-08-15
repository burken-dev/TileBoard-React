import type { EntityStates, HaEntity, SliderConfig, TileConfig } from '../config/types';
import { callService } from '../ha/services';
import { withLoading } from '../tiles/actions';
import { resolveFields, SLIDER_FIELDS } from './fields';
import { debounce } from './misc';

export interface SliderRuntime extends SliderConfig {
  value: number;
  min: number;
  max: number;
  step: number;
}

const num = (v: unknown): number => (typeof v === 'number' ? v : Number(v)) || 0;

export function getSliderConf(item: TileConfig, entity: HaEntity, states: EntityStates): SliderRuntime {
  const def = resolveFields<SliderConfig>(item.slider ?? ({} as SliderConfig), SLIDER_FIELDS, states, entity);
  const attrs = entity.attributes ?? {};
  const field = (def.field as string | undefined) ?? 'value';
  return {
    ...def,
    max: num(attrs.max) || (def.max as number) || 100,
    min: num(attrs.min) || (def.min as number) || 0,
    step: (def.step as number) || num(attrs.step) || 1,
    value: num(attrs[field]) || num(entity.state) || (def.value as number) || 0,
    request: def.request ?? { domain: 'input_number', service: 'set_value', field: 'value' },
  };
}

export function getLightSliderConf(slider: SliderConfig, entity: HaEntity, states: EntityStates): SliderRuntime {
  const def = resolveFields<SliderConfig>(slider ?? ({} as SliderConfig), SLIDER_FIELDS, states, entity);
  const attrs = entity.attributes ?? {};
  const field = (def.field as string | undefined) ?? 'value';
  return {
    ...def,
    max: (def.max as number) || num(attrs.max) || 100,
    min: (def.min as number) || num(attrs.min) || 0,
    step: (def.step as number) || num(attrs.step) || 1,
    value: num(attrs[field]) || num(def.min as number) || num(attrs.min) || 0,
    request: def.request ?? { domain: 'input_number', service: 'set_value', field },
  };
}

function sendSliderValueFn(item: TileConfig, conf: SliderRuntime): void {
  const request = conf.request as
    | { type?: string; domain: string; service: string; field?: string }
    | undefined;
  if (!request) return;
  const data: Record<string, unknown> = { entity_id: item.id };
  data[request.field ?? 'value'] = conf.value;
  withLoading(item, () => callService(request.domain, request.service, data));
}

export const sendSliderValue = debounce(sendSliderValueFn, 250);