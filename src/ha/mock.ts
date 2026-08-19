import type { HaEntity, MockConfig } from '../config/types';
import { getAppStore } from '../store';

export function stepMockEntities(entities: HaEntity[]): HaEntity[] {
  const now = new Date().toISOString();
  return entities.map((entity) => {
    let state = entity.state;
    const attributes = { ...entity.attributes };
    if (entity.entity_id.startsWith('sensor.') && state.trim() !== '' && !isNaN(Number(state))) {
      const base = Number(state);
      const delta = (Math.random() - 0.5) * Math.max(0.6, Math.abs(base) * 0.04);
      state = String(Math.round((base + delta) * 10) / 10);
    } else if (entity.entity_id === 'media_player.living_room_speaker') {
      const cycle: Record<string, string> = { playing: 'paused', paused: 'idle', idle: 'playing' };
      state = cycle[entity.state] ?? 'playing';
    } else if (entity.entity_id.startsWith('weather.')) {
      if (typeof attributes.temperature === 'number') {
        attributes.temperature =
          Math.round((attributes.temperature + (Math.random() - 0.5) * 0.4) * 10) / 10;
      }
    }
    return { ...entity, state, attributes, last_updated: now };
  });
}

export function mockCallService(
  domain: string,
  service: string,
  serviceData?: Record<string, unknown>,
): Promise<void> {
  const store = getAppStore();
  const id = String(serviceData?.entity_id ?? '');
  const current = id ? store.entities[id] : null;
  if (!current) return Promise.resolve();

  let state = current.state;
  const attributes = { ...current.attributes };
  const write = (key: string): void => {
    if (serviceData && key in serviceData) attributes[key] = serviceData[key];
  };

  if (
    domain === 'switch' || domain === 'input_boolean' || domain === 'fan' ||
    domain === 'vacuum' || domain === 'scene' || domain === 'script' ||
    domain === 'automation' || domain === 'homeassistant'
  ) {
    if (service === 'toggle') state = state === 'on' ? 'off' : 'on';
    else if (service === 'turn_on') state = 'on';
    else if (service === 'turn_off') state = 'off';
    else if (service === 'start') state = 'cleaning';
    else if (service === 'return_to_base') state = 'docked';
    else if (service === 'pause') state = 'paused';
    if (domain === 'fan' && service === 'set_speed') write('speed');
  } else if (domain === 'lock') {
    if (service === 'lock') state = 'locked';
    else if (service === 'unlock') state = 'unlocked';
  } else if (domain === 'cover') {
    if (service === 'open_cover') { state = 'open'; attributes.current_position = 100; }
    else if (service === 'close_cover') { state = 'closed'; attributes.current_position = 0; }
    else if (service === 'stop_cover') state = 'open';
  } else if (domain === 'light') {
    if (service === 'turn_on') {
      state = 'on';
      if (serviceData && 'brightness_pct' in serviceData) {
        attributes.brightness = Math.round((Number(serviceData.brightness_pct) / 100) * 255);
      }
      write('brightness');
      write('color_temp');
      write('rgb_color');
    } else if (service === 'turn_off') {
      state = 'off';
    }
  } else if (domain === 'media_player') {
    if (service === 'media_play') state = 'playing';
    else if (service === 'media_pause') state = 'paused';
    else if (service === 'media_stop') state = 'idle';
    else if (service === 'turn_on') state = 'on';
    else if (service === 'turn_off') state = 'off';
    else if (service === 'volume_set') write('volume_level');
    else if (service === 'volume_up') attributes.volume_level = Math.min(1, (Number(attributes.volume_level) || 0) + 0.05);
    else if (service === 'volume_down') attributes.volume_level = Math.max(0, (Number(attributes.volume_level) || 0) - 0.05);
    else if (service === 'select_source') write('source');
    else if (service === 'volume_mute') write('is_volume_muted');
    else if (service === 'volume_unmute') attributes.is_volume_muted = false;
  } else if (domain === 'input_number') {
    if (service === 'set_value') state = String(serviceData?.value ?? state);
  } else if (domain === 'input_select') {
    if (service === 'select_option') state = String(serviceData?.option ?? state);
  } else if (domain === 'climate') {
    if (service === 'set_temperature') write('temperature');
    else if (service === 'set_hvac_mode') state = String(serviceData?.hvac_mode ?? state);
  } else if (domain === 'alarm_control_panel') {
    if (service === 'alarm_arm_home') state = 'armed_home';
    else if (service === 'alarm_arm_away') state = 'armed_away';
    else if (service === 'alarm_arm_night') state = 'armed_night';
    else if (service === 'alarm_disarm') state = 'disarmed';
  }

  store.updateEntity({ ...current, state, attributes, last_updated: new Date().toISOString() });
  return Promise.resolve();
}

export function mockGetHistory(entityId: string | string[], startDate: string): Promise<unknown[][]> {
  const store = getAppStore();
  const ids = Array.isArray(entityId) ? entityId : [entityId];
  const start = new Date(startDate).getTime();
  const now = Date.now();
  const step = 2 * 60 * 60 * 1000;
  const series = ids.map((id) => {
    const entity = store.entities[id];
    if (!entity) return [];
    const points: Array<Record<string, unknown>> = [];
    const base = Number(entity.state) || 0;
    for (let t = start; t <= now; t += step) {
      const value = base + Math.sin(t / 3600000) * (Math.abs(base) * 0.1 + 1);
      points.push({
        entity_id: id,
        state: String(Math.round(value * 100) / 100),
        last_changed: new Date(t).toISOString(),
        attributes: { ...entity.attributes },
      });
    }
    return points;
  });
  return Promise.resolve(series);
}

export function startMockSimulator(mock: MockConfig): () => void {
  const store = getAppStore();
  store.setEntities(mock.entities);
  const interval = mock.interval ?? 2000;
  const timer = window.setInterval(() => {
    store.setEntities(stepMockEntities(Object.values(store.entities)));
  }, interval);
  return () => window.clearInterval(timer);
}