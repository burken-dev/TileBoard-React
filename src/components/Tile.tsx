import type React from 'react';
import type { HaEntity, PageConfig, TileConfig } from '../config/types';
import { useLongPress } from '../hooks/useLongPress';
import { useAppStore } from '../store';
import { entityClick, entityLongPress } from '../tiles/actions';
import {
  entityState,
  entitySubtitle,
  entityTitle,
  getItemEntity,
  itemClasses,
} from '../utils/entity';
import { isHidden, parseFieldValue } from '../utils/fields';
import { callFunction } from '../utils/functions';
import { itemPositionStyles, pageOpts } from '../utils/layout';
import { toAbsoluteServerURL } from '../utils/misc';
import { TileBody } from './tiles/TileBody';

interface TileProps {
  item: TileConfig;
  page: PageConfig;
}

function itemBackgroundStyles(
  item: TileConfig,
  entity: HaEntity,
  entities: Record<string, HaEntity>,
  serverUrl: string,
): React.CSSProperties {
  const styles: React.CSSProperties = {};
  if ('bgOpacity' in item) {
    styles.opacity = parseFieldValue(item.bgOpacity, entities, item, entity) as number;
  }
  if (item.bg) {
    const bg = parseFieldValue(item.bg, entities, item, entity);
    if (bg) styles.backgroundImage = `url(${bg})`;
  } else if (item.bgSuffix) {
    const bg = parseFieldValue(item.bgSuffix, entities, item, entity);
    if (bg) styles.backgroundImage = `url("${toAbsoluteServerURL(String(bg), serverUrl)}")`;
  }
  return styles;
}

export default function Tile({ item, page }: TileProps) {
  const config = useAppStore((s) => s.config);
  const entities = useAppStore((s) => s.entities);
  const isLoading = useAppStore((s) => s.isLoading);
  const selectOpened = useAppStore((s) => s.selectOpened);
  const activePage = useAppStore((s) => s.activePage);
  const activeCamera = useAppStore((s) => s.activeCamera);
  const screensaverShown = useAppStore((s) => s.screensaverShown);

  const entity = getItemEntity(item, entities);

  const long = useLongPress(
    () => {
      if (entity) entityLongPress(item, entity);
    },
    () => {
      if (entity) entityClick(item, entity);
    },
  );

  if (!entity || isHidden(item, entities)) return null;

  const title = entityTitle(item, entity, entities);
  const subtitle = entitySubtitle(item, entity, entities);
  const state = entityState(item, entity, entities);
  const loading = isLoading(item);

  const base = itemPositionStyles(item, pageOpts(page, config));
  let custom: React.CSSProperties = {};
  if (typeof item.customStyles === 'function') {
    custom = (callFunction(item.customStyles, [item, entity]) as React.CSSProperties) ?? {};
  } else if (item.customStyles) {
    custom = item.customStyles;
  }
  const styles = { ...base, ...custom };

  const slides = item.slides ?? [];
  const freezed =
    activePage !== config.pages.indexOf(page) || activeCamera !== null || screensaverShown;

  return (
    <div
      className={'item ' + itemClasses(item, entity, loading, selectOpened(item)).join(' ')}
      style={styles}
      onPointerDown={long.onPointerDown}
      onPointerUp={long.onPointerUp}
      onPointerLeave={long.onPointerLeave}
    >
      <div className="item-clickable" />
      {(item.bg || item.bgSuffix) && (
        <div
          className="item-background"
          style={itemBackgroundStyles(item, entity, entities, config.serverUrl)}
        />
      )}
      {title ? <div className="item-title">{title}</div> : null}
      {subtitle ? <div className="item-subtitle">{subtitle}</div> : null}
      {state ? <div className="item-state">{state}</div> : null}
      {slides.length > 0 && (
        <div className="item-slides-container">
          <div
            className={'item-slides -c' + slides.length}
            style={{
              animationDelay: `${(item.slidesDelay ?? 0)}s`,
              opacity: item.bgOpacity as number | undefined,
            }}
          >
            {slides.map((slide, index) => {
              const bg = parseFieldValue(slide.bg, entities, item, entity);
              return (
                <div
                  key={index}
                  className="item-slide"
                  style={{ backgroundImage: bg ? `url(${bg})` : undefined }}
                />
              );
            })}
          </div>
        </div>
      )}
      <TileBody item={item} entity={entity} freezed={freezed} />
    </div>
  );
}