# Config selection via `?config=` query parameter

## Goal

Restore the legacy feature of loading different runtime config files per dashboard.
Without a query param the default `config.js` is loaded; with `?config=garage` the
file `garage.js` is loaded instead.

## Current behavior

`index.html` statically loads `<script src="/config/config.js">`, which sets
`window.CONFIG`. `loadConfig()` (`src/config/load.ts`) reads `window.CONFIG` and
validates it. There is no query-parameter support.

## Design

1. `index.html` — remove the static `<script src="/config/config.js"></script>` tag.
2. `src/config/load.ts` — add:
   - `configName()`: reads `?config=` from `location.search`, defaults to `config`.
   - `loadConfigScript(name)`: injects `<script src="/config/{name}.js">`, resolves
     on `onload`, rejects on `onerror`.
3. `src/main.tsx` — startup is async: `configName()` → `await loadConfigScript(name)`;
   on failure render `ConfigNotFound`, otherwise `loadConfig()` and render as today.
4. `src/components/ConfigNotFound.tsx` — new component: "Config `{name}.js` not found"
   plus a reload button (`location.reload()`). Reuses `.config-error` styling.
5. `nginx.conf` — unchanged. Only `config.js` keeps the example fallback; other names
   404 and reach the not-found screen.

## Acceptance

- `/` loads `/config/config.js`.
- `/?config=garage` loads `/config/garage.js`.
- `/?config=missing` shows the not-found screen with a reload button.
- `npm run lint`, `typecheck`, `test`, `build` all pass.