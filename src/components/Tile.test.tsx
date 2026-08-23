import { act, fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Tile from './Tile';
import { createAppStore, getAppStore } from '../store';
import type { TileBoardConfig, TileConfig } from '../config/types';

const config: TileBoardConfig = {
  serverUrl: 'http://h',
  pages: [{ groups: [] }],
};

const entity = {
  entity_id: 'switch.test',
  state: 'on',
  attributes: { friendly_name: 'Test Switch' },
};

function setup() {
  createAppStore(config);
  getAppStore().setEntities([entity]);
}

describe('Tile', () => {
  it('renders title, state and classes', () => {
    setup();
    const item: TileConfig = {
      type: 'switch',
      id: 'switch.test',
      position: [0, 0],
    };
    const { container } = render(<Tile item={item} page={{ groups: [] }} />);
    const root = container.querySelector('.item')!;
    expect(root.className).toContain('-switch');
    expect(root.className).toContain('-th-switch');
    expect(root.className).toContain('-on');
    expect(container.querySelector('.item-title')?.textContent).toBe('Test Switch');
    expect(container.querySelector('.item-state')?.textContent).toBe('on');
  });

  it('calls action on click', () => {
    setup();
    const action = vi.fn();
    const item: TileConfig = {
      type: 'switch',
      id: 'switch.test',
      position: [0, 0],
      action,
    };
    const { container } = render(<Tile item={item} page={{ groups: [] }} />);
    fireEvent.pointerDown(container.querySelector('.item')!);
    fireEvent.pointerUp(container.querySelector('.item')!);
    expect(action).toHaveBeenCalled();
  });

  it('calls secondaryAction on long press', () => {
    vi.useFakeTimers();
    setup();
    const secondaryAction = vi.fn();
    const item: TileConfig = {
      type: 'switch',
      id: 'switch.test',
      position: [0, 0],
      secondaryAction,
    };
    const { container } = render(<Tile item={item} page={{ groups: [] }} />);
    fireEvent.pointerDown(container.querySelector('.item')!);
    vi.advanceTimersByTime(700);
    fireEvent.pointerUp(container.querySelector('.item')!);
    expect(secondaryAction).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('cancels secondaryAction on pointer move during scroll/drag', () => {
    vi.useFakeTimers();
    setup();
    const secondaryAction = vi.fn();
    const item: TileConfig = {
      type: 'switch',
      id: 'switch.test',
      position: [0, 0],
      secondaryAction,
    };
    const { container } = render(<Tile item={item} page={{ groups: [] }} />);
    const itemEl = container.querySelector('.item')!;
    fireEvent.pointerDown(itemEl, { clientX: 100, clientY: 100 });
    fireEvent.pointerMove(itemEl, { clientX: 100, clientY: 130 });
    vi.advanceTimersByTime(700);
    fireEvent.pointerUp(itemEl, { clientX: 100, clientY: 130 });
    expect(secondaryAction).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('renders nothing for hidden tiles', () => {
    setup();
    const item: TileConfig = {
      type: 'switch',
      id: 'switch.test',
      position: [0, 0],
      hidden: true,
    };
    const { container } = render(<Tile item={item} page={{ groups: [] }} />);
    expect(container.querySelector('.item')).toBeNull();
  });

  it('re-evaluates hidden functions when uiState changes', () => {
    setup();
    const item: TileConfig = {
      type: 'switch',
      id: 'switch.test',
      position: [0, 0],
      hidden: function () {
        return this.uiState('panel') === 'detail';
      },
    };
    const { container } = render(<Tile item={item} page={{ groups: [] }} />);
    expect(container.querySelector('.item')).not.toBeNull();

    act(() => {
      getAppStore().setUiState('panel', 'detail');
    });
    expect(container.querySelector('.item')).toBeNull();

    act(() => {
      getAppStore().setUiState('panel', 'overview');
    });
    expect(container.querySelector('.item')).not.toBeNull();
  });

  it('resolves function settings with entity context', () => {
    setup();
    const item: TileConfig = {
      type: 'switch',
      id: 'switch.test',
      position: [0, 0],
      icon: () => 'mdi-function-icon',
    };
    const { container } = render(<Tile item={item} page={{ groups: [] }} />);
    const icon = container.querySelector('.item-entity--icon');
    expect(icon?.className).toContain('mdi-function-icon');
  });

  it('resolves customStyles at the render boundary', () => {
    setup();
    const item: TileConfig = {
      type: 'switch',
      id: 'switch.test',
      position: [0, 0],
      customStyles: () => ({ color: 'rgb(1, 2, 3)' }),
    };
    const { container } = render(<Tile item={item} page={{ groups: [] }} />);
    const root = container.querySelector('.item') as HTMLElement;
    expect(root.style.color).toBe('rgb(1, 2, 3)');
  });

  it('normalizes kebab-case customStyles keys to camelCase', () => {
    setup();
    const item: TileConfig = {
      type: 'switch',
      id: 'switch.test',
      position: [0, 0],
      customStyles: () => ({ 'background-color': 'rgb(1, 2, 3)' }),
    };
    const { container } = render(<Tile item={item} page={{ groups: [] }} />);
    const root = container.querySelector('.item') as HTMLElement;
    expect(root.style.backgroundColor).toBe('rgb(1, 2, 3)');
  });
});