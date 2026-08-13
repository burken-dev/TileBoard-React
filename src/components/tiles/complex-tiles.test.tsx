import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Tile from '../Tile';
import type { TileConfig } from '../../config/types';
import { createAppStore, getAppStore } from '../../store';

vi.mock('../../ha/services', () => ({
  callService: vi.fn(() => Promise.resolve()),
  sendMessage: vi.fn(() => Promise.resolve()),
}));

function setup(entities: Array<Record<string, unknown>>, config?: Record<string, unknown>) {
  createAppStore({
    serverUrl: 'http://h',
    tileSize: 50,
    googleApiKey: 'KEY',
    pages: [{ groups: [] }],
    ...config,
  });
  getAppStore().setEntities(
    entities.map((e) => ({
      entity_id: String(e.entity_id),
      state: String(e.state),
      attributes: (e.attributes ?? {}) as Record<string, unknown>,
    })),
  );
}

function renderTile(item: TileConfig) {
  return render(<Tile item={item} page={{ groups: [] }} />);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('WeatherTile', () => {
  it('renders temperature and summary from @ fields', () => {
    setup([
      {
        entity_id: 'weather.x',
        state: 'sunny',
        attributes: { temperature: 21, temperature_unit: '°C' },
      },
    ]);
    const { container } = renderTile({
      type: 'weather',
      id: 'weather.x',
      position: [0, 0],
      fields: {
        temperature: '@attributes.temperature',
        temperatureUnit: '@attributes.temperature_unit',
      },
    });
    expect(container.querySelector('.weather-temperature')?.textContent).toContain('21');
    expect(container.querySelector('.weather-temperature')?.textContent).toContain('°C');
  });
});

describe('DeviceTrackerTile', () => {
  it('renders two map slides with default zoom levels', () => {
    setup([
      {
        entity_id: 'device_tracker.x',
        state: 'home',
        attributes: { latitude: 51.5, longitude: -0.12, friendly_name: 'Phone' },
      },
    ]);
    const { container } = renderTile({ type: 'device_tracker', id: 'device_tracker.x', position: [0, 0] });
    expect(container.querySelectorAll('.item-slide.-map')).toHaveLength(2);
    const first = container.querySelector('.item-slide.-map') as HTMLElement;
    expect(first.style.backgroundImage).toContain('maps.googleapis.com');
  });

  it('renders background image without coords when entity_picture present', () => {
    setup([
      {
        entity_id: 'device_tracker.x',
        state: 'home',
        attributes: { entity_picture: '/api/pic' },
      },
    ]);
    const { container } = renderTile({ type: 'device_tracker', id: 'device_tracker.x', position: [0, 0] });
    expect(container.querySelector('.item-slides-container')).toBeNull();
    expect(container.querySelector('.item-background')).toBeTruthy();
  });
});

describe('IframeTile', () => {
  it('sets iframe src', () => {
    setup([{ entity_id: 'sensor.x', state: 'on', attributes: {} }]);
    const { container } = renderTile({
      type: 'iframe',
      id: 'sensor.x',
      position: [0, 0],
      url: 'http://example.com',
    });
    expect(container.querySelector('iframe')?.getAttribute('src')).toBe('http://example.com');
  });
});