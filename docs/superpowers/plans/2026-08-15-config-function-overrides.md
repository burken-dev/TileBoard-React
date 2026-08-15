# Consistent function-override coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every reasonable config setting across tiles, sliders, pages, groups, header, and screensaver accept either a static value or a config function, resolved through one list-driven resolver.

**Architecture:** Add `resolveFields`/`resolveTile` to `src/utils/fields.ts` (built on the existing `parseFieldValue`/`callFunction`), widen the config types to `Field<T>`, and resolve at each render boundary where states/entity are available. Tiles resolve once in `Tile.tsx`; page/group fields resolve inside the `layout.ts` helpers (this avoids breaking `config.pages.indexOf(page)` identity in `Tile.tsx`); header/screensaver resolve in their own components. Function-first settings (`action`, `secondaryAction`, `filter`, `states`, `icons`, `slider.formatValue`) stay callable with their own signatures and are never resolved.

**Tech Stack:** React 18, zustand 5, zod 4, vitest + @testing-library/react (jsdom), Vite.

## Global Constraints

- Branch: `feature/config-quality-of-life` (already checked out). Commit messages: imperative present tense.
- Verification (from `AGENTS.md`): `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`. After EVERY task, run that task's test; run all four before pushing.
- `src/config/schema.ts` is intentionally permissive (only validates `serverUrl` + page/group/tile shape) and `validateConfig` returns `raw` untouched — `Field<T>` widening needs NO schema edits.
- Config files are plain JS — config functions are untyped at authoring time; the `Field<T>` types are internal documentation.
- `ConfigFunction<T>` signature is `(this: FunctionContext, item, entity) => T`; `parseFieldValue` also does `@entity.attr` / `&entity_id.attr` string interpolation.
- Test files sit beside source (`*.test.ts(x)`). Tests must not depend on the module-level singleton `appStore` persisting between files (vitest isolates per file).
- No new dependencies.
- **Deviation from spec §3 (functional equivalent):** page/group fields (`bg`, `bgSuffix`, `icon`, `tileSize`, `tileMargin`, `groupMarginCss`) are resolved at their consumption sites (layout helpers / PagesMenu) instead of a pre-resolution pass in `Pages.tsx`. Pre-resolving pages creates new page object references, which breaks `config.pages.indexOf(page)` at `Tile.tsx:84`. Resolution sites below deliver the same runtime capability without that identity bug. Page/group `hidden` needs no resolution — `isHidden` calls function values natively.

---

### Task 1: Core resolver in `src/utils/fields.ts`

**Files:**
- Modify: `src/utils/fields.ts`
- Test: `src/utils/fields.test.ts`

**Interfaces:**
- Consumes: `parseFieldValue`, `parseString`, `callFunction` (already in fields.ts), `EntityStates`/`HaEntity`/`TileConfig` types.
- Produces:
  - `resolveFieldValue(value: unknown, states: EntityStates, item?: unknown, entity?: HaEntity | null): unknown` — calls functions with `(item, entity)`, interpolates strings, passes everything else through unchanged (preserves `false`/`0`/`''`).
  - `resolveFields<T extends object>(obj: T, keys: readonly (keyof T)[], states: EntityStates, entity?: HaEntity | null): T` — shallow copy; resolves each listed key.
  - `resolveTile(item: TileConfig, entity: HaEntity | null, states: EntityStates): TileConfig`
  - Exported key lists: `TILE_FIELDS`, `PAGE_FIELDS`, `GROUP_FIELDS`, `HEADER_ITEM_FIELDS`, `SCREENSAVER_FIELDS`, `SLIDER_FIELDS`.

- [ ] **Step 1: Write the failing tests**

Append to `src/utils/fields.test.ts`. Update the import on line 4:

```ts
import { getItemFieldValue, parseFieldValue, parseString, resolveFields, resolveTile } from './fields';
```

Append:

```ts
describe('resolveFields', () => {
  it('calls function fields with item and entity context', () => {
    const item: TileConfig = { type: 'switch', id: 'x', position: [0, 0] };
    const result = resolveFields(
      {
        ...item,
        title: function (this: { states: EntityStates }) {
          return this.states['sensor.k'].state;
        },
      },
      ['title'],
      states,
      null,
    );
    expect(result.title).toBe('21');
  });

  it('preserves plain, falsy and unlisted values', () => {
    const action = function () {};
    const result = resolveFields({ a: 0, b: false, title: 'x', action }, ['title'], states);
    expect(result).toEqual({ a: 0, b: false, title: 'x', action });
  });

  it('interpolates string entity refs', () => {
    const result = resolveFields({ title: '&sensor.k.state' }, ['title'], states);
    expect(result.title).toBe('21');
  });
});

describe('resolveTile', () => {
  it('resolves listed fields and leaves function-first keys intact', () => {
    const action = function () {};
    const filter = function () {};
    const item: TileConfig = {
      type: 'switch',
      id: 'x',
      position: [0, 0],
      bgOpacity: () => 0.5,
      action,
      filter,
    };
    const result = resolveTile(item, null, states);
    expect(result.bgOpacity).toBe(0.5);
    expect(result.action).toBe(action);
    expect(result.filter).toBe(filter);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/utils/fields.test.ts`
Expected: FAIL — `resolveFields` is not a function.

- [ ] **Step 3: Implement the resolver in `src/utils/fields.ts`**

Append below `isHidden` (line 77). `callFunction` and `parseString` are already imported in this file; add `ConfigFunction` to the type import on line 1:

```ts
// resolveFieldValue preserves falsy values (parseFieldValue maps them to null)
export function resolveFieldValue(
  value: unknown,
  states: EntityStates,
  item?: unknown,
  entity?: HaEntity | null,
): unknown {
  if (typeof value === 'function') return callFunction(value as ConfigFunction, [item, entity]);
  if (typeof value === 'string') return parseString(value, states, entity);
  return value;
}

export function resolveFields<T extends object>(
  obj: T,
  keys: readonly (keyof T)[],
  states: EntityStates,
  entity?: HaEntity | null,
): T {
  const out: T = { ...obj };
  for (const key of keys) {
    if (!(key in obj)) continue;
    (out as Record<string, unknown>)[key as string] = resolveFieldValue(
      (obj as Record<string, unknown>)[key as string],
      states,
      obj,
      entity,
    );
  }
  return out;
}

export const TILE_FIELDS = [
  'title', 'subtitle', 'bg', 'bgSuffix', 'bgOpacity', 'bgSize', 'slidesDelay', 'hidden',
  'customStyles', 'value', 'unit', 'refresh', 'url', 'icon', 'iconImage', 'customHtml',
  'iframeStyles', 'iframeClasses', 'objFit', 'bufferLength', 'bottom', 'colorpicker',
  'hideSource', 'hideMuteButton', 'map', 'zoomLevels', 'hideEntityPicture', 'hideHeader',
  'width', 'height',
] as const;

export const PAGE_FIELDS = ['icon'] as const;
export const GROUP_FIELDS = ['title', 'width', 'height', 'groupMarginCss'] as const;
export const HEADER_ITEM_FIELDS = ['format', 'dateFormat', 'styles', 'html'] as const;
export const SCREENSAVER_FIELDS = ['timeout', 'slidesTimeout', 'slideCacheBust', 'styles'] as const;
export const SLIDER_FIELDS = ['min', 'max', 'step', 'value', 'title', 'field', 'request'] as const;

export function resolveTile(item: TileConfig, entity: HaEntity | null, states: EntityStates): TileConfig {
  return resolveFields(item, TILE_FIELDS as readonly (keyof TileConfig)[], states, entity);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/utils/fields.test.ts`
Expected: PASS.

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/utils/fields.ts src/utils/fields.test.ts
git commit -m "Add list-driven field resolver for config settings"
```

---

### Task 2: Widen tile/slider/history types and cast raw consumers

**Files:**
- Modify: `src/config/types.ts`
- Modify: `src/components/cameras/Camera.tsx:95,102`
- Modify: `src/components/cameras/CameraThumbnail.tsx:67,84`
- Modify: `src/components/cameras/CameraStream.tsx:39`
- Modify: `src/components/tiles/DeviceTrackerTile.tsx:20-21,31,45`
- Modify: `src/components/tiles/MediaPlayerTile.tsx:55,201`
- Modify: `src/components/tiles/LightTile.tsx:51`
- Modify: `src/components/tiles/SliderTile.tsx:14`
- Modify: `src/components/tiles/WeatherListTile.tsx:57`
- Modify: `src/utils/layout.ts:29-38`

**Interfaces:**
- Consumes: nothing new at runtime (types only; runtime resolution lands in Task 3+).
- Produces: widened `Field<T>` types consumed by every later task; `SliderRuntime` still redeclares `min/max/step/value` as `number`.

- [ ] **Step 1: Widen `src/config/types.ts`**

In `TileConfig`, change these to `Field<...>`:

```ts
  width?: Field<number>;
  height?: Field<number>;
  bgSize?: Field<string>;
  slidesDelay?: Field<number>;
  objFit?: Field<string>;
  bufferLength?: Field<number>;
  bottom?: Field<boolean>;
  colorpicker?: Field<boolean>;
  hideSource?: Field<boolean>;
  hideMuteButton?: Field<boolean>;
  map?: Field<'google' | 'mapbox' | 'yandex'>;
  zoomLevels?: Field<number[]>;
  hideEntityPicture?: Field<boolean>;
  hideHeader?: Field<boolean>;
```

In `HistoryConfig`:

```ts
  offset?: Field<number>;
  options?: Field<Record<string, unknown>>;
  styles?: Field<CSSProperties>;
  classes?: Field<string>;
```

In `SliderConfig`:

```ts
  title?: Field<string>;
  field?: Field<string>;
  min?: Field<number>;
  max?: Field<number>;
  step?: Field<number>;
  value?: Field<number>;
  request?: Field<{ type?: string; domain: string; service: string; field?: string }>;
```

`SliderRuntime` (sliders.ts) redeclares `min/max/step/value` as `number`, which is a valid narrowing of the widened base type — no change needed there yet.

- [ ] **Step 2: Cast raw consumers to keep typecheck green**

`Camera.tsx` (two `ImageLayer` props, lines 95 and 102):
```tsx
          backgroundSize={item.bgSize as string | undefined}
```

`CameraThumbnail.tsx` (two `backgroundSize` style values, lines 67 and 84):
```tsx
            backgroundSize: (item.bgSize as string | undefined) ?? 'cover',
```

`CameraStream.tsx` line 39:
```ts
    const len = typeof item.bufferLength !== 'undefined' ? (item.bufferLength as number) : 5;
```

`DeviceTrackerTile.tsx`:
```ts
  const zoomLevels = (item.zoomLevels as number[] | undefined) ?? [9, 13];
  const showBg = !!attrs.entity_picture && !(item.hideEntityPicture as boolean);
```
line 31: `animationDelay: `${(item.slidesDelay as number | undefined) ?? 0}s`,` and line 45:
```ts
                provider: (item.map as TileConfig['map'] | undefined) ?? 'google',
```
(import `TileConfig` already present in this file.)

`MediaPlayerTile.tsx` line 55: `const showSource = sourceList.length > 0 && !(item.hideSource as boolean);` — and the `item.hideMuteButton` guard (~line 201) the same way.

`LightTile.tsx` line 51: `{item.colorpicker ? (` → `{(item.colorpicker as boolean) ? (`.

`SliderTile.tsx` line 14: `{'item-entity-container' + ((item.bottom as boolean) ? ' -slider-bottom' : '')}`.

`WeatherListTile.tsx` line 57: `{!(item.hideHeader as boolean) && (`.

`layout.ts` `itemPositionStyles` (lines 29-38):
```ts
export function itemPositionStyles(item: TileConfig, opts: SizeOpts): CSSProperties {
  const w = (item.width as number | undefined) ?? 1;
  const h = (item.height as number | undefined) ?? 1;
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Run the tile component tests**

Run: `npm run test -- src/components/tiles src/components/Tile.test.tsx`
Expected: PASS (static configs behave identically; no resolution wired yet).

- [ ] **Step 5: Commit**

```bash
git add src/config/types.ts src/components/cameras src/components/tiles src/utils/layout.ts
git commit -m "Widen config types to accept functions for value settings"
```

---

### Task 3: Resolve tiles at the render boundary

**Files:**
- Modify: `src/components/Tile.tsx`
- Modify: `src/components/popups/CameraPopup.tsx`
- Test: `src/components/Tile.test.tsx`

**Interfaces:**
- Consumes: `resolveTile` (Task 1), `pageOpts(page, config)` (unchanged until Task 5).
- Produces: resolved `TileConfig` instances feeding the tile shell, `TileBody`, and camera fullscreen renders.

- [ ] **Step 1: Write the failing test**

Append to `src/components/Tile.test.tsx`:

```tsx
  it('resolves function settings with entity context', () => {
    setup();
    const item: TileConfig = {
      type: 'switch',
      id: 'switch.test',
      position: [0, 0],
      icon: () => 'mdi-function-icon',
    };
    const { container } = render(<Tile item={item} page={{ groups: [] }} />);
    const icon = container.querySelector('.item-entity--icon');
    expect(icon?.className).toContain('mdi-function-icon');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/Tile.test.tsx`
Expected: FAIL — icon class is empty (function not resolved).

- [ ] **Step 3: Resolve the tile in `Tile.tsx`**

Add the import:
```ts
import { resolveTile } from '../utils/fields';
```

In the component body, after the early-return `if (!entity || isHidden(item, entities)) return null;`, resolve once and use the resolved item everywhere below:

```tsx
  const resolved = resolveTile(item, entity, entities);
  const title = entityTitle(resolved, entity, entities);
  const subtitle = entitySubtitle(resolved, entity, entities);
  const state = entityState(resolved, entity, entities);
  const loading = isLoading(resolved);

  const base = itemPositionStyles(resolved, pageOpts(page, config));
  const custom = resolved.customStyles ?? {};
  const styles = { ...base, ...(custom as React.CSSProperties) };

  const slides = resolved.slides ?? [];
```

Replace the remaining `item` references inside the returned JSX with `resolved`: `itemClasses(resolved, ...)`, `selectOpened(resolved)`, `(resolved.bg || resolved.bgSuffix)`, `itemBackgroundStyles(resolved, entity, entities, config.serverUrl)`, `resolved.slides.length > 0`, `resolved.slidesDelay ?? 0`, `resolved.bgOpacity as number | undefined`, and `<TileBody item={resolved} .../>`.

Keep the `slides.map` block as-is (it already resolves each `slide.bg` via `parseFieldValue`). `state`, `action`, `secondaryAction`, `filter` are preserved by `resolveTile` (not in `TILE_FIELDS`), so click handlers and `entityState` work unchanged.

- [ ] **Step 4: Resolve the fullscreen camera tile in `CameraPopup.tsx`**

Add the import:
```ts
import { resolveTile } from '../../utils/fields';
```

Change line 17:
```ts
  const fullscreen = resolveTile(activeCamera.fullscreen, entity, entities);
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test -- src/components/Tile.test.tsx src/components/tiles src/components/popups`
Expected: PASS.

- [ ] **Step 6: Run typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/Tile.tsx src/components/popups/CameraPopup.tsx src/components/Tile.test.tsx
git commit -m "Resolve tile function settings at render boundary"
```

---

### Task 4: Resolve slider fields

**Files:**
- Modify: `src/utils/sliders.ts`
- Modify: `src/components/tiles/SliderTile.tsx`
- Modify: `src/components/tiles/LightTile.tsx`
- Test: `src/utils/sliders.test.ts`

**Interfaces:**
- Consumes: `resolveFields`, `SLIDER_FIELDS` (Task 1), `EntityStates` type.
- Produces:
  - `getSliderConf(item: TileConfig, entity: HaEntity, states: EntityStates): SliderRuntime`
  - `getLightSliderConf(slider: SliderConfig, entity: HaEntity, states: EntityStates): SliderRuntime`

- [ ] **Step 1: Write the failing tests**

Update the two existing `getSliderConf` calls (lines 30 and 35) and the two `getLightSliderConf` calls (lines 45-47) in `src/utils/sliders.test.ts` to pass `{}` as the third `states` argument. Append:

```ts
  it('resolves function slider fields', () => {
    const conf = getSliderConf(
      { ...item, slider: { min: () => 5 } },
      { ...entity, attributes: { min: 0, step: 5 } },
      {},
    );
    expect(conf.min).toBe(5);
  });

  it('resolves function title on light sliders', () => {
    const conf = getLightSliderConf(
      { title: () => 'Brightness', field: 'brightness' },
      { ...entity, attributes: { brightness: 128 } },
      {},
    );
    expect(conf.title).toBe('Brightness');
    expect(conf.value).toBe(128);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/utils/sliders.test.ts`
Expected: FAIL — min is 0 and title is a function (not resolved).

- [ ] **Step 3: Resolve slider fields in `src/utils/sliders.ts`**

Add imports:
```ts
import type { EntityStates } from '../config/types';
import { resolveFields, SLIDER_FIELDS } from './fields';
```

Change the two conf builders (note: `def.field` is a `Field<string>`, cast where read):

```ts
export function getSliderConf(item: TileConfig, entity: HaEntity, states: EntityStates): SliderRuntime {
  const def = resolveFields<SliderConfig>(item.slider ?? ({} as SliderConfig), SLIDER_FIELDS, states, entity);
  const attrs = entity.attributes ?? {};
  const field = (def.field as string | undefined) ?? 'value';
  return {
    ...def,
    max: num(attrs.max) || (def.max as number) || 100,
    min: num(attrs.min) || (def.min as number) || 0,
    step: (def.step as number) || num(attrs.step) || 1,
    value: num(attrs[field]) || num(entity.state) || (def.value as number) || 0,
    request: def.request ?? { domain: 'input_number', service: 'set_value', field: 'value' },
  };
}

export function getLightSliderConf(slider: SliderConfig, entity: HaEntity, states: EntityStates): SliderRuntime {
  const def = resolveFields<SliderConfig>(slider ?? ({} as SliderConfig), SLIDER_FIELDS, states, entity);
  const attrs = entity.attributes ?? {};
  const field = (def.field as string | undefined) ?? 'value';
  return {
    ...def,
    max: (def.max as number) || num(attrs.max) || 100,
    min: (def.min as number) || num(attrs.min) || 0,
    step: (def.step as number) || num(attrs.step) || 1,
    value: num(attrs[field]) || num(def.min as number) || num(attrs.min) || 0,
    request: def.request ?? { domain: 'input_number', service: 'set_value', field },
  };
}
```

`SLIDER_FIELDS` is typed `readonly ('min'|...)[]`; it is a subset of `keyof SliderConfig` after the Task 2 widening, so the `resolveFields<SliderConfig>` call compiles.

In `sendSliderValueFn`, `conf.request` is now `Field<{...}>` — cast once at the top:
```ts
function sendSliderValueFn(item: TileConfig, conf: SliderRuntime): void {
  const request = conf.request as
    | { type?: string; domain: string; service: string; field?: string }
    | undefined;
  if (!request) return;
```

- [ ] **Step 4: Update the two call sites**

`SliderTile.tsx` line 10: `const conf = getSliderConf(item, entity, states);` (`states` already exists via `useEntities`).

`LightTile.tsx` line 39: `const conf = getLightSliderConf(slider, entity, states);` — and change lines 42-44 to read the resolved `title` from `conf` instead of the raw `slider`:
```tsx
              {conf.title ? (
                <div className="item-slider-title">
                  <span>{String(conf.title)}</span>: <span>{slider.formatValue ? slider.formatValue(conf) : conf.value}</span>
                </div>
              ) : null}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test -- src/utils/sliders.test.ts`
Expected: PASS.

- [ ] **Step 6: Run typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/utils/sliders.ts src/utils/sliders.test.ts src/components/tiles/SliderTile.tsx src/components/tiles/LightTile.tsx
git commit -m "Resolve slider config fields as functions"
```

---

### Task 5: Resolve page and group fields

**Files:**
- Modify: `src/config/types.ts` (PageConfig, GroupConfig widening)
- Modify: `src/utils/layout.ts`
- Modify: `src/utils/layout.test.ts`
- Modify: `src/components/Page.tsx`
- Modify: `src/components/Group.tsx`
- Modify: `src/components/PagesMenu.tsx`
- Modify: `src/components/Tile.tsx` (pageOpts call gains states)
- Modify: `src/components/tiles/DeviceTrackerTile.tsx` (tileSize resolution)
- Test: `src/components/Pages.test.tsx`

**Interfaces:**
- Consumes: `resolveFields`, `resolveFieldValue`, `GROUP_FIELDS`, `PAGE_FIELDS` (Task 1).
- Produces:
  - `calcGroupSize(group: GroupConfig, states: EntityStates)`
  - `groupSizeStyles(group: GroupConfig, opts: SizeOpts, states: EntityStates)`
  - `pageOpts(page: PageConfig, config: TileBoardConfig, states: EntityStates)`
  - `groupMargin(page: PageConfig, group: GroupConfig, config: TileBoardConfig, states: EntityStates): string`
  - `pageBackground(page: PageConfig, config: TileBoardConfig, states: EntityStates): CSSProperties`

- [ ] **Step 1: Write the failing tests**

Append to `src/components/Pages.test.tsx`:

```tsx
  it('resolves a function page background', () => {
    createAppStore({
      ...fixture,
      pages: [{ ...fixture.pages[0], bg: () => 'http://h/bg.jpg' }],
    });
    getAppStore().setEntities([
      { entity_id: 'a', state: 'off', attributes: {} },
      { entity_id: 'b', state: 'off', attributes: {} },
      { entity_id: 'c', state: 'off', attributes: {} },
    ]);
    const { container } = render(<Pages />);
    const page = container.querySelector('.page') as HTMLElement;
    expect(page.style.backgroundImage).toContain('http://h/bg.jpg');
  });

  it('resolves a function group title', () => {
    createAppStore({
      ...fixture,
      pages: [
        {
          ...fixture.pages[0],
          groups: [{ ...fixture.pages[0].groups[0], title: () => 'Fn' }],
        },
        fixture.pages[1],
      ],
    });
    getAppStore().setEntities([
      { entity_id: 'a', state: 'off', attributes: {} },
      { entity_id: 'b', state: 'off', attributes: {} },
      { entity_id: 'c', state: 'off', attributes: {} },
    ]);
    const { container } = render(<Pages />);
    expect(container.textContent).toContain('Fn');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/Pages.test.tsx`
Expected: FAIL — backgroundImage empty; group title renders as a function string.

- [ ] **Step 3: Widen `PageConfig` and `GroupConfig` in `src/config/types.ts`**

`PageConfig`:
```ts
  icon?: Field<string>;
  tileSize?: Field<number>;
  tileMargin?: Field<number>;
  groupMarginCss?: Field<string>;
```

`GroupConfig`:
```ts
  title?: Field<string>;
  width?: Field<number>;
  height?: Field<number>;
  groupMarginCss?: Field<string>;
```

- [ ] **Step 4: Update `src/utils/layout.ts`**

Add imports (keep `toAbsoluteServerURL`):
```ts
import type { EntityStates, GroupConfig, PageConfig, TileBoardConfig, TileConfig } from '../config/types';
import { resolveFieldValue } from './fields';
```

Rewrite the four affected functions:

```ts
export function calcGroupSize(group: GroupConfig, states: EntityStates): { width: number; height: number } {
  let width = 0;
  let height = 0;
  for (const item of group.items || []) {
    const w = (resolveFieldValue(item.width, states, item, null) as number | undefined) ?? 1;
    const h = (resolveFieldValue(item.height, states, item, null) as number | undefined) ?? 1;
    height = Math.max(height, item.position[1] + h);
    width = Math.max(width, item.position[0] + w);
  }
  return { width, height };
}

export function groupSizeStyles(group: GroupConfig, opts: SizeOpts, states: EntityStates): CSSProperties {
  const w = (group.width as number | undefined) ?? calcGroupSize(group, states).width;
  const h = (group.height as number | undefined) ?? calcGroupSize(group, states).height;
  return {
    width: `${opts.tileSize * w + opts.tileMargin * (w - 1)}px`,
    height: `${opts.tileSize * h + opts.tileMargin * (h - 1)}px`,
  };
}
```

`itemPositionStyles` already casts `width`/`height` (Task 2) — leave it.

```ts
export function pageOpts(page: PageConfig, config: TileBoardConfig, states: EntityStates): SizeOpts {
  return {
    tileSize:
      (resolveFieldValue(page.tileSize, states, page, null) as number | undefined) ??
      config.tileSize ??
      150,
    tileMargin:
      (resolveFieldValue(page.tileMargin, states, page, null) as number | undefined) ??
      config.tileMargin ??
      6,
  };
}

export function groupMargin(
  page: PageConfig,
  group: GroupConfig,
  config: TileBoardConfig,
  states: EntityStates,
): string {
  return (
    (resolveFieldValue(page.groupMarginCss, states, page, null) as string | undefined) ??
    (resolveFieldValue(group.groupMarginCss, states, group, null) as string | undefined) ??
    config.groupMarginCss ??
    ''
  );
}

export function pageBackground(page: PageConfig, config: TileBoardConfig, states: EntityStates): CSSProperties {
  const styles: CSSProperties = {};
  const bg = resolveFieldValue(page.bg, states, page, null);
  if (bg) {
    styles.backgroundImage = `url("${bg}")`;
  } else if (page.bgSuffix) {
    const suffix = resolveFieldValue(page.bgSuffix, states, page, null);
    styles.backgroundImage = `url("${toAbsoluteServerURL(String(suffix), config.serverUrl)}")`;
  }
  return styles;
}
```

Update `src/utils/layout.test.ts` for the new signatures:
```ts
    expect(calcGroupSize(group, {})).toEqual({ width: 3, height: 3 });
```
and
```ts
    expect(groupSizeStyles(group, { tileSize: 150, tileMargin: 6 }, {}).width).toBe('306px');
```

- [ ] **Step 5: Update the page/group consumers**

`Page.tsx` — add states and pass to `pageBackground`:
```tsx
  const states = useAppStore((s) => s.entities);
  ...
  const styles: React.CSSProperties = pageBackground(page, config, states);
```

`Group.tsx` — resolve group fields, pass states, pass real states to `isHidden`:
```tsx
import { resolveFields, isHidden } from '../utils/fields';
import { GROUP_FIELDS } from '../utils/fields';
...
function Group({ group, page }: GroupProps) {
  const config = useAppStore((s) => s.config);
  const states = useAppStore((s) => s.entities);
  const resolved = resolveFields(group, GROUP_FIELDS, states, null);
  const opts = pageOpts(page, config, states);

  const styles = {
    ...groupSizeStyles(resolved, opts, states),
    margin: groupMargin(page, resolved, config, states),
  };

  return (
    <div className="group" style={styles}>
      {resolved.title ? <div className="group-title">{String(resolved.title)}</div> : null}
      {resolved.items
        .filter((item) => !isHidden(item, states))
        .map((item, index) => (
          <Tile key={index} item={item} page={page} />
        ))}
    </div>
  );
}
```

`PagesMenu.tsx` — resolve `icon`, pass real states to `isHidden`:
```tsx
import { useAppStore } from '../store';
import { isHidden, resolveFields } from '../utils/fields';
import { PAGE_FIELDS } from '../utils/fields';
...
export default function PagesMenu() {
  const config = useAppStore((s) => s.config);
  const states = useAppStore((s) => s.entities);
  const activePage = useAppStore((s) => s.activePage);
  const openPage = useAppStore((s) => s.openPage);

  const menuPosition = config.menuPosition ?? 'left';
  const visibleCount = config.pages.filter((page) => !isHidden(page, states)).length;
  if (visibleCount <= 1) return null;
  ...
        {config.pages.map((p, index) => {
          const page = resolveFields(p, PAGE_FIELDS, states, null);
          return isHidden(page, states) ? null : (
            <div
              key={index}
              className={'pages-menu--item' + (index === activePage ? ' -active' : '')}
              onClick={() => openPage(index)}
            >
              <i className={'mdi ' + ((page.icon as string | undefined) ?? '')} />
            </div>
          );
        })}
```

`Tile.tsx` — pass states to `pageOpts` (line 73):
```tsx
  const base = itemPositionStyles(resolved, pageOpts(page, config, entities));
```

`DeviceTrackerTile.tsx` — resolve page tileSize with states:
```tsx
import { useAppStore } from '../../store';
import { resolveFieldValue } from '../../utils/fields';
...
  const config = useAppStore((s) => s.config);
  const states = useAppStore((s) => s.entities);
  ...
  const tileSize =
    (resolveFieldValue(page.tileSize, states, page, null) as number | undefined) ??
    config.tileSize ??
    100;
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm run test -- src/components/Pages.test.tsx src/utils/layout.test.ts`
Expected: PASS.

- [ ] **Step 7: Run typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/config/types.ts src/utils/layout.ts src/utils/layout.test.ts src/components/Page.tsx src/components/Group.tsx src/components/PagesMenu.tsx src/components/Tile.tsx src/components/tiles/DeviceTrackerTile.tsx src/components/Pages.test.tsx
git commit -m "Resolve page and group function settings"
```

---

### Task 6: Resolve header and header-item fields

**Files:**
- Modify: `src/config/types.ts` (HeaderConfig, HeaderItemConfig widening)
- Modify: `src/components/Header.tsx`
- Modify: `src/components/HeaderItem.tsx`
- Test: `src/components/Header.test.tsx` (regression only)

**Interfaces:**
- Consumes: `resolveFields`, `HEADER_ITEM_FIELDS` (Task 1).
- Produces: resolved `HeaderConfig`/`HeaderItemConfig` used directly in JSX.

- [ ] **Step 1: Widen `src/config/types.ts`**

`HeaderConfig`:
```ts
  styles?: Field<CSSProperties>;
```

`HeaderItemConfig`:
```ts
  format?: Field<string>;
  dateFormat?: Field<string>;
  styles?: Field<CSSProperties>;
  html?: Field<string>;
```

- [ ] **Step 2: Resolve in `src/components/Header.tsx`**

```tsx
import { memo } from 'react';
import type React from 'react';
import type { HeaderConfig } from '../config/types';
import { useAppStore } from '../store';
import { resolveFields } from '../utils/fields';
import HeaderItem from './HeaderItem';

function Header({ header }: { header?: HeaderConfig }) {
  const states = useAppStore((s) => s.entities);
  const resolved = header ? resolveFields(header, ['styles'], states, null) : header;
  if (!resolved) return null;
  return (
    <div className="header">
      <div className="header-content" style={resolved.styles as React.CSSProperties}>
        <div className="header--left">
          {(resolved.left ?? []).map((item, index) => (
            <HeaderItem key={index} item={item} />
          ))}
        </div>
        <div className="header--right">
          {(resolved.right ?? []).map((item, index) => (
            <HeaderItem key={index} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default memo(Header);
```

- [ ] **Step 3: Resolve in `src/components/HeaderItem.tsx`**

Replace the `HeaderItem` body:

```tsx
import { useAppStore } from '../store';
import { isHidden, resolveFields } from '../utils/fields';
import { HEADER_ITEM_FIELDS } from '../utils/fields';

function HeaderItem({ item, slideBg }: { item: HeaderItemConfig; slideBg?: string }) {
  const states = useAppStore((s) => s.entities);
  const resolved = resolveFields(item, HEADER_ITEM_FIELDS, states, null);
  if (isHidden(resolved, states)) return null;

  return (
    <div className={'header-item -' + resolved.type} style={resolved.styles as React.CSSProperties}>
      {resolved.type === 'time' && <Clock />}
      {resolved.type === 'date' && (
        <DateDisplay format={(resolved.format as string | undefined) ?? 'EEEE, LLLL dd'} />
      )}
      {resolved.type === 'datetime' && (
        <>
          <Clock />
          <DateDisplay format={(resolved.dateFormat as string | undefined) ?? 'EEEE, LLLL dd'} />
        </>
      )}
      {resolved.type === 'custom_html' && (
        <div dangerouslySetInnerHTML={{ __html: (resolved.html as string | undefined) ?? '' }} />
      )}
      {resolved.type === 'weather' && <HeaderWeather item={item} />}
      {resolved.type === 'photo_date' && <PhotoDate bg={slideBg} format={resolved.format as string | undefined} />}
    </div>
  );
}
```

`HeaderWeather` keeps using the raw `item` — weather `fields`/`icons`/`iconImage` are resolved by `weather.ts` with their own context.

- [ ] **Step 4: Run tests + typecheck**

Run: `npm run test -- src/components/Header.test.tsx` and `npm run typecheck`
Expected: PASS, no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/config/types.ts src/components/Header.tsx src/components/HeaderItem.tsx
git commit -m "Resolve header and header item function settings"
```

---

### Task 7: Resolve screensaver fields

**Files:**
- Modify: `src/config/types.ts` (ScreensaverConfig, SlideConfig widening)
- Modify: `src/components/Screensaver.tsx`
- Test: `src/components/Screensaver.test.tsx` (regression only)

**Interfaces:**
- Consumes: `resolveFields`, `resolveFieldValue`, `SCREENSAVER_FIELDS` (Task 1).
- Produces: a resolved `conf` (stable via `useMemo` keyed on raw config + states) and a resolved `slides` array.

- [ ] **Step 1: Widen `src/config/types.ts`**

`ScreensaverConfig`:
```ts
  timeout: Field<number>;
  slidesTimeout?: Field<number>;
  slideCacheBust?: Field<number>;
  styles?: Field<CSSProperties>;
```

`SlideConfig`:
```ts
  bg: Field<string>;
  styles?: Field<CSSProperties>;
```

- [ ] **Step 2: Resolve in `src/components/Screensaver.tsx`**

Change the react import to include `useMemo`, add the fields/type imports:
```ts
import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useAppStore } from '../store';
import { resolveFieldValue, resolveFields } from '../utils/fields';
import { SCREENSAVER_FIELDS } from '../utils/fields';
import HeaderItem from './HeaderItem';
```

Replace the component's config/slides derivation (after the `useState`):

```tsx
  const rawConf = useAppStore((s) => s.config.screensaver);
  const states = useAppStore((s) => s.entities);
  const shown = useAppStore((s) => s.screensaverShown);
  const setScreensaverShown = useAppStore((s) => s.setScreensaverShown);
  const [activeSlide, setActiveSlide] = useState(0);

  const conf = useMemo(
    () => (rawConf ? resolveFields(rawConf, SCREENSAVER_FIELDS, states, null) : rawConf),
    [rawConf, states],
  );
  const slides = useMemo(
    () =>
      (conf?.slides ?? []).map((s) => ({
        ...s,
        bg: resolveFieldValue(s.bg, states, s, null) as string,
        styles: resolveFieldValue(s.styles, states, s, null) as CSSProperties | undefined,
      })),
    [conf, states],
  );
```

Update the three `useEffect` dep arrays from `conf` to `conf?.timeout`/`conf?.slidesTimeout` so the resolved object identity doesn't reset timers on every unrelated store change:
- effect 1 (listeners): `}, [conf?.timeout, setScreensaverShown]);`
- effect 2 (inactivity interval): `}, [conf?.timeout, setScreensaverShown, shown]);`
- effect 3 (slide interval): `}, [conf?.timeout, conf?.slidesTimeout, shown]);`

Cast the numeric reads (lines ~52, ~63, ~70) and the styles:
```tsx
      setScreensaverShown(conf.timeout < inactivity / 1000);   // timeout now a plain number at runtime
```
(keep `conf?.timeout` guards as-is; they are truthiness checks). Replace the rest of the render body to use `slides` instead of `conf.slides` and cast style usages:
```tsx
  const cacheBust = conf?.slideCacheBust as number | undefined;
  const slideBgUrl = (bg: string) => slideBg(bg, cacheBust);
  const activeBg = slides.length ? slideBgUrl(slides[activeSlide]?.bg ?? '') : undefined;

  return (
    <div className="screensaver" style={conf.styles as CSSProperties | undefined} onClick={() => setScreensaverShown(false)}>
      <div className="screensaver-slides">
        {slides.map((slide, index) => {
```
Replace `conf.slides` with `slides` inside the map and keep the `slide.rightBottom`/`rightTop`/`leftBottom`/`leftTop` corner slots as-is (they render `<HeaderItem>`, which resolves its own fields in Task 6). The `slide.bg`/`slide.styles` reads inside the map now hit the resolved slide.

- [ ] **Step 3: Run tests + typecheck**

Run: `npm run test -- src/components/Screensaver.test.tsx src/components/Header.test.tsx` and `npm run typecheck`
Expected: PASS, no type errors.

- [ ] **Step 4: Commit**

```bash
git add src/config/types.ts src/components/Screensaver.tsx
git commit -m "Resolve screensaver function settings"
```

---

### Task 8: Type the runtime-magic fields and run full verification

**Files:**
- Modify: `src/config/types.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: typed `actionPlus`/`actionMinus` (dimmer) and weather_list header titles — already function-capable at runtime, now documented in `TileConfig`.

- [ ] **Step 1: Add the fields to `TileConfig`**

```ts
  actionPlus?: ConfigFunction;
  actionMinus?: ConfigFunction;
  dateTitle?: Field<string>;
  iconTitle?: Field<string>;
  primaryTitle?: Field<string>;
  secondaryTitle?: Field<string>;
```

- [ ] **Step 2: Run full verification**

Run: `npm run lint && npm run typecheck && npm run test && npm run build`
Expected: all four pass.

- [ ] **Step 3: Commit**

```bash
git add src/config/types.ts
git commit -m "Type dimmer and weather list runtime config functions"
```

---

## Self-Review

**Spec coverage:**
- §1 core resolver → Task 1 ✓ (`resolveFieldValue`, `resolveFields`, `resolveTile`, key lists).
- §2 type widening → Tasks 2, 5, 6, 7 (tile/slider/history, page/group, header, screensaver/slide) + Task 8 (dimmer/weather_list magic). ✓
- §3 resolution points → Task 3 (Tile.tsx + CameraPopup), Task 4 (getSliderConf/getLightSliderConf), Task 5 (page/group via layout helpers + PagesMenu + Group + DeviceTracker — noted deviation: resolved at consumers, not a Pages pre-pass, to preserve `config.pages.indexOf(page)` identity), Task 6 (Header/HeaderItem), Task 7 (Screensaver). ✓
- §4 consistency fixes → dead `Page bg`/`bgSuffix` fixed in Task 5 `pageBackground`; `bgOpacity` raw casts covered by Task 3 `resolveTile`; `hidden` gets real states in Tasks 5-6. `filter`/`loading`/`controlsEnabled` intentionally untouched. ✓
- §5 testing → resolver units (Task 1), Tile function icon (Task 3), slider fields (Task 4), page bg + group title (Task 5), regression runs on Header/Screensaver (Tasks 6-7), full suite (Task 8). ✓
- Schema: untouched (permissive), no edits. ✓

**Placeholder scan:** No TBD/TODO. Every step has concrete code and a runnable test command. The one deliberate omission — no new Screensaver/Header-specific tests — is covered by the resolver unit tests (Task 1) plus the existing component suites as regression.

**Type consistency:**
- `resolveFields<T extends object>(obj, keys: readonly (keyof T)[], states, entity?)` — used identically in Tasks 1, 4, 5, 6, 7; the `as const` key lists are subsets of the widened `keyof` types after their widening task lands (Task 4 uses `SLIDER_FIELDS` after Task 2; Tasks 5-7 widen their own types in the same task).
- `resolveFieldValue(value, states, item?, entity?)` — consistent across Tasks 1, 5, 7.
- `getSliderConf`/`getLightSliderConf` gain `states` as the third param in Task 4 and all callers (SliderTile, LightTile, sliders.test) pass it.
- `pageOpts`/`groupMargin`/`pageBackground`/`calcGroupSize`/`groupSizeStyles` gain `states` in Task 5; all callers (Page, Group, Tile, layout.test) updated in the same task.
- `SliderRuntime` redeclared `min/max/step/value: number` remains a valid narrowing of the widened `Field<number>` base.
- Screensaver effects key on `conf?.timeout`/`conf?.slidesTimeout` primitives so the `useMemo`-resolved `conf` identity does not reset timers.