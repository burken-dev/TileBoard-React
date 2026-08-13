# Step 01: Scaffold

**Goal:** Remove the Angular app, set up Vite + React + TypeScript + LESS + Vitest +
ESLint/Prettier, port styles and static assets, and get an empty shell building,
linting, type-checking and testing.

**Legacy reference:** `git show LEGACY_REF:styles/`, `git show LEGACY_REF:index.html`,
`git show LEGACY_REF:images/`

**Files:**
- Delete: `scripts/`, `config.example.js` (moved), `index.html` (replaced),
  `manifest.webmanifest` (keep, see below)
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `eslint.config.js`,
  `.prettierrc`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/vite-env.d.ts`,
  `src/test/setup.ts`, `src/test/setup.test.ts`
- Copy: `styles/` (keep as-is at repo root), `images/` → `public/images/`,
  `favicon.png` → `public/favicon.png`, `config.example.js` → `public/config.example.js`,
  `manifest.webmanifest` → `public/manifest.webmanifest`

- [ ] **Step 1: Verify LEGACY_REF is recorded**

`git show LEGACY_REF:scripts/app.js` must print the Angular constants file
(LEGACY_REF is defined in `00-overview.md`). If it does not, STOP and report.

- [ ] **Step 2: Create package.json and install dependencies**

`package.json`: name `tileboard`, private, `"type": "module"`. Scripts:

```json
{
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "lint": "eslint .",
  "typecheck": "tsc --noEmit",
  "test": "vitest run"
}
```

Install the exact runtime and dev dependencies listed in `00-overview.md`
("Allowed dependencies"). Run `npm install` and verify it succeeds.

- [ ] **Step 3: Vite config**

`vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  css: { preprocessorOptions: { less: {} } },
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
  },
});
```

(`test` block requires `/// <reference types="vitest/config" />` at the top.)

- [ ] **Step 4: TypeScript config**

`tsconfig.json`: strict mode, `jsx: react-jsx`, `moduleResolution: bundler`,
`target: ES2020`, `lib: [ES2020, DOM, DOM.Iterable]`, include `src` and `vite.config.ts`.
`npm run typecheck` must work with zero files in src yet passing (add src files in step 6).

- [ ] **Step 5: ESLint + Prettier**

Flat config (`eslint.config.js`) with `@eslint/js` recommended + `typescript-eslint`
recommended + `eslint-config-prettier`. Lint `src/` and `vite.config.ts`; ignore
`public/`, `styles/`, `dist/`. `.prettierrc`: single quotes, trailing commas.
`npm run lint` must pass.

- [ ] **Step 6: index.html + app shell**

Root `index.html` (Vite entry): `<div id="root">`, `<script type="module" src="/src/main.tsx">`,
favicon/manifest meta tags copied from `git show LEGACY_REF:index.html` (keep the PWA
tags; manifest now at `/manifest.webmanifest`). Also include
`<script src="/config.js"></script>` before the module script (config.js may not exist
yet; the module script must not crash because of it — see step 02, but scaffold must
tolerate a missing config by rendering a placeholder message).

`src/main.tsx`: renders `<App />` into `#root`. Imports `../styles/main.less`,
`../styles/themes.less`, `../styles/weather-icons.css`, `../styles/custom.css` —
create `styles/custom.css` as an empty file if missing in legacy (legacy loads it
optionally). Import `@mdi/font/css/materialdesignicons.css`.

`src/App.tsx`: renders `<div className="page-container">TileBoard</div>` (placeholder
until step 04).

`src/vite-env.d.ts`: `/// <reference types="vite/client" />` plus
`declare global { interface Window { CONFIG?: unknown } }`.

- [ ] **Step 7: Test setup**

`src/test/setup.ts`: `import '@testing-library/jest-dom/vitest';`

`src/test/setup.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

describe('test setup', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 8: Delete Angular files, move assets**

Delete `scripts/` and root `index.html` (already replaced). Move (git mv where
possible): `images/` → `public/images/`, `favicon.png` → `public/`,
`config.example.js` → `public/config.example.js`, `manifest.webmanifest` → `public/`.
Keep `styles/` at the root (imported by src). Keep `README.md`, `TILE_EXAMPLES.md`,
`LICENSE.md` at the root (README rewritten in step 12).

- [ ] **Step 9: Verify**

```
npm run lint && npm run typecheck && npm run test && npm run build
```

All four green. `npm run dev` serves the page showing "TileBoard" and the legacy
styles load without build errors (visually: dark background from main.less body rule).

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "step 01: scaffold Vite + React + TypeScript + LESS + tests"
```

**Acceptance criteria:** Angular code deleted from the working tree (still readable via
`git show LEGACY_REF:`); all four npm scripts green; dev server renders the shell with
legacy styles applied.

**Out of scope:** config loading logic (step 02), any component beyond the shell.
