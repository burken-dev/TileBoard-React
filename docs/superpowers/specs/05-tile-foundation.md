# Step 05: Tile Foundation — Shell, Field Resolver, Entity Helpers, Actions Plumbing

**Goal:** Build everything every tile type depends on: the `&`/`@` field resolver,
entity display helpers, tile classes, the Tile component shell (background, slides,
title/subtitle/state, click + long-press), custom action dispatch, and loading state.

**Legacy reference:** `git show LEGACY_REF:scripts/controllers/main.js` —
`getItemEntity`, `entityTitle/Subtitle/State/Value/Unit/Icon`, `itemField`,
`getItemFieldValue`, `parseFieldValue`, `parseString`, `getEntityAttr`, `escapeClass`,
`itemClasses`, `isHidden`, `itemStyles` (customStyles part), `itemBgStyles`,
`slidesStyles`, `slideStyles`, `entityClick`, `entityLongPress`, `callFunction`,
`apiRequest`, `sendItemData`, `warnUnknownItem`;
`git show LEGACY_REF:index.html` (tile.html template).

**Files:**
- Create: `src/utils/fields.ts`, `src/utils/entity.ts`, `src/tiles/actions.ts`,
  `src/hooks/useLongPress.ts`, `src/components/tiles/TileBody.tsx`
- Test: `src/utils/fields.test.ts`, `src/utils/entity.test.ts`,
  `src/components/Tile.test.tsx`
- Modify: `src/components/Tile.tsx` (full shell), `src/store/index.ts` (loading slice),
  `src/utils/functions.ts` (real parseFieldValue in context), `src/components/Pages.tsx`
  (import shared `isHidden`), `src/components/Group.tsx` (same)

## Interfaces produced

### src/utils/fields.ts (pure; `states` passed explicitly everywhere)

```ts
export function parseFieldValue(value: unknown, states: EntityStates, item?: TileConfig, entity?: HaEntity | null): unknown;
// falsy -> null; function -> callFunction(value, [item, entity]); string -> parseString; else value

export function parseString(value: string, states: EntityStates, entity?: HaEntity | null): string;
// regex /([&@][\w\d._]+)/gi on value:
//   '@attr.path'      -> attribute path on `entity`
//   '&domain.name.rest' (>= 3 segments) -> states['domain.name'] then attribute path 'rest'
//   '&' refs with fewer than 3 segments stay literal
//   resolved undefined -> '' if the reference was the entire string, else keep literal text
//   resolved null -> ''

export function getItemFieldValue(field: string, states: EntityStates, item: TileConfig, entity?: HaEntity | null): unknown;
// walk dotted path on item (e.g. 'history.styles'), then parseFieldValue the result

export function isHidden(obj: { hidden?: Field<boolean> } | undefined, states: EntityStates, entity?: HaEntity | null): boolean;
// no hidden -> false; function -> callFunction truthiness; else Boolean(value)
```

Replace the temporary `parseFieldValue` in `getContext()` (step 03) with this one.

### src/utils/entity.ts (pure display helpers)

```ts
export function getItemEntity(item: TileConfig, entities: EntityStates): HaEntity | null;
// typeof item.id === 'object' -> item.id as HaEntity; string -> entities[id] ?? null
// unknown string id -> deduplicated console.warn (module-level Set), return null

export function entityTitle(item, entity, states): string | null;    // item.title absent -> entity.attributes.friendly_name; else getItemFieldValue('title')
export function entitySubtitle(item, entity, states): string | null; // getItemFieldValue('subtitle')
export function entityState(item, entity, states): string | null;
// item.state === false -> null
// item.state string -> parseString; function -> callFunction; other literal -> itself
// else item.states: function -> callFunction; object -> states[entity.state] ?? entity.state
// else entity.state
export function entityValue(item, entity, states): unknown;
// base = entity.state; item.value -> getItemFieldValue('value'); then item.filter?.call(ctx, value, item, entity)
export function entityUnit(item, entity, states): string | null;
// no 'unit' in item -> attributes.unit_of_measurement; else getItemFieldValue('unit')
export function entityIcon(item, entity, states): string | null;
// state = parseFieldValue(entity.state); if falsy and item.state -> parseFieldValue(item.state)
// if item.icon -> parseFieldValue(item.icon) (overrides)
// if no item.icons -> return state
// icons function -> callFunction; else icons[state] ?? null
export function listField(field: string, line: Record<string, Field<unknown>>, item, states): unknown;
// parseFieldValue(line[field]); then item.filter?.call(ctx, value, field, item) if function
```

All helpers take `(item: TileConfig, entity: HaEntity | null, states: EntityStates)`
— exact parameter order: item, entity, states.

### src/tiles/actions.ts

```ts
export function entityClick(item: TileConfig, entity: HaEntity | null): void;
export function entityLongPress(item: TileConfig, entity: HaEntity | null): void;
export function withLoading(item: TileConfig, fn: () => Promise<unknown>): void;
```

`entityClick`:
1. `item.action` → `callFunction(item.action, [item, entity])` and return.
2. `switch (item.type)` dispatch to handlers added by later specs. Step 05 creates the
   switch with no cases yet; specs 06–09 add cases:
   - 06: switch, light, fan, input_boolean, lock, cover_toggle, vacuum, automation,
     script, scene
   - 07: input_select, input_datetime
   - 08: camera, camera_thumbnail, camera_stream, media_player (none — media player
     uses inline buttons; no default click)
   - 09: door_entry, alarm, popup_iframe
3. No handler → do nothing.

`entityLongPress`:
1. `item.secondaryAction` → callFunction and return.
2. Type dispatch added later: 07 (light → open sliders), 09 (history popup default).

`withLoading(item, fn)`: if store `isLoading(item)` return; mark loading, await fn,
unmark. Store slice:

```ts
// store additions
loadingItems: Set<TileConfig>;
isLoading(item: TileConfig): boolean;
setLoading(item: TileConfig, loading: boolean): void;   // replaces the Set (new identity)
```

Tile reads `isLoading(item)` and appends `-loading` class (replaces legacy
`item.loading` mutation).

### src/hooks/useLongPress.ts

```ts
export function useLongPress(onLongPress: () => void, onClick: () => void, ms = 600): {
  onPointerDown(e: React.PointerEvent): void;
  onPointerUp(e: React.PointerEvent): void;
  onPointerLeave(e: React.PointerEvent): void;
};
```

Pointer down starts a `ms` timer (legacy hammer press: 600 ms); pointer up before the
timer → `onClick()`; timer firing → `onLongPress()` and suppress the subsequent click.
Pointer leave cancels. Movement > 10 px cancels both (avoids firing during pan).

### src/components/Tile.tsx (full shell)

Props: `{ item: TileConfig; page: PageConfig }`.

Render (legacy tile.html order):
1. Resolve `entity = getItemEntity(item, entities)`; if `!entity` or `isHidden(item)` →
   render nothing.
2. Outer div: class `item` + `itemClasses`; style = `itemPositionStyles(item, pageOpts)`
   merged with `customStyles` (object, or callFunction result, or undefined).
3. Gesture handlers via `useLongPress(() => entityLongPress(item, entity), () => entityClick(item, entity))`.
4. `<div className="item-clickable" />`
5. If `item.bg || item.bgSuffix`: `<div className="item-background">` with
   `backgroundImage: url(...)` (bgSuffix via toAbsoluteServerURL) and
   `opacity: parseFieldValue(item.bgOpacity)` when set.
6. Title/subtitle/state divs (`item-title`, `item-subtitle`, `item-state`) when their
   helper returns non-empty.
7. Slides: if `item.slides?.length`: `item-slides-container` → `item-slides -c{n}` with
   `animationDelay: (item.slidesDelay ?? index*0.8) + 's'` and bgOpacity, → per slide
   `item-slide` with `backgroundImage` from `slide.bg` (parseFieldValue).
8. Per-type content: `<TileBody item={item} entity={entity} />`.

`itemClasses(item, entity, loading, selectOpened)` — put in Tile.tsx or utils/entity.ts:
`['-'+item.type, '-'+escapeClass(entity.state), '-th-'+(item.theme ?? item.type),
...(item.classes ?? []), loading ? '-loading' : '', selectOpened ? '-top-entity' : '']`
(filter empties). `selectOpened` comes from the store slice added in step 07; until then
pass false.

### src/components/tiles/TileBody.tsx

```tsx
export function TileBody({ item, entity }: { item: TileConfig; entity: HaEntity }): JSX.Element | null;
```

Step 05: `switch (item.type)` returning `null` for every type. Specs 06–09 fill cases
by importing per-family components from `src/components/tiles/*`.

- [ ] **Step 1: Write failing tests**

`src/utils/fields.test.ts` (states fixture `{ 'sensor.k': { entity_id:'sensor.k', state:'21', attributes:{ unit_of_measurement:'°C' } } }`):
- `parseString('&sensor.k.state', states)` → `'21'`;
  `'&sensor.k.attributes.unit_of_measurement'` → `'°C'`;
  `'a & b'` (2 segments) stays literal; `'&missing.x.state'` → `''`;
  `'x@attributes.unit_of_measurement'` with entity → `'x°C'`;
  full-string ref missing → `''`, embedded ref missing → literal kept.
- `parseFieldValue(fn)` called with `(item, entity)` and context `this.states`.

`src/utils/entity.test.ts`:
- `entityTitle` falls back to `friendly_name`; `entityState` with states map, function,
  and `state: false` → null; `entityIcon` with icons map + item.icon override;
  `entityValue` applies filter; `entityUnit` fallback; `getItemEntity` synthetic object id.

`src/components/Tile.test.tsx` (mocked store):
- renders `.item-title`/`.item-state` text, classes `-switch`, `-th-switch`, state class.
- click calls `item.action` function; long-press (fake timers, 600 ms) calls
  `item.secondaryAction`.
- hidden tile renders nothing.

- [ ] **Step 2: Run tests — expect failures.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run tests — expect pass.**
- [ ] **Step 5: Manual check** with example config: tiles show titles/states/icons
  backgrounds per config; click with an `action` function works; unknown entity ids log
  one warning each.
- [ ] **Step 6: Verify** — all four npm scripts green.
- [ ] **Step 7: Commit** — `git commit -m "step 05: tile foundation, field resolver, actions plumbing"`

**Acceptance criteria:** Every later tile spec only adds a TileBody case and (optionally)
an actions.ts case — no changes to the shell. Field resolution matches legacy semantics
(tests lock it).

**Out of scope:** any specific tile type rendering, popups, select overlay,
history (later specs).
