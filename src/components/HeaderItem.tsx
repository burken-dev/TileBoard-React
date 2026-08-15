import { memo } from 'react';
import type React from 'react';
import type { HeaderItemConfig } from '../config/types';
import { useAppStore } from '../store';
import { isHidden, resolveFields } from '../utils/fields';
import { HEADER_ITEM_FIELDS } from '../utils/fields';
import { getWeatherField, getWeatherIcon, getWeatherImageStyles } from '../utils/weather';
import Clock from './Clock';
import DateDisplay from './DateDisplay';
import PhotoDate from './PhotoDate';

function HeaderItem({ item, slideBg }: { item: HeaderItemConfig; slideBg?: string }) {
  const states = useAppStore((s) => s.entities);
  const resolved = resolveFields(item, HEADER_ITEM_FIELDS, states, null);
  if (isHidden(resolved, states)) return null;

  return (
    <div className={'header-item -' + resolved.type} style={resolved.styles as React.CSSProperties}>
      {resolved.type === 'time' && <Clock />}
      {resolved.type === 'date' && (
        <DateDisplay format={(resolved.format as string | undefined) ?? 'EEEE, LLLL dd'} />
      )}
      {resolved.type === 'datetime' && (
        <>
          <Clock />
          <DateDisplay format={(resolved.dateFormat as string | undefined) ?? 'EEEE, LLLL dd'} />
        </>
      )}
      {resolved.type === 'custom_html' && (
        <div dangerouslySetInnerHTML={{ __html: (resolved.html as string | undefined) ?? '' }} />
      )}
      {resolved.type === 'weather' && <HeaderWeather item={item} />}
      {resolved.type === 'photo_date' && <PhotoDate bg={slideBg} format={resolved.format as string | undefined} />}
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