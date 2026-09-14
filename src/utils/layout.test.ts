import { describe, expect, it } from 'vitest';
import {
  bodyClasses,
  calcGroupSize,
  calcPageScale,
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

describe('calcPageScale', () => {
  it('shrinks to fit the tighter axis', () => {
    expect(calcPageScale(2000, 1000, 1000, 800)).toBe(0.5);
    expect(calcPageScale(1000, 2000, 800, 1000)).toBe(0.5);
  });

  it('never upscales', () => {
    expect(calcPageScale(500, 400, 1000, 800)).toBe(1);
  });

  it('returns 1 for non-positive inputs', () => {
    expect(calcPageScale(0, 0, 1000, 800)).toBe(1);
    expect(calcPageScale(1000, 800, 0, 0)).toBe(1);
  });
});

describe('display body class', () => {
  it('adds -display-scale only in scale mode', () => {
    const config: TileBoardConfig = { serverUrl: 'http://h', pages: [] };
    const scroll = { horizontal: false, vertical: false };
    expect(bodyClasses(config, scroll, 'scale')).toContain('-display-scale');
    expect(bodyClasses(config, scroll)).not.toContain('-display-scale');
  });
});

describe('bodyClasses customClasses', () => {
  const scroll = { horizontal: false, vertical: false };

  it('appends a global string split on whitespace', () => {
    const config: TileBoardConfig = {
      serverUrl: 'http://h',
      pages: [],
      customClasses: 'kiosk dark-mode',
    };
    const classes = bodyClasses(config, scroll);
    expect(classes).toContain('kiosk');
    expect(classes).toContain('dark-mode');
  });

  it('appends a global array after system classes', () => {
    const config: TileBoardConfig = {
      serverUrl: 'http://h',
      pages: [],
      menuPosition: 'left',
      customClasses: ['foo', 'bar'],
    };
    const classes = bodyClasses(config, scroll);
    expect(classes).toContain('foo');
    expect(classes).toContain('bar');
    expect(classes.indexOf('foo')).toBeGreaterThan(classes.indexOf('-menu-left'));
  });

  it('appends active page classes after global ones', () => {
    const config: TileBoardConfig = {
      serverUrl: 'http://h',
      pages: [{ title: 'A', customClasses: 'living-room', groups: [] }],
      customClasses: 'kiosk',
    };
    const classes = bodyClasses(config, scroll, 'fixed', 0);
    expect(classes).toContain('kiosk');
    expect(classes).toContain('living-room');
    expect(classes.indexOf('living-room')).toBeGreaterThan(classes.indexOf('kiosk'));
  });

  it('ignores empty entries and out-of-range page index', () => {
    const config: TileBoardConfig = {
      serverUrl: 'http://h',
      pages: [{ title: 'A', groups: [] }],
      customClasses: ['  ', '', 'ok'],
    };
    const classes = bodyClasses(config, scroll, 'fixed', 99);
    expect(classes).toContain('ok');
    expect(classes).not.toContain('');
    expect(classes).not.toContain('  ');
  });

  it('changes nothing when customClasses is absent', () => {
    const config: TileBoardConfig = { serverUrl: 'http://h', pages: [] };
    expect(bodyClasses(config, scroll)).not.toContain('kiosk');
  });
});
