import { act, fireEvent, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Tile from '../Tile';
import { FEATURES } from '../../config/constants';
import type { TileConfig } from '../../config/types';
import { createAppStore, getAppStore } from '../../store';

vi.mock('../../ha/services', () => ({
  callService: vi.fn(() => Promise.resolve()),
  sendMessage: vi.fn(() => Promise.resolve()),
}));

import { callService } from '../../ha/services';

const callServiceMock = vi.mocked(callService);

function setup(attributes: Record<string, unknown>) {
  createAppStore({ serverUrl: 'http://h', pages: [] });
  getAppStore().setEntities([
    { entity_id: 'media.x', state: 'playing', attributes },
  ]);
}

function renderTile() {
  const item: TileConfig = { type: 'media_player', id: 'media.x', position: [0, 0] };
  return render(<Tile item={item} page={{ groups: [] }} />);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('MediaPlayerTile', () => {
  it('renders pause when playing with PAUSE feature and sends media_pause', () => {
    setup({ supported_features: FEATURES.MEDIA_PLAYER.PAUSE });
    const { container } = renderTile();
    const btn = container.querySelector('.media-player--main-button');
    expect(btn?.querySelector('.mdi')?.className).toContain('mdi-pause');
    fireEvent.click(btn!);
    expect(callServiceMock).toHaveBeenCalledWith('media_player', 'media_pause', {
      entity_id: 'media.x',
    });
  });

  it('renders volume slider with VOLUME_SET and sends volume_set on drag', () => {
    vi.useFakeTimers();
    setup({
      supported_features: FEATURES.MEDIA_PLAYER.VOLUME_SET,
      volume_level: 0.5,
    });
    const { container } = renderTile();
    const input = container.querySelector('.media-player--volume input[type="range"]');
    expect(input).toBeTruthy();
    fireEvent.change(input!, { target: { value: '40' } });
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(callServiceMock).toHaveBeenCalledWith('media_player', 'volume_set', {
      entity_id: 'media.x',
      volume_level: 0.4,
    });
    vi.useRealTimers();
  });

  it('renders mute button and flips is_volume_muted', () => {
    setup({
      supported_features: FEATURES.MEDIA_PLAYER.VOLUME_MUTE,
      is_volume_muted: false,
    });
    const { container } = renderTile();
    const btn = container.querySelector('.media-player--button.-mute');
    expect(btn?.querySelector('.mdi')?.className).toContain('mdi-volume-high');
    fireEvent.click(btn!);
    expect(callServiceMock).toHaveBeenCalledWith('media_player', 'volume_mute', {
      entity_id: 'media.x',
      is_volume_muted: true,
    });
  });
});