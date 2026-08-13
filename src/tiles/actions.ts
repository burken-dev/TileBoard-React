import type { HaEntity, TileConfig } from '../config/types';
import { callService } from '../ha/services';
import { getAppStore } from '../store';
import { callFunction } from '../utils/functions';

export function entityClick(item: TileConfig, entity: HaEntity | null): void {
  if (typeof item.action === 'function') {
    callFunction(item.action, [item, entity]);
    return;
  }

  switch (item.type) {
    case 'switch':
    case 'light':
    case 'fan':
    case 'input_boolean':
      toggleSwitch(item, entity);
      return;
    case 'lock':
      toggleLock(item, entity);
      return;
    case 'cover_toggle':
      toggleCover(item, entity);
      return;
    case 'vacuum':
      toggleVacuum(item, entity);
      return;
    case 'automation':
      triggerAutomation(item, entity);
      return;
    case 'script':
      callScript(item, entity);
      return;
    case 'scene':
      callScene(item, entity);
      return;
  }
}

export function entityLongPress(item: TileConfig, entity: HaEntity | null): void {
  if (typeof item.secondaryAction === 'function') {
    callFunction(item.secondaryAction, [item, entity]);
    return;
  }
}

export function withLoading(item: TileConfig, fn: () => Promise<unknown>): void {
  const store = getAppStore();
  if (store.isLoading(item)) return;
  store.setLoading(item, true);
  fn().finally(() => {
    getAppStore().setLoading(item, false);
  });
}

function sendItemData(item: TileConfig, domain: string, service: string): void {
  withLoading(item, () => callService(domain, service, { entity_id: item.id }));
}

export function toggleSwitch(item: TileConfig, entity: HaEntity | null): void {
  if (typeof item.id !== 'string' || !entity) return;
  const group = item.id.split('.')[0];
  const domain = ['switch', 'light', 'fan'].includes(group) ? group : 'homeassistant';
  let service = 'toggle';
  if (entity.state === 'off') service = 'turn_on';
  else if (entity.state === 'on') service = 'turn_off';
  sendItemData(item, domain, service);
}

export function toggleLock(item: TileConfig, entity: HaEntity | null): void {
  if (!entity) return;
  let service: string | undefined;
  if (entity.state === 'locked') service = 'unlock';
  else if (entity.state === 'unlocked') service = 'lock';
  if (service) sendItemData(item, 'lock', service);
}

export function toggleCover(item: TileConfig, entity: HaEntity | null): void {
  if (!entity) return;
  let service: string | undefined;
  if (entity.state === 'open') service = 'close_cover';
  else if (entity.state === 'closed') service = 'open_cover';
  if (service) sendItemData(item, 'cover', service);
}

export function toggleVacuum(item: TileConfig, entity: HaEntity | null): void {
  if (!entity) return;
  let service: string | undefined;
  if (entity.state === 'off') service = 'turn_on';
  else if (entity.state === 'on') service = 'turn_off';
  else if (['idle', 'docked', 'paused'].includes(entity.state)) service = 'start';
  else if (entity.state === 'cleaning') service = 'return_to_base';
  if (service) sendItemData(item, 'vacuum', service);
}

export function triggerAutomation(item: TileConfig, _entity: HaEntity | null): void {
  sendItemData(item, 'automation', 'trigger');
}

export function callScript(item: TileConfig, _entity: HaEntity | null): void {
  sendItemData(item, 'script', 'turn_on');
}

export function callScene(item: TileConfig, _entity: HaEntity | null): void {
  sendItemData(item, 'scene', 'turn_on');
}