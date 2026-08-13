# TileBoard: Angular to React Conversion — Design

Date: 2026-08-13

## Context

TileBoard is a customizable Home Assistant dashboard built on AngularJS 1.x. The
upstream project is abandoned. The codebase has no build system: plain JS files loaded
via `document.write` script tags, a 2,321-line god controller (`scripts/controllers/main.js`),
inline HTML templates in `index.html`, vendored libraries (angular, hammer.js, Chart.js,
moment, hls.js, color-picker, angularjs-gauge), and a global `CONFIG` object supplied by
the user's `config.js`.

Total application code: ~3,900 lines of JS plus ~55KB of LESS/CSS.

Goal: full rewrite as a React application with full feature parity, executed by subagents
working through a sequence of spec files.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Config compatibility | New config format | No legacy constraints; cleaner design |
| Stack | Vite + React 18 + TypeScript | Modern tooling, typed internals |
| Feature scope | Full parity in one pass | All 30+ tile types, screensaver, cameras, history, alarms, themes |
| Repo layout | Replace in place | Angular files deleted in step 1; old code stays readable via git history |
| Styling | Port existing LESS as-is | Fastest path to visual parity; existing class names reused |
| HA connection | `home-assistant-js-websocket` | Official lib handles auth/reconnect; replaces hand-rolled api.js |
| Config loading | Runtime `config.js` setting `window.CONFIG`, validated with zod | Preserves zero-build config editing workflow |
| Plan structure | Vertical feature slices (approach A) | Each spec is independently implementable and verifiable |

## Target architecture

```
/                      index.html (Vite entry), package.json, vite.config.ts, tsconfig.json
public/                favicon, images/, config.example.js
styles/                main.less, themes.less, weather-icons.css, custom.css  (ported as-is)
src/
  main.tsx             bootstrap: load window.CONFIG -> validate -> render
  config/              schema.ts (zod), defaults.ts, types.ts
  ha/                  connection.ts (home-assistant-js-websocket), services.ts
  store/               zustand store: entities, config, UI state (active page, popups, screensaver)
  utils/               timeAgo, debounce, leadZero, '&'/@ field resolver, formatting
  components/          App, Pages/Page/Group, Tile shell, tiles/ (per family), popups/, Header, Screensaver, Notifications
```

### Dependencies

Runtime: `react`, `react-dom`, `zustand`, `home-assistant-js-websocket`, `zod`,
`chart.js`, `chartjs-adapter-date-fns`, `date-fns`, `hls.js`, `react-colorful`, `@mdi/font`.

Dev: `vite`, `typescript`, `@vitejs/plugin-react`, `less`, `vitest`,
`@testing-library/react`, `eslint`, `prettier`.

Replacements for vendored Angular-era libraries:

| Old | New |
|---|---|
| angular.min.js | React |
| hammer.js + angular.hammer.js | Native pointer events (page pan, long-press) |
| angularjs-gauge | Small custom SVG gauge component (full/semi/arch, thresholds) |
| color-picker.js | react-colorful |
| Chart.min.js + angular-chart | chart.js v4 directly |
| moment | date-fns / Intl |
| hls.js (vendored) | hls.js (npm) |

Icons: `@mdi/font` keeps the same `mdi-*` icon names used in old configs and templates.

### Config

- `config.js` is loaded via a `<script>` tag and sets `window.CONFIG`, same loading
  mechanism as the old app. Editing it requires no rebuild.
- The config shape is redesigned (no backward compatibility), but keeps the concepts:
  pages -> groups -> tiles, tile types, themes, header, screensaver, events.
- User-supplied functions remain allowed as values (states, icons, actions, filters).
- The `&sensor.x.state` (global entity reference) and `@attributes.x` (current entity
  reference) string resolver is kept as a utility for string values.
- On startup the config is validated with zod. Validation failures render an error
  screen listing the problems instead of white-screening.
- Defaults for omitted fields are ported from the old `scripts/app.js`
  (e.g. DEFAULT_HEADER, tileSize, transitions).

### State

One zustand store:
- `entities`: entity_id -> HA state object, updated from the WebSocket subscription.
- `config`: validated config.
- UI state: active page, open popup (camera / iframe / history / alarm / datetime /
  door entry), screensaver visibility, notification list.

### HA connection

`home-assistant-js-websocket` provides the auth flow (token storage, re-auth prompt),
connection with reconnect, and state subscription. On top of it, a thin `services.ts`
wraps `callService` for the actions tiles perform (toggle, cover, climate, media player,
alarm, etc.). The old app's `tileboard` HA event subscription is recreated so external
automations can still control the dashboard (open page, notify, screen on/off, custom).

## Spec files

Written to `docs/superpowers/specs/`. Executed strictly in numeric order; each file is
one subagent task.

| # | File | Scope |
|---|------|-------|
| 00 | `00-overview.md` | Index, execution rules for subagents, conventions, definition of done, verification commands, git ref of the Angular code |
| 01 | `01-scaffold.md` | Tag Angular code in git, delete it, Vite+React+TS+LESS pipeline, folder structure, lint/format/test setup, port styles + static assets. Runs and builds with a static shell |
| 02 | `02-config.md` | New config format spec, zod schema, defaults ported from old app.js, runtime loader, validation-error UI, config.example.js |
| 03 | `03-ha-connection.md` | Auth + WebSocket via home-assistant-js-websocket, reconnect/ping, entity store, service calls, tileboard HA-event subscription |
| 04 | `04-core-layout.md` | App shell: pages container + transitions (animated/GPU/simple), pages menu (left/bottom), page-level header, groups + tile grid positioning, hidden logic, pan gesture |
| 05 | `05-tile-foundation.md` | Tile shell: title/subtitle/state/icon/bg/slides/classes/customStyles/hidden, entity resolution, click + long-press actions, &/@ resolver, select overlay |
| 06 | `06-tiles-simple.md` | SENSOR, SENSOR_ICON, SWITCH, LOCK, COVER_TOGGLE, SCRIPT, AUTOMATION, SCENE, INPUT_BOOLEAN, VACUUM, CUSTOM, TEXT_LIST, IMAGE, GAUGE (SVG) |
| 07 | `07-tiles-interactive.md` | INPUT_NUMBER, INPUT_SELECT, FAN, CLIMATE, COVER, SLIDER, DIMMER_SWITCH, LIGHT (sliders + colorpicker), INPUT_DATETIME + datetime keypad popup |
| 08 | `08-tiles-media.md` | CAMERA, CAMERA_THUMBNAIL, CAMERA_STREAM (hls.js), MEDIA_PLAYER, fullscreen camera popup |
| 09 | `09-tiles-complex.md` | WEATHER, WEATHER_LIST, DEVICE_TRACKER (google/mapbox/yandex static maps), ALARM + keypad popup, DOOR_ENTRY popup, IFRAME, POPUP_IFRAME popup, history popup (chart.js) |
| 10 | `10-header-notifications.md` | Header items (time/date/datetime/weather/custom HTML), toast notifications (Noty) |
| 11 | `11-screensaver.md` | Screensaver: idle timeout, slides, corner items |
| 12 | `12-polish-themes.md` | Themes port, window.onerror -> toast, README rewrite, final parity checklist vs old app |

Every spec file contains: purpose, old-code reference paths (via `git show <ref>:...`),
files to create/modify, detailed behavior, acceptance criteria, verification commands,
and explicit out-of-scope notes.

## Verification

Testing: Vitest unit tests only. Required coverage per relevant spec: config schema
validation, &/@ resolver, utils, store logic (entity updates, service call payloads),
smoke renders of tile components with mocked entities. No e2e framework.

Definition of done per spec:
- `npm run build && npm run lint && npm run typecheck && npm run test` all green
- Acceptance criteria from the spec demonstrably met
- One commit per spec, message format `step NN: <title>`

Execution rules for subagents (codified in 00-overview.md):
- Specs are executed strictly in numeric order; never skip ahead.
- Old Angular behavior is the source of truth; read it via `git show <ref>:scripts/...`
  with the ref recorded in 00-overview.md.
- Do not modify files outside the spec's listed scope without noting it.
- If a spec's assumption is invalidated by an earlier slice, stop and report rather
  than improvise.

Visual parity: specs 06-09 include comparing against `images/tile-screenshots/` and
`images/screenshots/` shipped with the repo.

## Out of scope

- Backward compatibility with old config.js files.
- New features beyond parity (the redesigned config format is the only deliberate deviation).
- Server-side rendering, routing libraries (single-screen app; page switching is state),
  i18n (parity: English strings as in the old app).
