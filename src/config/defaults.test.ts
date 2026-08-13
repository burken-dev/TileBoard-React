import { describe, expect, it } from 'vitest';
import { applyDefaults } from './defaults';
import type { TileBoardConfig } from './types';

const baseConfig: TileBoardConfig = {
  serverUrl: 'http://localhost:8123',
  pages: [
    {
      groups: [
        {
          items: [
            {
              type: 'switch' as const,
              id: 'switch.test',
              position: [0, 0],
            },
          ],
        },
      ],
    },
  ],
};

describe('applyDefaults', () => {
  it('fills transition with animated', () => {
    expect(applyDefaults(baseConfig).transition).toBe('animated');
  });

  it('fills tileSize with 150', () => {
    expect(applyDefaults(baseConfig).tileSize).toBe(150);
  });

  it('fills tileMargin with 6', () => {
    expect(applyDefaults(baseConfig).tileMargin).toBe(6);
  });

  it('fills entitySize with normal', () => {
    expect(applyDefaults(baseConfig).entitySize).toBe('normal');
  });

  it('fills menuPosition with left', () => {
    expect(applyDefaults(baseConfig).menuPosition).toBe('left');
  });

  it('fills groupsAlign with horizontally', () => {
    expect(applyDefaults(baseConfig).groupsAlign).toBe('horizontally');
  });

  it('fills notiesPosition with right', () => {
    expect(applyDefaults(baseConfig).notiesPosition).toBe('right');
  });

  it('fills timeFormat with 24', () => {
    expect(applyDefaults(baseConfig).timeFormat).toBe(24);
  });

  it('fills pingConnection with true', () => {
    expect(applyDefaults(baseConfig).pingConnection).toBe(true);
  });

  it('fills doorEntryTimeout with 10', () => {
    expect(applyDefaults(baseConfig).doorEntryTimeout).toBe(10);
  });

  it('fills header with DEFAULT_HEADER', () => {
    const config = applyDefaults(baseConfig);
    expect(config.header).toBeDefined();
    expect(config.header?.left).toHaveLength(1);
    expect(config.header?.right).toHaveLength(1);
  });

  it('derives wsUrl from http serverUrl', () => {
    expect(applyDefaults({ ...baseConfig, serverUrl: 'http://h:8123' }).wsUrl).toBe(
      'ws://h:8123/api/websocket',
    );
  });

  it('derives wsUrl from https serverUrl', () => {
    expect(applyDefaults({ ...baseConfig, serverUrl: 'https://h' }).wsUrl).toBe(
      'wss://h/api/websocket',
    );
  });

  it('keeps explicit wsUrl', () => {
    const config = applyDefaults({
      ...baseConfig,
      wsUrl: 'ws://custom:8123/api/websocket',
    });
    expect(config.wsUrl).toBe('ws://custom:8123/api/websocket');
  });

  it('keeps explicit transition', () => {
    expect(applyDefaults({ ...baseConfig, transition: 'animated_gpu' }).transition).toBe(
      'animated_gpu',
    );
  });
});