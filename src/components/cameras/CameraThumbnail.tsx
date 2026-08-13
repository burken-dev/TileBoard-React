import { useEffect, useMemo, useRef, useState } from 'react';
import type { HaEntity, TileConfig } from '../../config/types';
import { sendMessage } from '../../ha/services';
import { callFunction } from '../../utils/functions';

interface CameraThumbnailProps {
  item: TileConfig;
  entity: HaEntity | null;
  freezed: boolean;
}

export function CameraThumbnail({ item, entity, freezed }: CameraThumbnailProps) {
  const freezedRef = useRef(freezed);
  freezedRef.current = freezed;
  const [cur, setCur] = useState<string | null>(null);
  const [prev, setPrev] = useState<string | null>(null);
  const curRef = useRef<string | null>(null);

  const refresh = useMemo<number>(() => {
    if (typeof item.refresh === 'function') {
      return Number(callFunction(item.refresh, [item, entity]));
    }
    return item.refresh ?? 2000;
  }, [item, entity]);

  useEffect(() => {
    let lastUpdate = 0;

    const show = (url: string): void => {
      setPrev(curRef.current);
      curRef.current = url;
      setCur(url);
      window.setTimeout(() => setPrev(null), 100);
    };

    const reload = (): void => {
      if (Date.now() - lastUpdate < (refresh ? refresh * 0.9 : 100)) return;
      if (lastUpdate && freezedRef.current) return;
      lastUpdate = Date.now();
      if (entity?.state === 'off') return;
      sendMessage<{ result?: { content_type?: string; content?: string } }>({
        type: 'camera_thumbnail',
        entity_id: entity?.entity_id ?? String(item.id),
      })
        .then((res) => {
          const result = res.result;
          if (!result?.content_type) return;
          show(`data:${result.content_type};base64,${result.content}`);
        })
        .catch(() => {});
    };

    reload();
    if (refresh) {
      const id = window.setInterval(reload, refresh);
      return () => window.clearInterval(id);
    }
  }, [item, entity, refresh]);

  return (
    <div className="item-camera" style={{ position: 'relative', overflow: 'hidden' }}>
      {prev ? (
        <div
          className="camera-layer"
          style={{
            backgroundImage: `url("${prev}")`,
            backgroundSize: item.bgSize ?? 'cover',
            backgroundPosition: 'center',
            opacity: 0,
            transition: 'opacity 0.1s ease-in-out',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
          }}
        />
      ) : null}
      {cur ? (
        <div
          className="camera-layer"
          style={{
            backgroundImage: `url("${cur}")`,
            backgroundSize: item.bgSize ?? 'cover',
            backgroundPosition: 'center',
            opacity: 1,
            transition: 'opacity 0.1s ease-in-out',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
          }}
        />
      ) : null}
    </div>
  );
}