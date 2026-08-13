import { useEffect, useRef } from 'react';
import type { HaEntity, TileConfig } from '../../config/types';
import { callFunction } from '../../utils/functions';

export function IframeTile({ item, entity }: { item: TileConfig; entity: HaEntity }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const src =
    typeof item.url === 'function' ? String(callFunction(item.url, [item, entity])) : item.url;
  const refresh =
    typeof item.refresh === 'function' ? Number(callFunction(item.refresh, [item, entity])) : item.refresh;

  useEffect(() => {
    if (!refresh || !src) return;
    const id = window.setInterval(() => {
      const el = iframeRef.current;
      if (el) el.src = src;
    }, Math.max(1000, refresh));
    return () => window.clearInterval(id);
  }, [refresh, src]);

  return (
    <div className="item-entity-container">
      <div className="item-iframe">
        <iframe ref={iframeRef} src={src} frameBorder="0" />
      </div>
    </div>
  );
}