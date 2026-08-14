# PERF-03: Bundle & startup

Target hardware: Raspberry Pi / old tablets on weak wifi. The app currently ships
everything — hls.js, chart.js, all popups — in ONE 1.1 MB JS chunk (350 kB gzip)
that must parse/compile before first paint. This spec splits it up and removes a
remote font dependency.

## Problems (from audit)

- `npx vite build` output: single `index-*.js` = **1,127 kB** (gzip 350 kB), CSS
  = 374 kB. No dynamic imports anywhere (`React.lazy`/`Suspense`/`import()`:
  zero matches in `src/`).
- `src/App.tsx:1-15` statically imports every popup → `HistoryPopup` pulls in
  `chart.js/auto` + `chartjs-adapter-date-fns` and `CameraPopup` pulls in
  `CameraStream` → hls.js, all in the critical path. (hls.js is ALSO being made
  lazy in PERF-02; this spec handles the popup-level splitting.)
- `src/components/popups/HistoryPopup.tsx:45-74`: chart.js v4 defaults animate a
  1000 ms entry animation and render at `devicePixelRatio` — a 1.5-2x DPR tablet
  rasters the full line chart at 2-4x logical pixels on open. Weak GPU stutter.
- `src/styles/themes.less:616,666` `@import url('https://fonts.googleapis.com/...Roboto...')`
  — remote Google Fonts: extra DNS/TLS + download, FOIT (invisible text) on slow
  connections, render-blocking on the Pi.

## Fix

### 1. Lazy-load the popups (`src/App.tsx`)

Convert the popup imports to `React.lazy` + wrap the popup tree in a single
`<Suspense>` with a `null` (or minimal) fallback. All popups already have default
exports (verified). The popups to lazy-load:

- `HistoryPopup` (pulls chart.js — biggest win)
- `CameraPopup` (pulls camera/hls components)
- `AlarmPopup`, `DatetimePopup`, `DoorEntryPopup`, `IframePopup`

```tsx
import { lazy, Suspense, useEffect } from 'react';

const AlarmPopup = lazy(() => import('./components/popups/AlarmPopup'));
const CameraPopup = lazy(() => import('./components/popups/CameraPopup'));
const DatetimePopup = lazy(() => import('./components/popups/DatetimePopup'));
const DoorEntryPopup = lazy(() => import('./components/popups/DoorEntryPopup'));
const HistoryPopup = lazy(() => import('./components/popups/HistoryPopup'));
const IframePopup = lazy(() => import('./components/popups/IframePopup'));
```

Wrap the popup section in `<Suspense fallback={null}>` (they render `null` when
closed anyway, so a null fallback is visually identical). `Notifications` and
`Screensaver` can stay static imports (small). Keep `Header`/`Pages` static.

Check `src/components/Pages.test.tsx` / popup tests: if any test renders `App`
and awaits a popup synchronously, the `lazy` boundary will make it async — adapt
the test only if needed (e.g. wrap in `await screen.findBy...`). Do not weaken
assertions.

### 2. Chart.js: kill entry animation, cap DPR (`HistoryPopup.tsx`)

In `baseOptions` (around line 45-64) add:

```ts
animation: false,
devicePixelRatio: Math.min(window.devicePixelRatio || 1, 1.5),
```

Set once at module scope: `const dpr = Math.min(window.devicePixelRatio || 1, 1.5);`
and reference it in the options object. Keep all existing options (scales,
plugins, maintainAspectRatio, responsive) unchanged.

### 3. Remove remote Google Fonts (`src/styles/themes.less`)

- Delete the two `@import url('https://fonts.googleapis.com/...')` lines
  (`themes.less:616` and `:666`).
- Replace the theme `font-family` declarations that referenced `'Roboto', ...`
  with the system font stack used elsewhere in the app. Check what
  `styles/main.less` already uses for a base font (e.g. `-apple-system,
  'Segoe UI', Roboto, ...` or similar) and reuse that stack. Search the file for
  `Roboto` and `font-family` usages in the theme blocks and update them to the
  local system stack.
- Do NOT download or vendor Roboto; rely on the platform/system stack (fast on
  all target devices, zero network).

## Do NOT touch

- `src/components/cameras/*` (PERF-02)
- `src/ha/connection.ts`, `src/store/index.ts`, `src/components/Tile.tsx`,
  `src/components/Group.tsx`, tile bodies, `HeaderItem.tsx`, `PagesMenu.tsx` (PERF-01)
- `src/components/Pages.tsx`, `Page.tsx`, `usePanGesture.ts`, `Screensaver.tsx`, `Clock.tsx` (PERF-04)

## Verification (MUST run)

```
npm run typecheck
npm run lint
npm test
npm run build
```

Run `npm run build` and confirm the output now has separate chunks:
`HistoryPopup` (chart.js) and camera popup (hls.js) should no longer be in the
main `index-*.js`. Report the new main chunk size vs the old 1,127 kB.

## Outcome

- Critical-path JS shrinks substantially (chart.js, hls.js, react-colorful and
  all popup code move out of the startup chunk).
- Chart popup opens without a 1 s animation and rasters at ≤1.5 DPR.
- No render-blocking remote font fetch.