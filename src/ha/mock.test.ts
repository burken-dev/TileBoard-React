import { describe, expect, it } from 'vitest';
import { createAppStore, getAppStore } from '../store';
import { mockCallService, stepMockEntities } from './mock';

const lamp = {
  entity_id: 'light.living_room_lamp',
  state: 'on',
  attributes: { brightness: 200, rgb_color: [255, 150, 50], supported_features: 1 },
  last_updated: '2026-01-01T00:00:00.000Z',
};

describe('stepMockEntities', () => {
  it('jitters numeric sensors and leaves other entities untouched', () => {
    const sensor = {
      entity_id: 'sensor.outdoor_temperature',
      state: '18.5',
      attributes: { unit_of_measurement: '°C' },
      last_updated: '2026-01-01T00:00:00.000Z',
    };
    const [sensorNext, lampNext] = stepMockEntities([sensor, lamp]);
    expect(Number(sensorNext.state)).not.toBe(18.5);
    expect(Math.abs(Number(sensorNext.state) - 18.5)).toBeLessThan(2);
    expect(lampNext.state).toBe(lamp.state);
    expect(lampNext.attributes).toEqual(lamp.attributes);
  });

  it('bumps last_updated on every entity', () => {
    const [next] = stepMockEntities([lamp]);
    expect(next.last_updated).not.toBe('2026-01-01T00:00:00.000Z');
  });

  it('cycles media player states', () => {
    const mp = { entity_id: 'media_player.living_room_speaker', state: 'playing', attributes: {}, last_updated: 'x' };
    const [next] = stepMockEntities([mp]);
    expect(next.state).toBe('paused');
  });
});

describe('mockCallService', () => {
  it('toggles a switch', async () => {
    createAppStore({ serverUrl: 'http://mock', pages: [] });
    getAppStore().setEntities([{ entity_id: 'switch.kitchen', state: 'off', attributes: {} }]);
    await mockCallService('switch', 'toggle', { entity_id: 'switch.kitchen' });
    expect(getAppStore().entities['switch.kitchen'].state).toBe('on');
  });

  it('writes light brightness and color back to attributes', async () => {
    createAppStore({ serverUrl: 'http://mock', pages: [] });
    getAppStore().setEntities([lamp]);
    await mockCallService('light', 'turn_on', { entity_id: 'light.living_room_lamp', brightness: 150, rgb_color: [1, 2, 3] });
    expect(getAppStore().entities['light.living_room_lamp'].attributes.brightness).toBe(150);
    expect(getAppStore().entities['light.living_room_lamp'].attributes.rgb_color).toEqual([1, 2, 3]);
  });

  it('arms the alarm', async () => {
    createAppStore({ serverUrl: 'http://mock', pages: [] });
    getAppStore().setEntities([{ entity_id: 'alarm_control_panel.home_alarm', state: 'disarmed', attributes: {} }]);
    await mockCallService('alarm_control_panel', 'alarm_arm_away', { entity_id: 'alarm_control_panel.home_alarm' });
    expect(getAppStore().entities['alarm_control_panel.home_alarm'].state).toBe('armed_away');
  });

  it('resolves for unknown services without touching the entity', async () => {
    createAppStore({ serverUrl: 'http://mock', pages: [] });
    getAppStore().setEntities([{ entity_id: 'switch.kitchen', state: 'off', attributes: {} }]);
    await expect(
      mockCallService('input_text', 'set_value', { entity_id: 'switch.kitchen', value: 'x' }),
    ).resolves.toBeUndefined();
    expect(getAppStore().entities['switch.kitchen'].state).toBe('off');
  });
});