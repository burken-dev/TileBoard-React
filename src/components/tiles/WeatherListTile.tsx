import { memo } from 'react';
import type { EntityStates, HaEntity, TileConfig } from '../../config/types';
import { useEntities } from '../../store';
import { parseFieldValue } from '../../utils/fields';
import { callFunction } from '../../utils/functions';

function weatherListField(
  field: string,
  line: Record<string, unknown> | undefined,
  item: TileConfig,
  entity: HaEntity | null,
  states: EntityStates,
): unknown {
  if (!line || !line[field]) return null;
  return parseFieldValue(line[field], states, item, entity);
}

function weatherListIcon(
  line: Record<string, unknown> | undefined,
  item: TileConfig,
  entity: HaEntity | null,
  states: EntityStates,
): string | null {
  const icon = weatherListField('icon', line, item, entity, states) as string | null;
  if (!icon) return null;
  if (typeof item.icons === 'function') return String(callFunction(item.icons, [icon, item, entity]));
  if (!item.icons) return icon;
  return (item.icons as Record<string, string>)[icon] || icon;
}

function weatherListImageStyles(
  line: Record<string, unknown> | undefined,
  item: TileConfig,
  entity: HaEntity | null,
  states: EntityStates,
): Record<string, string> | null {
  let iconImage = weatherListField('iconImage', line, item, entity, states);
  if (!iconImage) return null;
  if (typeof item.icons === 'function') {
    iconImage = callFunction(item.icons, [iconImage, item, entity]);
  }
  if (item.icons && typeof item.icons === 'object' && String(iconImage) in (item.icons as object)) {
    iconImage = (item.icons as Record<string, unknown>)[iconImage as string];
  }
  if (!iconImage) return null;
  return { backgroundImage: `url("${String(iconImage)}")` };
}

export const WeatherListTile = memo(function WeatherListTile({ item, entity }: { item: TileConfig; entity: HaEntity }) {
  const states = useEntities([String(item.id)]);
  const list = (item.list ?? []) as Array<Record<string, unknown>>;

  return (
    <div className="item-entity-container">
      <div className="weather-list">
        <table>
          {!item.hideHeader && (
            <tr className="weather-list-header">
              <th>
                <span>{String(itemField('dateTitle', item, entity, states) ?? 'Date')}</span>
              </th>
              <th className="weather-list-header--icon">
                <span>{String(itemField('iconTitle', item, entity, states))}</span>
              </th>
              <th className="weather-list-header--primary">
                <span>{String(itemField('primaryTitle', item, entity, states) ?? 'Forecast')}</span>
              </th>
              <th className="weather-list-header--secondary">
                <span>{String(itemField('secondaryTitle', item, entity, states))}</span>
              </th>
            </tr>
          )}
          {list.map((line, index) => {
            const icon = weatherListIcon(line, item, entity, states);
            const imgStyles = weatherListImageStyles(line, item, entity, states);
            return (
              <tr key={index}>
                <td className="weather-list-date">
                  <div>{String(weatherListField('date', line, item, entity, states) ?? '')}</div>
                </td>
                <td className="weather-list-icon-container">
                  {icon && (
                    <div className="weather-list-icon">
                      <div className={'wu wu-' + icon} />
                    </div>
                  )}
                  {imgStyles && (
                    <div className="weather-list-icon-image">
                      <div style={imgStyles} />
                    </div>
                  )}
                </td>
                <td className="weather-list--primary">
                  <div>{String(weatherListField('primary', line, item, entity, states) ?? '')}</div>
                </td>
                <td className="weather-list--secondary">
                  <div>{String(weatherListField('secondary', line, item, entity, states) ?? '')}</div>
                </td>
              </tr>
            );
          })}
        </table>
      </div>
    </div>
  );
});

function itemField(field: string, item: TileConfig, entity: HaEntity, states: EntityStates): unknown {
  const value = (item as unknown as Record<string, unknown>)[field];
  return parseFieldValue(value, states, item, entity);
}