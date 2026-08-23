import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useLongPress } from './useLongPress';

afterEach(cleanup);

function TestComponent({
  onLongPress,
  onClick,
}: {
  onLongPress: () => void;
  onClick: () => void;
}) {
  const long = useLongPress(onLongPress, onClick, 600);
  return (
    <div
      data-testid="target"
      onPointerDown={long.onPointerDown}
      onPointerMove={long.onPointerMove}
      onPointerUp={long.onPointerUp}
      onPointerLeave={long.onPointerLeave}
      onPointerCancel={long.onPointerCancel}
      onClick={long.onClick}
    >
      Tile
    </div>
  );
}

describe('useLongPress', () => {
  it('triggers onClick when released quickly without moving', () => {
    const onLongPress = vi.fn();
    const onClick = vi.fn();
    const { container } = render(
      <TestComponent onLongPress={onLongPress} onClick={onClick} />,
    );
    const el = container.querySelector('[data-testid="target"]')!;

    fireEvent.pointerDown(el, { clientX: 100, clientY: 100 });
    fireEvent.pointerUp(el, { clientX: 102, clientY: 102 });

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('triggers onClick only once when both pointerUp and click fire (mouse click)', () => {
    const onLongPress = vi.fn();
    const onClick = vi.fn();
    const { container } = render(
      <TestComponent onLongPress={onLongPress} onClick={onClick} />,
    );
    const el = container.querySelector('[data-testid="target"]')!;

    fireEvent.pointerDown(el, { clientX: 100, clientY: 100 });
    fireEvent.pointerUp(el, { clientX: 100, clientY: 100 });
    fireEvent.click(el);

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('triggers onClick on touch panel where pointerCancel fires before click', () => {
    const onLongPress = vi.fn();
    const onClick = vi.fn();
    const { container } = render(
      <TestComponent onLongPress={onLongPress} onClick={onClick} />,
    );
    const el = container.querySelector('[data-testid="target"]')!;

    // Touch tap on touch panel: pointerdown -> pointercancel -> click
    fireEvent.pointerDown(el, { clientX: 100, clientY: 100 });
    fireEvent.pointerCancel(el);
    fireEvent.click(el);

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('triggers onLongPress when held for >= 600ms and suppresses trailing click', () => {
    vi.useFakeTimers();
    const onLongPress = vi.fn();
    const onClick = vi.fn();
    const { container } = render(
      <TestComponent onLongPress={onLongPress} onClick={onClick} />,
    );
    const el = container.querySelector('[data-testid="target"]')!;

    fireEvent.pointerDown(el, { clientX: 100, clientY: 100 });
    vi.advanceTimersByTime(650);
    fireEvent.pointerUp(el, { clientX: 100, clientY: 100 });
    fireEvent.click(el);

    expect(onLongPress).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('cancels long press and does not click when moved > 10px during drag/scroll', () => {
    vi.useFakeTimers();
    const onLongPress = vi.fn();
    const onClick = vi.fn();
    const { container } = render(
      <TestComponent onLongPress={onLongPress} onClick={onClick} />,
    );
    const el = container.querySelector('[data-testid="target"]')!;

    fireEvent.pointerDown(el, { clientX: 100, clientY: 100 });
    fireEvent.pointerMove(el, { clientX: 100, clientY: 130 });
    vi.advanceTimersByTime(650);
    fireEvent.pointerUp(el, { clientX: 100, clientY: 130 });

    expect(onLongPress).not.toHaveBeenCalled();
    expect(onClick).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
