import type { ConfigFunction, EntityStates, HaEntity, TileConfig } from '../config/types';
import { callFunction } from './functions';

export function parseFieldValue(
  value: unknown,
  states: EntityStates,
  item?: TileConfig,
  entity?: HaEntity | null,
): unknown {
  if (!value) return null;
  if (typeof value === 'function') return callFunction(value, [item, entity]);
  if (typeof value === 'string') return parseString(value, states, entity);
  return value;
}

function getObjectAttr(obj: unknown, path: string): unknown {
  let res: unknown = obj;
  path.split('.').forEach((key) => {
    res = typeof res === 'object' && res ? (res as Record<string, unknown>)[key] : undefined;
  });
  return res;
}

function getEntityAttr(str: string, states: EntityStates): unknown {
  const path = str.split('.');
  if (path.length < 3) return undefined;
  const entity = states[path.slice(0, 2).join('.')] || null;
  return getObjectAttr(entity, path.slice(2).join('.'));
}

function parseVariable(value: string, states: EntityStates, entity?: HaEntity | null): unknown {
  if (value[0] === '@') return getObjectAttr(entity, value.slice(1));
  if (value[0] === '&') return getEntityAttr(value.slice(1), states);
  return value;
}

export function parseString(
  value: string,
  states: EntityStates,
  entity?: HaEntity | null,
): string {
  return value.replace(/([&@][\w\d._]+)/gi, (match) => {
    if (match[0] === '&' && match.split('.').length < 3) return match;

    const res = parseVariable(match, states, entity);

    if (typeof res === 'undefined') {
      if (match === value) return '';
      return match;
    }
    if (res === null) return '';
    return String(res);
  });
}

export function getItemFieldValue(
  field: string,
  states: EntityStates,
  item: TileConfig,
  entity?: HaEntity | null,
): unknown {
  let value: unknown = item;
  field.split('.').forEach((f) => {
    value = typeof value === 'object' ? (value as Record<string, unknown>)[f] : undefined;
  });
  return parseFieldValue(value, states, item, entity);
}

export function isHidden(
  obj: { hidden?: unknown } | undefined,
  _states: EntityStates,
  entity?: HaEntity | null,
): boolean {
  if (!obj || !('hidden' in obj)) return false;
  if (typeof obj.hidden === 'function') return Boolean(callFunction(obj.hidden, [obj, entity]));
  return Boolean(obj.hidden);
}

// resolveFieldValue preserves falsy values (parseFieldValue maps them to null)
export function resolveFieldValue(
  value: unknown,
  states: EntityStates,
  item?: unknown,
  entity?: HaEntity | null,
): unknown {
  if (typeof value === 'function') return callFunction(value as ConfigFunction, [item, entity]);
  if (typeof value === 'string') return parseString(value, states, entity);
  return value;
}

export function resolveFields<T extends object>(
  obj: T,
  keys: readonly (keyof T)[],
  states: EntityStates,
  entity?: HaEntity | null,
): T {
  let changed = false;
  const out: T = { ...obj };
  for (const key of keys) {
    if (!(key in obj)) continue;
    const original = (obj as Record<string, unknown>)[key as string];
    const value = resolveFieldValue(original, states, obj, entity);
    if (value !== original) {
      (out as Record<string, unknown>)[key as string] = value;
      changed = true;
    }
  }
  return changed ? out : obj;
}

export const TILE_FIELDS = [
  'title', 'subtitle', 'bg', 'bgSuffix', 'bgOpacity', 'bgSize', 'slidesDelay', 'hidden',
  'customStyles', 'value', 'unit', 'refresh', 'url', 'icon', 'iconImage', 'customHtml',
  'iframeStyles', 'iframeClasses', 'objFit', 'bufferLength', 'bottom', 'colorpicker',
  'hideSource', 'hideMuteButton', 'map', 'zoomLevels', 'hideEntityPicture', 'hideHeader',
  'width', 'height',
] as const;

export const PAGE_FIELDS = ['icon'] as const;
export const GROUP_FIELDS = ['title', 'width', 'height', 'groupMarginCss'] as const;
export const HEADER_ITEM_FIELDS = ['format', 'dateFormat', 'styles', 'html'] as const;
export const SCREENSAVER_FIELDS = ['timeout', 'slidesTimeout', 'slideCacheBust', 'styles', 'ambient_backdrop'] as const;
export const SLIDER_FIELDS = ['min', 'max', 'step', 'value', 'title', 'field', 'request'] as const;

export function resolveTile(item: TileConfig, entity: HaEntity | null, states: EntityStates): TileConfig {
  return resolveFields(item, TILE_FIELDS as readonly (keyof TileConfig)[], states, entity);
}