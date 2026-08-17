# Multi-Tile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `multi` tile type — a container tile that shows one child tile at a time, switchable via the existing `setUiState` context method, with optional `autorotate`. This generalizes the current `setUiState`-based show/hide workaround for tile "panels".

**Architecture:** A new `MultiTile` component renders a `.item.-multi` wrapper (positioned by the parent's own `position`/`width`/`height`) containing a single child `<Tile>` mounted at `[0,0]` with the parent's size. Switching state lives in the existing `uiState` store under the convention key `multi:<tileId>`:

- `undefined` → show first visible child (and write its key back, normalizing the store).
- `number n` → step `n` children (skip hidden, wrap around; `0` = no change).
- `string s` → show the child whose `key === s`; if that child is not visible, show nothing.

`MultiTile` normalizes state by writing the active child's key back into `uiState`, so `this.uiState('multi:<tileId>')` always reads the currently shown child's key. `autorotate` (ms interval) calls `setUiState(uiKey, 1)` on a timer that resets whenever the active child changes. `Tile.tsx` short-circuits multi items to `MultiTile` before the entity checks (children can be any tile type, including nested `multi`). Position in a child is ignored; width/height inherit from the parent unless the child overrides them.

**Tech Stack:** React 19, Zustand, Less (via Vite), Vitest + Testing Library.

## Global Constraints

- Config is backwards-compatible: `multi` is a new tile `type`; new optional keys `items`, `autorotate` (tile), `key` (child) on `TileConfig`. No changes to existing tile behavior.
- No strict schema validation for the new fields — the zod schema already passes raw config through (only `type`/`id`/`position` are checked on group items). Children are plain `TileConfig` objects; their `position` is required by the type but ignored at runtime.
- `styles/main.less` is the source of truth (Vite compiles it); `styles/main.css` is a stale artifact — do not edit it.
- All hooks run before any conditional return in `Tile.tsx` (rules of hooks).
- Commit messages: imperative present tense. Branch: `feature/multi-tile` (already created; design doc committed as `3f5e7d6`, `9a91bad`).
- Design spec: `docs/superpowers/specs/2026-08-17-multi-tile-design.md`

---

### Task 1: Config plumbing — type, schema enum, field list

**Files:**
- Modify: `src/config/types.ts` (`TileType`, `TileConfig`)
- Modify: `src/config/schema.ts` (`TILE_TYPES`)
- Modify: `src/utils/fields.ts` (`TILE_FIELDS`)
- Test: `src/config/schema.test.ts`
- Test: `src/utils/fields.test.ts`

**Interfaces:**
- Produces: `'multi'` added to `TileType` and `TILE_TYPES`; `TileConfig.items?: TileConfig[]`, `TileConfig.autorotate?: Field<number>`, and `TileConfig.key?: string`; `'autorotate'` added to `TILE_FIELDS` so it can be a function/entity-ref and is resolved by `resolveTile`. Tasks 2–3 read `resolved.items` and `resolved.autorotate` after that resolution.

- [ ] **Step 1: Write the failing tests**

Append this test at the end of `src/config/schema.test.ts`:

```ts
it('accepts a multi tile with items and autorotate', () => {
  const config = {
    ...minimalValidConfig,
    pages: [
      {
        groups: [
          {
            items: [
              {
                type: 'multi' as const,
                id: 'main',
                position: [0, 0],
                autorotate: 5000,
                items: [
                  { type: 'switch' as const, id: 'switch.test', position: [0, 0], key: 'a' },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
  const result = validateConfig(config);
  expect(result.ok).toBe(true);
});
```

Add `TileConfig` to the type imports and append this describe block at the end of `src/utils/fields.test.ts` (the existing `states` fixture is in scope there):

```ts
describe('resolveTile with multi autorotate', () => {
  it('resolves a function-valued autorotate', () => {
    const item: TileConfig = {
      type: 'multi',
      id: 'm',
      position: [0, 0],
      autorotate: () => 5000,
      items: [],
    };
    const resolved = resolveTile(item, null, states);
    expect(resolved.autorotate).toBe(5000);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/config/schema.test.ts src/utils/fields.test.ts`
Expected: FAIL — `'multi'` is not a valid `TILE_TYPES` value (zod rejects it) and `autorotate` is not in `TILE_FIELDS` (resolveTile leaves the function as-is, so `resolved.autorotate` is a function, not `5000`).

- [ ] **Step 3: Implement the type, schema, and field changes**

In `src/config/types.ts`, add `'multi'` to the `TileType` union:

```ts
export type TileType = 'alarm_control_panel' | ... | 'multi';
```

In the `TileConfig` interface add:

```ts
  items?: TileConfig[]; // multi tile: child tiles to rotate between
  autorotate?: Field<number>; // multi tile: ms per child, -1/absent = off
  key?: string; // multi child: stable identifier used by setUiState('multi:<id>', key)
```

In `src/config/schema.ts`, add `'multi'` to the `TILE_TYPES` array.

In `src/utils/fields.ts`, add `'autorotate'` to the `TILE_FIELDS` array (e.g. after `'height'`).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/config/schema.test.ts src/utils/fields.test.ts`
Expected: all PASS.

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/config/types.ts src/config/schema.ts src/utils/fields.ts src/config/schema.test.ts src/utils/fields.test.ts
git commit -m "Add multi tile type and autorotate field"
```

---

### Task 2: MultiTile component — rendering, switching, normalization

**Files:**
- Create: `src/components/tiles/MultiTile.tsx`
- Test: `src/components/tiles/MultiTile.test.tsx`

**Interfaces:**
- Consumes: `TileConfig` (type `multi`), `resolveTile`, `isHidden`, `itemPositionStyles`, `pageOpts`, store slices `config`, `entities`, `uiState`, `setUiState`.
- Produces: a `.item.-multi` wrapper positioned by the parent, containing exactly one child `<Tile>` (position forced to `[0,0]`, width/height defaulting to the parent's resolved size). Writes the active child's key into `uiState['multi:<tileId>']` whenever it differs (normalization + step-command consumption). Renders nothing when no child is visible, or when the active child (selected by key) is not visible.

The step logic needs the last-shown child key in a ref (`activeKeyRef`) because a number command overwrites the stored key string in `uiState`; the ref is what a subsequent step counts from.

- [ ] **Step 1: Write the failing tests**

Create `src/components/tiles/MultiTile.test.tsx`:

```tsx
import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import type { HaEntity, PageConfig, TileConfig } from '../../config/types';
import { createAppStore, getAppStore } from '../../store';
import MultiTile from './MultiTile';

vi.mock('../../ha/services', () => ({
  callService: vi.fn(() => Promise.resolve()),
  sendMessage: vi.fn(() => Promise.resolve()),
}));

const page: PageConfig = { groups: [] };

const entityA: HaEntity = { entity_id: 'switch.a', state: 'off', attributes: { friendly_name: 'Switch A' } };
const entityB: HaEntity = { entity_id: 'switch.b', state: 'off', attributes: { friendly_name: 'Switch B' } };

const multiItem: TileConfig = {
  type: 'multi',
  id: 'main',
  position: [0, 0],
  width: 2,
  height: 1,
  items: [
    { type: 'switch', id: 'switch.a', position: [9, 9] },
    { type: 'switch', id: 'switch.b', position: [9, 9], key: 'b' },
  ],
};

function setup(entities: HaEntity[]) {
  createAppStore({ serverUrl: 'http://h', pages: [] });
  getAppStore().setEntities(entities);
}

function renderMulti(override: Partial<TileConfig> = {}) {
  return render(<MultiTile item={{ ...multiItem, ...override }} page={page} />);
}

beforeEach(() => {
  getAppStore().setUiState('multi:main', undefined);
});
```

Append the tests below. Key observations: the active child tile renders its own `.item` inside the `.item.-multi` wrapper, and its title comes from `entityTitle` (`friendly_name`).

```tsx
describe('MultiTile switching', () => {
  it('renders the first visible child by default', () => {
    setup([entityA, entityB]);
    const { container } = renderMulti();
    expect(container.querySelector('.item.-multi .item-title')).toHaveTextContent('Switch A');
  });

  it('ignores the child position', () => {
    setup([entityA, entityB]);
    const { container } = renderMulti();
    const child = container.querySelector('.item.-multi > .item') as HTMLElement;
    expect(child.style.left).toBe('0px');
    expect(child.style.top).toBe('0px');
  });

  it('inherits the parent size when the child has none', () => {
    setup([entityA, entityB]);
    const { container } = renderMulti();
    const child = container.querySelector('.item.-multi > .item') as HTMLElement;
    expect(child.style.width).toBe('306px');
    expect(child.style.height).toBe('156px');
  });

  it('keeps an overriding child width', () => {
    setup([entityA, entityB]);
    const { container } = renderMulti({ items: [{ type: 'switch', id: 'switch.a', position: [9, 9], width: 1 }] });
    const child = container.querySelector('.item.-multi > .item') as HTMLElement;
    expect(child.style.width).toBe('150px');
  });

  it('steps forward and wraps', () => {
    setup([entityA, entityB]);
    const { container } = renderMulti();
    act(() => getAppStore().setUiState('multi:main', 1));
    expect(container.querySelector('.item.-multi .item-title')).toHaveTextContent('Switch B');
    act(() => getAppStore().setUiState('multi:main', 1));
    expect(container.querySelector('.item.-multi .item-title')).toHaveTextContent('Switch A');
  });

  it('steps backward with wrap', () => {
    setup([entityA, entityB]);
    const { container } = renderMulti();
    act(() => getAppStore().setUiState('multi:main', -1));
    expect(container.querySelector('.item.-multi .item-title')).toHaveTextContent('Switch B');
  });

  it('shows the child matching a key', () => {
    setup([entityA, entityB]);
    const { container } = renderMulti();
    act(() => getAppStore().setUiState('multi:main', 'b'));
    expect(container.querySelector('.item.-multi .item-title')).toHaveTextContent('Switch B');
  });

  it('skips hidden children when stepping', () => {
    setup([entityA, entityB]);
    const { container } = renderMulti({
      items: [
        { type: 'switch', id: 'switch.a', position: [9, 9], hidden: true },
        { type: 'switch', id: 'switch.b', position: [9, 9], key: 'b' },
      ],
    });
    expect(container.querySelector('.item.-multi .item-title')).toHaveTextContent('Switch B');
    act(() => getAppStore().setUiState('multi:main', 1));
    expect(container.querySelector('.item.-multi .item-title')).toHaveTextContent('Switch B');
  });

  it('shows nothing when the keyed child becomes hidden', () => {
    setup([entityA, entityB]);
    const { container } = renderMulti();
    act(() => getAppStore().setUiState('multi:main', 'b'));
    act(() => getAppStore().setEntities([entityA]));
    expect(container.querySelector('.item.-multi')).toBeNull();
  });

  it('shows nothing when all children are hidden', () => {
    setup([entityA, entityB]);
    const { container } = renderMulti({
      items: [
        { type: 'switch', id: 'switch.a', position: [9, 9], hidden: true },
        { type: 'switch', id: 'switch.b', position: [9, 9], hidden: true },
      ],
    });
    expect(container.querySelector('.item.-multi')).toBeNull();
  });

  it('normalizes the store to the active child key', () => {
    setup([entityA, entityB]);
    renderMulti();
    expect(getAppStore().uiState['multi:main']).toBe('0');
    act(() => getAppStore().setUiState('multi:main', 1));
    expect(getAppStore().uiState['multi:main']).toBe('b');
  });
});
```

Note: pixel math — tile size is `150` and margin is `6` (defaults), so a 2-wide tile is `150 * 2 + 6 = 306` and a 1-tall tile is `150 + 6 = 156`. If this test fails on dimensions, check the actual defaults in `src/utils/layout.ts` and adjust the expected numbers.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/tiles/MultiTile.test.tsx`
Expected: FAIL — `./MultiTile` module doesn't exist yet.

- [ ] **Step 3: Implement `MultiTile.tsx`**

Create `src/components/tiles/MultiTile.tsx`:

```tsx
import { useEffect, useRef } from 'react';
import type { EntityStates, PageConfig, TileConfig } from '../../config/types';
import { useAppStore } from '../../store';
import { isHidden, resolveTile } from '../../utils/fields';
import { itemPositionStyles, pageOpts } from '../../utils/layout';
import Tile from '../Tile';

function childKey(child: TileConfig, index: number): string {
  return typeof child.key === 'string' ? child.key : String(index);
}

function childVisible(child: TileConfig, entities: EntityStates): boolean {
  if (isHidden(child, entities)) return false;
  return typeof child.id === 'object' || Boolean(entities[child.id]);
}

function wrap(index: number, length: number): number {
  return ((index % length) + length) % length;
}

export function MultiTile({ item, page }: { item: TileConfig; page: PageConfig }) {
  const config = useAppStore((s) => s.config);
  const entities = useAppStore((s) => s.entities);
  const uiKey = `multi:${String(item.id)}`;
  const value = useAppStore((s) => s.uiState[uiKey]);
  const setUiState = useAppStore((s) => s.setUiState);

  const resolved = resolveTile(item, null, entities);
  const children = resolved.items ?? [];
  const opts = pageOpts(page, config, entities);

  const activeKeyRef = useRef<string | null>(null);

  const visibleChildren = children
    .map((child, index) => ({ child, index }))
    .filter(({ child }) => childVisible(child, entities));

  let targetIndex: number | null = null;
  if (visibleChildren.length > 0) {
    if (typeof value === 'number') {
      const currentPos = visibleChildren.findIndex(
        ({ child, index }) => childKey(child, index) === activeKeyRef.current,
      );
      const base = currentPos >= 0 ? currentPos : 0;
      targetIndex = visibleChildren[wrap(base + value, visibleChildren.length)].index;
    } else if (typeof value === 'string') {
      const found = children.findIndex((child, index) => childKey(child, index) === value);
      if (found >= 0 && visibleChildren.some(({ index }) => index === found)) {
        targetIndex = found;
      }
    } else {
      targetIndex = visibleChildren[0].index;
    }
  }

  // ponytail: normalization effect runs every render; the key !== value guard makes it settle after one write.
  useEffect(() => {
    if (targetIndex === null) return;
    const key = childKey(children[targetIndex], targetIndex);
    activeKeyRef.current = key;
    if (key !== value) setUiState(uiKey, key);
  });

  if (targetIndex === null) return null;

  const child = children[targetIndex];
  const parentWidth = (resolved.width as number | undefined) ?? 1;
  const parentHeight = (resolved.height as number | undefined) ?? 1;
  const clone: TileConfig = {
    ...child,
    position: [0, 0],
    width: child.width ?? parentWidth,
    height: child.height ?? parentHeight,
  };

  return (
    <div className="item -multi" style={itemPositionStyles(resolved, opts)}>
      <Tile item={clone} page={page} />
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/tiles/MultiTile.test.tsx`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/tiles/MultiTile.tsx src/components/tiles/MultiTile.test.tsx
git commit -m "Add MultiTile component for show-one-of-many tiles"
```

---

### Task 3: Autorotate

**Files:**
- Modify: `src/components/tiles/MultiTile.tsx`
- Test: `src/components/tiles/MultiTile.test.tsx`

**Interfaces:**
- Consumes: `resolved.autorotate` (number ms, resolved by Task 1).
- Produces: when `autorotate >= 0` and at least one child is visible, an interval that calls `setUiState(uiKey, 1)`. The interval is recreated whenever the active child changes (target), so each child shows for `autorotate` ms. `-1`/absent = off (default).

- [ ] **Step 1: Write the failing tests**

Add the imports `vi` to the vitest import line and append this describe block to `src/components/tiles/MultiTile.test.tsx`:

```tsx
describe('MultiTile autorotate', () => {
  it('advances through children on the interval', () => {
    vi.useFakeTimers();
    setup([entityA, entityB]);
    const { container } = renderMulti({ autorotate: 1000 });
    expect(container.querySelector('.item.-multi .item-title')).toHaveTextContent('Switch A');
    act(() => vi.advanceTimersByTime(1000));
    expect(container.querySelector('.item.-multi .item-title')).toHaveTextContent('Switch B');
    act(() => vi.advanceTimersByTime(1000));
    expect(container.querySelector('.item.-multi .item-title')).toHaveTextContent('Switch A');
    vi.useRealTimers();
  });

  it('does not rotate when autorotate is absent', () => {
    vi.useFakeTimers();
    setup([entityA, entityB]);
    const { container } = renderMulti();
    act(() => vi.advanceTimersByTime(5000));
    expect(container.querySelector('.item.-multi .item-title')).toHaveTextContent('Switch A');
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/tiles/MultiTile.test.tsx -t "autorotate"`
Expected: FAIL — no interval yet, so nothing advances.

- [ ] **Step 3: Implement the interval**

In `src/components/tiles/MultiTile.tsx`, after the normalization effect, add:

```tsx
  const autorotate = (resolved.autorotate as number | undefined) ?? -1;
  useEffect(() => {
    if (autorotate < 0 || visibleChildren.length === 0) return;
    const timer = setInterval(() => setUiState(uiKey, 1), autorotate);
    return () => clearInterval(timer);
  }, [autorotate, uiKey, targetIndex, visibleChildren.length]);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/tiles/MultiTile.test.tsx`
Expected: all PASS (both new and existing).

- [ ] **Step 5: Commit**

```bash
git add src/components/tiles/MultiTile.tsx src/components/tiles/MultiTile.test.tsx
git commit -m "Add autorotate to multi tiles"
```

---

### Task 4: Tile integration + wrapper styles

**Files:**
- Modify: `src/components/Tile.tsx`
- Modify: `styles/main.less`
- Test: `src/components/tiles/MultiTile.test.tsx`

**Interfaces:**
- Consumes: `MultiTile` from Task 2.
- Produces: multi items route to `MultiTile` instead of the entity path (`getItemEntity` is skipped to avoid the "entity not found" path), and the `.item.-multi` wrapper has a transparent background so only the active child's tile is visible.

- [ ] **Step 1: Write the failing test**

Append to `src/components/tiles/MultiTile.test.tsx` (import `Tile` as `import Tile from '../Tile';`):

```tsx
describe('Tile integration', () => {
  it('routes a multi tile through the Tile component', () => {
    setup([entityA, entityB]);
    const { container } = render(<Tile item={multiItem} page={page} />);
    expect(container.querySelector('.item.-multi .item-title')).toHaveTextContent('Switch A');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/tiles/MultiTile.test.tsx -t "routes"`
Expected: FAIL — `Tile` calls `getItemEntity` on `multi:main`, no entity matches, and it returns `null`.

- [ ] **Step 3: Implement the Tile short-circuit**

In `src/components/Tile.tsx`:
- Add the import: `import { MultiTile } from './tiles/MultiTile';`
- Change line 55 from:

```tsx
  const entity = getItemEntity(item, entities);
```

to:

```tsx
  const entity = item.type === 'multi' ? null : getItemEntity(item, entities);
```

- Add, between the `useLongPress` call (line 64) and the `if (!entity || isHidden(...))` check (line 66):

```tsx
  if (item.type === 'multi') return <MultiTile item={item} page={page} />;
```

- [ ] **Step 4: Implement the wrapper style**

In `styles/main.less`, inside the `.item` block (around line 489–514), after the base properties and before the closing brace, add:

```less
      &.-multi {
         background-color: transparent;
      }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/components/tiles/MultiTile.test.tsx && npm run build`
Expected: all PASS; build succeeds (confirms the Less compiles).

- [ ] **Step 6: Commit**

```bash
git add src/components/Tile.tsx styles/main.less src/components/tiles/MultiTile.test.tsx
git commit -m "Route multi tiles to MultiTile and add transparent wrapper style"
```

---

### Task 5: Documentation examples

**Files:**
- Modify: `TILE_EXAMPLES.md`

**Interfaces:**
- Consumes: the `multi` type, `items`, `autorotate`, and child `key` from Tasks 1–3.
- Produces: a documented `multi` example. (The example configs `config.example.js` / `reference_config_react.js` are left unchanged — they are demo configs with mock entities, and adding a multi tile there would require inventing entities for no real gain.)

- [ ] **Step 1: Add the MULTI section**

In `TILE_EXAMPLES.md`, after the MEDIA_PLAYER block (ends at line 396, before the blank line at 397), insert:

```md
#### MULTI
Shows one child tile at a time. Use `setUiState('multi:<id>', ...)` in tap/timer
actions to switch: pass a `number` to step, or a child `key` to jump to that child.
Children inherit the multi tile's size unless overridden.
```js
{
   position: [0, 0],
   id: 'panels',
   type: 'multi',
   width: 2,
   height: 1,
   autorotate: 10000,
   items: [
      {
         type: 'switch',
         id: 'switch.lamp',
         position: [0, 0],
         key: 'lamp',
      },
      {
         type: 'sensor',
         id: 'sensor.temp',
         position: [0, 0],
         key: 'temp',
      },
   ],
},
```
```

- [ ] **Step 2: Commit**

```bash
git add TILE_EXAMPLES.md
git commit -m "Document multi tile type in examples"
```

---

### Task 6: Full verification

**Files:** none.

**Interfaces:** n/a — final gate before pushing per AGENTS.md.

- [ ] **Step 1: Run all verification commands**

Run:
```
npm run lint
npm run typecheck
npm run test
npm run build
```
Expected: all four exit 0 with no errors.

- [ ] **Step 2: Confirm the branch state**

Run: `git log --oneline -8`
Expected: the five feature commits on `feature/multi-tile` ahead of the two design-doc commits (`3f5e7d6`, `9a91bad`).

- [ ] **Step 3: Push and open a PR**

Run: `git push -u origin feature/multi-tile && gh pr create --fill`
Expected: PR to `main` opens with the commit summary.
