import { useEffect, useMemo, useRef, useState } from 'react';
import type { HaEntity, TileConfig } from '../../config/types';
import { useAppStore } from '../../store';
import { callFunction } from '../../utils/functions';
import { toAbsoluteServerURL } from '../../utils/misc';

interface CameraProps {
  item: TileConfig;
  entity: HaEntity | null;
  freezed: boolean;
}

interface ImageLayerProps {
  url: string;
  backgroundSize: string | undefined;
  visible: boolean;
}

function ImageLayer({ url, backgroundSize, visible }: ImageLayerProps) {
  return (
    <div
      className="camera-layer"
      style={{
        backgroundImage: `url("${url}")`,
        backgroundSize: backgroundSize ?? 'cover',
        backgroundPosition: 'center',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.1s ease-in-out',
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
      }}
    />
  );
}

export function Camera({ item, entity, freezed }: CameraProps) {
  const serverUrl = useAppStore((s) => s.config.serverUrl);
  const freezedRef = useRef(freezed);
  freezedRef.current = freezed;
  const [cur, setCur] = useState<string | null>(null);
  const [prev, setPrev] = useState<string | null>(null);
  const curRef = useRef<string | null>(null);

  const show = (url: string): void => {
    setPrev(curRef.current);
    curRef.current = url;
    setCur(url);
    window.setTimeout(() => setPrev(null), 100);
  };

  const refresh = useMemo<number>(
    () =>
      typeof item.refresh === 'function'
        ? Number(callFunction(item.refresh, [item, entity]))
        : (item.refresh ?? 0),
    [item, entity],
  );

  useEffect(() => {
    let i = 0;
    let photoUrl: string | null = null;

    const reload = (): void => {
      if (!photoUrl || freezedRef.current) return;
      show(photoUrl + (photoUrl.includes('?') ? '&' : '?') + '_i=' + i++);
    };

    const update = (): void => {
      const newUrl = item.filter
        ? String(callFunction(item.filter, [item, entity]))
        : entity?.attributes?.entity_picture
          ? String(entity.attributes.entity_picture)
          : null;
      if (newUrl !== photoUrl) {
        photoUrl = newUrl;
        reload();
      }
    };

    update();
    if (refresh) {
      const id = window.setInterval(reload, refresh);
      return () => window.clearInterval(id);
    }
  }, [item, entity, refresh]);

  return (
    <div className="item-camera" style={{ position: 'relative', overflow: 'hidden' }}>
      {prev ? (
        <ImageLayer
          url={toAbsoluteServerURL(prev, serverUrl)}
          backgroundSize={item.bgSize}
          visible={false}
        />
      ) : null}
      {cur ? (
        <ImageLayer
          url={toAbsoluteServerURL(cur, serverUrl)}
          backgroundSize={item.bgSize}
          visible
        />
      ) : null}
    </div>
  );
}