import { describe, expect, it } from 'vitest';
import {
  bodyClasses,
  calcGroupSize,
  groupSizeStyles,
  itemPositionStyles,
  pageTransform,
  shouldDrawPage,
} from './layout';
import type { GroupConfig, TileBoardConfig, TileConfig } from '../config/types';

describe('calcGroupSize', () => {
  it('computes max extents', () => {
    const group: GroupConfig = {
      items: [
        { type: 'switch', id: 'a', position: [1, 0], width: 2, height: 1 },
        { type: 'switch', id: 'b', position: [0, 2] },
      ],
    };
    expect(calcGroupSize(group, {})).toEqual({ width: 3, height: 3 });
  });
});

describe('itemPositionStyles', () => {
  it('applies grid math', () => {
    const item: TileConfig = { type: 'switch', id: 'a', position: [1, 2], width: 2 };
    expect(itemPositionStyles(item, { tileSize: 150, tileMargin: 6 })).toEqual({
      width: '306px',
      height: '150px',
      left: '156px',
      top: '312px',
    });
  });
});

describe('groupSizeStyles', () => {
  it('formats width from group dims', () => {
    const group: GroupConfig = { width: 2, height: 3, items: [] };
    expect(groupSizeStyles(group, { tileSize: 150, tileMargin: 6 }, {}).width).toBe('306px');
  });
});

describe('pageTransform', () => {
  it('animated_gpu horizontal', () => {
    expect(pageTransform(1, 'animated_gpu', false)).toBe('translate3d(-100%, 0, 0)');
  });
  it('animated_gpu vertical', () => {
    expect(pageTransform(1, 'animated_gpu', true)).toBe('translate3d(0, -100%, 0)');
  });
  it('animated horizontal', () => {
    expect(pageTransform(1, 'animated', false)).toBe('translate(-100%, 0)');
  });
  it('simple is undefined', () => {
    expect(pageTransform(1, 'simple', false)).toBeUndefined();
  });
});

describe('shouldDrawPage', () => {
  it('simple draws only active', () => {
    expect(shouldDrawPage(2, 1, 'simple')).toBe(false);
  });
  it('animated draws all', () => {
    expect(shouldDrawPage(2, 1, 'animated')).toBe(true);
  });
});

describe('bodyClasses', () => {
  it('includes theme and entity size', () => {
    const config: TileBoardConfig = {
      serverUrl: 'http://h',
      pages: [],
      customTheme: ['material'],
      entitySize: 'big',
    };
    const classes = bodyClasses(config, { horizontal: false, vertical: false });
    expect(classes).toContain('-theme-material');
    expect(classes).toContain('-big-entity');
  });

  it('includes scroll classes', () => {
    const config: TileBoardConfig = { serverUrl: 'http://h', pages: [] };
    const classes = bodyClasses(config, { horizontal: true, vertical: true });
    expect(classes).toContain('-scrolled-horizontally');
    expect(classes).toContain('-scrolled-vertically');
  });
});