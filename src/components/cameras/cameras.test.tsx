import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HaEntity, TileConfig } from '../../config/types';
import { createAppStore } from '../../store';
import { Camera } from './Camera';
import { CameraStream } from './CameraStream';
import { CameraThumbnail } from './CameraThumbnail';

vi.mock('../../ha/services', () => ({
  callService: vi.fn(() => Promise.resolve()),
  sendMessage: vi.fn(() => Promise.resolve()),
}));

import { sendMessage } from '../../ha/services';

const sendMessageMock = vi.mocked(sendMessage);

type HlsMock = {
  loadSource: ReturnType<typeof vi.fn>;
  attachMedia: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
};

const hlsState = vi.hoisted(() => {
  const instances: HlsMock[] = [];
  const Events = { MANIFEST_PARSED: 'hlsManifestParsed' };
  return { instances, Events };
});

vi.mock('hls.js', () => ({
  default: class Hls {
    static Events = hlsState.Events;
    loadSource = vi.fn();
    attachMedia = vi.fn();
    on = vi.fn();
    destroy = vi.fn();
    constructor() {
      hlsState.instances.push(this);
    }
  },
}));

function setup() {
  createAppStore({ serverUrl: 'http://h:8123', pages: [] });
}

function entity(state: string, attributes: Record<string, unknown>): HaEntity {
  return { entity_id: 'camera.x', state, attributes };
}

const cameraItem: TileConfig = { type: 'camera', id: 'camera.x', position: [0, 0] };

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('CameraThumbnail', () => {
  it('requests camera_thumbnail and renders the base64 data URL', async () => {
    setup();
    sendMessageMock.mockResolvedValue({
      result: { content_type: 'image/jpeg', content: 'QUJD' },
    });
    const { container } = render(
      <CameraThumbnail item={cameraItem} entity={entity('on', {})} freezed={false} />,
    );
    await act(async () => {});
    expect(sendMessageMock).toHaveBeenCalledWith({
      type: 'camera_thumbnail',
      entity_id: 'camera.x',
    });
    const layer = container.querySelector('.camera-layer') as HTMLElement;
    expect(layer.style.backgroundImage).toContain('data:image/jpeg;base64,QUJD');
  });

  it('skips request when entity state is off', () => {
    setup();
    render(
      <CameraThumbnail item={cameraItem} entity={entity('off', {})} freezed={false} />,
    );
    expect(sendMessageMock).not.toHaveBeenCalled();
  });
});

describe('CameraStream', () => {
  it('requests camera/stream and attaches the hls source', async () => {
    setup();
    sendMessageMock.mockResolvedValue({ result: { url: '/api/stream' } });
    const { container } = render(
      <CameraStream item={cameraItem} entity={entity('on', {})} freezed={false} />,
    );
    await act(async () => {});
    expect(sendMessageMock).toHaveBeenCalledWith({
      type: 'camera/stream',
      entity_id: 'camera.x',
    });
    expect(container.querySelector('video')).toBeTruthy();
    const hls = hlsState.instances[0];
    expect(hls.loadSource).toHaveBeenCalledWith('http://h:8123/api/stream');
    expect(hls.on).toHaveBeenCalledWith('hlsManifestParsed', expect.any(Function));
  });
});

describe('Camera', () => {
  it('appends _i=1 cache buster on refresh tick', () => {
    setup();
    const { container } = render(
      <Camera
        item={{ ...cameraItem, refresh: 100 }}
        entity={entity('on', { entity_picture: '/api/camera' })}
        freezed={false}
      />,
    );
    act(() => {
      vi.advanceTimersByTime(100);
    });
    const layers = container.querySelectorAll('.camera-layer');
    expect(
      Array.from(layers).some((el) =>
        (el as HTMLElement).style.backgroundImage.includes('_i=1'),
      ),
    ).toBe(true);
  });
});