import type { EntityStates, Field, HaEntity, TileConfig } from '../config/types';
import { getAppStore } from '../store';
import { callFunction } from './functions';
import { getItemFieldValue, parseFieldValue, parseString } from './fields';
import { escapeClass } from './misc';

const warnedIds = new Set<string>();

export function getItemEntity(item: TileConfig, entities: EntityStates): HaEntity | null {
  if (typeof item.id === 'object') return item.id as HaEntity;
  const entity = entities[item.id] ?? null;
  const { config, entitiesLoaded, addNotification, notificationSeen } = getAppStore();
  if (!entity && entitiesLoaded && !warnedIds.has(item.id)) {
    warnedIds.add(item.id);
    console.warn(`Entity "${item.id}" not found`);
    if (!config.ignoreErrors) {
      const id = `${item.id}_not_found`;
      if (!notificationSeen(id)) {
        setTimeout(() => {
          addNotification({
            type: 'warning',
            id,
            title: 'Entity not found',
            message: String(item.id),
          });
        }, 0);
      }
    }
  }
  return entity;
}

export function entityTitle(
  item: TileConfig,
  entity: HaEntity | null,
  states: EntityStates,
): string | null {
  if (!('title' in item)) {
    return entity?.attributes?.friendly_name != null ? String(entity.attributes.friendly_name) : null;
  }
  return getItemFieldValue('title', states, item, entity) as string | null;
}

export function entitySubtitle(
  item: TileConfig,
  entity: HaEntity | null,
  states: EntityStates,
): string | null {
  return getItemFieldValue('subtitle', states, item, entity) as string | null;
}

export function entityState(
  item: TileConfig,
  entity: HaEntity | null,
  states: EntityStates,
): string | null {
  if (item.state === false) return null;

  if (typeof item.state !== 'undefined') {
    if (typeof item.state === 'string') return parseString(item.state, states, entity);
    if (typeof item.state === 'function') return callFunction(item.state, [item, entity]) as string;
    return String(item.state);
  }

  if (!entity) return null;

  if (typeof item.states === 'function') return callFunction(item.states, [item, entity]) as string;
  if (item.states && typeof item.states === 'object') {
    return item.states[entity.state] || entity.state;
  }
  return entity.state;
}

export function entityValue(
  item: TileConfig,
  entity: HaEntity | null,
  states: EntityStates,
): unknown {
  let value: unknown = entity?.state;
  if (item.value) value = getItemFieldValue('value', states, item, entity);
  if (typeof item.filter === 'function') return callFunction(item.filter, [value, item, entity]);
  return value;
}

export function entityUnit(
  item: TileConfig,
  entity: HaEntity | null,
  states: EntityStates,
): string | null {
  if (!('unit' in item)) {
    return entity?.attributes?.unit_of_measurement != null
      ? String(entity.attributes.unit_of_measurement)
      : null;
  }
  return getItemFieldValue('unit', states, item, entity) as string | null;
}

export function entityIcon(
  item: TileConfig,
  entity: HaEntity | null,
  states: EntityStates,
): string | null {
  let state = parseFieldValue(entity?.state, states, item, entity) as string | null;
  if (!state && item.state) {
    state = parseFieldValue(item.state, states, item, entity) as string | null;
  }
  if (item.icon) {
    state = parseFieldValue(item.icon, states, item, entity) as string | null;
  }
  if (!item.icons) return state;
  if (typeof item.icons === 'function') {
    return callFunction(item.icons, [item, entity]) as string | null;
  }
  return (state != null && item.icons[state]) || null;
}

export function listField(
  field: string,
  line: Record<string, Field<unknown>>,
  item: TileConfig,
  states: EntityStates,
): unknown {
  const value = parseFieldValue(line[field], states, item, null);
  if (typeof item.filter === 'function') return callFunction(item.filter, [value, field, item]);
  return value;
}

export function supportsFeature(feature: number, entity: HaEntity | null): boolean {
  if (!entity || !('supported_features' in entity.attributes)) return false;
  const features = Number(entity.attributes.supported_features);
  return (features & feature) === feature;
}

export function itemClasses(
  item: TileConfig,
  entity: HaEntity | null,
  loading = false,
  selectOpened = false,
): string[] {
  const classes = [
    '-' + item.type,
    '-' + escapeClass(entity?.state),
    '-th-' + (item.theme ?? item.type),
    ...(item.classes ?? []),
    loading ? '-loading' : '',
    selectOpened ? '-top-entity' : '',
  ];
  return classes.filter(Boolean);
}