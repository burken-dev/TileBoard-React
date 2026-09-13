import { useEffect, useState } from 'react';
import type { RefObject } from 'react';
import { calcPageScale } from '../utils/layout';

function measureScale(el: HTMLElement): number {
  return calcPageScale(el.scrollWidth, el.scrollHeight, el.clientWidth, el.clientHeight);
}

export function usePageScale(ref: RefObject<HTMLElement | null>, enabled: boolean): number {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!enabled) {
      setScale(1);
      return;
    }
    const el = ref.current;
    if (!el) return;
    // Runs after every commit (no dep array) so late content changes
    // (entities streaming in) rescale; same-value updates bail out.
    const update = () => {
      setScale((prev) => {
        const next = measureScale(el);
        return prev === next ? prev : next;
      });
    };
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  });

  return scale;
}
