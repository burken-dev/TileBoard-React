import { memo } from 'react';
import type { HeaderItemConfig } from '../config/types';
import { useAppStore } from '../store';
import { isHidden } from '../utils/fields';
import { getWeatherField, getWeatherIcon, getWeatherImageStyles } from '../utils/weather';
import Clock from './Clock';
import DateDisplay from './DateDisplay';

function HeaderItem({ item }: { item: HeaderItemConfig }) {
  if (isHidden(item, {} as never)) return null;

  return (
    <div className={'header-item -' + item.type} style={item.styles}>
      {item.type === 'time' && <Clock />}
      {item.type === 'date' && <DateDisplay format={item.format ?? 'EEEE, LLLL dd'} />}
      {item.type === 'datetime' && (
        <>
          <Clock />
          <DateDisplay format={item.dateFormat ?? 'EEEE, LLLL dd'} />
        </>
      )}
      {item.type === 'custom_html' && (
        <div dangerouslySetInnerHTML={{ __html: item.html ?? '' }} />
      )}
      {item.type === 'weather' && <HeaderWeather item={item} />}
    </div>
  );
}

export default memo(HeaderItem);

function HeaderWeather({ item }: { item: HeaderItemConfig }) {
  const states = useAppStore((s) => s.entities);
  const icon = getWeatherIcon(item, null, states);
  const imgStyles = getWeatherImageStyles(item, null, states);

  return (
    <>
      <div className="header-weather--icon-container">
        {icon && (
          <div className="header-weather--icon">
            <div className={'wu wu-' + icon} />
          </div>
        )}
        {imgStyles && (
          <div className="header-weather--icon-image">
            <div style={imgStyles} />
          </div>
        )}
      </div>
      {item.fields?.temperature && (
        <div className="header-weather--temperature">
          <span>{String(getWeatherField('temperature', item, null, states))}</span>
          <span>{String(getWeatherField('temperatureUnit', item, null, states))}</span>
        </div>
      )}
      {item.fields?.summary && (
        <div className="header-weather--summary">
          <span>{String(getWeatherField('summary', item, null, states))}</span>
        </div>
      )}
    </>
  );
}