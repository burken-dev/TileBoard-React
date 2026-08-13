import { beforeAll, describe, expect, it } from 'vitest';
import type { EntityStates, TileConfig } from '../config/types';
import { createAppStore } from '../store';
import {
  entityIcon,
  entityState,
  entityTitle,
  entityUnit,
  entityValue,
  getItemEntity,
} from './entity';

beforeAll(() => {
  createAppStore({ serverUrl: 'http://h', pages: [] });
});

const states: EntityStates = {
  'sensor.k': {
    entity_id: 'sensor.k',
    state: '21',
    attributes: {
      friendly_name: 'Kitchen temp',
      unit_of_measurement: '°C',
    },
  },
};

describe('entityTitle', () => {
  it('falls back to friendly_name', () => {
    const item: TileConfig = { type: 'sensor', id: 'sensor.k', position: [0, 0] };
    expect(entityTitle(item, states['sensor.k'], states)).toBe('Kitchen temp');
  });

  it('uses item.title', () => {
    const item: TileConfig = {
      type: 'sensor',
      id: 'sensor.k',
      position: [0, 0],
      title: 'Custom',
    };
    expect(entityTitle(item, states['sensor.k'], states)).toBe('Custom');
  });
});

describe('entityState', () => {
  it('uses states map', () => {
    const item: TileConfig = {
      type: 'sensor',
      id: 'sensor.k',
      position: [0, 0],
      states: { '21': 'twenty one' },
    };
    expect(entityState(item, states['sensor.k'], states)).toBe('twenty one');
  });

  it('uses function', () => {
    const item: TileConfig = {
      type: 'sensor',
      id: 'sensor.k',
      position: [0, 0],
      state: () => 'fn',
    };
    expect(entityState(item, states['sensor.k'], states)).toBe('fn');
  });

  it('returns null when state false', () => {
    const item: TileConfig = {
      type: 'sensor',
      id: 'sensor.k',
      position: [0, 0],
      state: false,
    };
    expect(entityState(item, states['sensor.k'], states)).toBeNull();
  });

  it('defaults to entity.state', () => {
    const item: TileConfig = { type: 'sensor', id: 'sensor.k', position: [0, 0] };
    expect(entityState(item, states['sensor.k'], states)).toBe('21');
  });
});

describe('entityIcon', () => {
  it('maps icons by state', () => {
    const item: TileConfig = {
      type: 'switch',
      id: 'sensor.k',
      position: [0, 0],
      icons: { '21': 'mdi-check' },
    };
    expect(entityIcon(item, states['sensor.k'], states)).toBe('mdi-check');
  });

  it('item.icon overrides', () => {
    const item: TileConfig = {
      type: 'switch',
      id: 'sensor.k',
      position: [0, 0],
      icon: 'mdi-star',
    };
    expect(entityIcon(item, states['sensor.k'], states)).toBe('mdi-star');
  });
});

describe('entityValue', () => {
  it('applies filter', () => {
    const item: TileConfig = {
      type: 'sensor',
      id: 'sensor.k',
      position: [0, 0],
      filter: (value: unknown) => Number(value) * 2,
    };
    expect(entityValue(item, states['sensor.k'], states)).toBe(42);
  });
});

describe('entityUnit', () => {
  it('falls back to attribute', () => {
    const item: TileConfig = { type: 'sensor', id: 'sensor.k', position: [0, 0] };
    expect(entityUnit(item, states['sensor.k'], states)).toBe('°C');
  });
});

describe('getItemEntity', () => {
  it('returns synthetic object id', () => {
    const synthetic = { entity_id: 'x', state: 'on', attributes: {} };
    const item: TileConfig = {
      type: 'switch',
      id: synthetic,
      position: [0, 0],
    };
    expect(getItemEntity(item, {})).toBe(synthetic);
  });

  it('looks up string id', () => {
    const item: TileConfig = { type: 'switch', id: 'sensor.k', position: [0, 0] };
    expect(getItemEntity(item, states)).toBe(states['sensor.k']);
  });

  it('returns null for unknown id', () => {
    const item: TileConfig = { type: 'switch', id: 'missing.x', position: [0, 0] };
    expect(getItemEntity(item, states)).toBeNull();
  });
});