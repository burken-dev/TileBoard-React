import { fireEvent, render } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import type { HaEntity, TileConfig } from '../../config/types';
import { createAppStore, getAppStore } from '../../store';
import { CustomTile } from './CustomTile';

const dummyEntity: HaEntity = {
  entity_id: 'sensor.custom_test',
  state: '10',
  attributes: {},
};

function setup() {
  createAppStore({ serverUrl: 'http://h', pages: [] });
  getAppStore().setEntities([dummyEntity]);
}

beforeEach(() => {
  setup();
});

describe('CustomTile', () => {
  it('renders custom HTML correctly', () => {
    const tile: TileConfig = {
      type: 'custom',
      id: 'sensor.custom_test',
      position: [0, 0],
      customHtml: '<div class="test-content">Hello Custom Tile</div>',
    };
    const { container } = render(<CustomTile item={tile} entity={dummyEntity} />);
    expect(container.querySelector('.test-content')?.textContent).toBe('Hello Custom Tile');
  });

  it('preserves child element scroll position across re-renders and html updates', () => {
    let callCount = 0;
    const tile: TileConfig = {
      type: 'custom',
      id: 'sensor.custom_test',
      position: [0, 0],
      customHtml: () => {
        callCount++;
        return `<div class="electricity-longlist" style="overflow-y: auto; height: 100px;">
          <div style="height: 500px;">Item list version ${callCount}</div>
        </div>`;
      },
    };

    const { container, rerender } = render(<CustomTile item={tile} entity={dummyEntity} />);
    const scrollEl = container.querySelector<HTMLElement>('.electricity-longlist')!;
    expect(scrollEl).not.toBeNull();

    // User scrolls down to 250px
    scrollEl.scrollTop = 250;
    fireEvent.scroll(scrollEl);

    // Trigger re-render with updated entity state / new customHtml return value
    const updatedEntity = { ...dummyEntity, state: '20' };
    getAppStore().setEntities([updatedEntity]);

    rerender(<CustomTile item={{ ...tile }} entity={updatedEntity} />);

    const newScrollEl = container.querySelector<HTMLElement>('.electricity-longlist')!;
    expect(newScrollEl.scrollTop).toBe(250);
  });
});
