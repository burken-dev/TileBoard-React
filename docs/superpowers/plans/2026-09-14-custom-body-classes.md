# Custom Body Classes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `customClasses` (string or string array) to root config and page config, appended to `document.body.className` via `bodyClasses()`.

**Architecture:** Extend `TileBoardConfig` and `PageConfig` types, add a small `normalizeClasses` helper in `src/utils/layout.ts`, extend `bodyClasses()` with an optional 4th param `activePageIndex`, and subscribe `App.tsx` to `activePage` from the store.

**Tech Stack:** TypeScript, React 19, zustand store, vitest, eslint, tsc.

## Global Constraints

- Backwards compatible: absent `customClasses` changes nothing.
- Values used verbatim, no prefixing (unlike `-theme-`).
- Body gets global + active page only, in that order after system classes.
- Invalid entries (non-string, empty, whitespace-only) silently ignored; no validation errors.
- No `src/config/schema.ts` change (minimal passthrough schema).
- Commit messages: imperative present tense.
- Verification before push: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`.

---

## File structure

- Modify `src/config/types.ts`: add `customClasses?: string | string[]` to `TileBoardConfig` and to `PageConfig`. No runtime impact, enables the feature.
- Modify `src/utils/layout.ts`: add `normalizeClasses()` helper, extend `bodyClasses()` signature with optional `activePageIndex?: number | null`, append global + active-page classes.
- Modify `src/utils/layout.test.ts`: cover string split, array, page append, filtering, out-of-range, unchanged default.
- Modify `src/App.tsx`: subscribe to `activePage`, pass to `bodyClasses()`, add to effect deps.

---

### Task 1: Types + bodyClasses logic + unit tests

**Files:**
- Modify: `src/config/types.ts`
- Modify: `src/utils/layout.ts`
- Modify: `src/utils/layout.test.ts`
- Test: `src/utils/layout.test.ts`

**Interfaces:**
- Consumes: `TileBoardConfig`, `PageConfig` from `src/config/types.ts`; `bodyClasses(config, scroll, displayMode)` from `src/utils/layout.ts`.
- Produces: `TileBoardConfig.customClasses?: string | string[]`; `PageConfig.customClasses?: string | string[]`; `normalizeClasses(value: unknown): string[]`; `bodyClasses(config, scroll, displayMode?, activePageIndex?: number | null): string[]` consumed by Task 2.

- [ ] **Step 1: Add types**

In `src/config/types.ts`, in `PageConfig` after `hidden?: Field<boolean>;` add:

```ts
customClasses?: string | string[];
```

In `TileBoardConfig` after `customTheme?: string | string[] | null;` add:

```ts
customClasses?: string | string[];
```

- [ ] **Step 2: Write failing unit tests**

In `src/utils/layout.test.ts`, append a new describe block (keep existing imports and blocks untouched):

```ts
describe('bodyClasses customClasses', () => {
  const scroll = { horizontal: false, vertical: false };

  it('appends a global string split on whitespace', () => {
    const config: TileBoardConfig = {
      serverUrl: 'http://h',
      pages: [],
      customClasses: 'kiosk dark-mode',
    };
    const classes = bodyClasses(config, scroll);
    expect(classes).toContain('kiosk');
    expect(classes).toContain('dark-mode');
  });

  it('appends a global array after system classes', () => {
    const config: TileBoardConfig = {
      serverUrl: 'http://h',
      pages: [],
      menuPosition: 'left',
      customClasses: ['foo', 'bar'],
    };
    const classes = bodyClasses(config, scroll);
    expect(classes).toContain('foo');
    expect(classes).toContain('bar');
    expect(classes.indexOf('foo')).toBeGreaterThan(classes.indexOf('-menu-left'));
  });

  it('appends active page classes after global ones', () => {
    const config: TileBoardConfig = {
      serverUrl: 'http://h',
      pages: [{ title: 'A', customClasses: 'living-room', groups: [] }],
      customClasses: 'kiosk',
    };
    const classes = bodyClasses(config, scroll, 'fixed', 0);
    expect(classes).toContain('kiosk');
    expect(classes).toContain('living-room');
    expect(classes.indexOf('living-room')).toBeGreaterThan(classes.indexOf('kiosk'));
  });

  it('ignores empty entries and out-of-range page index', () => {
    const config: TileBoardConfig = {
      serverUrl: 'http://h',
      pages: [{ title: 'A', groups: [] }],
      customClasses: ['  ', '', 'ok'],
    };
    const classes = bodyClasses(config, scroll, 'fixed', 99);
    expect(classes).toContain('ok');
    expect(classes).not.toContain('');
    expect(classes).not.toContain('  ');
  });

  it('changes nothing when customClasses is absent', () => {
    const config: TileBoardConfig = { serverUrl: 'http://h', pages: [] };
    expect(bodyClasses(config, scroll)).not.toContain('kiosk');
  });
});
```

Note: this uses `TileBoardConfig` already imported in the test file. If the import is missing, add `TileBoardConfig` to the existing type import from `../config/types`.

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/utils/layout.test.ts`
Expected: FAIL — `bodyClasses` ignores `customClasses` (missing `kiosk`, `foo`, `living-room`).

- [ ] **Step 4: Implement normalize helper + extend bodyClasses**

In `src/utils/layout.ts`, before `bodyClasses`, add:

```ts
function normalizeClasses(value: unknown): string[] {
  const list = Array.isArray(value) ? value : [value];
  const out: string[] = [];
  for (const entry of list) {
    if (typeof entry !== 'string') continue;
    for (const part of entry.split(/\s+/)) {
      const cls = part.trim();
      if (cls) out.push(cls);
    }
  }
  return out;
}
```

Change the `bodyClasses` signature from:

```ts
export function bodyClasses(
  config: TileBoardConfig,
  scroll: { horizontal: boolean; vertical: boolean },
  displayMode: DisplayMode = 'fixed',
): string[] {
```

to:

```ts
export function bodyClasses(
  config: TileBoardConfig,
  scroll: { horizontal: boolean; vertical: boolean },
  displayMode: DisplayMode = 'fixed',
  activePageIndex?: number | null,
): string[] {
```

Before the final `return classes;` in `bodyClasses` (after the scroll lines, keeping them untouched), insert:

```ts
classes.push(...normalizeClasses(config.customClasses));
if (typeof activePageIndex === 'number') {
  const page = config.pages?.[activePageIndex];
  if (page) classes.push(...normalizeClasses(page.customClasses));
}
```

Do not touch system-class logic above.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/utils/layout.test.ts`
Expected: PASS (all blocks including existing `bodyClasses` tests).

- [ ] **Step 6: Run typecheck and lint for touched files**

Run: `npm run typecheck`
Expected: PASS.

Run: `npx eslint src/utils/layout.ts src/utils/layout.test.ts src/config/types.ts`
Expected: PASS, no errors.

- [ ] **Step 7: Commit**

```bash
git add src/config/types.ts src/utils/layout.ts src/utils/layout.test.ts
git commit -m "Add customClasses support to bodyClasses"
```

---

### Task 2: Wire active page in App.tsx

**Files:**
- Modify: `src/App.tsx`
- Test: `src/utils/layout.test.ts` (already passing from Task 1; manual verification here)

**Interfaces:**
- Consumes: `bodyClasses(..., activePageIndex?)` from Task 1; `activePage: number` selector from `useAppStore` in `src/store/index.ts`.
- Produces: `document.body.className` now includes global + active-page custom classes; swapped on navigation via existing `openPage()`.

- [ ] **Step 1: Subscribe to activePage and pass through**

In `src/App.tsx`, change:

```ts
export default function App({ config }: AppProps) {
  const scrolled = useAppStore((s) => s.scrolled);
  const displayMode = useAppStore((s) => s.displayMode);
```

to:

```ts
export default function App({ config }: AppProps) {
  const scrolled = useAppStore((s) => s.scrolled);
  const displayMode = useAppStore((s) => s.displayMode);
  const activePage = useAppStore((s) => s.activePage);
```

Change:

```ts
useEffect(() => {
  document.body.className = bodyClasses(config, scrolled, displayMode).join(' ');
}, [config, scrolled, displayMode]);
```

to:

```ts
useEffect(() => {
  document.body.className = bodyClasses(config, scrolled, displayMode, activePage).join(' ');
}, [config, scrolled, displayMode, activePage]);
```

No other changes in this file.

- [ ] **Step 2: Verify with full test suite**

Run: `npx vitest run src/utils/layout.test.ts src/App.test.tsx`
Expected: PASS.

- [ ] **Step 3: Run full verification**

Run: `npm run lint`
Expected: PASS.

Run: `npm run typecheck`
Expected: PASS.

Run: `npm run test`
Expected: PASS (full suite).

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "Apply customClasses for active page to body tag"
```

---

## Self-review

- Spec coverage: types for root + page (Task 1 Step 1); normalize string-split + array + trim + ignore non-strings (Task 1 Step 4); order system → global → page (Task 1 Steps 2/4); active-page-only swap on navigation via store subscription (Task 2 Step 1); backwards compat + out-of-range + whitespace handling (Task 1 Steps 2/4); unit tests for each (Task 1 Steps 2-5); no schema change per spec. Covered.
- Placeholder scan: no TBD/TODO; every step has exact code, exact file paths, exact commands with expected outcomes. Fixed.
- Type consistency: `customClasses?: string | string[]` spelled identically in both interfaces and tests; `bodyClasses(config, scroll, displayMode?, activePageIndex?: number | null)` signature identical in Task 1 Step 4 and Task 2 Step 1; `normalizeClasses(value: unknown): string[]` defined once, used consistently. Fixed.
