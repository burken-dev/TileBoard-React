import { useRef } from 'react';
import type React from 'react';

export function useLongPress(
  onLongPress: () => void,
  onClick: () => void,
  ms = 600,
): {
  onPointerDown(e: React.PointerEvent): void;
  onPointerMove(e: React.PointerEvent): void;
  onPointerUp(e: React.PointerEvent): void;
  onPointerLeave(e: React.PointerEvent): void;
  onPointerCancel(e: React.PointerEvent): void;
  onClick(e: React.MouseEvent): void;
} {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fired = useRef(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(false);

  function clear(): void {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }

  function onPointerDown(e: React.PointerEvent): void {
    start.current = { x: e.clientX, y: e.clientY };
    fired.current = false;
    moved.current = false;
    clear();
    timer.current = setTimeout(() => {
      fired.current = true;
      onLongPress();
    }, ms);
  }

  function onPointerMove(e: React.PointerEvent): void {
    const s = start.current;
    if (!s) return;
    if (Math.abs(e.clientX - s.x) > 10 || Math.abs(e.clientY - s.y) > 10) {
      clear();
      moved.current = true;
    }
  }

  function onPointerUp(e: React.PointerEvent): void {
    clear();
    const s = start.current;
    start.current = null;
    if (s && (Math.abs(e.clientX - s.x) > 10 || Math.abs(e.clientY - s.y) > 10)) {
      moved.current = true;
    }
  }

  function onPointerLeave(): void {
    clear();
  }

  function onPointerCancel(): void {
    clear();
    start.current = null;
    moved.current = true;
  }

  function handleClick(_e: React.MouseEvent): void {
    if (fired.current) {
      fired.current = false;
      return;
    }
    if (moved.current) {
      moved.current = false;
      return;
    }
    onClick();
  }

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerLeave,
    onPointerCancel,
    onClick: handleClick,
  };
}