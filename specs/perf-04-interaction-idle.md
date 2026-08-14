# PERF-04: Interaction & idle timers

Target hardware: Raspberry Pi / old tablets. Two issues: page swipes re-render the
whole dashboard on every pointermove, and the screensaver keeps running 1 s
timers + slide animation while hidden.

## Problems (from audit)

1. **Drag setState per pointermove** (`src/hooks/usePanGesture.ts:43-53` +
   `src/components/Pages.tsx:46-49,57-64`): every pointermove calls
   `opts.onDrag(clamped)` → `Pages` does `setDragging(true)` + `setDragOffset(offset)`.
   Each setState re-renders `Pages`, which maps over all visible pages and
   re-renders the `Page → Group → Tile` subtree. A 60 Hz pointer stream of full
   reconciliation + DOM diff drops old tablets to single-digit FPS during swipes.
   The transform is applied via React state instead of a direct DOM write.
2. **Screensaver slide timer runs while hidden** (`Screensaver.tsx:49-57`): the
   `setActiveSlide` interval runs whenever `conf?.timeout` is set — even when the
   screensaver is NOT shown — so `Screensaver` re-renders every `slidesTimeout`
   second the entire time the app is in normal use, and when it becomes visible
   it may be on a random slide. It should only advance slides while shown.
3. **Screensaver inactivity poll runs forever** (`Screensaver.tsx:42-46`): a 1 s
   interval polls inactivity even while the screensaver is already shown (when
   shown, we only need activity events — handled by the listener `reset`).
4. **`Clock` is not memoized** (`src/components/Clock.tsx:18`): a 1 s local-state
   tick is isolated (good), but any parent re-render (e.g. header updates from
   PERF-01 entity changes) re-renders the clock needlessly.

## Fix

### 1. Drive the drag transform via a ref, not React state (`usePanGesture.ts` + `Pages.tsx`)

Move the transform application out of React state:

- `usePanGesture` already has the drag math. Extend `PanOptions` with an
  optional `onDrag` that stays, but change the *caller* (`Pages`) to write the
  transform directly to the container DOM node instead of `setState`.
- In `Pages.tsx`:
  - Add a `containerRef` for the `#pages` div.
  - `onDrag: (offset) => { if (containerRef.current) containerRef.current.style.transform = dragTransform(offset, transition, menuOnLeft); }`
  - On drag start (pointer down), set `transition: 'none'` on the element
    directly; on settle, remove the inline transition and reset the transform to
    the settled page position, then call `openPage(...)`.
  - Drop `dragOffset`/`dragging` state that was only used for the transform. The
    `transform`/`transition` in `containerStyle` can then simply be the static
    `pageTransform(activePage, transition, menuOnLeft)` (re-computed from
    `activePage`, which already re-renders Pages on page change). While dragging,
    the ref-driven inline styles take precedence.

Keep the visual behavior identical (translate by offset%, transition none during
drag, snap back on settle). `usePanGesture` itself needs no change unless you
find it cleaner to have it own the element ref — if so, keep the public behavior
of `Pages` unchanged. The essential rule: **no setState per pointermove**.

If the direct-DOM approach risks breaking the existing `Pages.test.tsx`
drag tests, prefer the simplest correct version that removes the per-move React
re-render and still passes the tests.

### 2. Gate the screensaver slide interval on `shown` (`Screensaver.tsx`)

In the slide-advance effect (`useEffect` at line 49-57), skip the interval setup
(or early-return) when the screensaver is not shown, and restart when it becomes
shown. Because the interval callback closes over `activeSlide`, the simplest
correct approach:

```tsx
useEffect(() => {
  if (!conf?.timeout || !shown) return;
  const slides = conf.slides ?? [];
  if (!slides.length) return;
  const id = window.setInterval(() => {
    setActiveSlide((prev) => (prev + 1) % slides.length);
  }, (conf.slidesTimeout ?? 1) * 1000);
  return () => window.clearInterval(id);
}, [conf, shown]);
```

This stops the hidden screensaver from re-rendering every second and ensures
slides only advance while visible.

### 3. Skip the inactivity poll while shown (`Screensaver.tsx`)

In the inactivity interval callback (line 42-46), return early when already shown:

```tsx
const id = window.setInterval(() => {
  if (shown) return;                       // activity events handle hiding
  const inactivity = Date.now() - lastActivity;
  setScreensaverShown(conf.timeout < inactivity / 1000);
}, 1000);
```

Add `shown` to the effect's dependency array. `setScreensaverShown` already bails
out on unchanged booleans, but skipping the work (and the store call) entirely is
cleaner.

### 4. Memoize `Clock` (`Clock.tsx`)

Wrap the default export in `memo`:

```tsx
import { memo, useEffect, useState } from 'react';
...
export default memo(Clock);
```

No other change — the 1 s tick stays local state.

## Do NOT touch

- `src/ha/connection.ts`, `src/store/index.ts`, `src/components/Tile.tsx`,
  `src/components/Group.tsx`, `Header.tsx`, `HeaderItem.tsx`, `PagesMenu.tsx`,
  tile bodies (PERF-01)
- `src/components/cameras/*` (PERF-02)
- `src/App.tsx`, `src/components/popups/HistoryPopup.tsx`, `src/styles/themes.less` (PERF-03)

## Verification (MUST run)

```
npm run typecheck
npm run lint
npm test
npm run build
```

`Pages.test.tsx`, `Screensaver.test.tsx` and `Header.test.tsx` must still pass.
Adapt tests only if the new behavior is strictly correct (e.g. slide advance now
only happens while shown — tests that call `vi.advanceTimersByTime` while hidden
may need `shown` set first).

## Outcome

- Page swipes apply transform directly to the DOM → no React reconciliation
  during a 60 Hz pointer stream.
- Screensaver does zero timer work while hidden.
- Clock no longer re-renders when its parent re-renders.