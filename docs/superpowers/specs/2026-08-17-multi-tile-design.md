# Multi Tile

Date: 2026-08-17

## Goal

Add a `multi` tile type: a container tile that shows exactly one of its child
tiles at a time, with optional auto-rotation. This generalizes the previous
`setUiState` workaround, where tiles were shown/hidden individually via
`hidden: function() { return this.uiState('k') !== 'v'; }`, into a single
container that owns visibility of its children.

## Config

- Add `'multi'` to `TileType` in `src/config/types.ts` and to `TILE_TYPES` in
  `src/config/schema.ts`.
- New `TileConfig` fields:
  - `items?: TileConfig[]` — the child tiles (any existing tile type).
  - `autorotate?: Field<number>` — milliseconds between auto-advances; `-1` or
    absent = off (default `-1`). Added to `TILE_FIELDS` in `src/utils/fields.ts`
    so it can be a config function.
  - `key?: string` on child tiles — identifier for targeting. Defaults to
    `String(index)`.
- No strict schema validation beyond the type enum; the schema already passes
  the raw config through and does not validate `items`, `key`, etc. (consistent
  with existing tiles).

## State API (the generic switch function)

Reuses the existing `setUiState`/`uiState` context methods. Convention key =
`multi:<tileId>`.

Value semantics:

- `undefined` / absent → first visible child.
- `number n` → step n children (positive forward, negative backward), skipping
  hidden children, wrapping around. `0` = no change.
- `string s` → show the child whose `key === s`.

`MultiTile` normalizes the value and writes the active child's key back to the
store, so `this.uiState('multi:<tileId>')` always reads as the currently shown
child's key.

Examples:

- `this.setUiState('multi:main', 1)` → next
- `this.setUiState('multi:main', -1)` → previous
- `this.setUiState('multi:main', 'cameras')` → jump to key

## Component (`src/components/tiles/MultiTile.tsx`, new)

- Wrapper `div.item.-multi` positioned/sized via `itemPositionStyles(item,
  pageOpts)` — identical to any tile in the group grid.
- Resolves the parent's `width`/`height` via `resolveTile` (`TILE_FIELDS`) as
  the default size for children.
- Active child rendered via the existing `<Tile item={clone} page={page} />`,
  where `clone = { ...child, position: [0, 0], width: child.width ??
  parentWidth, height: child.height ?? parentHeight }`. Child position is
  ignored; size is inherited from the parent unless the child overrides it.
  Only the active child mounts.
- Subscribes to `uiState` (re-renders on switch) and entities (re-evaluates
  children's visibility).
- Visibility check is a local helper (not `getItemEntity`) to avoid
  "entity not found" warnings for skipped children: a child is selectable if
  `!isHidden(child, entities)` and it has a resolvable entity (object-id
  children always count; string-id children need the entity present).
- Step/rotation count only among visible children and wrap around. If the
  currently stored active child is not visible (hidden or missing entity),
  a step counts from the first visible child. When rendering nothing (active
  child hidden), no normalized write-back happens — the stored key is left
  pointing at the hidden child.
- Active child becomes hidden at runtime → render nothing (no auto-advance).
- All children hidden → render nothing.

## `src/components/Tile.tsx`

- Guard `getItemEntity` to skip for `multi` (`const entity = item.type ===
  'multi' ? null : getItemEntity(item, entities)`).
- After all hooks, `if (item.type === 'multi') return <MultiTile ... />;`. All
  existing hooks still run for every tile, so there are no conditional-hook
  issues and `Group` stays untouched.

## Styles (`styles/main.less` + `styles/main.css`)

- `.item.-multi { background-color: transparent; }` so an overridden-smaller
  child doesn't show a grey box around it.

## autorotate

- `autorotate >= 0`: interval calls `setUiState('multi:<id>', 1)` every
  `autorotate` ms. Interval is recreated whenever the active child changes, so
  any manual switch resets the countdown.
- `-1` / absent → no rotation.

## Docs

- Add a `multi` tile example with `items` and `autorotate` to
  `TILE_EXAMPLES.md` (and the example configs if applicable).

## Tests

- `src/config/schema.test.ts`: `multi` type accepted.
- New `src/components/tiles/MultiTile.test.tsx`:
  - renders the active child
  - child position is ignored
  - size inherited from parent
  - size overridden by child
  - step +1 / −1 with wrap
  - target by key
  - autorotate advances
  - skips hidden children
  - hides when the active child becomes hidden
  - renders nothing when all children are hidden

## Out of scope

- Per-child independent timing, pause-on-hover, or manual swipe gestures.
- Persistence of the active child across page reloads.
- Title/background on the `multi` wrapper itself (children render their own).