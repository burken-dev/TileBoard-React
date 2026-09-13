import { useEffect, useLayoutEffect, useState } from 'react';
import type { RefObject } from 'react';
import { calcPageScale } from '../utils/layout';

function measureScale(viewport: HTMLElement, content: HTMLElement): number {
  return calcPageScale(
    content.scrollWidth,
    content.scrollHeight,
    viewport.clientWidth,
    viewport.clientHeight,
  );
}

export function usePageScale(
  viewportRef: RefObject<HTMLElement | null>,
  contentRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  active: boolean,
): number {
  const [scale, setScale] = useState(1);

  // Sync measure on enable/activation so the right scale paints
  // without flashing unscaled.
  useLayoutEffect(() => {
    if (!enabled || !active) {
      setScale(1);
      return;
    }
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (viewport && content) setScale(measureScale(viewport, content));
  }, [viewportRef, contentRef, enabled, active]);

  // Subscribe once per enable/activation instead of every commit:
  // viewport resizes, element box changes, and real DOM mutations
  // rescale; same-value updates bail out.
  useEffect(() => {
    if (!enabled || !active) return;
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content || typeof ResizeObserver === 'undefined') return;
    const update = () => {
      const vp = viewportRef.current;
      const ct = contentRef.current;
      if (!vp || !ct) return;
      setScale((prev) => {
        const next = measureScale(vp, ct);
        return prev === next ? prev : next;
      });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(viewport);
    ro.observe(content);
    const mo = new MutationObserver(update);
    mo.observe(content, { childList: true, subtree: true, characterData: true, attributes: true });
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [viewportRef, contentRef, enabled, active]);

  return scale;
}
