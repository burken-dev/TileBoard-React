# TileBoard React Conversion — Step 00: Overview

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Each spec file (`01` through `12`) is one task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the abandoned AngularJS TileBoard dashboard as a React + TypeScript app with full feature parity, one spec file at a time.

**Architecture:** Vite + React 18 + TypeScript SPA. Config is a runtime-loaded `config.js` (`window.CONFIG`) validated with zod. Home Assistant connection via `home-assistant-js-websocket`. One zustand store holds entities, config, and UI state. Domain logic lives in pure functions in `src/utils/` and `src/ha/`; React components stay thin.

**Tech Stack:** React 18, TypeScript, Vite, zustand, zod, home-assistant-js-websocket, chart.js (+ chartjs-adapter-date-fns, date-fns), hls.js, react-colorful, @mdi/font, Vitest, @testing-library/react, ESLint, Prettier, LESS.

## Global Constraints

- Specs are executed **strictly in numeric order** (01 → 12). Never skip ahead.
- Legacy Angular code is the source of truth for behavior. Reference it with
  `git show LEGACY_REF:<path>` (LEGACY_REF below). Do not modify it.
- `npm run build && npm run lint && npm run typecheck && npm run test` must all be
  green before committing each step.
- One commit per spec. Commit message: `step NN: <title>` (title from the spec).
- No comments in code unless the spec says otherwise.
- Do not modify files outside a spec's listed scope without noting it in the commit
  message body.
- Do not add dependencies beyond the list in this file.
- No new features beyond parity.

## LEGACY_REF

```
LEGACY_REF=fd49305
```

Last commit containing the complete Angular app. Key legacy paths:

| Legacy path | Contents |
|---|---|
| `scripts/app.js` | Constants (TYPES, FEATURES, THEMES...), DEFAULT_HEADER, utils (timeAgo, debounce, toAbsoluteServerURL...) |
| `scripts/init.js` | Bootstrap, Chart.js defaults |
| `scripts/models/api.js` | WebSocket API, OAuth flow, token handling |
| `scripts/models/noty.js` | Notification model |
| `scripts/controllers/main.js` | God controller: all layout, entity, action, popup logic |
| `scripts/controllers/screensaver.js` | Screensaver controller |
| `scripts/controllers/noty.js` | Notifications controller |
| `scripts/directives.js` | tile/camera/clock/date/iframe/header directives |
| `index.html` | All templates (page, tile, popups, header, screensaver, noties) |
| `styles/main.less`, `styles/themes.less` | Styling (ported as-is) |
| `config.example.js`, `README.md`, `TILE_EXAMPLES.md` | Config format documentation |

## Allowed dependencies

Runtime: `react`, `react-dom`, `zustand`, `home-assistant-js-websocket`, `zod`,
`chart.js`, `chartjs-adapter-date-fns`, `date-fns`, `hls.js`, `react-colorful`,
`@mdi/font`.

Dev: `vite`, `@vitejs/plugin-react`, `typescript`, `less`, `vitest`, `jsdom`,
`@testing-library/react`, `@testing-library/jest-dom`, `@types/react`,
`@types/react-dom`, `eslint`, `prettier`, `eslint-config-prettier`,
`@eslint/js`, `typescript-eslint`.

## Final repository layout

```
index.html                    Vite entry (root)
package.json vite.config.ts tsconfig.json eslint.config.js .prettierrc
public/
  config.example.js           runtime-loaded example config
  favicon.png
  images/                     backgrounds, screenshots (copied from legacy)
styles/
  main.less themes.less weather-icons.css custom.css   (ported from legacy)
src/
  main.tsx                    bootstrap: validate window.CONFIG -> render
  App.tsx                     root component, body classes, connection lifecycle
  config/
    types.ts                  all config + entity types
    constants.ts              TYPES, FEATURES, HEADER_ITEMS, GAUGE_DEFAULTS, DEFAULT_HEADER
    schema.ts                 zod schema, validateConfig()
    defaults.ts               applyDefaults()
  ha/
    connection.ts             auth + websocket lifecycle
    services.ts               callService, sendMessage, getHistory
  store/
    index.ts                  zustand store (AppState)
  utils/
    functions.ts              callFunction + FunctionContext
    fields.ts                 parseFieldValue / parseString (& and @ resolver)
    layout.ts                 pure layout calculations
    misc.ts                   leadZero, timeAgo, debounce, toAbsoluteServerURL, escapeClass
    history.ts                history API response -> chart datasets mapping
  components/
    Pages.tsx Page.tsx Group.tsx Tile.tsx TileBody.tsx
    tiles/                    per-family tile renderers (specs 06-09)
    popups/                   CameraPopup, IframePopup, HistoryPopup, DoorEntryPopup,
                              AlarmPopup, DatetimePopup (specs 07-09)
    Header.tsx HeaderItem.tsx Clock.tsx DateDisplay.tsx (spec 10)
    Screensaver.tsx           (spec 11)
    Notifications.tsx         (spec 10)
  hooks/
    useLongPress.ts usePanGesture.ts useIdle.ts ... (created by the spec that needs them)
  test/
    setup.ts                  vitest setup
```

## Key shared contracts (locked — all specs must use these exact names)

See `02-config.md` for `TileBoardConfig`/`TileConfig` types, `03-ha-connection.md`
for the store (`useAppStore`) and `callService`/`sendMessage`/`getHistory`,
`05-tile-foundation.md` for `callFunction`, `parseFieldValue`, and the `Tile` component
props. Each spec repeats the contracts it consumes and produces.

## Execution rules

- Read this file plus your assigned spec before starting. Read the referenced legacy
  code with `git show LEGACY_REF:<path>` before implementing behavior.
- Every spec follows TDD where practical: write the test for pure logic first, watch it
  fail, implement, watch it pass. For pure UI, render tests against a mocked store.
- If a spec's assumption is invalidated by an earlier step, STOP and report the
  discrepancy. Do not improvise cross-spec changes.
- If you must deviate from a spec, list every deviation in the commit message body.

## Step index

| Step | File | Title |
|---|---|---|
| 01 | `01-scaffold.md` | Scaffold: delete Angular, Vite+React+TS+LESS+tests |
| 02 | `02-config.md` | Config types, zod schema, defaults, loader |
| 03 | `03-ha-connection.md` | HA auth/connection, entity store, services |
| 04 | `04-core-layout.md` | Pages, groups, grid layout, transitions, pan |
| 05 | `05-tile-foundation.md` | Tile shell, field resolver, actions plumbing |
| 06 | `06-tiles-simple.md` | Simple display + toggle tiles, gauge |
| 07 | `07-tiles-interactive.md` | Numeric/select/climate/cover/slider/light/datetime |
| 08 | `08-tiles-media.md` | Cameras, streams, media player |
| 09 | `09-tiles-complex.md` | Weather, maps, alarm, door entry, iframes, history |
| 10 | `10-header-notifications.md` | Header items, toast notifications |
| 11 | `11-screensaver.md` | Screensaver |
| 12 | `12-polish-themes.md` | Themes, error toast, README, parity checklist |
