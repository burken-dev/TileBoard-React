# Screensaver Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a configurable control bar to the screensaver — Previous / Play-Pause / Next buttons plus custom action buttons — that navigate and pause the slideshow, with custom actions receiving the current slide context and the standard `FunctionContext`.

**Architecture:** Move the screensaver's active-slide and paused state into a new zustand `ScreensaverSlice` (so `FunctionContext` can expose `this.slide` / `this.slideIndex` / `this.slideCount`), then render a small `ScreensaverControls` bar inside `Screensaver.tsx`. The auto-advance interval is gated on `paused` and re-keyed on the active slide so manual navigation resets the timer. Custom buttons dispatch through `callFunction(action, [{ bg, index, total }])`.

**Tech Stack:** React 18, zustand 5, vitest + @testing-library/react (jsdom), Vite, Less.

## Global Constraints

- Branch: `feature/screensaver-controls` (already checked out). Commit messages: imperative present tense.
- Verification (from `AGENTS.md`): `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`. After EVERY task run that task's tests; run all four before pushing.
- No new dependencies. mdi icons via the already-imported `@mdi/font` (`<i className="mdi mdi-<name>" />`).
- `createAppStore` (`src/store/index.ts:174`) returns early if a store already exists, so the store config is fixed per test file — **a new test file is required whenever a test needs a different config**. Existing example: `Screensaver.photoDate.test.tsx`.
- `src/config/schema.ts` validates only `serverUrl` + page/group/tile shape and passes `raw` through untouched — no schema edits needed.
- Config functions are plain JS at authoring time; the TS types are internal documentation.
- Tests use fake timers (`vi.useFakeTimers()`), `render` + `act(() => vi.advanceTimersByTime(6000))` to surface the screensaver, and `createAppStore` in `beforeEach`.

---

### Task 1: Screensaver slice in the store + `this.slide` on FunctionContext

**Files:**
- Modify: `src/config/types.ts` (FunctionContext interface, after line 37 `setUiState`)
- Modify: `src/store/index.ts` (new slice)
- Modify: `src/utils/functions.ts` (getContext)
- Test: `src/utils/functions.test.ts`

**Interfaces:**
- Consumes: existing `getAppStore`, `useAppStore` from `src/store/index.ts`; `FunctionContext` type.
- Produces (store state, consumed by Task 2):
  - `screensaverSlide: number` — 0-based active slide index (default `0`).
  - `screensaverPaused: boolean` (default `false`).
  - `screensaverBg: string | null` — resolved cache-busted bg URL of the active slide (default `null`).
  - `setScreensaverSlide(index: number): void`
  - `setScreensaverPaused(paused: boolean): void`
  - `setScreensaverBg(bg: string | null): void`
- Produces (FunctionContext, consumed by custom button actions):
  - `slide: string | null` — current slide bg URL, `null` when the screensaver is not shown.
  - `slideIndex: number | null` — 0-based, `null` when not shown.
  - `slideCount: number | null` — number of slides, `null` when not shown.

- [ ] **Step 1: Write the failing tests**

Append to `src/utils/functions.test.ts`:

```ts
it('exposes the current screensaver slide from the store', () => {
  getAppStore().setScreensaverShown(true);
  getAppStore().setScreensaverSlide(1);
  getAppStore().setScreensaverBg('b.jpg?t=0');
  const ctx = getContext();
  expect(ctx.slide).toBe('b.jpg?t=0');
  expect(ctx.slideIndex).toBe(1);
  expect(ctx.slideCount).toBe(2);
});

it('exposes null slide fields while the screensaver is hidden', () => {
  getAppStore().setScreensaverShown(false);
  const ctx = getContext();
  expect(ctx.slide).toBeNull();
  expect(ctx.slideIndex).toBeNull();
  expect(ctx.slideCount).toBeNull();
});
```

Update the `beforeEach` config so the store has slides (needed for `slideCount`):

```ts
const config: TileBoardConfig = {
  serverUrl: 'http://h',
  pages: [{ groups: [] }],
  screensaver: { timeout: 5, slides: [{ bg: 'a.jpg' }, { bg: 'b.jpg' }] },
};
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/utils/functions.test.ts`
Expected: FAIL — `ctx.slide` / `setScreensaverSlide` etc. do not exist (TS/type errors or `undefined`).

- [ ] **Step 3: Add the store slice**

In `src/store/index.ts`, add a slice interface after the `UiStateSlice` interface (line 123):

```ts
interface ScreensaverSlice {
  screensaverSlide: number;   // 0-based active slide index
  screensaverPaused: boolean; // paused = no auto-advance
  screensaverBg: string | null; // resolved cache-busted bg URL of the active slide
  setScreensaverSlide(index: number): void;
  setScreensaverPaused(paused: boolean): void;
  setScreensaverBg(bg: string | null): void;
}
```

Add `ScreensaverSlice` to the `AppStore` union (after `UiStateSlice` in the type list, line 138):

```ts
  NotificationsSlice &
  UiStateSlice &
  ScreensaverSlice;
```

In `createAppStore`'s state object (after `uiState: {}`, line 195), add the state and setters:

```ts
    screensaverSlide: 0,
    screensaverPaused: false,
    screensaverBg: null,
    setScreensaverSlide: (index) => set({ screensaverSlide: index }),
    setScreensaverPaused: (paused) => set({ screensaverPaused: paused }),
    setScreensaverBg: (bg) => set({ screensaverBg: bg }),
```

- [ ] **Step 4: Add the FunctionContext fields**

In `src/config/types.ts`, inside `FunctionContext` (after line 37 `setUiState`):

```ts
  slide: string | null;       // current screensaver slide bg URL, null when not shown
  slideIndex: number | null;  // 0-based index of the active slide, null when not shown
  slideCount: number | null;  // number of screensaver slides, null when not shown
```

- [ ] **Step 5: Wire `getContext`**

In `src/utils/functions.ts`, rewrite `getContext` to read the slice:

```ts
export function getContext(): FunctionContext {
  const store = getAppStore();
  return {
    states: store.entities,
    parseFieldValue: (value, item, entity) =>
      parseFieldValue(value, getAppStore().entities, item, entity),
    callService,
    sendMessage,
    openPage: (pageIndex) => getAppStore().openPage(pageIndex),
    addNotification: (data) => getAppStore().addNotification(data),
    memo,
    uiState: (key) => getAppStore().uiState[key],
    setUiState: (key, value) => getAppStore().setUiState(key, value),
    slide: store.screensaverShown ? store.screensaverBg : null,
    slideIndex: store.screensaverShown ? store.screensaverSlide : null,
    slideCount: store.screensaverShown ? store.config.screensaver?.slides?.length ?? null : null,
  };
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/utils/functions.test.ts`
Expected: PASS (2 new + 1 existing).

- [ ] **Step 7: Commit**

```bash
git add src/config/types.ts src/store/index.ts src/utils/functions.ts src/utils/functions.test.ts
git commit -m "Add screensaver slide state to store and context"
```

---

### Task 2: Controls bar — config types, built-in buttons, styles

**Files:**
- Modify: `src/config/types.ts` (button types + `ScreensaverConfig` keys)
- Create: `src/components/ScreensaverControls.tsx`
- Modify: `src/components/Screensaver.tsx`
- Modify: `styles/main.less`
- Test: `src/components/Screensaver.test.tsx`
- Create: `src/components/Screensaver.controls.test.tsx`

**Interfaces:**
- Consumes: store slice from Task 1 (`screensaverSlide`, `screensaverPaused`, `setScreensaverSlide`, `setScreensaverPaused`, `setScreensaverBg`); `callFunction` from `src/utils/functions.ts`; `FunctionContext` type.
- Produces (consumed by Task 3):
  - `ScreensaverButtonType = 'previous' | 'play_pause' | 'next'`
  - `ScreensaverButtonContext { bg: string; index: number; total: number }`
  - `ScreensaverButtonAction = (this: FunctionContext, ctx: ScreensaverButtonContext) => void`
  - `ScreensaverButtonConfig { type?; icon?: string; action?: ScreensaverButtonAction; enabled?: boolean }`
  - `ScreensaverConfig.buttons?: ScreensaverButtonConfig[]`
  - `ScreensaverConfig.buttonsPosition?: 'bottom-center' | 'bottom-left' | 'bottom-right'`
  - `ScreensaverControls({ buttons, position, paused, onAction })` component where `onAction(button: ScreensaverButtonConfig) => void`.

- [ ] **Step 1: Write the failing tests**

Add a default-buttons test to `src/components/Screensaver.test.tsx` (its existing config has no `buttons` key, so the fallback applies). Append:

```ts
it('renders the default control buttons bar', () => {
  const { container } = render(<Screensaver />);
  act(() => {
    vi.advanceTimersByTime(6000);
  });
  const controls = container.querySelector('.screensaver-controls');
  expect(controls).toBeTruthy();
  expect(controls!.className).toContain('--bottom-center');
  expect(controls!.querySelectorAll('.screensaver-button')).toHaveLength(3);
});
```

Create `src/components/Screensaver.controls.test.tsx` (separate file: its own config):

```tsx
import { act, fireEvent, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Screensaver from './Screensaver';
import { createAppStore } from '../store';
import type { FunctionContext, ScreensaverButtonContext, TileBoardConfig } from '../config/types';

const seen: Array<{ ctx: ScreensaverButtonContext; slide: string | null }> = [];
const customAction = function (this: FunctionContext, ctx: ScreensaverButtonContext) {
  seen.push({ ctx, slide: this.slide });
};

const config: TileBoardConfig = {
  serverUrl: 'http://h',
  pages: [{ groups: [] }],
  screensaver: {
    timeout: 5,
    slidesTimeout: 1,
    slideCacheBust: 60,
    slides: [{ bg: 'a.jpg' }, { bg: 'b.jpg' }],
    buttonsPosition: 'bottom-right',
    buttons: [
      { type: 'previous', icon: 'mdi-arrow-left' },
      { type: 'play_pause' },
      { type: 'next' },
      { icon: 'mdi-lightbulb', action: customAction },
      { icon: 'mdi-x', action: customAction, enabled: false },
    ],
  },
};

describe('Screensaver controls', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    createAppStore(config);
    seen.length = 0;
  });

  it('renders enabled buttons in order with their icons and position', () => {
    const { container } = render(<Screensaver />);
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    const controls = container.querySelector('.screensaver-controls')!;
    expect(controls.className).toContain('--bottom-right');
    const buttons = controls.querySelectorAll('.screensaver-button');
    expect(buttons).toHaveLength(4);
    expect(buttons[0].querySelector('.mdi')!.className).toContain('mdi-arrow-left');
    expect(buttons[1].querySelector('.mdi')!.className).toContain('mdi-pause');
  });

  it('next button advances the active slide', () => {
    const { container } = render(<Screensaver />);
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    fireEvent.click(container.querySelectorAll('.screensaver-button')[2]);
    const slides = container.querySelectorAll('.screensaver-slide');
    expect(slides[1].classList.contains('-active')).toBe(true);
  });

  it('previous button wraps to the last slide', () => {
    const { container } = render(<Screensaver />);
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    fireEvent.click(container.querySelectorAll('.screensaver-button')[0]);
    const slides = container.querySelectorAll('.screensaver-slide');
    expect(slides[1].classList.contains('-active')).toBe(true);
  });

  it('play/pause stops and resumes auto-advance', () => {
    const { container } = render(<Screensaver />);
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    const buttons = container.querySelectorAll('.screensaver-button');
    fireEvent.click(buttons[1]);
    expect(buttons[1].querySelector('.mdi')!.className).toContain('mdi-play');
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    let slides = container.querySelectorAll('.screensaver-slide');
    expect(slides[0].classList.contains('-active')).toBe(true);
    fireEvent.click(container.querySelectorAll('.screensaver-button')[1]);
    expect(container.querySelectorAll('.screensaver-button')[1].querySelector('.mdi')!.className).toContain('mdi-pause');
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    slides = container.querySelectorAll('.screensaver-slide');
    expect(slides[1].classList.contains('-active')).toBe(true);
  });

  it('clicking the controls does not hide the screensaver', () => {
    const { container } = render(<Screensaver />);
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    fireEvent.click(container.querySelector('.screensaver-controls')!);
    expect(container.querySelector('.screensaver')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/Screensaver.test.tsx src/components/Screensaver.controls.test.tsx`
Expected: FAIL — `.screensaver-controls` does not exist; the store state is now a no-op for rendering.

- [ ] **Step 3: Add the config types**

In `src/config/types.ts`, before `ScreensaverConfig` (line 196):

```ts
export type ScreensaverButtonType = 'previous' | 'play_pause' | 'next';

export interface ScreensaverButtonContext {
  bg: string;     // current slide bg URL (resolved, incl. cache-bust)
  index: number;  // 0-based index of the active slide
  total: number;  // slide count
}

export type ScreensaverButtonAction = (
  this: FunctionContext,
  ctx: ScreensaverButtonContext,
) => void;

export interface ScreensaverButtonConfig {
  type?: ScreensaverButtonType;     // absent -> custom button
  icon?: string;                    // mdi class; defaults for built-ins, required for custom
  action?: ScreensaverButtonAction; // required for custom buttons
  enabled?: boolean;                // default true; false hides the button
}
```

In `ScreensaverConfig`, add two keys:

```ts
  buttons?: ScreensaverButtonConfig[];                                   // default: [prev, play_pause, next]
  buttonsPosition?: 'bottom-center' | 'bottom-left' | 'bottom-right';    // default 'bottom-center'
```

- [ ] **Step 4: Create `ScreensaverControls.tsx`**

```tsx
import type { ScreensaverButtonConfig, ScreensaverConfig } from '../config/types';

function buttonIcon(button: ScreensaverButtonConfig, paused: boolean): string {
  if (button.type === 'play_pause') return paused ? 'mdi-play' : 'mdi-pause';
  if (button.icon) return button.icon;
  if (button.type === 'previous') return 'mdi-skip-previous';
  if (button.type === 'next') return 'mdi-skip-next';
  return 'mdi-circle';
}

export default function ScreensaverControls({
  buttons,
  position,
  paused,
  onAction,
}: {
  buttons: ScreensaverButtonConfig[];
  position: NonNullable<ScreensaverConfig['buttonsPosition']>;
  paused: boolean;
  onAction: (button: ScreensaverButtonConfig) => void;
}) {
  return (
    <div
      className={'screensaver-controls --' + position}
      onClick={(e) => e.stopPropagation()}
    >
      {buttons
        .filter((b) => b.enabled !== false)
        .map((button, i) => (
          <button key={i} className="screensaver-button" onClick={() => onAction(button)}>
            <i className={'mdi ' + buttonIcon(button, paused)} />
          </button>
        ))}
    </div>
  );
}
```

- [ ] **Step 5: Wire `Screensaver.tsx`**

Update imports (replace the `useState` import; add the new ones):

```ts
import { useEffect, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useAppStore } from '../store';
import { resolveFieldValue, resolveFields } from '../utils/fields';
import { SCREENSAVER_FIELDS } from '../utils/fields';
import { callFunction } from '../utils/functions';
import type { ScreensaverButtonConfig } from '../config/types';
import HeaderItem from './HeaderItem';
import ScreensaverControls from './ScreensaverControls';
```

Replace the local slide state (line 22) with the store:

```ts
  const activeSlide = useAppStore((s) => s.screensaverSlide);
  const paused = useAppStore((s) => s.screensaverPaused);
  const setScreensaverSlide = useAppStore((s) => s.setScreensaverSlide);
  const setScreensaverPaused = useAppStore((s) => s.setScreensaverPaused);
  const setScreensaverBg = useAppStore((s) => s.setScreensaverBg);
```

Replace the auto-advance effect (lines 75-83) with the paused-gated, slide-keyed version:

```ts
  useEffect(() => {
    if (!conf?.timeout || !shown || paused) return;
    const slides = conf.slides ?? [];
    if (!slides.length) return;
    const id = window.setInterval(() => {
      setScreensaverSlide((prev) => (prev + 1) % slides.length);
    }, ((conf.slidesTimeout as number | undefined) ?? 1) * 1000);
    return () => window.clearInterval(id);
  }, [conf?.timeout, conf?.slidesTimeout, shown, paused, activeSlide, setScreensaverSlide]);
```

Move the cache-bust/active-bg computation above the early return and sync the store, then delete the old copies from the render body (old lines 87-89):

```ts
  const cacheBust = conf?.slideCacheBust as number | undefined;
  const activeBg = slides.length ? slideBg(slides[activeSlide]?.bg ?? '', cacheBust) : undefined;

  useEffect(() => {
    setScreensaverBg(activeBg ?? null);
  }, [activeBg, setScreensaverBg]);

  const handleControl = (button: ScreensaverButtonConfig): void => {
    const len = slides.length;
    if (!len) return;
    switch (button.type) {
      case 'previous':
        setScreensaverSlide((activeSlide - 1 + len) % len);
        return;
      case 'next':
        setScreensaverSlide((activeSlide + 1) % len);
        return;
      case 'play_pause':
        setScreensaverPaused(!paused);
        return;
      default:
        if (button.action) {
          callFunction(button.action, [{ bg: activeBg ?? '', index: activeSlide, total: len }]);
        }
    }
  };
```

In the render body, replace the old `cacheBust`/`slideBgUrl`/`activeBg` prep (old lines 87-89) with just the local URL helper:

```ts
  const slideBgUrl = (bg: string) => slideBg(bg, cacheBust);
```

Inside the root `.screensaver` div, after the `.screensaver-content` block (after line 172), render the controls:

```tsx
      {slides.length ? (
        <ScreensaverControls
          buttons={
            conf.buttons ?? [{ type: 'previous' }, { type: 'play_pause' }, { type: 'next' }]
          }
          position={conf.buttonsPosition ?? 'bottom-center'}
          paused={paused}
          onAction={handleControl}
        />
      ) : null}
```

- [ ] **Step 6: Add the styles**

In `styles/main.less`, inside the `.screensaver { ... }` block (after the `&-content` rules, before the closing brace at line 2163), add:

```less
   &-controls {
      position: absolute;
      bottom: 20px;
      z-index: 53;
      display: flex;
      gap: 12px;
      padding: 8px 14px;
      background: rgba(0, 0, 0, 0.45);
      border-radius: 24px;

      &.--bottom-center { left: 50%; transform: translateX(-50%); }
      &.--bottom-left { left: 20px; }
      &.--bottom-right { right: 20px; }
   }

   &-button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      border: none;
      border-radius: 50%;
      background: transparent;
      color: #fff;
      font-size: 26px;
      cursor: pointer;

      &:hover {
         background: rgba(255, 255, 255, 0.15);
      }
   }
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx vitest run src/components/Screensaver.test.tsx src/components/Screensaver.controls.test.tsx`
Expected: PASS — all existing Screensaver tests plus the 5 controls tests plus the default-bar test.

- [ ] **Step 8: Commit**

```bash
git add src/config/types.ts src/components/Screensaver.tsx src/components/ScreensaverControls.tsx styles/main.less src/components/Screensaver.test.tsx src/components/Screensaver.controls.test.tsx
git commit -m "Add screensaver navigation controls"
```

---

### Task 3: Custom button actions + documentation

**Files:**
- Modify: `src/components/Screensaver.controls.test.tsx` (custom action test)
- Modify: `README.md`
- (Custom dispatch code already landed in Task 2's `handleControl` default case.)

**Interfaces:**
- Consumes: `ScreensaverButtonContext` type; store `screensaverBg`; `callFunction` with `getContext()` `this`.
- Produces: nothing new at the API level — this task verifies and documents the custom-button contract.

- [ ] **Step 1: Write the failing test**

Append to `src/components/Screensaver.controls.test.tsx` (inside the describe block):

```ts
  it('custom button action receives the slide context and this.slide', () => {
    const { container } = render(<Screensaver />);
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    fireEvent.click(container.querySelectorAll('.screensaver-button')[3]);
    expect(seen).toEqual([
      { ctx: { bg: 'a.jpg?t=0', index: 0, total: 2 }, slide: 'a.jpg?t=0' },
    ]);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/Screensaver.controls.test.tsx`
Expected: FAIL — either `callFunction` is not yet wired (custom button click does nothing) or `this.slide` is `null` (screensaverBg not synced). Verify Task 2 wired both; if `this.slide` is still `null`, the `setScreensaverBg` effect needs to be re-checked (it must run after the screensaver becomes visible — confirm `activeBg` is computed from the resolved `slides` and the effect fires inside the `act`).

- [ ] **Step 3: Update the README**

In `README.md`, extend the screensaver config example (around line 148) with the new keys:

```js
     /* buttons: control-bar buttons. Omit to show Previous/Play-Pause/Next.
      * Custom buttons need `icon` (an mdi class) and `action`; the action's
      * `this` is the config FunctionContext and it receives one argument
      * `{ bg, index, total }` (current slide URL, 0-based index, slide count). */
     buttons: [
        { type: 'previous' },
        { type: 'play_pause' },
        { type: 'next' },
        {
           icon: 'mdi-lightbulb-off-outline',
           action: function (ctx) {
              this.callService('light', 'turn_off', { entity_id: 'light.kitchen' });
              fetch('/api/whatever?image=' + encodeURIComponent(ctx.bg));
           },
        },
     ],
     /* buttonsPosition: where the bar sits: 'bottom-center' (default), 'bottom-left', 'bottom-right' */
     buttonsPosition: 'bottom-center',
```

After the `photo_date` paragraph (line 182-185), add:

```md
Screensaver controls: `buttons` configures the control bar (Previous / Play-Pause /
Next plus custom buttons with an mdi `icon` and an `action`). Built-in `previous` /
`play_pause` / `next` buttons get fixed behavior and default icons; set `enabled: false`
to hide one. Custom buttons run with the config `FunctionContext` as `this` and receive
`{ bg, index, total }` — the current slide's cache-busted URL, its 0-based index, and
the slide count. While the screensaver is active, any config function can also read
`this.slide`, `this.slideIndex`, and `this.slideCount`. `buttonsPosition` moves the bar
(`bottom-center` default, `bottom-left`, `bottom-right`).
```

- [ ] **Step 4: Run the full verification suite**

Run: `npm run lint && npm run typecheck && npm run test && npm run build`
Expected: all four pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/Screensaver.controls.test.tsx README.md
git commit -m "Add custom screensaver button actions and document controls"
```
