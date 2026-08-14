import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import type { HaEntity, TileConfig } from '../../config/types';
import { sendMessage } from '../../ha/services';
import { useAppStore } from '../../store';
import { toAbsoluteServerURL } from '../../utils/misc';

interface CameraStreamProps {
  item: TileConfig;
  entity: HaEntity | null;
  freezed: boolean;
}

export function CameraStream({ item, entity, freezed }: CameraStreamProps) {
  const serverUrl = useAppStore((s) => s.config.serverUrl);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (freezed || entity?.state === 'off') return;
    let cancelled = false;
    sendMessage<{ result?: { url?: string } }>({
      type: 'camera/stream',
      entity_id: entity?.entity_id ?? String(item.id),
    })
      .then((res) => {
        if (!cancelled && res.result?.url) setUrl(toAbsoluteServerURL(res.result.url, serverUrl));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [entity, serverUrl, item.id, freezed]);

  useEffect(() => {
    if (freezed || !url) return;
    const el = videoRef.current;
    if (!el) return;
    const len = typeof item.bufferLength !== 'undefined' ? item.bufferLength : 5;
    let hls: import('hls.js').default | null = null;
    let cancelled = false;
    (async () => {
      const { default: Hls } = await import('hls.js');
      if (cancelled || freezed) return;
      hls = new Hls({ maxBufferLength: len, maxMaxBufferLength: len });
      hls.loadSource(url);
      hls.attachMedia(el);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        el.play().catch(() => {});
      });
    })();
    return () => {
      cancelled = true;
      el.pause();
      hls?.destroy();
    };
  }, [url, item.bufferLength, freezed]);

  return (
    <div className="item-camera" style={{ position: 'relative', overflow: 'hidden' }}>
      <video
        ref={videoRef}
        muted
        style={{
          objectFit: (item.objFit ?? 'fill') as React.CSSProperties['objectFit'],
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
}