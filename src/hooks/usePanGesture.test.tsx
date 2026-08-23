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
  it('pans page when dragging on standard tile', () => {
    const onDrag = vi.fn();
    const onSettle = vi.fn();
    const { container } = render(
      <TestPanComponent onDrag={onDrag} onSettle={onSettle} />,
    );
    const tile = container.querySelector('[data-testid="regular-tile"]')!;

    fireEvent.pointerDown(tile, { clientY: 200 });
    fireEvent.pointerMove(tile, { clientY: 100 });
    fireEvent.pointerUp(tile, { clientY: 100 });

    expect(onDrag).toHaveBeenCalled();
    expect(onSettle).toHaveBeenCalled();
  });

  it('does NOT pan page when dragging inside a scrollable container (e.g. electricity list)', () => {
    const onDrag = vi.fn();
    const onSettle = vi.fn();
    const { container } = render(
      <TestPanComponent onDrag={onDrag} onSettle={onSettle} />,
    );
    const listItem = container.querySelector('[data-testid="list-item"]')!;

    fireEvent.pointerDown(listItem, { clientY: 200 });
    fireEvent.pointerMove(listItem, { clientY: 100 });
    fireEvent.pointerUp(listItem, { clientY: 100 });

    expect(onDrag).not.toHaveBeenCalled();
    expect(onSettle).not.toHaveBeenCalled();
  });

  it('does NOT pan page when clicking inputs', () => {
    const onDrag = vi.fn();
    const onSettle = vi.fn();
    const { container } = render(
      <TestPanComponent onDrag={onDrag} onSettle={onSettle} />,
    );
    const input = container.querySelector('[data-testid="text-input"]')!;

    fireEvent.pointerDown(input, { clientY: 200 });
    fireEvent.pointerMove(input, { clientY: 100 });
    fireEvent.pointerUp(input, { clientY: 100 });

    expect(onDrag).not.toHaveBeenCalled();
    expect(onSettle).not.toHaveBeenCalled();
  });
});
