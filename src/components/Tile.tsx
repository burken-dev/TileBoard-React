import { memo } from 'react';
import type React from 'react';
import type { HaEntity, PageConfig, TileConfig } from '../config/types';
import { useLongPress } from '../hooks/useLongPress';
import { useAppStore, useEntities } from '../store';
import { entityClick, entityLongPress } from '../tiles/actions';
import {
  entityState,
  entitySubtitle,
  entityTitle,
  getItemEntity,
  itemClasses,
} from '../utils/entity';
import { isHidden, parseFieldValue, resolveTile } from '../utils/fields';
import { cssStyles } from '../utils/styles';
import { itemPositionStyles, pageOpts } from '../utils/layout';
import { toAbsoluteServerURL } from '../utils/misc';
import { TileBody } from './tiles/TileBody';
import { MultiTile } from './tiles/MultiTile';

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

function Tile({ item, page }: TileProps) {
  const config = useAppStore((s) => s.config);
  const entities = useEntities([String(item.id)]);
  const isLoading = useAppStore((s) => s.isLoading);
  const selectOpened = useAppStore((s) => s.selectOpened);
  const activePage = useAppStore((s) => s.activePage);
  const activeCamera = useAppStore((s) => s.activeCamera);
  const screensaverShown = useAppStore((s) => s.screensaverShown);
  useAppStore((s) => s.uiState);

  const entity = item.type === 'multi' ? null : getItemEntity(item, entities);

  const long = useLongPress(
    () => {
      if (entity) entityLongPress(item, entity);
    },
    () => {
      if (entity) entityClick(item, entity);
    },
  );

  if (item.type === 'multi') return <MultiTile item={item} page={page} />;

  if (!entity || isHidden(item, entities)) return null;

  const resolved = resolveTile(item, entity, entities);
  const title = entityTitle(resolved, entity, entities);
  const subtitle = entitySubtitle(resolved, entity, entities);
  const state = entityState(resolved, entity, entities);
  const loading = isLoading(resolved);

  const base = itemPositionStyles(resolved, pageOpts(page, config, entities));
  const custom = resolved.customStyles ?? {};
  const styles = { ...base, ...cssStyles(custom as Record<string, unknown>) };

  const slides = resolved.slides ?? [];
  const freezed =
    activePage !== config.pages.indexOf(page) || activeCamera !== null || screensaverShown;

  return (
    <div
      className={'item ' + itemClasses(resolved, entity, loading, selectOpened(resolved)).join(' ')}
      style={styles}
      onPointerDown={long.onPointerDown}
      onPointerMove={long.onPointerMove}
      onPointerUp={long.onPointerUp}
      onPointerLeave={long.onPointerLeave}
      onPointerCancel={long.onPointerCancel}
      onClick={long.onClick}
    >
      <div className="item-clickable" />
      {(resolved.bg || resolved.bgSuffix) && (
        <div
          className="item-background"
          style={itemBackgroundStyles(resolved, entity, entities, config.serverUrl)}
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
              animationDelay: `${(resolved.slidesDelay ?? 0)}s`,
              opacity: resolved.bgOpacity as number | undefined,
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
      <TileBody item={resolved} entity={entity} freezed={freezed} page={page} />
    </div>
  );
}

export default memo(Tile);