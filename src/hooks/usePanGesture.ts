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
}

export function usePanGesture(opts: PanOptions) {
  const [dragging, setDragging] = useState(false);
  const drag = useRef<DragState | null>(null);

  const axisPos = (e: React.PointerEvent): number =>
    opts.axis === 'y' ? e.clientY : e.clientX;

  const viewport = (): number => (opts.axis === 'y' ? window.innerHeight : window.innerWidth);

  function onPointerDown(e: React.PointerEvent): void {
    if (opts.disabled) return;
    const target = e.target as HTMLElement;
    if (target && ['INPUT', 'TEXTAREA', 'SELECT'].indexOf(target.tagName) !== -1) return;
    const pos = axisPos(e);
    drag.current = {
      start: pos,
      last: pos,
      lastTime: Date.now(),
      initial: -opts.active * 100,
    };
    setDragging(true);
  }

  function onPointerMove(e: React.PointerEvent): void {
    const d = drag.current;
    if (!d) return;
    const delta = axisPos(e) - d.start;
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
    drag.current = null;
    setDragging(false);

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
    drag.current = null;
    setDragging(false);
    opts.onSettle(opts.active);
  }

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    dragging,
  };
}