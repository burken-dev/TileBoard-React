import { useEffect, useRef } from 'react';
import type { EntityStates, PageConfig, TileConfig } from '../../config/types';
import { useAppStore } from '../../store';
import { isHidden, resolveTile } from '../../utils/fields';
import { itemPositionStyles, pageOpts } from '../../utils/layout';
import Tile from '../Tile';

function childKey(child: TileConfig, index: number): string {
  return typeof child.key === 'string' ? child.key : String(index);
}

function childVisible(child: TileConfig, entities: EntityStates, fallback: boolean): boolean {
  if (isHidden(child, entities)) return false;
  if (typeof child.id === 'object') return true;
  const entity = entities[child.id];
  if (!entity) return false;
  if (fallback && (entity.state === 'unavailable' || entity.state === 'unknown')) return false;
  return true;
}

function wrap(index: number, length: number): number {
  return ((index % length) + length) % length;
}

export function MultiTile({ item, page }: { item: TileConfig; page: PageConfig }) {
  const config = useAppStore((s) => s.config);
  const entities = useAppStore((s) => s.entities);
  const uiKey = `multi:${String(item.id)}`;
  const value = useAppStore((s) => s.uiState[uiKey]);
  const setUiState = useAppStore((s) => s.setUiState);

  const resolved = resolveTile(item, null, entities);
  const children = resolved.items ?? [];
  const fallback = resolved.fallback ?? false;
  const opts = pageOpts(page, config, entities);

  const activeKeyRef = useRef<string | null>(null);

  const visibleChildren = children
    .map((child, index) => ({ child, index }))
    .filter(({ child }) => childVisible(child, entities, fallback));

  let targetIndex: number | null = null;
  if (visibleChildren.length > 0) {
    if (typeof value === 'number') {
      const currentPos = visibleChildren.findIndex(
        ({ child, index }) => childKey(child, index) === activeKeyRef.current,
      );
      const base = currentPos >= 0 ? currentPos : 0;
      targetIndex = visibleChildren[wrap(base + value, visibleChildren.length)].index;
    } else if (typeof value === 'string') {
      const found = children.findIndex((child, index) => childKey(child, index) === value);
      if (found >= 0 && visibleChildren.some(({ index }) => index === found)) {
        targetIndex = found;
      }
    } else {
      targetIndex = visibleChildren[0].index;
    }
  }

  // ponytail: normalization effect runs every render; the key !== value guard makes it settle after one write.
  // fallback auto (no explicit pick) stays unpinned so it re-picks live instead of going blank.
  useEffect(() => {
    if (targetIndex === null) return;
    const key = childKey(children[targetIndex], targetIndex);
    activeKeyRef.current = key;
    if (fallback && value === undefined) return;
    if (key !== value) setUiState(uiKey, key);
  });

  const autorotate = (resolved.autorotate as number | undefined) ?? -1;
  useEffect(() => {
    if (autorotate < 0 || visibleChildren.length === 0) return;
    const timer = setInterval(() => setUiState(uiKey, 1), autorotate);
    return () => clearInterval(timer);
  }, [autorotate, uiKey, targetIndex, visibleChildren.length]);

  if (targetIndex === null) return null;

  const child = children[targetIndex];
  const parentWidth = (resolved.width as number | undefined) ?? 1;
  const parentHeight = (resolved.height as number | undefined) ?? 1;
  const clone: TileConfig = {
    ...child,
    position: [0, 0],
    width: child.width ?? parentWidth,
    height: child.height ?? parentHeight,
  };

  return (
    <div className="item -multi" style={itemPositionStyles(resolved, opts)}>
      <Tile item={clone} page={page} />
    </div>
  );
}