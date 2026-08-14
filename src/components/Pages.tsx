import { useRef } from 'react';
import type React from 'react';
import { usePanGesture } from '../hooks/usePanGesture';
import { useAppStore } from '../store';
import { isHidden } from '../utils/fields';
import { pageTransform, shouldDrawPage } from '../utils/layout';
import Page from './Page';
import PagesMenu from './PagesMenu';

function dragTransform(offset: number, transition: string, menuOnLeft: boolean): string {
  if (transition === 'animated_gpu') {
    return menuOnLeft ? `translate3d(0, ${offset}%, 0)` : `translate3d(${offset}%, 0, 0)`;
  }
  return menuOnLeft ? `translate(0, ${offset}%)` : `translate(${offset}%, 0)`;
}

export default function Pages() {
  const config = useAppStore((s) => s.config);
  const activePage = useAppStore((s) => s.activePage);
  const openPage = useAppStore((s) => s.openPage);
  const activeSelect = useAppStore((s) => s.activeSelect);
  const closeSelect = useAppStore((s) => s.closeSelect);

  const transition = config.transition ?? 'animated';
  const menuOnLeft = (config.menuPosition ?? 'left') === 'left';

  const visible = config.pages
    .map((page, index) => ({ page, index }))
    .filter(({ page }) => !isHidden(page, {}));

  const count = visible.length;
  const activePos = Math.max(
    0,
    visible.findIndex((entry) => entry.index === activePage),
  );

  const containerRef = useRef<HTMLDivElement>(null);

  const pan = usePanGesture({
    axis: menuOnLeft ? 'y' : 'x',
    count,
    active: activePos,
    disabled: false,
    onDrag: (offset) => {
      const el = containerRef.current;
      if (el) el.style.transform = dragTransform(offset, transition, menuOnLeft);
    },
    onSettle: (targetPos) => {
      const el = containerRef.current;
      if (el) {
        el.style.transition = '';
        el.style.transform = pageTransform(targetPos, transition, menuOnLeft) ?? '';
      }
      if (visible[targetPos]) openPage(visible[targetPos].index);
    },
  });

  const containerStyle: React.CSSProperties = {
    transform: pageTransform(activePage, transition, menuOnLeft),
  };

  const pointerHandlers = {
    onPointerDown: (e: React.PointerEvent) => {
      const el = containerRef.current;
      if (el) el.style.transition = 'none';
      pan.onPointerDown(e);
    },
    onPointerMove: pan.onPointerMove,
    onPointerUp: pan.onPointerUp,
    onPointerCancel: pan.onPointerCancel,
  };

  return (
    <>
      <div
        ref={containerRef}
        id="pages"
        className="pages"
        style={containerStyle}
        {...pointerHandlers}
      >
        {activeSelect ? <div className="page-overlay" onClick={() => closeSelect()} /> : null}
        {visible.map(({ page, index }) =>
          shouldDrawPage(index, activePage, transition) ? (
            <Page key={index} page={page} index={index} />
          ) : null,
        )}
      </div>
      <PagesMenu />
    </>
  );
}