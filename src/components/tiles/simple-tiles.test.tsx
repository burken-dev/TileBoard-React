import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { EntityStates, HaEntity, PageConfig, TileConfig } from '../../config/types';
import { createAppStore, getAppStore } from '../../store';
import Tile from '../Tile';

const states: EntityStates = {
  'sensor.k': {
    entity_id: 'sensor.k',
    state: '21',
    attributes: {
      friendly_name: 'Kitchen temp',
      unit_of_measurement: '°C',
    },
  },
  'switch.x': {
    entity_id: 'switch.x',
    state: 'on',
    attributes: { friendly_name: 'Switch X' },
  },
};

const page: PageConfig = { groups: [] };

function setup(entities: HaEntity[] = Object.values(states)) {
  createAppStore({ serverUrl: 'http://h', pages: [] });
  getAppStore().setEntities(entities);
}

function renderTile(item: TileConfig) {
  return render(<Tile item={item} page={page} />);
}

describe('simple tiles', () => {
  it('SENSOR renders value and unit from entity', () => {
    setup();
    const { container } = renderTile({ type: 'sensor', id: 'sensor.k', position: [0, 0] });
    expect(container.querySelector('.item-entity--value')?.textContent).toBe('21');
    expect(container.querySelector('.item-entity--unit')?.textContent).toBe('°C');
    expect(container.querySelector('.item-title')?.textContent).toBe('Kitchen temp');
  });

  it('SWITCH renders icon from icons map', () => {
    setup();
    const { container } = renderTile({
      type: 'switch',
      id: 'switch.x',
      position: [0, 0],
      icons: { on: 'mdi-check' },
    });
    const icon = container.querySelector('.item-entity--icon');
    expect(icon?.className).toContain('mdi-check');
  });

  it('TEXT_LIST renders rows with resolved values', () => {
    setup();
    const { container } = renderTile({
      type: 'text_list',
      id: 'sensor.k',
      position: [0, 0],
      list: [
        { title: '&sensor.k.state', value: '&sensor.k.attributes.unit_of_measurement' },
        { title: '&missing.x.state', value: 'fixed' },
      ],
    });
    const rows = container.querySelectorAll('.item-list--item');
    expect(rows).toHaveLength(2);
    expect(rows[0]?.querySelector('.item-list--name')?.textContent).toBe('21');
    expect(rows[0]?.querySelector('.item-list--value')?.textContent).toBe('°C');
    expect(rows[1]?.querySelector('.item-list--name')?.textContent).toBe('');
    expect(rows[1]?.querySelector('.item-list--value')?.textContent).toBe('fixed');
  });

  it('GAUGE renders label and clamps value to max', () => {
    setup([{ ...states['sensor.k'], state: '150' }]);
    const { container } = renderTile({
      type: 'gauge',
      id: 'sensor.k',
      position: [0, 0],
      settings: { max: 100, label: 'Temp' },
    });
    const gauge = container.querySelector('.item-gauge');
    expect(gauge?.textContent).toContain('100');
    expect(gauge?.textContent).toContain('Temp');
    const fg = container.querySelector('path[data-foreground]');
    expect(fg?.getAttribute('stroke-dashoffset')).toBe('0');
  });
});