import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HaEntity, PageConfig, TileConfig } from '../../config/types';
import { createAppStore, getAppStore } from '../../store';
import Tile from '../Tile';
import { MultiTile } from './MultiTile';

vi.mock('../../ha/services', () => ({
  callService: vi.fn(() => Promise.resolve()),
  sendMessage: vi.fn(() => Promise.resolve()),
}));

afterEach(cleanup);

const page: PageConfig = { groups: [] };

const entityA: HaEntity = { entity_id: 'switch.a', state: 'off', attributes: { friendly_name: 'Switch A' } };
const entityB: HaEntity = { entity_id: 'switch.b', state: 'off', attributes: { friendly_name: 'Switch B' } };

const multiItem: TileConfig = {
  type: 'multi',
  id: 'main',
  position: [0, 0],
  width: 2,
  height: 1,
  items: [
    { type: 'switch', id: 'switch.a', position: [9, 9] },
    { type: 'switch', id: 'switch.b', position: [9, 9], key: 'b' },
  ],
};

function setup(entities: HaEntity[]) {
  getAppStore().setEntities(entities);
}

function renderMulti(override: Partial<TileConfig> = {}) {
  return render(<MultiTile item={{ ...multiItem, ...override }} page={page} />);
}

beforeEach(() => {
  createAppStore({ serverUrl: 'http://h', pages: [] });
  getAppStore().setUiState('multi:main', undefined);
});

describe('MultiTile switching', () => {
  it('renders the first visible child by default', () => {
    setup([entityA, entityB]);
    const { container } = renderMulti();
    expect(container.querySelector('.item.-multi .item-title')).toHaveTextContent('Switch A');
  });

  it('ignores the child position', () => {
    setup([entityA, entityB]);
    const { container } = renderMulti();
    const child = container.querySelector('.item.-multi > .item') as HTMLElement;
    expect(child.style.left).toBe('0px');
    expect(child.style.top).toBe('0px');
  });

  it('inherits the parent size when the child has none', () => {
    setup([entityA, entityB]);
    const { container } = renderMulti();
    const child = container.querySelector('.item.-multi > .item') as HTMLElement;
    expect(child.style.width).toBe('306px');
    expect(child.style.height).toBe('150px');
  });

  it('keeps an overriding child width', () => {
    setup([entityA, entityB]);
    const { container } = renderMulti({
      items: [{ type: 'switch', id: 'switch.a', position: [9, 9], width: 1 }],
    });
    const child = container.querySelector('.item.-multi > .item') as HTMLElement;
    expect(child.style.width).toBe('150px');
  });

  it('steps forward and wraps', () => {
    setup([entityA, entityB]);
    const { container } = renderMulti();
    act(() => getAppStore().setUiState('multi:main', 1));
    expect(container.querySelector('.item.-multi .item-title')).toHaveTextContent('Switch B');
    act(() => getAppStore().setUiState('multi:main', 1));
    expect(container.querySelector('.item.-multi .item-title')).toHaveTextContent('Switch A');
  });

  it('steps backward with wrap', () => {
    setup([entityA, entityB]);
    const { container } = renderMulti();
    act(() => getAppStore().setUiState('multi:main', -1));
    expect(container.querySelector('.item.-multi .item-title')).toHaveTextContent('Switch B');
  });

  it('shows the child matching a key', () => {
    setup([entityA, entityB]);
    const { container } = renderMulti();
    act(() => getAppStore().setUiState('multi:main', 'b'));
    expect(container.querySelector('.item.-multi .item-title')).toHaveTextContent('Switch B');
  });

  it('skips hidden children when stepping', () => {
    setup([entityA, entityB]);
    const { container } = renderMulti({
      items: [
        { type: 'switch', id: 'switch.a', position: [9, 9], hidden: true },
        { type: 'switch', id: 'switch.b', position: [9, 9], key: 'b' },
      ],
    });
    expect(container.querySelector('.item.-multi .item-title')).toHaveTextContent('Switch B');
    act(() => getAppStore().setUiState('multi:main', 1));
    expect(container.querySelector('.item.-multi .item-title')).toHaveTextContent('Switch B');
  });

  it('shows nothing when the keyed child becomes hidden', () => {
    setup([entityA, entityB]);
    const { container } = renderMulti();
    act(() => getAppStore().setUiState('multi:main', 'b'));
    act(() => getAppStore().setEntities([entityA]));
    expect(container.querySelector('.item.-multi')).toBeNull();
  });

  it('shows nothing when all children are hidden', () => {
    setup([entityA, entityB]);
    const { container } = renderMulti({
      items: [
        { type: 'switch', id: 'switch.a', position: [9, 9], hidden: true },
        { type: 'switch', id: 'switch.b', position: [9, 9], hidden: true },
      ],
    });
    expect(container.querySelector('.item.-multi')).toBeNull();
  });

  it('normalizes the store to the active child key', () => {
    setup([entityA, entityB]);
    renderMulti();
    expect(getAppStore().uiState['multi:main']).toBe('0');
    act(() => getAppStore().setUiState('multi:main', 1));
    expect(getAppStore().uiState['multi:main']).toBe('b');
  });
});

describe('MultiTile autorotate', () => {
  it('advances through children on the interval', () => {
    vi.useFakeTimers();
    setup([entityA, entityB]);
    const { container } = renderMulti({ autorotate: 1000 });
    expect(container.querySelector('.item.-multi .item-title')).toHaveTextContent('Switch A');
    act(() => vi.advanceTimersByTime(1000));
    expect(container.querySelector('.item.-multi .item-title')).toHaveTextContent('Switch B');
    act(() => vi.advanceTimersByTime(1000));
    expect(container.querySelector('.item.-multi .item-title')).toHaveTextContent('Switch A');
    vi.useRealTimers();
  });

  it('does not rotate when autorotate is absent', () => {
    vi.useFakeTimers();
    setup([entityA, entityB]);
    const { container } = renderMulti();
    act(() => vi.advanceTimersByTime(5000));
    expect(container.querySelector('.item.-multi .item-title')).toHaveTextContent('Switch A');
    vi.useRealTimers();
  });
});

describe('Tile integration', () => {
  it('routes a multi tile through the Tile component', () => {
    setup([entityA, entityB]);
    const { container } = render(<Tile item={multiItem} page={page} />);
    expect(container.querySelector('.item.-multi .item-title')).toHaveTextContent('Switch A');
  });
});