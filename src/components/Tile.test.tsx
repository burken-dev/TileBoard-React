import { fireEvent, render } from '@testing-library/react';
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
});