# Screensaver Ambient Backdrop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an opt-in `ambient_backdrop` screensaver option that shows each slide contained within the screen with a blurred, grayscale version of the same image filling the screen behind it.

**Architecture:** When `ambient_backdrop: true`, the Screensaver component renders a `.screensaver-slide-backdrop` div inside each `.screensaver-slide` using the same cache-busted bg URL. CSS scoped under `.screensaver-slides.-ambient` flips the slide to `background-size: contain` and styles the backdrop as `cover` + `blur(10px) grayscale(85%)`. Because the backdrop is a child of the crossfading slide, the existing `-active`/`-prev` opacity transition applies to both layers in sync. The off-path (option unset) rendering is unchanged.

**Tech Stack:** React 19, Zustand, Less (via Vite), Vitest + Testing Library.

## Global Constraints

- Boolean-only config (`ambient_backdrop: true`). No blur/grayscale/shadow tunables — tuning stays in custom CSS / per-slide `styles`.
- Backdrop reuses the existing cache-busted URL helper `slideBgUrl` so it busts on the same cadence as the slide.
- Per-slide `styles` keep spreading onto the slide div — behavior unchanged.
- When the option is absent/false, the rendered DOM must be byte-for-byte unchanged.
- Follow existing patterns: Less in `styles/main.less` (Vite compiles it; `styles/main.css` is a stale artifact — do not edit it), config types in `src/config/types.ts`, field resolution lists in `src/utils/fields.ts`.
- Commit messages: imperative present tense. Branch: `feature/screensaver-ambient-backdrop`.
- Design spec: `docs/superpowers/specs/2026-08-16-screensaver-ambient-backdrop-design.md`

---

### Task 1: Config option + field resolution

**Files:**
- Modify: `src/config/types.ts:219-231` (`ScreensaverConfig`)
- Modify: `src/utils/fields.ts:122`
- Test: `src/utils/fields.test.ts`

**Interfaces:**
- Produces: `ScreensaverConfig.ambient_backdrop?: Field<boolean>` — added to the `SCREENSAVER_FIELDS` resolution list so it can be a function/entity-ref and is resolved by `resolveFields`. Task 2 reads `conf.ambient_backdrop` after that resolution.

- [ ] **Step 1: Write the failing test**

Add `SCREENSAVER_FIELDS` and `ScreensaverConfig` to the imports in `src/utils/fields.test.ts`:

```ts
import type { EntityStates, ScreensaverConfig, TileConfig } from '../config/types';
import { getItemFieldValue, parseFieldValue, parseString, resolveFields, resolveTile, SCREENSAVER_FIELDS } from './fields';
```

Append this describe block at the end of `src/utils/fields.test.ts`:

```ts
describe('resolveFields with SCREENSAVER_FIELDS', () => {
  it('resolves a function-valued ambient_backdrop', () => {
    const conf: ScreensaverConfig = {
      timeout: 5,
      slides: [],
      ambient_backdrop: () => true,
    };
    const resolved = resolveFields(
      conf,
      SCREENSAVER_FIELDS as readonly (keyof ScreensaverConfig)[],
      states,
      null,
    );
    expect(resolved.ambient_backdrop).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/fields.test.ts -t "ambient_backdrop"`
Expected: FAIL — the describe block doesn't exist yet (import of `SCREENSAVER_FIELDS` fails).

- [ ] **Step 3: Implement the config type and field list**

In `src/config/types.ts`, inside the `ScreensaverConfig` interface, add after `slideCacheBust`:

```ts
  ambient_backdrop?: Field<boolean>; // true = show slide contained with a blurred grayscale backdrop
```

In `src/utils/fields.ts`, extend the screensaver field list:

```ts
export const SCREENSAVER_FIELDS = ['timeout', 'slidesTimeout', 'slideCacheBust', 'styles', 'ambient_backdrop'] as const;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/fields.test.ts -t "ambient_backdrop"`
Expected: PASS (`resolveFieldValue` calls the function, returning `true`).

- [ ] **Step 5: Run typecheck and full fields test file**

Run: `npm run typecheck && npx vitest run src/utils/fields.test.ts`
Expected: both PASS.

- [ ] **Step 6: Commit**

```bash
git add src/config/types.ts src/utils/fields.ts src/utils/fields.test.ts
git commit -m "Add ambient_backdrop screensaver config option"
```

---

### Task 2: Screensaver component rendering

**Files:**
- Modify: `src/components/Screensaver.tsx:126-143`
- Test: `src/components/Screensaver.test.tsx`

**Interfaces:**
- Consumes: `ScreensaverConfig.ambient_backdrop?: Field<boolean>` (from Task 1, already resolved by `conf = resolveFields(...)`).
- Produces: When on, container class `screensaver-slides -ambient` and a `.screensaver-slide-backdrop` child as the first child of each `.screensaver-slide`, with inline `backgroundImage` = `url(${slideBgUrl(slide.bg)})`.

- [ ] **Step 1: Write the failing tests**

Append these two tests at the end of `src/components/Screensaver.test.tsx`:

```tsx
  it('renders an ambient backdrop per slide when ambient_backdrop is on', () => {
    createAppStore({
      ...config,
      screensaver: { ...config.screensaver!, ambient_backdrop: true },
    });
    const { container } = render(<Screensaver />);
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    const slides = container.querySelector('.screensaver-slides') as HTMLElement;
    expect(slides.classList.contains('-ambient')).toBe(true);
    const backdrops = container.querySelectorAll('.screensaver-slide-backdrop');
    expect(backdrops).toHaveLength(2);
    expect((backdrops[0] as HTMLElement).style.backgroundImage).toContain('a.jpg?t=0');
  });

  it('does not render ambient backdrops by default', () => {
    const { container } = render(<Screensaver />);
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(container.querySelectorAll('.screensaver-slide-backdrop')).toHaveLength(0);
    const slides = container.querySelector('.screensaver-slides') as HTMLElement;
    expect(slides.classList.contains('-ambient')).toBe(false);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/Screensaver.test.tsx -t "ambient"`
Expected: FAIL — no `-ambient` class, no `.screensaver-slide-backdrop` elements.

- [ ] **Step 3: Implement the component change**

In `src/components/Screensaver.tsx`, after the `cacheBust` line (line 92), add:

```tsx
  const ambient = Boolean(conf?.ambient_backdrop);
```

Change the slides container opening tag (line 127) to:

```tsx
      <div className={'screensaver-slides' + (ambient ? ' -ambient' : '')}>
```

Inside the slide map, as the first child of the returned `.screensaver-slide` div (before the `{slide.rightBottom ? ...}` block, i.e. right after the `style={{...}}>` closing of the div), add:

```tsx
              {ambient ? (
                <div
                  key="backdrop"
                  className="screensaver-slide-backdrop"
                  style={{ backgroundImage: `url(${slideBgUrl(slide.bg)})` }}
                />
              ) : null}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/Screensaver.test.tsx`
Expected: all PASS, including the two new tests and all existing ones.

- [ ] **Step 5: Commit**

```bash
git add src/components/Screensaver.tsx src/components/Screensaver.test.tsx
git commit -m "Render ambient backdrop layer in screensaver slides"
```

---

### Task 3: Ambient backdrop styles

**Files:**
- Modify: `styles/main.less:2100-2131` (inside the `.screensaver` block, after the `&-slide` rules)

**Interfaces:**
- Consumes: `-ambient` class and `.screensaver-slide-backdrop` elements from Task 2.
- Produces: `.screensaver-slides.-ambient` CSS that flips slides to `contain` + `drop-shadow` and styles the backdrop as full-screen `cover` + blur + grayscale.

- [ ] **Step 1: Add the CSS**

In `styles/main.less`, after the `&-slide` block (which ends with the `&.-prev` rule around line 2131) and before the `&-content` block, add:

```less
      &-slides.-ambient {
         .screensaver-slide {
            background-size: contain;
            background-repeat: no-repeat;
            filter: drop-shadow(black 10px 10px 20px);
         }

         .screensaver-slide-backdrop {
            position: absolute;
            inset: 0;
            background-size: cover;
            background-position: center;
            filter: blur(10px) grayscale(85%);
            z-index: -1;
         }
      }
```

Note: `z-index: -1` is safe because `.screensaver-slide` is `position: absolute; z-index: 51`, which creates a stacking context, so the backdrop paints behind the slide's contain image and content.

- [ ] **Step 2: Verify the Less compiles**

Run: `npm run build`
Expected: build succeeds (Vite compiles `main.less`; a Less syntax error here fails the build).

- [ ] **Step 3: Commit**

```bash
git add styles/main.less
git commit -m "Add ambient backdrop styles for screensaver"
```

---

### Task 4: Documentation examples

**Files:**
- Modify: `public/config/config.example.js:52-56`
- Modify: `public/config/reference_config_react.js:197-201`

**Interfaces:**
- Consumes: the `ambient_backdrop` option name from Task 1.
- Produces: documented example usage of the option.

- [ ] **Step 1: Update `config.example.js`**

In `public/config/config.example.js`, in the screensaver block (line 52), add after the `styles` line (line 56):

```js
      ambient_backdrop: true, // show slide contained, with a blurred grayscale version behind it
```

- [ ] **Step 2: Update `reference_config_react.js`**

In `public/config/reference_config_react.js`, in the screensaver block (line 197), add after the `slideCacheBust` line (line 200):

```js
      ambient_backdrop: true, // show slide contained, with a blurred grayscale version behind it
```

- [ ] **Step 3: Verify both files still parse as JS**

Run: `node --check public/config/config.example.js && node --check public/config/reference_config_react.js`
Expected: both exit 0 with no output.

- [ ] **Step 4: Commit**

```bash
git add public/config/config.example.js public/config/reference_config_react.js
git commit -m "Document ambient_backdrop screensaver option in example configs"
```

---

### Task 5: Full verification

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

Run: `git log --oneline -6`
Expected: the four feature commits on `feature/screensaver-ambient-backdrop` ahead of `fix/header-clock-styles-auth-tokens`.
