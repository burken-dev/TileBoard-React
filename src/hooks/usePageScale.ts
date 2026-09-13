import { useEffect, useLayoutEffect, useState } from 'react';
import type { RefObject } from 'react';
import { calcPageScale } from '../utils/layout';

function measureScale(el: HTMLElement): number {
  return calcPageScale(el.scrollWidth, el.scrollHeight, el.clientWidth, el.clientHeight);
}

export function usePageScale(
  ref: RefObject<HTMLElement | null>,
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
    const el = ref.current;
    if (el) setScale(measureScale(el));
  }, [ref, enabled, active]);

  // Subscribe once per enable/activation instead of every commit:
  // viewport resizes, element box changes, and real DOM mutations
  // rescale; same-value updates bail out.
  useEffect(() => {
    if (!enabled || !active) return;
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const update = () => {
      setScale((prev) => {
        const next = measureScale(el);
        return prev === next ? prev : next;
      });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    const mo = new MutationObserver(update);
    mo.observe(el, { childList: true, subtree: true, characterData: true, attributes: true });
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [ref, enabled, active]);

  return scale;
}
