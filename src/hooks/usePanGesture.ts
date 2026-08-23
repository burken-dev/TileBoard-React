import { useRef, useState } from 'react';
import type React from 'react';

export interface PanOptions {
  axis: 'x' | 'y';
  count: number;
  active: number;
  disabled: boolean;
  onDrag: (offsetPercent: number) => void;
  onSettle: (targetIndex: number) => void;
}

interface DragState {
  start: number;
  last: number;
  lastTime: number;
  initial: number;
  isDragging: boolean;
}

const DRAG_THRESHOLD = 10; // px threshold before initiating page pan

function isScrollableElement(el: Element, axis: 'x' | 'y'): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const style = window.getComputedStyle(el);
  const overflow = axis === 'y' ? style.overflowY : style.overflowX;
  if (overflow === 'auto' || overflow === 'scroll') return true;
  const inlineOverflow = axis === 'y' ? el.style.overflowY : el.style.overflowX;
  const inlineGeneral = el.style.overflow;
  return (
    inlineOverflow === 'auto' ||
    inlineOverflow === 'scroll' ||
    inlineGeneral === 'auto' ||
    inlineGeneral === 'scroll'
  );
}

function hasScrollableAncestor(
  target: Element | null,
  container: Element | null,
  axis: 'x' | 'y',
): boolean {
  let current: Element | null = target;
  while (current && current !== container) {
    if (
      current.classList.contains('page') ||
      current.classList.contains('pages') ||
      current.id === 'pages'
    ) {
      break;
    }
    if (isScrollableElement(current, axis)) {
      return true;
    }
    current = current.parentElement;
  }
  return false;
}

export function usePanGesture(opts: PanOptions) {
  const [dragging, setDragging] = useState(false);
  const drag = useRef<DragState | null>(null);

  const axisPos = (e: React.PointerEvent): number =>
    opts.axis === 'y' ? e.clientY : e.clientX;

  const viewport = (): number => (opts.axis === 'y' ? window.innerHeight : window.innerWidth);

  function onPointerDown(e: React.PointerEvent): void {
    if (opts.disabled || opts.count <= 1) return;
    const target = e.target as HTMLElement | null;
    if (target && ['INPUT', 'TEXTAREA', 'SELECT'].indexOf(target.tagName) !== -1) return;
    if (hasScrollableAncestor(target, e.currentTarget as HTMLElement | null, opts.axis)) return;
    const pos = axisPos(e);
    drag.current = {
      start: pos,
      last: pos,
      lastTime: Date.now(),
      initial: -opts.active * 100,
      isDragging: false,
    };
  }

  function onPointerMove(e: React.PointerEvent): void {
    const d = drag.current;
    if (!d) return;
    const delta = axisPos(e) - d.start;

    if (!d.isDragging) {
      if (Math.abs(delta) < DRAG_THRESHOLD) {
        return;
      }
      d.isDragging = true;
      setDragging(true);
    }

    const offset = -opts.active * 100 + (delta / viewport()) * 100;
    const max = -(opts.count - 1) * 100;
    const clamped = Math.max(max, Math.min(0, offset));
    opts.onDrag(clamped);
    d.last = axisPos(e);
    d.lastTime = Date.now();
  }

  function finish(e: React.PointerEvent): void {
    const d = drag.current;
    if (!d) return;
    const wasDragging = d.isDragging;
    drag.current = null;
    setDragging(false);

    if (!wasDragging) {
      return;
    }

    const pos = axisPos(e);
    const panPercent = ((pos - d.start) / viewport()) * 100;
    const dt = Date.now() - d.lastTime;
    const velocity = dt > 0 ? (pos - d.last) / dt : 0;

    let target = opts.active;
    if (
      Math.abs(panPercent) >= 50 ||
      (Math.abs(velocity) > 0.5 && velocity < 0 === panPercent < 0)
    ) {
      const deltaIndex = panPercent < 0 ? 1 : -1;
      target = Math.max(0, Math.min(opts.count - 1, opts.active + deltaIndex));
    }
    opts.onSettle(target);
  }

  function onPointerUp(e: React.PointerEvent): void {
    finish(e);
  }

  function onPointerCancel(): void {
    const d = drag.current;
    const wasDragging = d?.isDragging;
    drag.current = null;
    setDragging(false);
    if (wasDragging) {
      opts.onSettle(opts.active);
    }
  }

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    dragging,
  };
}