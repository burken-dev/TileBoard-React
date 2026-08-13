import type { HaEntity, TileConfig } from '../config/types';
import { getAppStore } from '../store';
import { callFunction } from '../utils/functions';

export function entityClick(item: TileConfig, entity: HaEntity | null): void {
  if (typeof item.action === 'function') {
    callFunction(item.action, [item, entity]);
    return;
  }

  switch (item.type) {
    // cases added by specs 06-09
  }
}

export function entityLongPress(item: TileConfig, entity: HaEntity | null): void {
  if (typeof item.secondaryAction === 'function') {
    callFunction(item.secondaryAction, [item, entity]);
    return;
  }
  // type dispatch added by specs 07/09
}

export function withLoading(item: TileConfig, fn: () => Promise<unknown>): void {
  const store = getAppStore();
  if (store.isLoading(item)) return;
  store.setLoading(item, true);
  fn().finally(() => {
    getAppStore().setLoading(item, false);
  });
}