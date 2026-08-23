import { memo, useEffect, useLayoutEffect, useRef } from 'react';
import type { HaEntity, TileConfig } from '../../config/types';
import { useEntities } from '../../store';
import { parseFieldValue } from '../../utils/fields';
import { IconTile } from './IconTile';

export const CustomTile = memo(function CustomTile({
  item,
  entity,
}: {
  item: TileConfig;
  entity: HaEntity;
}) {
  const states = useEntities([String(item.id)]);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollPositions = useRef<Map<string, number>>(new Map());

  // Capture scroll events from any child elements inside the custom container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (target && target !== container) {
        const key = target.className ? target.className.trim() : target.tagName;
        if (key) {
          scrollPositions.current.set(key, target.scrollTop);
        }
      }
    };

    container.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, []);

  const html = item.customHtml
    ? parseFieldValue(item.customHtml, states, item, entity)
    : null;

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    scrollPositions.current.forEach((scrollTop, elKey) => {
      try {
        const selector = elKey
          .split(/\s+/)
          .filter(Boolean)
          .map((cls) => `.${cls}`)
          .join('');
        if (selector) {
          const matches = container.querySelectorAll<HTMLElement>(selector);
          matches.forEach((el) => {
            if (el.scrollTop !== scrollTop) {
              el.scrollTop = scrollTop;
            }
          });
        }
      } catch {
        // Fallback for non-class selectors or invalid classes
      }
    });
  }, [html]);

  if (item.customHtml) {
    return (
      <div className="item-entity-container">
        <div
          ref={containerRef}
          dangerouslySetInnerHTML={{ __html: String(html ?? '') }}
        />
      </div>
    );
  }
  return <IconTile item={item} entity={entity} />;
});