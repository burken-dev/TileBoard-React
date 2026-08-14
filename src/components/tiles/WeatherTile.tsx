import { memo } from 'react';
import type { HaEntity, TileConfig } from '../../config/types';
import { useEntities } from '../../store';
import { parseFieldValue } from '../../utils/fields';
import { getWeatherField, getWeatherIcon, getWeatherImageStyles } from '../../utils/weather';

export const WeatherTile = memo(function WeatherTile({ item, entity }: { item: TileConfig; entity: HaEntity }) {
  const states = useEntities([String(item.id)]);
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
});