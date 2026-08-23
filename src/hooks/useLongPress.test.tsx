import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useLongPress } from './useLongPress';

afterEach(cleanup);

function TestComponent({
  onLongPress,
  onClick,
  ms = 600,
}: {
  onLongPress: () => void;
  onClick: () => void;
  ms?: number;
}) {
  const long = useLongPress(onLongPress, onClick, ms);

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
  it('does not trigger actions on mount or plain render', () => {
    const onLongPress = vi.fn();
    const onClick = vi.fn();
    render(<TestComponent onLongPress={onLongPress} onClick={onClick} />);
    expect(onClick).not.toHaveBeenCalled();
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('triggers onClick on tap/click event sequence (pointerDown -> pointerUp -> click)', () => {
    const onLongPress = vi.fn();
    const onClick = vi.fn();
    const { container } = render(
      <TestComponent onLongPress={onLongPress} onClick={onClick} />,
    );
    const el = container.querySelector('[data-testid="target"]')!;

    fireEvent.pointerDown(el, { clientX: 100, clientY: 100 });
    fireEvent.pointerUp(el, { clientX: 100, clientY: 100 });
    expect(onClick).not.toHaveBeenCalled(); // Not called before click event

    fireEvent.click(el);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('triggers onClick when simple fireEvent.click is dispatched (mouse/keyboard click)', () => {
    const onLongPress = vi.fn();
    const onClick = vi.fn();
    const { container } = render(
      <TestComponent onLongPress={onLongPress} onClick={onClick} />,
    );
    const el = container.querySelector('[data-testid="target"]')!;

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
    expect(onLongPress).toHaveBeenCalledTimes(1);

    fireEvent.pointerUp(el, { clientX: 100, clientY: 100 });
    fireEvent.click(el);

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
    fireEvent.click(el);

    expect(onLongPress).not.toHaveBeenCalled();
    expect(onClick).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('cancels click when pointerCancel fires during swipe/gesture', () => {
    const onLongPress = vi.fn();
    const onClick = vi.fn();
    const { container } = render(
      <TestComponent onLongPress={onLongPress} onClick={onClick} />,
    );
    const el = container.querySelector('[data-testid="target"]')!;

    fireEvent.pointerDown(el, { clientX: 100, clientY: 100 });
    fireEvent.pointerCancel(el);
    fireEvent.click(el);

    expect(onClick).not.toHaveBeenCalled();
    expect(onLongPress).not.toHaveBeenCalled();
  });
});
