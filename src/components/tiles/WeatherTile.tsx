import type { EntityStates, HaEntity, TileConfig } from '../../config/types';
import { useAppStore } from '../../store';
import { entityIcon } from '../../utils/entity';
import { parseFieldValue } from '../../utils/fields';
import { callFunction } from '../../utils/functions';

function getWeatherField(
  field: string,
  item: TileConfig,
  entity: HaEntity | null,
  states: EntityStates,
): unknown {
  const fields = item.fields;
  if (!fields || !fields[field]) return null;
  return parseFieldValue(fields[field], states, item, entity);
}

function getWeatherIcon(item: TileConfig, entity: HaEntity | null, states: EntityStates): string | null {
  let icon: string | null = null;
  if (item.icon || item.icons) icon = entityIcon(item, entity, states);
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
  if (typeof map === 'function') return String(callFunction(map, [icon, item, entity]));
  if (!map) return icon;
  return (map as Record<string, string>)[icon] || icon;
}

function getWeatherImageStyles(
  item: TileConfig,
  entity: HaEntity | null,
  states: EntityStates,
): Record<string, string> | null {
  if (!item.iconImage) return null;
  let iconImage = parseFieldValue(item.iconImage, states, item, entity);
  if (typeof item.icons === 'function') {
    iconImage = callFunction(item.icons, [iconImage, item, entity]);
  }
  if (item.icons && typeof item.icons === 'object' && String(iconImage) in (item.icons as object)) {
    iconImage = (item.icons as Record<string, unknown>)[iconImage as string];
  }
  if (!iconImage) return null;
  return { backgroundImage: `url("${String(iconImage)}")` };
}

export function WeatherTile({ item, entity }: { item: TileConfig; entity: HaEntity }) {
  const states = useAppStore((s) => s.entities);
  const icon = getWeatherIcon(item, entity, states);
  const imgStyles = getWeatherImageStyles(item, entity, states);
  const f = item.fields;

  const unit = (field: string): string | null =>
    f?.[field] != null ? String(getWeatherField(field, item, entity, states)) : null;

  return (
    <div className="item-entity-container">
      <div className="weather">
        <div className="weather-icon-container">
          {icon && (
            <div className="weather-icon">
              <div className={'wu wu-' + icon} />
            </div>
          )}
          {imgStyles && (
            <div className="weather-icon-image">
              <div style={imgStyles} />
            </div>
          )}
        </div>

        {f?.temperature != null && (
          <div className="weather-temperature">
            <span>{String(getWeatherField('temperature', item, entity, states))}</span>
            <span>{String(getWeatherField('temperatureUnit', item, entity, states))}</span>
          </div>
        )}

        {f?.highTemperature != null && (
          <div className="weather-line -items">
            <span className="weather-item">
              <i className="mdi mdi-arrow-collapse-up" />
              <span>{String(getWeatherField('highTemperature', item, entity, states))}</span>
              <span>{unit('highTemperatureUnit')}</span>
            </span>
          </div>
        )}

        {f?.lowTemperature != null && (
          <div className="weather-line -items">
            <span className="weather-item">
              <i className="mdi mdi-arrow-collapse-down" />
              <span>{String(getWeatherField('lowTemperature', item, entity, states))}</span>
              <span>{unit('lowTemperatureUnit')}</span>
            </span>
          </div>
        )}

        {(f?.humidity != null || f?.windSpeed != null) && (
          <div className="weather-line -items">
            {f?.humidity != null && (
              <span className="weather-item">
                <i className="mdi mdi-water" />
                <span>{String(getWeatherField('humidity', item, entity, states))}</span>
                <span>{unit('humidityUnit')}</span>
              </span>
            )}
            {f?.windSpeed != null && (
              <span className="weather-item">
                <i className="mdi mdi-weather-windy" />
                <span>{String(getWeatherField('windSpeed', item, entity, states))}</span>
                <span>{unit('windSpeedUnit')}</span>
              </span>
            )}
          </div>
        )}

        {(f?.list as Array<Record<string, unknown>> | undefined ?? []).map((line, index) => (
          <div className="weather-line" key={index}>
            <span>{String(parseFieldValue(line, states, item, entity))}</span>
          </div>
        ))}

        {f?.apparentTemperature != null && (
          <div className="weather-line">
            Feels like
            <span>{String(getWeatherField('apparentTemperature', item, entity, states))}</span>
            <span>{unit('apparentTemperatureUnit')}</span>
          </div>
        )}
        {f?.pressure != null && (
          <div className="weather-line">
            Pressure
            <span>{String(getWeatherField('pressure', item, entity, states))}</span>
            <span>{unit('pressureUnit')}</span>
          </div>
        )}
        {f?.pollen != null && (
          <div className="weather-line">
            Pollen
            <span>{String(getWeatherField('pollen', item, entity, states))}</span>
          </div>
        )}
        {f?.precipProbability != null && (
          <div className="weather-line">
            <span>{String(getWeatherField('precipProbability', item, entity, states))}</span>
            <span>{unit('precipProbabilityUnit')}</span>
            chance of rain
          </div>
        )}
      </div>
    </div>
  );
}