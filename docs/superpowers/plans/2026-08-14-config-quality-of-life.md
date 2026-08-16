# Config quality-of-life features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add eight small config-driven features to the React TileBoard so the user can delete the workarounds in `public/config/reference_config.js`.

**Architecture:** Config keys drive existing render/effect paths. New optional keys on `TileBoardConfig` (`autoReloadInterval`, `scripts`, `locale`), `ScreensaverConfig` (`slideCacheBust`), a new header-item type (`photo_date`), two new `FunctionContext` helpers (`memo`, `uiState`/`setUiState`), and one bug fix in `tiles/actions.ts`. No new state plumbing beyond a tiny `uiState` slice in the existing zustand store and a module-level memo cache.

**Tech Stack:** React 18, zustand 5, date-fns v4, zod 4, vitest + @testing-library/react (jsdom), Vite.

## Global Constraints

- Branch: `feature/config-quality-of-life` (already checked out). Commit messages: imperative present tense.
- Verification before push (from `AGENTS.md`): `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`. After EVERY task, at minimum run the task's test; run all four before pushing.
- `configSchema` in `src/config/schema.ts` is intentionally permissive (only validates `serverUrl` + page/group/tile shape) and `validateConfig` returns `raw` untouched — new optional keys pass through with NO schema edits. Add acceptance tests instead.
- All new config keys are optional. `src/config/defaults.ts` is untouched.
- FunctionContext (`src/config/types.ts`) is the contract for config functions; every new helper must be added there AND to `getContext()` in `src/utils/functions.ts`.
- Config files are plain JS — user helper functions stay in user config as closures; do NOT move them into base code.
- Test files sit beside source (`*.test.ts(x)`), matching repo convention. Tests must not depend on the module-level singleton `appStore` persisting between files (vitest isolates per file).

---

### Task 1: Config types for the new keys

**Files:**
- Modify: `src/config/types.ts`
- Test: `src/config/schema.test.ts`

**Interfaces:**
- Consumes: `HeaderItemType` (line 149), `ScreensaverConfig` (line 179), `TileBoardConfig` (line 195), `FunctionContext` (line 27).
- Produces: the new typed fields consumed by every later task.

- [ ] **Step 1: Add the new fields to `src/config/types.ts`**

In `FunctionContext` (after `addNotification`), add:

```ts
  memo: <T>(key: string, ttlSeconds: number, fn: () => T) => T;
  uiState: (key: string) => unknown;
  setUiState: (key: string, value: unknown) => void;
```

In `HeaderItemType`, change to:

```ts
export type HeaderItemType = 'time' | 'date' | 'datetime' | 'weather' | 'custom_html' | 'photo_date';
```

In `ScreensaverConfig`, add after `slidesTimeout`:

```ts
  slideCacheBust?: number; // seconds; append a rolling cache-bust query to slide bg urls
```

In `TileBoardConfig`, add after `rememberLastPage`:

```ts
  autoReloadInterval?: number; // seconds between full page reloads
  scripts?: string[];          // extra scripts to load after config, before app render
  locale?: string;             // date-fns locale name, e.g. 'sv-se'
```

- [ ] **Step 2: Add acceptance tests to `src/config/schema.test.ts`**

Append inside `describe('validateConfig', ...)`:

```ts
  it('accepts the new optional config keys', () => {
    const config = {
      ...minimalValidConfig,
      autoReloadInterval: 3600,
      scripts: ['https://cdn.example.com/lib.js'],
      locale: 'sv-se',
      screensaver: {
        timeout: 180,
        slideCacheBust: 300,
        slides: [{ bg: 'a.jpg' }],
      },
    };
    const result = validateConfig(config);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.autoReloadInterval).toBe(3600);
      expect(result.config.scripts).toEqual(['https://cdn.example.com/lib.js']);
      expect(result.config.locale).toBe('sv-se');
    }
  });
```

- [ ] **Step 3: Run test to verify it passes**

Run: `npm run test -- src/config/schema.test.ts`
Expected: PASS.

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/config/types.ts src/config/schema.test.ts
git commit -m "Add config types for auto reload, scripts, locale and cache bust"
```

---

### Task 2: `locale` utility and date-fns wiring

**Files:**
- Create: `src/utils/locale.ts`
- Create: `src/utils/locale.test.ts`
- Modify: `src/components/DateDisplay.tsx`

**Interfaces:**
- Consumes: `TileBoardConfig.locale` (Task 1), date-fns v4 `format` with `{ locale }` options.
- Produces: `getDateLocale(locale?: string): Locale | undefined` — returns a date-fns `Locale` for a config value like `'sv-se'`, else `undefined` (date-fns English default).

- [ ] **Step 1: Write the failing test**

Create `src/utils/locale.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { getDateLocale } from './locale';

describe('getDateLocale', () => {
  it('returns the locale for a bare name', () => {
    expect(getDateLocale('sv')?.code).toBe('sv');
  });

  it('strips the region suffix', () => {
    expect(getDateLocale('sv-se')?.code).toBe('sv');
  });

  it('is case insensitive', () => {
    expect(getDateLocale('SV-SE')?.code).toBe('sv');
  });

  it('returns undefined for an unknown or missing locale', () => {
    expect(getDateLocale('xx')).toBeUndefined();
    expect(getDateLocale(undefined)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/utils/locale.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/utils/locale.ts`**

```ts
import { sv } from 'date-fns/locale';
import type { Locale } from 'date-fns';

// ponytail: static registry; add locales here as needed (dynamic import glob is overkill)
const REGISTRY: Record<string, Locale> = {
  sv,
};

export function getDateLocale(locale?: string): Locale | undefined {
  if (!locale) return undefined;
  const key = locale.toLowerCase().split('-')[0];
  return REGISTRY[key];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/utils/locale.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire `DateDisplay.tsx` to the configured locale**

Current `src/components/DateDisplay.tsx`:

```tsx
import { format } from 'date-fns';

export default function DateDisplay({ format: fmt }: DateDisplayProps) {
  const [now, setNow] = useState(() => new Date());
  ...
  return <div className="date">{format(now, fmt ?? 'EEEE, LLLL dd')}</div>;
}
```

Replace with:

```tsx
import { format } from 'date-fns';
import { getDateLocale } from '../utils/locale';
import { useAppStore } from '../store';

export default function DateDisplay({ format: fmt }: DateDisplayProps) {
  const [now, setNow] = useState(() => new Date());
  const locale = useAppStore((s) => s.config.locale);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60 * 1000);
    return () => window.clearInterval(id);
  }, []);

  return <div className="date">{format(now, fmt ?? 'EEEE, LLLL dd', { locale: getDateLocale(locale) })}</div>;
}
```

Verify `Locale` is imported as a type only (`import type { Locale }` is also fine). Keep existing imports (`useEffect`, `useState`) intact.

- [ ] **Step 6: Run existing tests + typecheck**

Run: `npm run test -- src/components/Header.test.tsx src/components/Screensaver.test.tsx` and `npm run typecheck`
Expected: PASS, no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/utils/locale.ts src/utils/locale.test.ts src/components/DateDisplay.tsx
git commit -m "Add locale config for date formatting"
```

---

### Task 3: `autoReloadInterval`

**Files:**
- Modify: `src/App.tsx`
- Create: `src/App.test.tsx`

**Interfaces:**
- Consumes: `TileBoardConfig.autoReloadInterval` (Task 1).

- [ ] **Step 1: Write the failing test**

Create `src/App.test.tsx`:

```tsx
import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { createAppStore } from './store';
import type { TileBoardConfig } from './config/types';

vi.mock('./ha/connection', () => ({ initConnection: vi.fn() }));

const config: TileBoardConfig = {
  serverUrl: 'http://h',
  autoReloadInterval: 1,
  pages: [{ groups: [] }],
};

describe('App autoReloadInterval', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    createAppStore(config);
  });

  it('reloads the page after the configured interval', () => {
    const reload = vi.spyOn(window.location, 'reload').mockImplementation(() => {});
    render(<App config={config} />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(reload).toHaveBeenCalled();
    reload.mockRestore();
  });

  it('does not reload when the option is absent', () => {
    createAppStore({ serverUrl: 'http://h', pages: [{ groups: [] }] });
    const reload = vi.spyOn(window.location, 'reload').mockImplementation(() => {});
    render(<App config={{ serverUrl: 'http://h', pages: [{ groups: [] }] }} />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(reload).not.toHaveBeenCalled();
    reload.mockRestore();
  });
});
```

Note: `createAppStore` returns early after the first call (module singleton). Because vitest isolates files, the two `it` blocks share one store in this file; the second `it` calls `createAppStore` again which is a no-op — that is fine since the config object passed to `<App>` controls the effect.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/App.test.tsx`
Expected: FAIL — no reload timer exists.

- [ ] **Step 3: Implement the effect in `src/App.tsx`**

Inside `App`, after the `bodyClasses` effect, add:

```tsx
  useEffect(() => {
    if (!config.autoReloadInterval || config.autoReloadInterval <= 0) return;
    const id = window.setInterval(
      () => window.location.reload(),
      config.autoReloadInterval * 1000,
    );
    return () => window.clearInterval(id);
  }, [config.autoReloadInterval]);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/App.test.tsx`
Expected: PASS.

- [ ] **Step 5: Run lint + typecheck**

Run: `npm run lint` and `npm run typecheck`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/App.test.tsx
git commit -m "Add autoReloadInterval config option"
```

---

### Task 4: `scripts` loading

**Files:**
- Modify: `src/config/load.ts`
- Modify: `src/config/load.test.ts`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: `TileBoardConfig.scripts` (Task 1).
- Produces: `loadScript(url: string): Promise<void>` — appends a `<script>` tag, resolves on `load`, rejects on `error`.

- [ ] **Step 1: Write the failing test**

Append to `src/config/load.test.ts`:

```ts
import { loadConfigScript, loadScript } from './load';

describe('loadScript', () => {
  it('injects a script tag with the given src and resolves on load', async () => {
    const loadHandler: typeof document.head.appendChild = (node) => {
      node.dispatchEvent(new Event('load'));
      return node;
    };
    const appendChild = vi.fn(loadHandler);
    const spy = vi.spyOn(document.head, 'appendChild').mockImplementation(appendChild);

    await expect(loadScript('https://cdn.example.com/lib.js')).resolves.toBeUndefined();
    expect(appendChild).toHaveBeenCalledOnce();
    expect(appendChild.mock.calls[0][0]).toHaveProperty('src', 'https://cdn.example.com/lib.js');
    spy.mockRestore();
  });

  it('rejects when the script fails to load', async () => {
    const rejectHandler: typeof document.head.appendChild = (node) => {
      node.dispatchEvent(new Event('error'));
      return node;
    };
    const spy = vi.spyOn(document.head, 'appendChild').mockImplementation(rejectHandler);

    await expect(loadScript('https://cdn.example.com/missing.js')).rejects.toThrow();
    spy.mockRestore();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/config/load.test.ts`
Expected: FAIL — `loadScript` not exported.

- [ ] **Step 3: Implement `loadScript` in `src/config/load.ts`**

Add below `loadConfigScript`:

```ts
export function loadScript(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`${url} failed to load`));
    document.head.appendChild(script);
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/config/load.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire `main.tsx` to load `config.scripts` before render**

Current `src/main.tsx` start():

```ts
  const result = loadConfig();
  if (result.ok) createAppStore(result.config);

  createRoot(document.getElementById('root')!).render(...);
```

Change to load scripts (best-effort, non-blocking) after creating the store and before rendering:

```ts
  const result = loadConfig();
  if (result.ok) {
    createAppStore(result.config);
    for (const url of result.config.scripts ?? []) {
      try {
        await loadScript(url);
      } catch {
        getAppStore().addNotification({
          type: 'error',
          title: 'Failed to load script',
          message: url,
          lifetime: 12,
        });
      }
    }
  }

  createRoot(document.getElementById('root')!).render(...);
```

Import `loadScript` and `getAppStore` in `main.tsx` (it already imports `loadConfigScript`/`loadConfig` from `./config/load`; add `getAppStore` from `./store`).

- [ ] **Step 6: Run typecheck + test**

Run: `npm run typecheck` and `npm run test -- src/config/load.test.ts`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/config/load.ts src/config/load.test.ts src/main.tsx
git commit -m "Add scripts config to load extra scripts before render"
```

---

### Task 5: `slideCacheBust` for screensaver slides

**Files:**
- Modify: `src/components/Screensaver.tsx`
- Modify: `src/components/Screensaver.test.tsx`

**Interfaces:**
- Consumes: `ScreensaverConfig.slideCacheBust` (Task 1).

- [ ] **Step 1: Write the failing test**

Append to `src/components/Screensaver.test.tsx`:

```tsx
  it('appends a rolling cache-bust query to slide backgrounds', () => {
    createAppStore({
      serverUrl: 'http://h',
      pages: [{ groups: [] }],
      screensaver: {
        timeout: 5,
        slidesTimeout: 30,
        slideCacheBust: 60,
        slides: [{ bg: 'a.jpg' }],
      },
    });
    const { container } = render(<Screensaver />);
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    const slide = container.querySelector('.screensaver-slide') as HTMLElement;
    expect(slide.style.backgroundImage).toContain('a.jpg?t=0');
  });
```

Note: `vi.setSystemTime(0)` in the existing `beforeEach`, so the bucket is `Math.floor(0 / 1000 / 60) === 0`. The second `createAppStore` call is a no-op (singleton) but the config from the first `beforeEach` call already includes no `slideCacheBust`; the assertion relies on the existing store config. To keep the test deterministic, instead pass the busted config to the existing `config` constant at the top of the file by REPLACING the existing `config` with:

```ts
const config: TileBoardConfig = {
  serverUrl: 'http://h',
  pages: [{ groups: [] }],
  screensaver: {
    timeout: 5,
    slidesTimeout: 1,
    slideCacheBust: 60,
    slides: [{ bg: 'a.jpg' }, { bg: 'b.jpg' }],
    rightTop: [{ type: 'datetime' }],
  },
};
```

and in the new test just render (no second `createAppStore`):

```tsx
  it('appends a rolling cache-bust query to slide backgrounds', () => {
    const { container } = render(<Screensaver />);
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    const slide = container.querySelector('.screensaver-slide') as HTMLElement;
    expect(slide.style.backgroundImage).toContain('a.jpg?t=0');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/Screensaver.test.tsx`
Expected: FAIL — backgroundImage is `url(a.jpg)` with no query.

- [ ] **Step 3: Implement cache busting in `src/components/Screensaver.tsx`**

Add a helper above the `Screensaver` component:

```ts
function slideBg(bg: string, cacheBust?: number): string {
  if (!cacheBust) return bg;
  const base = bg.replace(/\?.*$/, '');
  const bucket = Math.floor(Date.now() / 1000 / cacheBust);
  return `${base}?t=${bucket}`;
}
```

Inside `Screensaver`, before the return, compute the busted urls:

```ts
  const cacheBust = conf?.slideCacheBust;
  const slideBgUrl = (bg: string) => slideBg(bg, cacheBust);
```

Replace the slide `style` backgroundImage:

```tsx
              style={{
                backgroundImage: `url(${slideBgUrl(slide.bg)})`,
                ...(slide.styles ?? {}),
              }}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/components/Screensaver.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/Screensaver.tsx src/components/Screensaver.test.tsx
git commit -m "Add slideCacheBust for screensaver slide backgrounds"
```

---

### Task 6: `this.memo` helper

**Files:**
- Create: `src/utils/memo.ts`
- Create: `src/utils/memo.test.ts`
- Modify: `src/utils/functions.ts`

**Interfaces:**
- Consumes: `FunctionContext.memo` type (Task 1).
- Produces: `memo<T>(key, ttlSeconds, fn): T` — module-level cache; `getContext()` exposes it as `this.memo`.

- [ ] **Step 1: Write the failing test**

Create `src/utils/memo.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { memo } from './memo';

describe('memo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1000000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the cached value within the ttl', () => {
    const fn = vi.fn(() => 42);
    expect(memo('a', 60, fn)).toBe(42);
    expect(memo('a', 60, fn)).toBe(42);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('recomputes after the ttl expires', () => {
    const fn = vi.fn(() => 1);
    memo('b', 60, fn);
    vi.advanceTimersByTime(61 * 1000);
    expect(memo('b', 60, fn)).toBe(1);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('treats different keys independently', () => {
    const a = vi.fn(() => 'a');
    const b = vi.fn(() => 'b');
    memo('k1', 60, a);
    memo('k2', 60, b);
    memo('k1', 60, a);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/utils/memo.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/utils/memo.ts`**

```ts
// ponytail: module-level cache, lazy eviction, no cap (keys are user-controlled and few)
const cache = new Map<string, { expires: number; value: unknown }>();

export function memo<T>(key: string, ttlSeconds: number, fn: () => T): T {
  const hit = cache.get(key);
  const now = Date.now();
  if (hit && now < hit.expires) return hit.value as T;
  const value = fn();
  cache.set(key, { expires: now + ttlSeconds * 1000, value });
  return value;
}
```

- [ ] **Step 4: Expose `memo` on the FunctionContext**

In `src/utils/functions.ts`, import and add to the context:

```ts
import { memo } from './memo';
...
    memo,
```

- [ ] **Step 5: Run tests + typecheck**

Run: `npm run test -- src/utils/memo.test.ts` and `npm run typecheck`
Expected: PASS, clean.

- [ ] **Step 6: Commit**

```bash
git add src/utils/memo.ts src/utils/memo.test.ts src/utils/functions.ts
git commit -m "Add memo helper to FunctionContext"
```

---

### Task 7: `uiState` / `setUiState`

**Files:**
- Modify: `src/store/index.ts`
- Modify: `src/utils/functions.ts`
- Modify: `src/components/Tile.tsx`
- Modify: `src/components/Tile.test.tsx`

**Interfaces:**
- Consumes: `FunctionContext.uiState`/`setUiState` types (Task 1).
- Produces: store slice `uiState: Record<string, unknown>` + `setUiState(key, value)`; context getters backed by `getAppStore()`.

- [ ] **Step 1: Write the failing tests**

Add store slice test. Append to `src/components/Tile.test.tsx`:

```tsx
  it('re-evaluates hidden functions when uiState changes', () => {
    setup();
    const item: TileConfig = {
      type: 'switch',
      id: 'switch.test',
      position: [0, 0],
      hidden: function () {
        return this.uiState('panel') === 'detail';
      },
    };
    const { container } = render(<Tile item={item} page={{ groups: [] }} />);
    expect(container.querySelector('.item')).not.toBeNull();

    act(() => {
      getAppStore().setUiState('panel', 'detail');
    });
    expect(container.querySelector('.item')).toBeNull();

    act(() => {
      getAppStore().setUiState('panel', 'overview');
    });
    expect(container.querySelector('.item')).not.toBeNull();
  });
```

Add `act` to the imports in `Tile.test.tsx` (currently imports `fireEvent, render` from `@testing-library/react`).

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/Tile.test.tsx`
Expected: FAIL — `setUiState` is not a function / hidden does not re-evaluate.

- [ ] **Step 3: Add the store slice in `src/store/index.ts`**

Add an interface after `NotificationsSlice` (before `AppStore`):

```ts
interface UiStateSlice {
  uiState: Record<string, unknown>;
  setUiState(key: string, value: unknown): void;
}
```

Add `UiStateSlice` to the `AppStore` type intersection. In the store factory, add state + action:

```ts
    uiState: {},
    setUiState: (key, value) =>
      set((prev) => ({ uiState: { ...prev.uiState, [key]: value } })),
```

- [ ] **Step 4: Expose on FunctionContext in `src/utils/functions.ts`**

In the returned context object, add:

```ts
    uiState: (key) => getAppStore().uiState[key],
    setUiState: (key, value) => getAppStore().setUiState(key, value),
```

- [ ] **Step 5: Subscribe `Tile` to `uiState` so hidden re-evaluates**

In `src/components/Tile.tsx`, add a subscription (a bare hook call is lint-clean; the re-render is the point — config functions read the store via `getContext`):

```tsx
  useAppStore((s) => s.uiState);
```

Place it with the other `useAppStore` selectors. This causes `Tile` to re-render on any `setUiState`, re-running `isHidden`/title/etc.

- [ ] **Step 6: Run tests + lint + typecheck**

Run: `npm run test -- src/components/Tile.test.tsx` and `npm run lint` and `npm run typecheck`
Expected: PASS, clean.

- [ ] **Step 7: Commit**

```bash
git add src/store/index.ts src/utils/functions.ts src/components/Tile.tsx src/components/Tile.test.tsx
git commit -m "Add uiState store slice and context helpers"
```

---

### Task 8: select-domain fix

**Files:**
- Modify: `src/tiles/actions.ts`
- Modify: `src/components/tiles/interactive-tiles.test.tsx`

**Interfaces:**
- Consumes: `TileConfig.id` (string form).
- Produces: `setSelectOption` now derives the domain from the entity id (fixes `select.*` entities).

- [ ] **Step 1: Write the failing test**

Append to `src/components/tiles/interactive-tiles.test.tsx`:

```tsx
  it('select_option uses the domain from the entity id', () => {
    setup([
      { entity_id: 'select.laddbox', state: 'A', attributes: { options: ['A', 'B'] } },
    ]);
    const { container } = renderTile({
      type: 'input_select',
      id: 'select.laddbox',
      position: [0, 0],
    });
    tap(container);
    const overlay = container.querySelector('.item-select');
    expect(overlay).not.toBeNull();
    fireEvent.click(overlay!.querySelectorAll('.item-select--option')[1]!);
    expect(callServiceMock).toHaveBeenCalledWith('select', 'select_option', {
      entity_id: 'select.laddbox',
      option: 'B',
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/tiles/interactive-tiles.test.tsx`
Expected: FAIL — called with `'input_select'` domain.

- [ ] **Step 3: Fix `setSelectOption` in `src/tiles/actions.ts`**

Current:

```ts
export function setSelectOption(item: TileConfig, _entity: HaEntity | null, option: string): void {
  sendItemData(item, 'input_select', 'select_option', { option });
}
```

Replace with:

```ts
export function setSelectOption(item: TileConfig, _entity: HaEntity | null, option: string): void {
  const domain = typeof item.id === 'string' ? item.id.split('.')[0] : 'input_select';
  sendItemData(item, domain, 'select_option', { option });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- src/components/tiles/interactive-tiles.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tiles/actions.ts src/components/tiles/interactive-tiles.test.tsx
git commit -m "Derive select_option domain from entity id"
```

---

### Task 9: `photo_date` screensaver item (EXIF date)

**Files:**
- Create: `src/components/PhotoDate.tsx`
- Create: `src/components/PhotoDate.test.tsx`
- Modify: `src/components/HeaderItem.tsx`
- Modify: `src/components/Screensaver.tsx`
- Modify: `package.json` / `package-lock.json` (add `exifreader`)

**Interfaces:**
- Consumes: `HeaderItemType 'photo_date'` (Task 1), `slideCacheBust` (Task 5), `getDateLocale` (Task 2).
- Produces: `<PhotoDate bg slideBg format>` component; `HeaderItem` gains optional `slideBg?: string` prop; `Screensaver` passes the active slide's busted bg to photo_date items.

- [ ] **Step 1: Install the dependency**

Run: `npm install exifreader@^4.42.0`
Verify `package.json` gains `"exifreader": "^4.42.0"`.

- [ ] **Step 2: Write the failing test**

Create `src/components/PhotoDate.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PhotoDate from './PhotoDate';
import { createAppStore } from '../store';

vi.mock('exifreader', () => ({
  default: {
    load: vi.fn(() =>
      Promise.resolve({
        DateTimeOriginal: { value: '2023:04:12 10:30:00', description: '2023-04-12 10:30:00' },
      }),
    ),
  },
}));

import { load } from 'exifreader';

const loadMock = vi.mocked(load);

describe('PhotoDate', () => {
  beforeEach(() => {
    createAppStore({ serverUrl: 'http://h', locale: 'sv-se', pages: [{ groups: [] }] });
  });

  it('renders the formatted photo date', async () => {
    render(<PhotoDate bg="a.jpg" />);
    expect(await screen.findByText('12 april 2023')).toBeTruthy();
  });

  it('renders nothing without a bg', () => {
    render(<PhotoDate />);
    expect(screen.queryByText(/./)).toBeNull();
  });

  it('renders nothing when EXIF has no DateTimeOriginal', async () => {
    loadMock.mockResolvedValueOnce({} as never);
    render(<PhotoDate bg="b.jpg" />);
    expect(await Promise.resolve()).toBeUndefined();
    expect(screen.queryByText(/./)).toBeNull();
  });
});
```

Note: `sv` locale day-month ordering — date-fns `sv` `dd MMMM yyyy` yields `12 april 2023`. If the rendered text differs, assert on the actual output after running once.

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test -- src/components/PhotoDate.test.tsx`
Expected: FAIL — module `./PhotoDate` not found.

- [ ] **Step 4: Implement `src/components/PhotoDate.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { format, parse } from 'date-fns';
import { getDateLocale } from '../utils/locale';
import { useAppStore } from '../store';

interface PhotoDateProps {
  bg?: string;
  format?: string;
}

export default function PhotoDate({ bg, format: fmt = 'dd MMMM yyyy' }: PhotoDateProps) {
  const locale = useAppStore((s) => s.config.locale);
  const [text, setText] = useState('');

  useEffect(() => {
    let cancelled = false;
    if (!bg) {
      setText('');
      return;
    }
    import('exifreader')
      .then(({ default: ExifReader }) => ExifReader.load(bg))
      .then((tags: Record<string, unknown>) => {
        if (cancelled) return;
        const tag = tags['DateTimeOriginal'] as
          | { value?: unknown; description?: unknown }
          | undefined;
        const raw = tag && typeof tag === 'object' ? (tag.value ?? tag.description) : tag;
        if (typeof raw !== 'string') return;
        const date = parse(raw, 'yyyy:MM:dd HH:mm:ss', new Date());
        if (!isNaN(date.getTime())) setText(format(date, fmt, { locale: getDateLocale(locale) }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [bg, fmt, locale]);

  if (!text) return null;
  return <div className="photo-date">{text}</div>;
}
```

- [ ] **Step 5: Wire `HeaderItem` for the `photo_date` type**

In `src/components/HeaderItem.tsx`:

- Import `PhotoDate`.
- Change the component signature to accept the optional slide bg:

```tsx
function HeaderItem({ item, slideBg }: { item: HeaderItemConfig; slideBg?: string }) {
```

- Add a render branch:

```tsx
      {item.type === 'photo_date' && <PhotoDate bg={slideBg} format={item.format} />}
```

- [ ] **Step 6: Pass `slideBg` from `Screensaver`**

In `src/components/Screensaver.tsx`, before the return, compute the active slide's busted bg:

```ts
  const slides = conf?.slides ?? [];
  const activeBg = conf?.slideCacheBust && slides.length
    ? slideBgUrl(slides[activeSlide]?.bg ?? '')
    : undefined;
```

Pass `slideBg` to the `HeaderItem` components rendered in the GLOBAL content slots (`conf.rightBottom`/`rightTop`/`leftBottom`/`leftTop`) — the four inside `.screensaver-content`. Use the existing `HeaderItem` calls but add the prop, e.g.:

```tsx
            <HeaderItem key={i} item={item} slideBg={activeBg} />
```

For per-slide slots (inside `.screensaver-slide`), pass that slide's own busted bg instead of the active one. In the slide map, replace `HeaderItem` usages to pass `slideBg={slideBgUrl(slide.bg)}` (the per-slide slots show that slide's date).

- [ ] **Step 7: Run tests + lint + typecheck**

Run: `npm run test -- src/components/PhotoDate.test.tsx src/components/Screensaver.test.tsx src/components/Header.test.tsx`
Run: `npm run lint` and `npm run typecheck`
Expected: PASS, clean.

- [ ] **Step 8: Commit**

```bash
git add src/components/PhotoDate.tsx src/components/PhotoDate.test.tsx src/components/HeaderItem.tsx src/components/Screensaver.tsx package.json package-lock.json
git commit -m "Add photo_date screensaver item showing EXIF photo date"
```

---

### Task 10: Documentation

**Files:**
- Modify: `README.md`
- Modify: `public/config/config.example.js`

**Interfaces:**
- Consumes: all new config keys/helpers from Tasks 1–9.

- [ ] **Step 1: Document the new config keys in `README.md`**

In the full config object (around line 90), add:

```js
   /* autoReloadInterval: seconds between full page reloads (0/absent = never) */
   autoReloadInterval: 3600,
   /* scripts: extra scripts to load after the config, before the app renders */
   scripts: ['https://cdn.jsdelivr.net/npm/...'],
   /* locale: date-fns locale name, e.g. 'sv-se'. Defaults to English. */
   locale: 'sv-se',
```

In the `screensaver` block, add:

```js
     /* slideCacheBust: seconds. Append a rolling cache-bust query to slide bg urls
      * so same-name image files are re-fetched. (optional) */
     slideCacheBust: 300,
```

Add a short paragraph after the screensaver block explaining `photo_date`:

```md
Screensaver corner items accept `{ type: 'photo_date' }` to show the EXIF capture date
(`DateTimeOriginal`) of the current slide. It lazy-loads `exifreader`, so it only ships
when used. Format via `format` (date-fns tokens, default `dd MMMM yyyy`); the configured
`locale` is applied.
```

In the **Function context** section (around line 349), extend the object:

```js
   memo: Function, // (key, ttlSeconds, fn) -> value; memoizes fn() for ttlSeconds
   uiState: Function, // (key) -> value; read a page-level UI state value
   setUiState: Function, // (key, value) -> void; set a value and re-render affected tiles
```

- [ ] **Step 2: Update `public/config/config.example.js`**

Uncomment/extend the screensaver example to show `slideCacheBust` and a `photo_date` item:

```js
   /*screensaver: {// optional
      timeout: 300, // after 5 mins of inactive
      slidesTimeout: 10, // 10s for one slide
      slideCacheBust: 300, // append a rolling cache-bust query to slide bgs (optional)
      styles: { fontSize: '40px' },
      leftBottom: [{ type: 'datetime' }], // put datetime to the left-bottom of screensaver
      rightBottom: [{ type: 'photo_date' }], // show the EXIF date of the current slide
      slides: [...]
   },*/
```

Also add the new top-level keys as commented examples near `timeFormat`:

```js
   /* autoReloadInterval: seconds between full page reloads (optional) */
   //autoReloadInterval: 3600,
   /* scripts: extra scripts to load before the app renders (optional) */
   //scripts: ['https://cdn.jsdelivr.net/npm/exif-js'],
   /* locale: date-fns locale name, e.g. 'sv-se' (optional) */
   //locale: 'sv-se',
```

- [ ] **Step 3: Verify nothing broke**

Run: `npm run lint && npm run typecheck && npm run test && npm run build`
Expected: all four pass.

- [ ] **Step 4: Commit**

```bash
git add README.md public/config/config.example.js
git commit -m "Document config quality-of-life features"
```

---

## Self-Review

**Spec coverage:**
- §1 autoReloadInterval → Task 3 ✓
- §2 scripts → Task 4 ✓
- §3 locale → Task 2 (+ DateDisplay) ✓
- §4 slideCacheBust → Task 5 ✓
- §5 photo_date → Task 9 ✓ (dynamic import keeps exifreader out of the main bundle; per-slide and global slots wired)
- §6 select-domain → Task 8 ✓
- §7 memo → Task 6 ✓ (module-level cache, lazy eviction, no cap, `ponytail:` comment)
- §8 uiState → Task 7 ✓ (zustand slice + context + Tile subscription)
- Cross-cutting types/schema → Task 1 (schema intentionally untouched — permissive; acceptance tests added) ✓
- README/example → Task 10 ✓

**Placeholder scan:** No TBD/TODO; every step has concrete code and a runnable test command. The one noted uncertainty (exact `sv` date-fns output in `PhotoDate.test.tsx`) is handled by a run-once-and-adjust note rather than a placeholder.

**Type consistency:**
- `memo<T>(key: string, ttlSeconds: number, fn: () => T): T` — type (Task 1), impl (Task 6), usage identical.
- `uiState(key)`, `setUiState(key, value)` — consistent across Task 1, Task 7, and the Tile hidden test.
- `getDateLocale(locale?: string): Locale | undefined` — Task 2 and used in Task 9.
- `slideBgUrl`/`slideBg` naming: helper in Task 5 is `slideBg(bg, cacheBust)` returning a url; Task 9 references `slideBgUrl` — renamed consistently in Task 9 step 6 to `const slideBgUrl = (bg: string) => slideBg(bg, cacheBust);` in Task 5 step 3. (Task 5 introduces `slideBg`; Task 9 uses the local alias `slideBgUrl` — consistent because Task 5 defines `slideBgUrl` inline before the return. Verify both exist in Screensaver.tsx when Task 9 lands.)
- `loadScript(url: string): Promise<void>` — Task 4 consistent between impl and main.tsx wiring.
