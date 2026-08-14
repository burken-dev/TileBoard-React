# PERF-01: Re-render reduction (core)

Target hardware: Raspberry Pi / old tablets (weak CPU). The app connects to Home
Assistant via websocket and re-renders the ENTIRE tile tree on every entity state
change. This spec fixes that.

## Problem (from audit)

- `src/ha/connection.ts:34-37` calls `setEntities(Object.values(states))` once per
  incoming `subscribe_entities` message (i.e. per HA state_changed batch, no
  throttling). A busy home emits several changes/sec.
- `src/store/index.ts:197-206` `setEntities` rebuilds the whole `entities` map
  (`Object.fromEntries`) on every call → new map object identity every update.
- 29 components subscribe with `useAppStore((s) => s.entities)` (see list below).
  Zustand v5 re-renders a subscriber whenever the selected value changes
  reference → **every entity change re-renders every tile on every page**, and
  each render re-runs regex parsing (`utils/fields.ts:42 parseString`,
  `utils/entity.ts:60,74,103`) for every tile.
- No `React.memo` anywhere → even un-subscribed parents cascade renders.

## Fix

### 1. Batch entity updates per animation frame (`src/ha/connection.ts`)

Coalesce the `subscribeEntities` callbacks so all messages arriving within one
frame produce a single `setEntities` call. Module-scope pending buffer:

```ts
let pendingStates: EntityStates | null = null;
let flushScheduled = false;

function flushEntities(): void {
  flushScheduled = false;
  if (!pendingStates) return;
  const states = pendingStates;
  pendingStates = null;
  getAppStore().setEntities(Object.values(states));
}

function scheduleFlush(): void {
  if (flushScheduled || !pendingStates) return;
  flushScheduled = true;
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(flushEntities);
  } else {
    // jsdom / tests
    setTimeout(flushEntities, 0);
  }
}
```

In the `subscribeEntities` callback replace the direct call with:

```ts
subscribeEntities(connection, (states) => {
  pendingStates = states;          // keep LATEST full snapshot
  scheduleFlush();
  if (config.debug) console.log('entities updated', states);
});
```

Import `EntityStates` type from `../config/types`. Keep all other connection
behavior unchanged (ping interval, events, reconnect handling).

### 2. Add per-entity selector hooks (`src/store/index.ts`)

Append two exports at the bottom of the file:

```ts
/** Subscribe to a single entity's object; re-renders only when THAT entity changes. */
export function useEntity(item: TileConfig): HaEntity | null {
  return useAppStore((s) => {
    if (typeof item.id === 'object') return item.id as HaEntity;
    return s.entities[item.id] ?? null;
  });
}

/**
 * Subscribe to the entities map but only re-render when one of `ids` changed
 * reference. Returns the full map (so &cross_entity.attr references still
 * resolve) but the component is skipped when unrelated entities update.
 */
export function useEntities(ids: string[]): EntityStates {
  return useAppStore(
    (s) => s.entities,
    (prev, next) => {
      if (prev === next) return true;
      for (const id of ids) {
        if (prev[id] !== next[id]) return false;
      }
      return true;
    },
  );
}
```

`EntityStates` and `TileConfig` are already imported in this file.

### 3. Convert subscriptions (files to edit)

Rules:
- `isHidden(obj, _states, entity)` (`utils/fields.ts:69`) **ignores** `states` →
  callers that used it only for `isHidden` can drop the entities subscription.
- Components whose data derives from ONE entity: use `useEntity(item)` / the
  per-entity selector.
- Components whose config fields can reference other entities (`&entity_id.attr`)
  or that read several entities: use `useEntities([String(item.id), ...extraIds])`
  — pass `item.id` plus any explicit other-entity ids the tile reads from config.
  `useEntities` keeps working with the existing `states` variable (it returns the
  full map) so the rest of the component code is unchanged.

Files and their changes:

| File | Change |
|------|--------|
| `src/components/Tile.tsx` | `const entities = useAppStore((s) => s.entities)` → `const entities = useEntities([String(item.id)])`. Keep `const entity = getItemEntity(item, entities)`. Note: config fields on `item` that reference OTHER entities will now only update when the tile's own entity changes — acceptable, documented trade-off. |
| `src/components/Group.tsx` | Remove the `entities` subscription entirely (`isHidden` ignores states). Call `isHidden(item, {} as never)`. |
| `src/components/PagesMenu.tsx` | Remove the entities subscription (check it is only used for `isHidden`). If used elsewhere, use `useEntities` with the menu's entity ids. |
| `src/components/HeaderItem.tsx` | Header items are small. Use `useEntities([String(item.id)])` when `item.id` exists; for weather items (multi-entity) keep the full map but via `useEntities([])` (re-renders only when… nothing → not acceptable) — instead weather headers keep `useAppStore((s) => s.entities)`. Only convert time/date/custom/entity-backed items; leave weather as-is. |
| `src/components/tiles/SensorTile.tsx` | `useAppStore((s) => s.entities)` → `useEntities([String(item.id)])` |
| `src/components/tiles/IconTile.tsx` | same |
| `src/components/tiles/ImageTile.tsx` | same |
| `src/components/tiles/InputNumberTile.tsx` | same |
| `src/components/tiles/InputSelectTile.tsx` | same |
| `src/components/tiles/InputDatetimeTile.tsx` | same |
| `src/components/tiles/SliderTile.tsx` | same |
| `src/components/tiles/DimmerTile.tsx` | same |
| `src/components/tiles/FanTile.tsx` | same |
| `src/components/tiles/CoverTile.tsx` | same |
| `src/components/tiles/LightTile.tsx` | same |
| `src/components/tiles/DeviceTrackerTile.tsx` | same (it takes a `page` prop for device map; verify the `states` usage is only own-entity + `&` refs; if it reads `page.entities` config, add those ids) |
| `src/components/tiles/CustomTile.tsx` | custom tiles call user functions with `[item, entity]`; use `useEntities([String(item.id)])` |
| `src/components/tiles/GaugeTile.tsx` | gauge `settings` fields can cross-ref → `useEntities([String(item.id)])` and add any ids referenced in `item.settings` strings if easy to detect; otherwise `[String(item.id)]` is acceptable. |
| `src/components/tiles/WeatherTile.tsx` | weather reads a weather entity + possibly a `temp`/`humidity` id. Use `useEntities([String(item.id)])`; if the tile config references other entity ids explicitly, add them. Do NOT break existing behavior. |
| `src/components/tiles/WeatherListTile.tsx` | similar |
| `src/components/tiles/TextListTile.tsx` | similar |
| `src/components/tiles/ClimateTile.tsx` | climate may reference sensors; use `useEntities([String(item.id)])` plus any explicit ids in config. |
| `src/components/tiles/MediaPlayerTile.tsx` | may reference related entities; use `useEntities([String(item.id)])` plus explicit ids. |
| `src/components/tiles/TileBody.tsx` | no subscription; no change needed (verify). |

### 4. Add `React.memo`

Wrap in `memo(...)` (import `{ memo } from 'react'`):
- `Tile` (`src/components/Tile.tsx`) — **essential**: stops Group/Page re-renders
  cascading to every tile. `Tile` props `{ item, page }` are stable references.
- `Group` (`src/components/Group.tsx`) — props `{ group, page }` stable.
- `Header` (`src/components/Header.tsx`) — props `{ header }` stable.
- `HeaderItem` (`src/components/HeaderItem.tsx`) — props `{ item }` stable.
- Each tile body component in `src/components/tiles/*.tsx` (they take
  `{ item, entity, ... }`; `entity` reference changes only when that entity
  updates, so memo is safe and blocks cascades).

Do NOT memo `Pages`/`Page` (owned by PERF-04) and do NOT memo popups.

## Do NOT touch

- `src/components/Pages.tsx`, `src/components/Page.tsx` (PERF-04)
- `src/components/cameras/*` (PERF-02)
- `src/App.tsx`, `src/components/popups/HistoryPopup.tsx`, `src/styles/themes.less` (PERF-03)
- `src/hooks/usePanGesture.ts`, `src/components/Screensaver.tsx`, `src/components/Clock.tsx` (PERF-04)
- Do not change config schema, tile behavior, or public API.

## Verification (MUST run)

```
npm run typecheck
npm run lint
npm test
npm run build
```

Existing tests must still pass. If a test depends on exact render timing of entity
updates, adapt it only if the new behavior is strictly correct (batching is
same-frame, so should be transparent).

## Outcome

- A busy HA instance updating N times/sec now causes at most one render per
  frame, and only tiles whose own entity changed re-render.
- Unrelated tiles skip render entirely (per-entity selector + memo).