import { act, fireEvent, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HaEntity, PageConfig, TileConfig } from '../../config/types';
import { createAppStore, getAppStore } from '../../store';
import Tile from '../Tile';

vi.mock('../../ha/services', () => ({
  callService: vi.fn(() => Promise.resolve()),
  sendMessage: vi.fn(() => Promise.resolve()),
}));

import { callService } from '../../ha/services';

const callServiceMock = vi.mocked(callService);

const page: PageConfig = { groups: [] };

function setup(entities: HaEntity[]) {
  createAppStore({ serverUrl: 'http://h', pages: [] });
  getAppStore().setEntities(entities);
}

function renderTile(item: TileConfig) {
  return render(<Tile item={item} page={page} />);
}

function tap(container: HTMLElement) {
  const root = container.querySelector('.item')!;
  fireEvent.pointerDown(root);
  fireEvent.pointerUp(root);
}

beforeEach(() => callServiceMock.mockClear());

describe('interactive tiles', () => {
  it('input_number increases and clamps at max', () => {
    setup([
      { entity_id: 'input_number.x', state: '95', attributes: { step: 10, max: 100 } },
    ]);
    const { container } = renderTile({
      type: 'input_number',
      id: 'input_number.x',
      position: [0, 0],
    });
    fireEvent.click(container.querySelector('.item-button.-center-right')!);
    expect(callServiceMock).toHaveBeenCalledWith('input_number', 'set_value', {
      entity_id: 'input_number.x',
      value: 100,
    });
  });

  it('input_select opens overlay, choosing option sends and closes', () => {
    setup([
      { entity_id: 'input_select.x', state: 'A', attributes: { options: ['A', 'B', 'C'] } },
    ]);
    const { container } = renderTile({
      type: 'input_select',
      id: 'input_select.x',
      position: [0, 0],
    });
    expect(container.querySelector('.item-select')).toBeNull();

    tap(container);
    const overlay = container.querySelector('.item-select');
    expect(overlay).not.toBeNull();
    expect(overlay?.querySelectorAll('.item-select--option')).toHaveLength(3);

    fireEvent.click(overlay!.querySelectorAll('.item-select--option')[1]!);
    expect(callServiceMock).toHaveBeenCalledWith('input_select', 'select_option', {
      entity_id: 'input_select.x',
      option: 'B',
    });
    expect(container.querySelector('.item-select')).toBeNull();
  });

  it('input_select with a resolvable field opens overlay', () => {
    setup([
      { entity_id: 'input_select.x', state: 'A', attributes: { options: ['A', 'B', 'C'] } },
    ]);
    const { container } = renderTile({
      type: 'input_select',
      id: 'input_select.x',
      position: [0, 0],
      title: () => 'X',
    });
    expect(container.querySelector('.item-select')).toBeNull();

    tap(container);
    expect(container.querySelector('.item-select')).not.toBeNull();
  });

  it('light with a resolvable field opens controls on long press', () => {
    vi.useFakeTimers();
    setup([
      {
        entity_id: 'light.x',
        state: 'on',
        attributes: { brightness: 128, supported_features: 1 },
      },
    ]);
    const { container } = renderTile({
      type: 'light',
      id: 'light.x',
      position: [0, 0],
      title: () => 'X',
      sliders: [{ field: 'brightness' }],
    });

    const root = container.querySelector('.item')!;
    fireEvent.pointerDown(root);
    act(() => {
      vi.advanceTimersByTime(700);
    });
    fireEvent.pointerUp(root);

    expect(container.querySelector('.item-entity-sliders')).not.toBeNull();

    fireEvent.click(container.querySelector('.item-entity--back-button')!);
    expect(container.querySelector('.item-entity-sliders')).toBeNull();

    vi.useRealTimers();
  });

  it('climate respects target_temp_step and clamps to max_temp', () => {
    setup([
      {
        entity_id: 'climate.x',
        state: 'heat',
        attributes: {
          temperature: 29,
          target_temp_step: 2,
          max_temp: 30,
        },
      },
    ]);
    const { container } = renderTile({ type: 'climate', id: 'climate.x', position: [0, 0] });
    fireEvent.click(container.querySelector('.item-button.-center-right')!);
    expect(callServiceMock).toHaveBeenCalledWith('climate', 'set_temperature', {
      entity_id: 'climate.x',
      temperature: 30,
    });
  });

  it('climate preset select opens overlay and sends preset_mode', () => {
    setup([
      {
        entity_id: 'climate.x',
        state: 'heat',
        attributes: { preset_mode: 'comfort', preset_modes: ['comfort', 'eco'] },
      },
    ]);
    const { container } = renderTile({ type: 'climate', id: 'climate.x', position: [0, 0] });
    fireEvent.click(container.querySelector('.item-climate--mode')!);
    const options = container.querySelectorAll('.item-select--option');
    expect(options).toHaveLength(2);
    fireEvent.click(options[1]!);
    expect(callServiceMock).toHaveBeenCalledWith('climate', 'set_preset_mode', {
      entity_id: 'climate.x',
      preset_mode: 'eco',
    });
  });

  it('cover disables open when fully open', () => {
    setup([{ entity_id: 'cover.x', state: 'open', attributes: { current_position: 100 } }]);
    const { container } = renderTile({ type: 'cover', id: 'cover.x', position: [0, 0] });
    const buttons = container.querySelectorAll('.item-cover--button');
    expect(buttons[0]!.className).toContain('-disabled');

    fireEvent.click(buttons[1]!);
    expect(callServiceMock).toHaveBeenCalledWith('cover', 'stop_cover', {
      entity_id: 'cover.x',
    });
  });

  it('select_option uses the domain from the entity id', () => {
    setup([
      { entity_id: 'select.laddbox', state: 'A', attributes: { options: ['A', 'B'] } },
    ]);
    const { container } = renderTile({
      type: 'input_select',
      id: 'select.laddbox',
      position: [0, 0],
    });
    tap(container);
    const overlay = container.querySelector('.item-select');
    expect(overlay).not.toBeNull();
    fireEvent.click(overlay!.querySelectorAll('.item-select--option')[1]!);
    expect(callServiceMock).toHaveBeenCalledWith('select', 'select_option', {
      entity_id: 'select.laddbox',
      option: 'B',
    });
  });

  it('light brightness + computes brightness_pct', () => {
    setup([
      {
        entity_id: 'light.x',
        state: 'on',
        attributes: { brightness: 100, supported_features: 1 },
      },
    ]);
    const { container } = renderTile({ type: 'light', id: 'light.x', position: [0, 0] });
    fireEvent.click(container.querySelector('.item-button.-center-right')!);
    expect(callServiceMock).toHaveBeenCalledWith('light', 'turn_on', {
      entity_id: 'light.x',
      brightness_pct: 50,
    });
  });
});