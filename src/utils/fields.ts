import type { EntityStates, HaEntity, TileConfig } from '../config/types';
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