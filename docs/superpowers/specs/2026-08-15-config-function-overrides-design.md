# Design: Consistent function-override coverage for config settings

Date: 2026-08-15
Status: Approved

## Goal

TileBoard config already lets many settings be either a static value or a config
function (`Field<T> = T | ConfigFunction<T>`). Coverage is inconsistent: some settings
resolve functions, others silently ignore them (typed `Field<T>` but never resolved), and
many plain settings accept static values only. This spec makes function support
systematic: every reasonable value setting across tiles, pages, groups, header, and
screensaver accepts `Field<T>`, resolved through one list-driven helper.

## Current mechanism (ground truth)

- `Field<T> = T | ConfigFunction<T>` — `src/config/types.ts:45`.
- `ConfigFunction<T>` signature: `(this: FunctionContext, item, entity) => T` —
  `types.ts:39-43`.
- `callFunction(funcOrValue, args)` — `src/utils/functions.ts:24-30`; applies functions
  with `getContext()` as `this`.
- `parseFieldValue(value, states, item, entity)` — `src/utils/fields.ts:4-14`; handles
  function (calls with `[item, entity]`), string (`@entity.attr` / `&entity_id.attr`
  interpolation), or raw passthrough.
- `getItemFieldValue` / `isHidden` — `src/utils/fields.ts:56-77`.
- Runtime schema (`src/config/schema.ts`) validates only `type`/`id`/`position`/shape;
  `validateConfig` returns `raw` untouched. New `Field<T>` keys need NO schema edits.
  Existing tests in `schema.test.ts` already pin function acceptance for `title`/`states`.

## 1. Core mechanism — `src/utils/fields.ts`

Add a generic list-driven resolver built on `parseFieldValue`:

```ts
export function resolveFields<T extends object>(
  obj: T,
  keys: Array<keyof T>,
  states: EntityStates,
  entity?: HaEntity | null,
): T;

export function resolveTile(item: TileConfig, entity: HaEntity | null, states: EntityStates): TileConfig;
```

`resolveTile` shallow-copies the tile and resolves every key on a canonical `TILE_FIELDS`
list via `parseFieldValue`. Non-listed keys are copied through untouched. Resolution runs
at the render boundary where `states` and `entity` are available; existing per-consumer
`parseFieldValue`/`callFunction` calls become no-ops on already-resolved plain values, so
the change is additive and low-risk.

### Resolution list (flat scalar value settings)

`title, subtitle, state, bg, bgSuffix, bgOpacity, bgSize, slidesDelay, hidden,
customStyles, value, unit, refresh, url, icon, iconImage, customHtml, iframeStyles,
iframeClasses, objFit, bufferLength, bottom, colorpicker, hideSource, hideMuteButton,
map, zoomLevels, hideEntityPicture, hideHeader, width, height`

### Excluded (unchanged behavior)

- **Function-first keys** — must stay callable with their own signatures at their call
  sites: `action`, `secondaryAction`, `filter`, `states`, `icons`, `slider.formatValue`.
- **Structural / nested** — resolved elsewhere or structural: `id`, `type`, `position`,
  `theme`, `classes`, `list`, `fields`, `settings`, `history`, `slider`, `sliders`,
  `slides`, `fullscreen`, `layout`.
  - `list` / `fields` / `settings` / `history`: already function-capable per-item via
    `parseFieldValue` at their consumers (e.g. `listField` passes the field name to
    `filter`); kept lazy to preserve that context.
  - `slides[].bg`: already resolved at `Tile.tsx:114`.
  - `slider`/`sliders` fields: resolved in `getSliderConf` (single consumer), see §3.
  - `fullscreen`/`layout`: nested tile configs; `fullscreen` resolved at the camera
    popup boundary, `layout` tiles render through `<Tile>`.
- **Dead config** (leave alone, out of scope): `loading`, `controlsEnabled`.

## 2. Type widening — `src/config/types.ts`

Every setting below becomes `Field<T>` of its current type. This is what makes the
capability uniform and documented at the type level.

- `TileConfig` → `Field`: `bgSize`, `slidesDelay`, `width`, `height`, `objFit`,
  `bufferLength`, `bottom`, `colorpicker`, `hideSource`, `hideMuteButton`, `map`,
  `zoomLevels`, `hideEntityPicture`, `hideHeader`.
- `SliderConfig` → `Field`: `min`, `max`, `step`, `value`, `title`, `field`, `request`.
- `HistoryConfig` → `Field`: `offset`, `options`, `styles`, `classes` (already work at
  runtime through `getItemFieldValue`; untyped today).
- `PageConfig` → `Field`: `bg`, `bgSuffix` (already typed, currently dead), `icon`,
  `tileSize`, `tileMargin`, `groupMarginCss`.
- `GroupConfig` → `Field`: `title`, `width`, `height`, `groupMarginCss`.
- `HeaderConfig.styles` → `Field<CSSProperties>`.
- `HeaderItemConfig` → `Field`: `format`, `dateFormat`, `styles`, `html`.
- `ScreensaverConfig` → `Field`: `timeout`, `slidesTimeout`, `slideCacheBust`, `styles`.
- `SlideConfig.bg` → `Field<string>`; `SlideConfig.styles` → `Field<CSSProperties>`.
- Document existing runtime-magic fields on `TileConfig`: dimmer `actionPlus` /
  `actionMinus`, weather_list header titles `dateTitle` / `iconTitle` / `primaryTitle` /
  `secondaryTitle`.

## 3. Resolution points

Each boundary resolves with real `states` from the store. Key lists:

- `TILE_FIELDS` = the §1 resolution list.
- `PAGE_FIELDS` = `bg, bgSuffix, icon, tileSize, tileMargin, groupMarginCss, hidden`.
- `GROUP_FIELDS` = `title, width, height, groupMarginCss, hidden`.
- `HEADER_ITEM_FIELDS` = `format, dateFormat, styles, html, hidden`.
- `SLIDER_FIELDS` = `min, max, step, value, title, field, request`.
- `SCREENSAVER_FIELDS` = `timeout, slidesTimeout, slideCacheBust, styles`.

- `src/components/Tile.tsx`: `resolveTile(item, entity, states)` once; resolved item feeds
  the tile shell and `TileBody`. Fixes the raw `bgOpacity` cast in the slides container
  (Tile.tsx:110) for free.
- `src/components/popups/CameraPopup.tsx`: `resolveTile(fullscreen, entity, states)`
  before rendering the camera tile.
- `src/components/Pages.tsx`: resolve each page (`resolveFields` over `PAGE_FIELDS`) with
  real states; the resolved page propagates to `Page`/`Group`/`Tile`. Fixes the dead
  `page.bg`/`page.bgSuffix` path in `layout.ts:pageBackground` — a resolved bg is a plain
  string, so the existing `typeof === 'string'` guard works.
- `src/components/Group.tsx`: resolve group fields (`GROUP_FIELDS`); pass real states to
  `isHidden` for items (fixes the `{}`-states call at Group.tsx:26).
- `src/components/Header.tsx` + `HeaderItem.tsx`: resolve header styles and item scalars
  (`HEADER_ITEM_FIELDS`); pass real states to `isHidden` (HeaderItem.tsx:11 currently
  passes `{} as never`).
- `src/components/Screensaver.tsx`: resolve `SCREENSAVER_FIELDS` and each slide's `bg`
  (fixes plain-string `SlideConfig.bg`).
- `src/utils/sliders.ts` `getSliderConf`: `resolveFields` over `SLIDER_FIELDS` (single
  consumer; already receives item/entity/states context).

## 4. Consistency fixes

- **Dead `Page bg`/`bgSuffix`** (typed `Field`, never resolved) → fixed by page
  resolution in `Pages.tsx`.
- **`bgOpacity` raw casts** (Tile.tsx:110 slides opacity; DeviceTrackerTile.tsx:32) →
  fixed by `resolveTile`.
- **`hidden` degraded context** (Page/Group/HeaderItem called with `{}` states) → pass
  real `states` so context-dependent hidden functions work.
- **Leave alone**: `filter` (already function-capable; its three call signatures are
  intentional call sites — value filters vs. list-field filters vs. camera URL source);
  dead `loading`/`controlsEnabled`.

## 5. Testing

- `src/utils/fields.test.ts`: unit tests for `resolveFields`/`resolveTile` — function
  field called with `(item, entity)` context; plain value passthrough; unlisted keys
  untouched; excluded keys (`action`, `filter`, `states`, `icons`) not resolved; hidden
  resolved to boolean.
- One component test for function `page.bg` (pages render path).
- Existing component/schema tests serve as the regression net.
- Verification per `AGENTS.md`: `npm run lint`, `npm run typecheck`, `npm run test`,
  `npm run build`.

## Out of scope

- Changing `filter` semantics/signatures.
- `theme`/`classes`/`position`/`id`/`type` as functions (structural).
- Dead `loading`/`controlsEnabled`.
- Runtime schema changes (permissive schema needs none).