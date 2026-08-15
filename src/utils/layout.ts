import type { CSSProperties } from 'react';
import type { EntityStates, GroupConfig, PageConfig, TileBoardConfig, TileConfig } from '../config/types';
import { toAbsoluteServerURL } from './misc';
import { resolveFieldValue } from './fields';

export interface SizeOpts {
  tileSize: number;
  tileMargin: number;
}

export function calcGroupSize(group: GroupConfig, states: EntityStates): { width: number; height: number } {
  let width = 0;
  let height = 0;
  for (const item of group.items || []) {
    const w = (resolveFieldValue(item.width, states, item, null) as number | undefined) ?? 1;
    const h = (resolveFieldValue(item.height, states, item, null) as number | undefined) ?? 1;
    height = Math.max(height, item.position[1] + h);
    width = Math.max(width, item.position[0] + w);
  }
  return { width, height };
}

export function groupSizeStyles(group: GroupConfig, opts: SizeOpts, states: EntityStates): CSSProperties {
  const w = (group.width as number | undefined) ?? calcGroupSize(group, states).width;
  const h = (group.height as number | undefined) ?? calcGroupSize(group, states).height;
  return {
    width: `${opts.tileSize * w + opts.tileMargin * (w - 1)}px`,
    height: `${opts.tileSize * h + opts.tileMargin * (h - 1)}px`,
  };
}

export function itemPositionStyles(item: TileConfig, opts: SizeOpts): CSSProperties {
  const w = (item.width as number | undefined) ?? 1;
  const h = (item.height as number | undefined) ?? 1;
  return {
    width: `${opts.tileSize * w + opts.tileMargin * (w - 1)}px`,
    height: `${opts.tileSize * h + opts.tileMargin * (h - 1)}px`,
    left: `${item.position[0] * opts.tileSize + opts.tileMargin * item.position[0]}px`,
    top: `${item.position[1] * opts.tileSize + opts.tileMargin * item.position[1]}px`,
  };
}

export function pageOpts(page: PageConfig, config: TileBoardConfig, states: EntityStates): SizeOpts {
  return {
    tileSize:
      (resolveFieldValue(page.tileSize, states, page, null) as number | undefined) ??
      config.tileSize ??
      150,
    tileMargin:
      (resolveFieldValue(page.tileMargin, states, page, null) as number | undefined) ??
      config.tileMargin ??
      6,
  };
}

export function groupMargin(
  page: PageConfig,
  group: GroupConfig,
  config: TileBoardConfig,
  states: EntityStates,
): string {
  return (
    (resolveFieldValue(page.groupMarginCss, states, page, null) as string | undefined) ??
    (resolveFieldValue(group.groupMarginCss, states, group, null) as string | undefined) ??
    config.groupMarginCss ??
    ''
  );
}

export function pageBackground(page: PageConfig, config: TileBoardConfig, states: EntityStates): CSSProperties {
  const styles: CSSProperties = {};
  const bg = resolveFieldValue(page.bg, states, page, null);
  if (bg) {
    styles.backgroundImage = `url("${bg}")`;
  } else if (page.bgSuffix) {
    const suffix = resolveFieldValue(page.bgSuffix, states, page, null);
    styles.backgroundImage = `url("${toAbsoluteServerURL(String(suffix), config.serverUrl)}")`;
  }
  return styles;
}

export function bodyClasses(
  config: TileBoardConfig,
  scroll: { horizontal: boolean; vertical: boolean },
): string[] {
  const classes: string[] = [];

  if (config.customTheme) {
    const themes = Array.isArray(config.customTheme)
      ? config.customTheme
      : [config.customTheme];
    themes.forEach((theme) => {
      if (theme) classes.push('-theme-' + theme);
    });
  }

  if (config.entitySize) classes.push('-' + config.entitySize + '-entity');

  classes.push('-menu-' + (config.menuPosition ?? 'left'));
  classes.push('-groups-align-' + (config.groupsAlign ?? 'horizontally'));

  if (config.hideScrollbar) classes.push('-hide-scrollbar');

  if (scroll.horizontal) classes.push('-scrolled-horizontally');
  if (scroll.vertical) classes.push('-scrolled-vertically');

  return classes;
}

export function pageTransform(
  index: number,
  transition: string,
  menuOnLeft: boolean,
): string | undefined {
  const offset = -index * 100;
  if (transition === 'animated_gpu') {
    return menuOnLeft
      ? `translate3d(0, ${offset}%, 0)`
      : `translate3d(${offset}%, 0, 0)`;
  }
  if (transition === 'animated') {
    return menuOnLeft ? `translate(0, ${offset}%)` : `translate(${offset}%, 0)`;
  }
  return undefined;
}

export function shouldDrawPage(
  pageIndex: number,
  activeIndex: number,
  transition: string,
): boolean {
  return transition === 'simple' ? pageIndex === activeIndex : true;
}