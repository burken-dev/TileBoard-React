import { act, fireEvent, render } from '@testing-library/react';
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
  it('renders custom HTML safely as React Virtual DOM nodes and sanitizes dangerous elements', () => {
    const tile: TileConfig = {
      type: 'custom',
      id: 'sensor.custom_test',
      position: [0, 0],
      customHtml: `
        <div class="test-content">
          <span class="safe-text">Hello Custom Tile</span>
          <script>alert('dangerous')</script>
          <button class="safe-btn" onclick="evil()">Action</button>
        </div>
      `,
    };
    const { container } = render(<CustomTile item={tile} entity={dummyEntity} />);

    // Renders safe markup
    expect(container.querySelector('.safe-text')?.textContent).toBe('Hello Custom Tile');
    const btn = container.querySelector('.safe-btn');
    expect(btn).not.toBeNull();
    expect(btn?.textContent).toBe('Action');

    // Sanitizes scripts and inline event attributes
    expect(container.querySelector('script')).toBeNull();
    expect(btn?.getAttribute('onclick')).toBeNull();
  });

  it('suppresses re-renders when unrelated entities update', () => {
    let renderCount = 0;
    const tile: TileConfig = {
      type: 'custom',
      id: 'sensor.custom_test',
      position: [0, 0],
      customHtml: () => {
        renderCount++;
        return '<div class="render-count">Count</div>';
      },
    };

    render(<CustomTile item={tile} entity={dummyEntity} />);
    expect(renderCount).toBe(1);

    // Update an unrelated entity in store
    const unrelatedEntity: HaEntity = {
      entity_id: 'sensor.unrelated',
      state: 'on',
      attributes: {},
    };
    act(() => {
      getAppStore().setEntities([dummyEntity, unrelatedEntity]);
    });

    // CustomTile should NOT re-render
    expect(renderCount).toBe(1);
  });

  it('triggers re-render when primary entity updates in store', () => {
    let renderCount = 0;
    const tile: TileConfig = {
      type: 'custom',
      id: 'sensor.custom_test',
      position: [0, 0],
      customHtml: function () {
        renderCount++;
        const state = this.states['sensor.custom_test']?.state ?? '';
        return `<div class="state-val">${state}</div>`;
      },
    };

    const { container } = render(<CustomTile item={tile} entity={dummyEntity} />);
    expect(renderCount).toBe(1);
    expect(container.querySelector('.state-val')?.textContent).toBe('10');

    // Update subscribed primary entity in store
    const updatedEntity: HaEntity = {
      entity_id: 'sensor.custom_test',
      state: '20',
      attributes: {},
    };
    act(() => {
      getAppStore().setEntities([updatedEntity]);
    });

    expect(renderCount).toBe(2);
    expect(container.querySelector('.state-val')?.textContent).toBe('20');
  });

  it('triggers re-render when declared item.entities updates and suppresses unrelated updates', () => {
    const entityA: HaEntity = {
      entity_id: 'sensor.a',
      state: '10',
      attributes: {},
    };
    const entityB: HaEntity = {
      entity_id: 'sensor.b',
      state: '20',
      attributes: {},
    };
    act(() => {
      getAppStore().setEntities([entityA, entityB]);
    });

    let multiDepRenderCount = 0;
    const multiTile: TileConfig = {
      type: 'custom',
      id: 'sensor.a',
      entities: ['sensor.a', 'sensor.b'],
      position: [0, 0],
      customHtml: function () {
        multiDepRenderCount++;
        const a = this.states['sensor.a']?.state ?? '';
        const b = this.states['sensor.b']?.state ?? '';
        return `<div class="multi-dep">A: ${a}, B: ${b}</div>`;
      },
    };

    const { container } = render(<CustomTile item={multiTile} entity={entityA} />);
    expect(multiDepRenderCount).toBe(1);
    expect(container.querySelector('.multi-dep')?.textContent).toBe('A: 10, B: 20');

    // Update sensor.b (which is in declared entities) -> SHOULD re-render
    const updatedB: HaEntity = {
      entity_id: 'sensor.b',
      state: '25',
      attributes: {},
    };
    act(() => {
      getAppStore().setEntities([entityA, updatedB]);
    });
    expect(multiDepRenderCount).toBe(2);
    expect(container.querySelector('.multi-dep')?.textContent).toBe('A: 10, B: 25');

    // Update unrelated sensor.c -> should NOT re-render
    const entityC: HaEntity = {
      entity_id: 'sensor.c',
      state: '99',
      attributes: {},
    };
    act(() => {
      getAppStore().setEntities([entityA, updatedB, entityC]);
    });
    expect(multiDepRenderCount).toBe(2);
  });

  it('memo areEqual suppresses re-render when parent passes new object references with unchanged values', () => {
    let renderCount = 0;
    const tile: TileConfig = {
      type: 'custom',
      id: 'sensor.custom_test',
      position: [0, 0],
      customHtml: () => {
        renderCount++;
        return '<div>Memo Test</div>';
      },
    };

    const { rerender } = render(<CustomTile item={tile} entity={dummyEntity} />);
    expect(renderCount).toBe(1);

    // Parent re-renders and passes a fresh item shallow copy and fresh entity copy
    rerender(<CustomTile item={{ ...tile }} entity={{ ...dummyEntity }} />);
    expect(renderCount).toBe(1);
  });

  it('preserves child element scroll position across re-renders and html updates naturally', () => {
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

    const { container } = render(<CustomTile item={tile} entity={dummyEntity} />);
    const scrollEl = container.querySelector<HTMLElement>('.electricity-longlist')!;
    expect(scrollEl).not.toBeNull();

    // User scrolls down to 250px
    scrollEl.scrollTop = 250;
    fireEvent.scroll(scrollEl);

    // Trigger re-render with updated entity state / new customHtml return value
    const updatedEntity = { ...dummyEntity, state: '20' };
    act(() => {
      getAppStore().setEntities([updatedEntity]);
    });

    expect(callCount).toBe(2);
    const newScrollEl = container.querySelector<HTMLElement>('.electricity-longlist')!;
    expect(newScrollEl.scrollTop).toBe(250);
  });

  it('renders IconTile fallback when customHtml is not provided', () => {
    const tile: TileConfig = {
      type: 'custom',
      id: 'sensor.custom_test',
      position: [0, 0],
      icon: 'mdi-puzzle',
    };

    const { container } = render(<CustomTile item={tile} entity={dummyEntity} />);
    expect(container.querySelector('.item-entity--icon')).not.toBeNull();
  });
});

