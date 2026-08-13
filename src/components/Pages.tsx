import { useState } from 'react';
import type React from 'react';
import { usePanGesture } from '../hooks/usePanGesture';
import { useAppStore } from '../store';
import { isHidden } from '../utils/functions';
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

  const transition = config.transition ?? 'animated';
  const menuOnLeft = (config.menuPosition ?? 'left') === 'left';

  const visible = config.pages
    .map((page, index) => ({ page, index }))
    .filter(({ page }) => !isHidden(page));

  const count = visible.length;
  const activePos = Math.max(
    0,
    visible.findIndex((entry) => entry.index === activePage),
  );

  const [dragOffset, setDragOffset] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);

  const pan = usePanGesture({
    axis: menuOnLeft ? 'y' : 'x',
    count,
    active: activePos,
    disabled: false,
    onDrag: (offset) => {
      setDragging(true);
      setDragOffset(offset);
    },
    onSettle: (targetPos) => {
      setDragging(false);
      setDragOffset(null);
      if (visible[targetPos]) openPage(visible[targetPos].index);
    },
  });

  const transform =
    dragging && dragOffset !== null
      ? dragTransform(dragOffset, transition, menuOnLeft)
      : pageTransform(activePage, transition, menuOnLeft);

  const containerStyle: React.CSSProperties = {
    transform,
    transition: dragging ? 'none' : undefined,
  };

  const pointerHandlers = {
    onPointerDown: pan.onPointerDown,
    onPointerMove: pan.onPointerMove,
    onPointerUp: pan.onPointerUp,
    onPointerCancel: pan.onPointerCancel,
  };

  return (
    <>
      <div id="pages" className="pages" style={containerStyle} {...pointerHandlers}>
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