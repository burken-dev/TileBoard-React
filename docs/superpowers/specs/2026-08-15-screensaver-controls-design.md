# Design: Screensaver navigation controls

Date: 2026-08-15
Status: Approved

## Goal

Add a control bar to the screensaver so the user can navigate and control the image
slideshow: Previous / Play-Pause / Next buttons, plus configurable custom buttons
(e.g. Home Assistant service calls, REST requests) that run with access to the
current image and the standard `FunctionContext` APIs.

## Config

New types in `src/config/types.ts`:

```ts
export type ScreensaverButtonType = 'previous' | 'play_pause' | 'next';

export interface ScreensaverButtonContext {
  bg: string;     // current slide bg URL (resolved, incl. cache-bust)
  index: number;  // 0-based index of the active slide
  total: number;  // slide count
}

export type ScreensaverButtonAction = (this: FunctionContext, ctx: ScreensaverButtonContext) => void;

export interface ScreensaverButtonConfig {
  type?: ScreensaverButtonType;     // absent -> custom button
  icon?: string;                    // mdi class; defaults for built-ins, required for custom
  action?: ScreensaverButtonAction; // required for custom buttons
  enabled?: boolean;                // default true; false hides the button
}
```

`ScreensaverConfig` gains:

```ts
buttons?: ScreensaverButtonConfig[];                               // default: [prev, play_pause, next]
buttonsPosition?: 'bottom-center' | 'bottom-left' | 'bottom-right'; // default 'bottom-center'
```

The schema (`src/config/schema.ts`) validates only `serverUrl`/`pages`, so no schema
change is needed.

## Action context

`FunctionContext` gains three read-only fields:

```ts
slide: string | null;       // current slide bg URL (cache-busted), null when not shown
slideIndex: number | null;  // 0-based, null when not shown
slideCount: number | null;
```

A new `ScreensaverSlice` in `src/store/index.ts` holds `activeSlide: number`,
`paused: boolean`, and setters. `Screensaver.tsx` moves its local slide state there;
`getContext()` (`src/utils/functions.ts`) reads the slice so any config function can
read `this.slide` / `this.slideIndex` / `this.slideCount` at call time.

No REST helper is added: custom actions use browser `fetch`, `this.callService`,
`this.sendMessage` — all already available on `FunctionContext`.

## Behavior

- **Prev/Next** navigate with modulo and reset the auto-advance timer (the interval
  effect is re-keyed on `activeSlide`), but do **not** unpause: a paused screensaver
  stays paused after navigating.
- **Play/Pause** toggles `paused` (default: playing). While paused the advance
  interval is cleared. Icon flips between `mdi-pause` and `mdi-play`.
- Single-slide slideshows: prev/next are no-ops (modulo of 1).
- The controls bar container calls `stopPropagation()` on click so buttons do not
  dismiss the screensaver.
- Controls render only while the screensaver is shown.

## Rendering

`src/components/Screensaver.tsx`:

- The auto-advance `useEffect` gains a `paused` guard and `activeSlide` in its
  dependency array, so pausing clears the interval and manual navigation restarts the
  per-slide timer.
- Render a `ScreensaverControls` sub-component (kept in its own file
  `src/components/ScreensaverControls.tsx`) from `conf.buttons`, falling back to the
  three defaults when the key is absent and skipping entries with `enabled === false`.
  Built-in types use fixed behavior with default icons (`mdi-skip-previous`, dynamic
  pause/play, `mdi-skip-next`); custom buttons call
  `callFunction(button.action, [{ bg, index, total }])` with the cache-busted `bg`.

## Styles

`styles/main.less`: `.screensaver-controls` — centered flex bar, semi-transparent
dark background, rounded, `bottom: 20px`, `z-index: 53` (above slides); position
modifiers `--bottom-center` / `--bottom-left` / `--bottom-right`.

## Tests

- `src/components/Screensaver.test.tsx`: default buttons render; prev/next change the
  active slide; play/pause stops and restarts auto-advance (fake timers); a custom
  button's action receives `{ bg, index, total }`; clicking a button does not hide the
  screensaver.
- `src/utils/functions.test.ts`: `getContext()` exposes `slide` / `slideIndex` /
  `slideCount` from the store.

## Documentation

README screensaver section documents `buttons` and `buttonsPosition`, including a
custom-button example calling `this.callService` / `fetch`.

## Out of scope

- Keyboard shortcuts, hover-fade, swipe navigation.
- Custom icons for the `play_pause` built-in (icon is derived from state).
- Controls on the non-shown screensaver.
