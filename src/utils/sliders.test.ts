import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HaEntity, TileConfig } from '../config/types';
import { createAppStore } from '../store';
import { getLightSliderConf, getSliderConf, sendSliderValue } from './sliders';

vi.mock('../ha/services', () => ({
  callService: vi.fn(() => Promise.resolve()),
  sendMessage: vi.fn(() => Promise.resolve()),
}));

import { callService } from '../ha/services';

const callServiceMock = vi.mocked(callService);

const entity: HaEntity = {
  entity_id: 'input_number.x',
  state: '10',
  attributes: { min: 0, max: 100, step: 5 },
};

const item: TileConfig = {
  type: 'slider',
  id: 'input_number.x',
  position: [0, 0],
  slider: {},
};

createAppStore({ serverUrl: 'http://h', pages: [] });

describe('getSliderConf', () => {
  it('defaults from entity attributes', () => {
    const conf = getSliderConf(item, entity, {});
    expect(conf).toMatchObject({ min: 0, max: 100, step: 5, value: 10 });
  });

  it('value resolves from slider.field', () => {
    const conf = getSliderConf(
      { ...item, slider: { field: 'some' } },
      { ...entity, attributes: { some: 42 } },
      {},
    );
    expect(conf.value).toBe(42);
  });

  it('resolves function slider fields', () => {
    const conf = getSliderConf(
      { ...item, slider: { min: () => 5 } },
      { ...entity, attributes: { min: 0, step: 5 } },
      {},
    );
    expect(conf.min).toBe(5);
  });
});

describe('getLightSliderConf', () => {
  it('resolves value from field attribute', () => {
    const conf = getLightSliderConf(
      { field: 'brightness' },
      { ...entity, attributes: { brightness: 128 } },
      {},
    );
    expect(conf.value).toBe(128);
    expect(conf.request).toEqual({ domain: 'input_number', service: 'set_value', field: 'brightness' });
  });

  it('resolves function title on light sliders', () => {
    const conf = getLightSliderConf(
      { title: () => 'Brightness', field: 'brightness' },
      { ...entity, attributes: { brightness: 128 } },
      {},
    );
    expect(conf.title).toBe('Brightness');
    expect(conf.value).toBe(128);
  });
});

describe('sendSliderValue', () => {
  beforeEach(() => {
    createAppStore({ serverUrl: 'http://h', pages: [] });
    callServiceMock.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces and sends payload with latest value', () => {
    const conf = getSliderConf(item, entity, {});
    sendSliderValue(item, { ...conf, value: 55 });
    sendSliderValue(item, { ...conf, value: 60 });
    expect(callServiceMock).not.toHaveBeenCalled();
    vi.advanceTimersByTime(260);
    expect(callServiceMock).toHaveBeenCalledWith('input_number', 'set_value', {
      entity_id: 'input_number.x',
      value: 60,
    });
  });
});