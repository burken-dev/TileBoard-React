import type { CSSProperties } from 'react';
import type { GroupConfig, PageConfig, TileBoardConfig, TileConfig } from '../config/types';
import { toAbsoluteServerURL } from './misc';

export interface SizeOpts {
  tileSize: number;
  tileMargin: number;
}

export function calcGroupSize(group: GroupConfig): { width: number; height: number } {
  let width = 0;
  let height = 0;
  for (const item of group.items || []) {
    height = Math.max(height, item.position[1] + ((item.height as number | undefined) ?? 1));
    width = Math.max(width, item.position[0] + ((item.width as number | undefined) ?? 1));
  }
  return { width, height };
}

export function groupSizeStyles(group: GroupConfig, opts: SizeOpts): CSSProperties {
  const w = group.width ?? calcGroupSize(group).width;
  const h = group.height ?? calcGroupSize(group).height;
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

export function pageOpts(page: PageConfig, config: TileBoardConfig): SizeOpts {
  return {
    tileSize: page.tileSize ?? config.tileSize ?? 150,
    tileMargin: page.tileMargin ?? config.tileMargin ?? 6,
  };
}

export function groupMargin(
  page: PageConfig,
  group: GroupConfig,
  config: TileBoardConfig,
): string {
  return page.groupMarginCss ?? group.groupMarginCss ?? config.groupMarginCss ?? '';
}

export function pageBackground(page: PageConfig, config: TileBoardConfig): CSSProperties {
  const styles: CSSProperties = {};
  if (page.bg) {
    if (typeof page.bg === 'string' && page.bg) {
      styles.backgroundImage = `url("${page.bg}")`;
    }
  } else if (page.bgSuffix && typeof page.bgSuffix === 'string') {
    styles.backgroundImage = `url("${toAbsoluteServerURL(page.bgSuffix, config.serverUrl)}")`;
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