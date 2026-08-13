import type { EntityStates, HaEntity, TileConfig } from '../config/types';
import { entityIcon } from './entity';
import { parseFieldValue } from './fields';
import { callFunction } from './functions';

interface WeatherItemLike {
  icon?: unknown;
  icons?: unknown;
  iconImage?: unknown;
  state?: unknown;
  fields?: Record<string, unknown>;
}

function asTileConfig(item: WeatherItemLike): TileConfig {
  return item as unknown as TileConfig;
}

export function getWeatherField(
  field: string,
  item: WeatherItemLike,
  entity: HaEntity | null,
  states: EntityStates,
): unknown {
  const fields = item.fields;
  if (!fields || !fields[field]) return null;
  return parseFieldValue(fields[field], states, asTileConfig(item), entity);
}

export function getWeatherIcon(
  item: WeatherItemLike,
  entity: HaEntity | null,
  states: EntityStates,
): string | null {
  let icon: string | null = null;
  if (item.icon || item.icons) icon = entityIcon(asTileConfig(item), entity, states);
  if (!icon) {
    icon = getWeatherField('icon', item, entity, states) as string | null;
    if (icon) {
      console.warn(
        '`icon` field inside fields is deprecated for WEATHER tile, please move it to the tile object',
      );
    }
  }
  if (!icon) return null;

  let map: unknown = item.icons;
  if (!map && item.fields?.iconMap) {
    map = item.fields.iconMap;
    if (icon) {
      console.warn(
        '`iconMap` field inside fields is deprecated for WEATHER tile, please move it to the tile object as `icons`',
      );
    }
  }
  if (typeof map === 'function') {
    return String(callFunction(map, [icon, asTileConfig(item), entity]));
  }
  if (!map) return icon;
  return (map as Record<string, string>)[icon] || icon;
}

export function getWeatherImageStyles(
  item: WeatherItemLike,
  entity: HaEntity | null,
  states: EntityStates,
): Record<string, string> | null {
  if (!item.iconImage) return null;
  let iconImage = parseFieldValue(item.iconImage, states, asTileConfig(item), entity);
  if (typeof item.icons === 'function') {
    iconImage = callFunction(item.icons, [iconImage, asTileConfig(item), entity]);
  }
  if (item.icons && typeof item.icons === 'object' && String(iconImage) in (item.icons as object)) {
    iconImage = (item.icons as Record<string, unknown>)[String(iconImage)];
  }
  if (!iconImage) return null;
  return { backgroundImage: `url("${String(iconImage)}")` };
}