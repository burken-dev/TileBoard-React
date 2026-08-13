import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HaEntity, TileConfig } from '../config/types';
import { createAppStore } from '../store';
import { entityClick } from './actions';

vi.mock('../ha/services', () => ({
  callService: vi.fn(() => Promise.resolve()),
  sendMessage: vi.fn(() => Promise.resolve()),
}));

import { callService } from '../ha/services';

const callServiceMock = vi.mocked(callService);

function entity(state: string, id = 'switch.test'): HaEntity {
  return { entity_id: id, state, attributes: {} };
}

function item(type: TileConfig['type'], id = 'switch.test'): TileConfig {
  return { type, id, position: [0, 0] };
}

describe('entityClick handlers', () => {
  beforeEach(() => {
    createAppStore({ serverUrl: 'http://h', pages: [] });
    callServiceMock.mockClear();
  });

  it('switch on -> switch/turn_off', () => {
    entityClick(item('switch'), entity('on'));
    expect(callServiceMock).toHaveBeenCalledWith('switch', 'turn_off', {
      entity_id: 'switch.test',
    });
  });

  it('switch off -> switch/turn_on', () => {
    entityClick(item('switch'), entity('off'));
    expect(callServiceMock).toHaveBeenCalledWith('switch', 'turn_on', {
      entity_id: 'switch.test',
    });
  });

  it('switch unknown state -> toggle', () => {
    entityClick(item('switch'), entity('unavailable'));
    expect(callServiceMock).toHaveBeenCalledWith('switch', 'toggle', {
      entity_id: 'switch.test',
    });
  });

  it('input_boolean uses homeassistant domain', () => {
    entityClick(item('input_boolean', 'input_boolean.x'), entity('off', 'input_boolean.x'));
    expect(callServiceMock).toHaveBeenCalledWith('homeassistant', 'turn_on', {
      entity_id: 'input_boolean.x',
    });
  });

  it('lock locked -> lock/unlock', () => {
    entityClick(item('lock', 'lock.x'), entity('locked', 'lock.x'));
    expect(callServiceMock).toHaveBeenCalledWith('lock', 'unlock', {
      entity_id: 'lock.x',
    });
  });

  it('vacuum cleaning -> vacuum/return_to_base', () => {
    entityClick(item('vacuum', 'vacuum.x'), entity('cleaning', 'vacuum.x'));
    expect(callServiceMock).toHaveBeenCalledWith('vacuum', 'return_to_base', {
      entity_id: 'vacuum.x',
    });
  });

  it('cover_toggle open -> cover/close_cover', () => {
    entityClick(item('cover_toggle', 'cover.x'), entity('open', 'cover.x'));
    expect(callServiceMock).toHaveBeenCalledWith('cover', 'close_cover', {
      entity_id: 'cover.x',
    });
  });

  it('scene -> scene/turn_on', () => {
    entityClick(item('scene', 'scene.x'), entity('on', 'scene.x'));
    expect(callServiceMock).toHaveBeenCalledWith('scene', 'turn_on', {
      entity_id: 'scene.x',
    });
  });
});