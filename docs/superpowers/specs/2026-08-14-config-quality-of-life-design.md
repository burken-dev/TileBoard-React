# Design: Config quality-of-life features (replacing config-side workarounds)

Date: 2026-08-14
Status: Approved

## Goal

The user's production config (`public/config/reference_config.js`, carried over from the
AngularJS TileBoard) contains workarounds that belong in the base code. This spec adds
eight small, independent features so those workarounds can be deleted:

1. `autoReloadInterval` — replaces a `setInterval(location.reload)` snippet.
2. `scripts` — replaces a synchronous-XHR `loadJS()` hack.
3. `locale` — replaces loading `moment.sv.js` for Swedish dates (currently silently
   unsupported; header dates render in English).
4. `slideCacheBust` — replaces a loop mutating `CONFIG.screensaver.slides` to defeat
   browser caching of same-name image files.
5. `photo_date` screensaver item — replaces a MutationObserver + EXIF + moment overlay.
6. select-domain fix — replaces a monkey-patched `setSelectOption` (base bug:
   `src/tiles/actions.ts` hardcodes the `input_select` domain).
7. `this.memo` — replaces hand-rolled `cacheStore`/`generateHash`/`getCache`/`setCache`.
8. `this.uiState`/`this.setUiState` — replaces `$scope.firstPageExtra` page-panel
   swapping, which currently has no equivalent in the React `FunctionContext`.

Helper functions (`getSmhiIcon`, `calculateGradient`, `rgbToHex`, `getStationName`)
need no base feature: config files are plain JS and config functions close over file
scope, so they become top-level functions in the user's config. Not part of this work.

Each feature is independently shippable; numbering below matches the list above.

## 1. `autoReloadInterval`

New optional key in `TileBoardConfig` (`src/config/types.ts`):

```ts
autoReloadInterval?: number; // seconds between full page reloads
```

One `useEffect` in `src/App.tsx`: when set and > 0, `setInterval(() =>
window.location.reload(), autoReloadInterval * 1000)`. Absent = never reload (current
behavior). Schema: optional positive number.

## 2. `scripts`

New optional key in `TileBoardConfig`:

```ts
scripts?: string[]; // extra scripts to load after config, before app render
```

Boot flow in `src/main.tsx` `start()`: after `loadConfig()` succeeds, sequentially
append `<script src>` tags awaiting each (`loadScript(url)` helper next to
`loadConfigScript` in `src/config/load.ts`), then render. Sequential await preserves
ordering for interdependent libraries. A failing script surfaces an error notification
via the existing `window.onerror`/store path but does not block app start.

## 3. `locale`

New optional key in `TileBoardConfig`:

```ts
locale?: string; // e.g. 'sv-se', 'sv', 'en-gb'
```

New module `src/utils/locale.ts`: normalize the configured value (lowercase, strip
region: `sv-se` → `sv`) and look it up in a small static registry mapping names to
date-fns locales. Ship `sv` now; default is date-fns English (current behavior). Other
locales are added to the registry on demand — no dynamic-import glob machinery.

`src/components/DateDisplay.tsx` passes `{ locale }` to date-fns `format`. Used by the
`photo_date` item (#5) as well. `Clock` is unaffected (numeric time only).

## 4. `slideCacheBust`

New optional key in `ScreensaverConfig`:

```ts
slideCacheBust?: number; // seconds; append a rolling cache-bust query to slide bgs
```

In `src/components/Screensaver.tsx`, when rendering a slide bg: strip any existing
query string and append `?t=<floor(Date.now()/1000/slideCacheBust)>`. Re-renders
already happen every `slidesTimeout`, so the bucket rolls over without any new timer.
Absent = URLs untouched (current behavior).

## 5. `photo_date` header item (EXIF date for the active screensaver slide)

New `HeaderItemType` `'photo_date'`, intended for screensaver item slots.

- `Screensaver.tsx` already holds `activeSlide` in state. It passes the active slide's
  `bg` (post cache-bust, per #4) to `HeaderItem` via a new optional `slideBg?: string`
  prop. Global screensaver slots receive the active slide's bg; per-slide slots receive
  their own slide's bg.
- `HeaderItem` renders a new `<PhotoDate bg={slideBg} format={item.format} />` for this
  type. Without `slideBg` (e.g. used in the header) it renders nothing.
- `PhotoDate` (`src/components/PhotoDate.tsx`): on `bg` change, dynamic
  `import('exifreader')`, `ExifReader.load(bg)`, read `DateTimeOriginal`, parse the EXIF
  `yyyy:MM:dd HH:mm:ss` format with date-fns `parse`, format with
  `item.format ?? 'dd MMMM yyyy'` and the configured locale (#3). Missing/invalid EXIF
  or load failure → render nothing.

New dependency: `exifreader` (maintained, ESM). Loaded only via dynamic import so it
stays out of the main bundle. Hand-parsing EXIF/TIFF (endianness, IFD pointers) is
rejected as error-prone.

Config result: `rightBottom: [{ type: 'photo_date' }]` replaces the MutationObserver,
the `exif-js` script load, and the `<span id="photo-date">` custom HTML.

## 6. select-domain fix

`src/tiles/actions.ts` `selectOption` hardcodes the domain:

```ts
sendItemData(item, 'input_select', 'select_option', { option });
```

Derive the domain from the item's entity id instead, so `select.*` entities (and any
future domain supporting `select_option`) work. One line plus a test pinning
`select.foo` → `callService('select', 'select_option', ...)`.

## 7. `this.memo(key, ttlSeconds, fn)`

New `src/utils/memo.ts`: module-level `Map<string, { expires: number; value: unknown }>`.

```ts
memo(key, ttlSeconds, fn) {
  const hit = store.get(key);
  if (hit && Date.now() < hit.expires) return hit.value;
  const value = fn();
  store.set(key, { expires: Date.now() + ttlSeconds * 1000, value });
  return value;
}
```

Exposed on `FunctionContext` as `memo`. Eviction is lazy, on access only; no size cap
(keys are user-controlled and few). Replaces the user's per-minute/per-15-min
time-bucket hashes: `ttl: 60` and `ttl: 900` respectively. The four cache helpers and
~15 call-site boilerplate blocks in the user config are deleted.

## 8. `this.uiState(key)` / `this.setUiState(key, value)`

New zustand slice in `src/store/index.ts`:

```ts
uiState: Record<string, unknown>;        // default {}
setUiState(key: string, value: unknown): void; // merges { [key]: value }
```

`FunctionContext` gains:

```ts
uiState: (key: string) => unknown;
setUiState: (key: string, value: unknown) => void;
```

Tiles subscribe to the `uiState` slice (in the shared tile wrapper where `hidden` and
other fields are evaluated) so config functions re-evaluate on change. This covers the
`firstPageExtra` pattern generically:

```js
action: function () { this.setUiState('mainPanel', 'trains'); },
hidden: function () { const p = this.uiState('mainPanel'); return p !== undefined && p !== 'trains'; },
```

No dedicated "panels" feature — the generic store is less code and more flexible.

## Cross-cutting

- `src/config/types.ts` and `src/config/schema.ts` gain the new keys; schema tests pin
  them.
- `src/config/defaults.ts` untouched (all keys optional, no defaults needed).
- Tests beside existing files, per repo convention (`npm run test`): locale
  normalization, memo expiry, cache-bust URL building, select-domain fix, schema
  acceptance of new keys, `PhotoDate` rendering with a mocked `exifreader`, uiState
  slice set/read.
- `README.md` config section documents the new keys.
- Verification per `AGENTS.md`: `npm run lint`, `npm run typecheck`, `npm run test`,
  `npm run build` before pushing `feature/config-quality-of-life`.

## Out of scope

- Porting the user's `reference_config.js` itself to the new features (follow-up task
  once these land).
- Moving user helpers (`getSmhiIcon`, `calculateGradient`, …) into base code — plain
  top-level functions in the config file suffice.
- A dedicated page-panels feature (covered by #8).
- Additional date-fns locales beyond `sv` (registry is the extension point).
- `photo_date` outside screensaver slots (renders nothing without a slide bg).
