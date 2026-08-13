import { describe, expect, it, beforeAll } from 'vitest';
import type { EntityStates, TileConfig } from '../config/types';
import { createAppStore, getAppStore } from '../store';
import { getItemFieldValue, parseFieldValue, parseString } from './fields';

const states: EntityStates = {
  'sensor.k': {
    entity_id: 'sensor.k',
    state: '21',
    attributes: { unit_of_measurement: '°C' },
  },
};

beforeAll(() => {
  createAppStore({ serverUrl: 'http://h', pages: [] });
  getAppStore().setEntities([states['sensor.k']]);
});

describe('parseString', () => {
  it('resolves entity refs', () => {
    expect(parseString('&sensor.k.state', states)).toBe('21');
    expect(parseString('&sensor.k.attributes.unit_of_measurement', states)).toBe('°C');
  });

  it('keeps short refs literal', () => {
    expect(parseString('a & b', states)).toBe('a & b');
  });

  it('blanks missing full-string ref', () => {
    expect(parseString('&missing.x.state', states)).toBe('');
  });

  it('resolves attribute refs on entity', () => {
    const entity = states['sensor.k'];
    expect(parseString('x@attributes.unit_of_measurement', states, entity)).toBe('x°C');
  });

  it('keeps embedded missing ref literal', () => {
    expect(parseString('v&missing.x.state', states)).toBe('v&missing.x.state');
  });
});

describe('parseFieldValue', () => {
  it('resolves functions with context states', () => {
    const item: TileConfig = { type: 'switch', id: 'x', position: [0, 0] };
    const result = parseFieldValue(
      function (this: { states: EntityStates }) {
        return this.states['sensor.k'].state;
      },
      states,
      item,
      null,
    );
    expect(result).toBe('21');
  });

  it('returns falsy as null', () => {
    expect(parseFieldValue(undefined, states)).toBeNull();
  });

  it('returns literals unchanged', () => {
    expect(parseFieldValue(42, states)).toBe(42);
  });
});

describe('getItemFieldValue', () => {
  it('walks dotted paths on item', () => {
    const item: TileConfig = {
      type: 'switch',
      id: 'x',
      position: [0, 0],
      history: { styles: { color: 'red' } },
    };
    expect(getItemFieldValue('history.styles', states, item, null)).toEqual({
      color: 'red',
    });
  });
});