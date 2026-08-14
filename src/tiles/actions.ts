import type { ConfigFunction, HaEntity, TileConfig } from '../config/types';
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
    case 'input_select':
      toggleSelect(item);
      return;
    case 'input_datetime':
      getAppStore().openDatetime(item);
      return;
    case 'camera':
    case 'camera_thumbnail':
    case 'camera_stream':
      getAppStore().openCamera(item);
      return;
    case 'alarm':
      getAppStore().openAlarm(item);
      return;
    case 'door_entry':
      getAppStore().openDoorEntry(item);
      return;
    case 'popup_iframe':
      getAppStore().openIframe(item);
      return;
    case 'dimmer_switch': {
      if (typeof item.action === 'function') {
        callFunction(item.action, [item, entity, () => {}]);
      } else if (typeof item.id === 'string' && entity) {
        toggleSwitch(item, entity);
      }
      return;
    }
  }
}

export function entityLongPress(item: TileConfig, entity: HaEntity | null): void {
  if (typeof item.secondaryAction === 'function') {
    callFunction(item.secondaryAction, [item, entity]);
    return;
  }
  if (item.history) {
    getAppStore().openHistory(item, entity);
    return;
  }
  switch (item.type) {
    case 'light': {
      const store = getAppStore();
      if ((!item.sliders || !item.sliders.length) && !item.colorpicker) return;
      const stateEntity =
        typeof item.id === 'string' ? store.entities[item.id] ?? null : null;
      if (stateEntity && stateEntity.state !== 'on') toggleSwitch(item, stateEntity);
      store.openLightControls(item);
      return;
    }
    default:
      if (entity && entity.entity_id) getAppStore().openHistory(item, entity);
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

function sendItemData(item: TileConfig, domain: string, service: string, data?: Record<string, unknown>): void {
  withLoading(item, () => callService(domain, service, { entity_id: item.id, ...data }));
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

export function toggleSelect(item: TileConfig): void {
  const store = getAppStore();
  if (store.selectOpened(item)) store.closeSelect();
  else store.openSelect(item);
}

export function setSelectOption(item: TileConfig, _entity: HaEntity | null, option: string): void {
  const domain = typeof item.id === 'string' ? item.id.split('.')[0] : 'input_select';
  sendItemData(item, domain, 'select_option', { option });
}

export function setFanSpeed(item: TileConfig, _entity: HaEntity | null, speed: string): void {
  sendItemData(item, 'fan', 'set_speed', { speed });
}

export function setClimateOption(item: TileConfig, _entity: HaEntity | null, preset: string): void {
  sendItemData(item, 'climate', 'set_preset_mode', { preset_mode: preset });
}

export function setClimateTemp(item: TileConfig, value: number): void {
  sendItemData(item, 'climate', 'set_temperature', { temperature: value });
}

export function increaseClimateTemp(item: TileConfig, entity: HaEntity | null): void {
  if (!entity) return;
  let value = parseFloat(String(entity.attributes.temperature));
  value += Number(entity.attributes.target_temp_step) || 1;
  if (entity.attributes.max_temp) value = Math.min(value, Number(entity.attributes.max_temp));
  setClimateTemp(item, value);
}

export function decreaseClimateTemp(item: TileConfig, entity: HaEntity | null): void {
  if (!entity) return;
  let value = parseFloat(String(entity.attributes.temperature));
  value -= Number(entity.attributes.target_temp_step) || 1;
  if (entity.attributes.min_temp) value = Math.max(value, Number(entity.attributes.min_temp));
  setClimateTemp(item, value);
}

export function sendCover(service: string, item: TileConfig, _entity: HaEntity | null): void {
  sendItemData(item, 'cover', service);
}

export function setInputNumber(item: TileConfig, value: number): void {
  sendItemData(item, 'input_number', 'set_value', { value });
}

export function increaseNumber(item: TileConfig, entity: HaEntity | null): void {
  if (!entity) return;
  let value = parseFloat(entity.state);
  value += Number(entity.attributes.step) || 1;
  if (entity.attributes.max) value = Math.min(value, Number(entity.attributes.max));
  setInputNumber(item, value);
}

export function decreaseNumber(item: TileConfig, entity: HaEntity | null): void {
  if (!entity) return;
  let value = parseFloat(entity.state);
  value -= Number(entity.attributes.step) || 1;
  if (entity.attributes.min) value = Math.max(value, Number(entity.attributes.min));
  setInputNumber(item, value);
}

export function dimmerAction(action: 'plus' | 'minus', item: TileConfig, entity: HaEntity | null): void {
  const func = 'action' + (action === 'plus' ? 'Plus' : 'Minus');
  const f = (item as unknown as Record<string, unknown>)[func];
  if (typeof f === 'function') callFunction(f as ConfigFunction, [item, entity]);
}

export function setLightBrightness(item: TileConfig, brightness: number): void {
  sendItemData(item, 'light', 'turn_on', {
    brightness_pct: Math.round((brightness / 255) * 100 / 10) * 10,
  });
}

export function increaseBrightness(item: TileConfig, entity: HaEntity | null): void {
  if (!entity || entity.state === 'off' || !('brightness' in entity.attributes)) return;
  const brightness = Math.min(Number(entity.attributes.brightness) + 25.5, 255);
  setLightBrightness(item, brightness);
}

export function decreaseBrightness(item: TileConfig, entity: HaEntity | null): void {
  if (!entity || entity.state === 'off' || !('brightness' in entity.attributes)) return;
  const brightness = Math.max(Number(entity.attributes.brightness) - 25.5, 1);
  setLightBrightness(item, brightness);
}

export function setLightColor(item: TileConfig, rgb: [number, number, number]): void {
  sendItemData(item, 'light', 'turn_on', { rgb_color: rgb });
}

export function sendPlayer(service: string, item: TileConfig, _entity: HaEntity | null): void {
  sendItemData(item, 'media_player', service);
}

export function mutePlayer(muteState: boolean, item: TileConfig, _entity: HaEntity | null): void {
  sendItemData(item, 'media_player', 'volume_mute', { is_volume_muted: muteState });
}

export function setSourcePlayer(item: TileConfig, _entity: HaEntity | null, option: string): void {
  sendItemData(item, 'media_player', 'select_source', { source: option });
}