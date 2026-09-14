# Custom Body Classes Design

Date: 2026-09-14
Status: approved
Option: B (global + per-page)

## Goal

Allow users to add custom CSS class names to the `<body>` tag via config,
so `custom.css` (`/config/styles/custom.css`) can target the whole dashboard
or specific pages without theme hacks.

## Background

- `App.tsx` sets `document.body.className = bodyClasses(config, scrolled, displayMode).join(' ')`.
- `bodyClasses()` in `src/utils/layout.ts` builds system classes from
  `customTheme` (`-theme-{name}`), `entitySize`, `menuPosition`,
  `groupsAlign`, `hideScrollbar`, `displayMode`, scroll state.
- Active page index already lives in the store (`activePage`).
- `schema.ts` validates only `serverUrl` + `pages` shape; extra fields pass
  through untouched.

## Design

### 1. Types (`src/config/types.ts`)

```ts
export interface TileBoardConfig {
  // ...
  customClasses?: string | string[];
}

export interface PageConfig {
  // ...
  customClasses?: string | string[];
}
```

Same name at both levels. Optional; absent means no extra classes.
Values are used verbatim (no `-theme-`-style prefixing).

### 2. Class resolution (`src/utils/layout.ts`)

Extend:

```ts
export function bodyClasses(
  config: TileBoardConfig,
  scroll: { horizontal: boolean; vertical: boolean },
  displayMode?: DisplayMode,
  activePageIndex?: number | null,
): string[]
```

Result order: `[...system classes, ...global customClasses, ...active page customClasses]`.
Body contains global + active page only, swapped on navigation.

Normalization helper:

- `string` input: split on whitespace, trim each part.
- `string[]` input: trim each entry.
- Drop empty strings and non-string entries; ignore out-of-range
  `activePageIndex` (no page classes). No dedupe, no errors.

### 3. Wiring (`src/App.tsx`)

- Subscribe to `activePage` via `useAppStore`.
- Pass it to `bodyClasses(config, scrolled, displayMode, activePage)`.
- Add `activePage` to the effect dependency array.
- No other files write `document.body.className`.

### 4. Data flow

Config load → store (`config`, `activePage`) → `App` effect →
`bodyClasses()` → `document.body.className`. Page navigation updates
`activePage` via existing `openPage()`, which re-triggers the effect.

### 5. Error handling

- Missing/empty `customClasses`: no change (backwards compatible).
- Whitespace-only, empty, or non-string entries: silently ignored.
- Invalid page index: page classes ignored, global still applied.

### 6. Testing

Extend `src/utils/layout.test.ts`:

- Global string (`"foo bar"` → `foo`, `bar`).
- Global array appended after system classes.
- Active page classes appended after global.
- Filtering of empty/whitespace entries.
- No `customClasses` → existing behavior unchanged.
- Out-of-range page index → no page classes.

No `schema.ts` change needed (minimal passthrough schema).

## Non-goals

- Dynamic/function-based classes (`Field<>`): deferred; static covers theming.
- Per-tile or per-group classes: out of scope.
- Validation errors for bad class names: silently ignored by design.
- Sanitization beyond trim/empty-filter.

## Example

```js
CONFIG = {
  customClasses: 'kiosk dark-mode',
  pages: [
    { title: 'Living', customClasses: ['living-room'], groups: [...] },
    { title: 'Bedroom', groups: [...] },
  ],
};
```

```css
/* custom.css */
body.kiosk #pages { cursor: none; }
body.living-room .page-container { background: #111; }
```
