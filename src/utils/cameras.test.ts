import { describe, expect, it } from 'vitest';
import type { HaEntity, PageConfig, TileConfig } from '../config/types';
import { getCameraList, getFullscreenEntity } from './cameras';

describe('getCameraList', () => {
  it('extracts camera tiles from nested pages/groups', () => {
    const pages = [
      {
        groups: [
          { items: [{ type: 'camera', id: 'camera.a', position: [0, 0] }] },
          {
            items: [
              { type: 'sensor', id: 'sensor.x', position: [0, 0] },
              { type: 'camera_thumbnail', id: 'camera.b', position: [0, 0] },
            ],
          },
        ],
      },
      {
        groups: [{ items: [{ type: 'camera_stream', id: 'camera.c', position: [0, 0] }] }],
      },
    ] as unknown as PageConfig[];
    expect(getCameraList(pages).map((i) => i.id)).toEqual(['camera.a', 'camera.b', 'camera.c']);
  });
});

describe('getFullscreenEntity', () => {
  const entities = {
    'camera.a': { entity_id: 'camera.a', state: 'on', attributes: {} } as HaEntity,
  };

  it('resolves own id', () => {
    const item = { type: 'camera', id: 'camera.a', position: [0, 0] } as TileConfig;
    expect(getFullscreenEntity(item, entities)?.entity_id).toBe('camera.a');
  });

  it('resolves fullscreen.id over own id', () => {
    const item = {
      type: 'camera',
      id: 'camera.b',
      position: [0, 0],
      fullscreen: { type: 'camera', id: 'camera.a', position: [0, 0] },
    } as TileConfig;
    expect(getFullscreenEntity(item, entities)?.entity_id).toBe('camera.a');
  });

  it('returns the synthetic object id entity itself', () => {
    const syn = { entity_id: 'camera.syn', state: 'on', attributes: {} } as HaEntity;
    const item = {
      type: 'camera',
      id: syn,
      position: [0, 0],
      fullscreen: { type: 'camera', id: syn, position: [0, 0] },
    } as TileConfig;
    expect(getFullscreenEntity(item, entities)).toBe(syn);
  });

  it('returns null when fullscreen id not found', () => {
    const item = {
      type: 'camera',
      id: 'camera.missing',
      position: [0, 0],
      fullscreen: { type: 'camera', id: 'camera.missing', position: [0, 0] },
    } as TileConfig;
    expect(getFullscreenEntity(item, entities)).toBeNull();
  });
});