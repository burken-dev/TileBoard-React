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
  const handled = useRef(false);

  function clear(): void {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }

  function onPointerDown(e: React.PointerEvent): void {
    start.current = { x: e.clientX, y: e.clientY };
    fired.current = false;
    handled.current = false;
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
    }
  }

  function onPointerUp(e: React.PointerEvent): void {
    clear();
    const s = start.current;
    start.current = null;
    if (fired.current) {
      return;
    }
    if (s && (Math.abs(e.clientX - s.x) > 10 || Math.abs(e.clientY - s.y) > 10)) {
      return;
    }
    // In environments where pointerup fires before click, trigger and record handled
    if (!handled.current) {
      handled.current = true;
      onClick();
    }
  }

  function onPointerLeave(): void {
    clear();
  }

  function onPointerCancel(): void {
    clear();
    start.current = null;
    // Don't reset fired here so a trailing click event after long press doesn't trigger onClick
  }

  function handleClick(_e: React.MouseEvent): void {
    if (fired.current) {
      fired.current = false;
      return;
    }
    if (handled.current) {
      handled.current = false;
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