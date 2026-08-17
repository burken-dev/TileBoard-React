import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { TileBoardConfig, TileConfig } from './types';
import { TILE_TYPES } from './schema';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(here, '../../public/config/test.js'), 'utf8');
const CONFIG = new Function('window', `${source}\n;return CONFIG;`)({
  location: { origin: 'http://localhost:5173' },
}) as TileBoardConfig;

function collectTiles(config: TileBoardConfig): TileConfig[] {
  const out: TileConfig[] = [];
  const walk = (items: TileConfig[]): void => {
    for (const item of items) {
      out.push(item);
      if (item.layout?.tiles) walk(item.layout.tiles);
      if (item.layout?.camera) walk([item.layout.camera]);
      if (item.fullscreen) walk([item.fullscreen]);
      if (item.items) walk(item.items);
    }
  };
  for (const page of config.pages) {
    for (const group of page.groups) walk(group.items);
  }
  return out;
}

function collectStrings(value: unknown, out: unknown[]): void {
  if (value == null) return;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    out.push(value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v) => collectStrings(v, out));
    return;
  }
  if (typeof value === 'object') {
    Object.values(value).forEach((v) => collectStrings(v, out));
  }
}

describe('test config coverage', () => {
  it('covers every tile type', () => {
    expect(CONFIG.mock, 'test.js must define mock.entities').toBeDefined();
    const tiles = collectTiles(CONFIG);
    const present = new Set(tiles.map((t) => t.type));
    const missing = TILE_TYPES.filter((t) => !present.has(t));
    expect(missing).toEqual([]);
  });

  it('references only entity ids that exist in mock data', () => {
    const mockIds = new Set((CONFIG.mock?.entities ?? []).map((e) => e.entity_id));
    const missing: string[] = [];
    for (const tile of collectTiles(CONFIG)) {
      if (typeof tile.id === 'string' && tile.type !== 'multi' && !mockIds.has(tile.id)) missing.push(tile.id);
      const values: unknown[] = [];
      collectStrings(tile, values);
      for (const v of values) {
        if (typeof v !== 'string') continue;
        for (const m of v.matchAll(/&([a-z0-9_]+\.[a-z0-9_]+)(?:\.|$)/gi)) {
          if (!mockIds.has(m[1])) missing.push(m[1]);
        }
      }
    }
    expect([...new Set(missing)]).toEqual([]);
  });

  it('mock entities match the HaEntity shape', () => {
    for (const e of CONFIG.mock?.entities ?? []) {
      expect(typeof e.entity_id).toBe('string');
      expect(typeof e.state).toBe('string');
      expect(e.attributes).toEqual(expect.any(Object));
    }
  });
});