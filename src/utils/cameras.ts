import type { EntityStates, HaEntity, PageConfig, TileConfig } from '../config/types';

const CAMERA_TYPES = ['camera', 'camera_thumbnail', 'camera_stream'];

export function getCameraList(pages: PageConfig[]): TileConfig[] {
  const res: TileConfig[] = [];
  pages.forEach((page) => {
    (page.groups || []).forEach((group) => {
      (group.items || []).forEach((item) => {
        if (CAMERA_TYPES.includes(item.type)) res.push(item);
      });
    });
  });
  return res;
}

export function getFullscreenEntity(item: TileConfig, entities: EntityStates): HaEntity | null {
  const id = item.fullscreen?.id ?? item.id;
  if (typeof id === 'object') return id as HaEntity;
  return entities[id] ?? null;
}