import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { usePanGesture } from './usePanGesture';

afterEach(cleanup);

function TestPanComponent({
  axis = 'y',
  onDrag,
  onSettle,
}: {
  axis?: 'x' | 'y';
  onDrag: (offset: number) => void;
  onSettle: (target: number) => void;
}) {
  const pan = usePanGesture({
    axis,
    count: 2,
    active: 0,
    disabled: false,
    onDrag,
    onSettle,
  });

  return (
    <div
      data-testid="page-container"
      className="page-container"
      onPointerDown={pan.onPointerDown}
      onPointerMove={pan.onPointerMove}
      onPointerUp={pan.onPointerUp}
      onPointerCancel={pan.onPointerCancel}
    >
      <div id="pages" className="pages">
        <div className="page -active">
          <div data-testid="regular-tile" className="item">
            Regular Tile
          </div>
          <div
            data-testid="scrollable-tile"
            className="item electricity-container"
          >
            <div
              data-testid="scrollable-list"
              className="electricity-longlist"
              style={{ overflowY: 'auto' }}
            >
              <div data-testid="list-item" className="item-list--item">
                Price item
              </div>
            </div>
          </div>
          <div data-testid="input-tile" className="item">
            <input data-testid="text-input" type="text" />
          </div>
        </div>
      </div>
    </div>
  );
}

describe('usePanGesture', () => {
  it('pans page when dragging on primary axis (Y when menu is left)', () => {
    const onDrag = vi.fn();
    const onSettle = vi.fn();
    const { container } = render(
      <TestPanComponent axis="y" onDrag={onDrag} onSettle={onSettle} />,
    );
    const tile = container.querySelector('[data-testid="regular-tile"]')!;

    fireEvent.pointerDown(tile, { clientX: 100, clientY: 200 });
    fireEvent.pointerMove(tile, { clientX: 102, clientY: 100 });
    fireEvent.pointerUp(tile, { clientX: 102, clientY: 100 });

    expect(onDrag).toHaveBeenCalled();
    expect(onSettle).toHaveBeenCalled();
  });

  it('aborts pan gesture when scrolling along cross axis (X when menu is left) so page scrolling works', () => {
    const onDrag = vi.fn();
    const onSettle = vi.fn();
    const { container } = render(
      <TestPanComponent axis="y" onDrag={onDrag} onSettle={onSettle} />,
    );
    const tile = container.querySelector('[data-testid="regular-tile"]')!;

    // User swipes horizontally 60px with small 12px vertical deviation
    fireEvent.pointerDown(tile, { clientX: 200, clientY: 100 });
    fireEvent.pointerMove(tile, { clientX: 140, clientY: 112 });
    fireEvent.pointerUp(tile, { clientX: 140, clientY: 112 });

    expect(onDrag).not.toHaveBeenCalled();
    expect(onSettle).not.toHaveBeenCalled();
  });

  it('aborts pan gesture when scrolling along cross axis (Y when menu is bottom) so page scrolling works', () => {
    const onDrag = vi.fn();
    const onSettle = vi.fn();
    const { container } = render(
      <TestPanComponent axis="x" onDrag={onDrag} onSettle={onSettle} />,
    );
    const tile = container.querySelector('[data-testid="regular-tile"]')!;

    // User swipes vertically 60px with small 12px horizontal deviation
    fireEvent.pointerDown(tile, { clientX: 100, clientY: 200 });
    fireEvent.pointerMove(tile, { clientX: 112, clientY: 140 });
    fireEvent.pointerUp(tile, { clientX: 112, clientY: 140 });

    expect(onDrag).not.toHaveBeenCalled();
    expect(onSettle).not.toHaveBeenCalled();
  });

  it('does NOT pan page when dragging inside a scrollable tile container', () => {
    const onDrag = vi.fn();
    const onSettle = vi.fn();
    const { container } = render(
      <TestPanComponent axis="y" onDrag={onDrag} onSettle={onSettle} />,
    );
    const listItem = container.querySelector('[data-testid="list-item"]')!;

    fireEvent.pointerDown(listItem, { clientX: 100, clientY: 200 });
    fireEvent.pointerMove(listItem, { clientX: 100, clientY: 100 });
    fireEvent.pointerUp(listItem, { clientX: 100, clientY: 100 });

    expect(onDrag).not.toHaveBeenCalled();
    expect(onSettle).not.toHaveBeenCalled();
  });

  it('does NOT pan page on micro-movements (< 10px threshold) like touch taps', () => {
    const onDrag = vi.fn();
    const onSettle = vi.fn();
    const { container } = render(
      <TestPanComponent axis="y" onDrag={onDrag} onSettle={onSettle} />,
    );
    const tile = container.querySelector('[data-testid="regular-tile"]')!;

    fireEvent.pointerDown(tile, { clientX: 100, clientY: 200 });
    fireEvent.pointerMove(tile, { clientX: 101, clientY: 203 });
    fireEvent.pointerUp(tile, { clientX: 101, clientY: 203 });

    expect(onDrag).not.toHaveBeenCalled();
    expect(onSettle).not.toHaveBeenCalled();
  });

  it('does NOT pan page when interacting with inputs', () => {
    const onDrag = vi.fn();
    const onSettle = vi.fn();
    const { container } = render(
      <TestPanComponent axis="y" onDrag={onDrag} onSettle={onSettle} />,
    );
    const input = container.querySelector('[data-testid="text-input"]')!;

    fireEvent.pointerDown(input, { clientX: 100, clientY: 200 });
    fireEvent.pointerMove(input, { clientX: 100, clientY: 100 });
    fireEvent.pointerUp(input, { clientX: 100, clientY: 100 });

    expect(onDrag).not.toHaveBeenCalled();
    expect(onSettle).not.toHaveBeenCalled();
  });
});
