# Step 02: Config Types, Schema, Defaults, Loader

**Goal:** Define the new typed config format, validate `window.CONFIG` with zod at
startup, apply defaults, and render a validation-error screen on failure.

**Legacy reference:** `git show LEGACY_REF:scripts/app.js` (constants + DEFAULT_HEADER),
`git show LEGACY_REF:config.example.js`, `git show LEGACY_REF:README.md`,
`git show LEGACY_REF:TILE_EXAMPLES.md`.

**Files:**
- Create: `src/config/types.ts`, `src/config/constants.ts`, `src/config/schema.ts`,
  `src/config/defaults.ts`, `src/config/load.ts`, `src/components/ConfigError.tsx`
- Test: `src/config/schema.test.ts`, `src/config/defaults.test.ts`
- Modify: `src/main.tsx`, `public/config.example.js`

## New config format

Same shape family as legacy (pages → groups → tiles) but:
- Users write string literals (`type: 'switch'`, `transition: 'animated_gpu'`) instead
  of legacy globals (`TYPES.SWITCH`).
- Validated with zod on load; unknown tile `type` values are rejected with a clear error.
- Functions remain allowed for dynamic fields; they are typed as `ConfigFunction` and
  pass through zod as `z.custom<Function>`.

## Interfaces produced (used by all later specs)

### src/config/types.ts

```ts
import type { CSSProperties } from 'react';

export interface HaEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  last_changed?: string;
  last_updated?: string;
}

export type EntityStates = Record<string, HaEntity>;

export interface FunctionContext {
  states: EntityStates;
  parseFieldValue: (value: unknown, item?: TileConfig, entity?: HaEntity | null) => unknown;
  callService: (domain: string, service: string, serviceData?: Record<string, unknown>) => void;
  sendMessage: <T = any>(data: Record<string, unknown>) => Promise<T>;
  openPage: (pageIndex: number) => void;
}

export type ConfigFunction<T = unknown> = (
  this: FunctionContext,
  item: TileConfig,
  entity: HaEntity | null,
) => T;

export type Field<T> = T | ConfigFunction<T>;

export type TileType =
  | 'device_tracker' | 'script' | 'automation' | 'sensor' | 'sensor_icon' | 'switch'
  | 'lock' | 'cover' | 'cover_toggle' | 'fan' | 'input_boolean' | 'light' | 'text_list'
  | 'input_number' | 'input_select' | 'input_datetime' | 'camera' | 'camera_thumbnail'
  | 'camera_stream' | 'scene' | 'slider' | 'iframe' | 'door_entry' | 'weather'
  | 'climate' | 'media_player' | 'custom' | 'alarm' | 'weather_list' | 'vacuum'
  | 'popup_iframe' | 'dimmer_switch' | 'gauge' | 'image';

export interface HistoryConfig {
  entity?: Field<string | string[]>;
  offset?: number;                     // ms, default 24h
  options?: Record<string, unknown>;   // chart.js options
  styles?: CSSProperties;
  classes?: string;
}

export interface TileConfig {
  type: TileType;
  id: string | HaEntity;               // entity_id, or inline synthetic entity object
  position: [number, number];
  title?: Field<string>;
  subtitle?: Field<string>;
  width?: number;                      // default 1
  height?: number;                     // default 1
  state?: Field<string> | false;
  states?: Record<string, string> | ConfigFunction<string>;
  icon?: Field<string>;
  icons?: Record<string, string> | ConfigFunction<string>;
  bg?: Field<string>;
  bgSuffix?: Field<string>;
  bgOpacity?: Field<number>;
  bgSize?: string;
  theme?: TileType;
  slides?: Array<{ bg: Field<string> }>;
  slidesDelay?: number;
  action?: ConfigFunction;
  secondaryAction?: ConfigFunction;
  hidden?: Field<boolean>;
  classes?: string[];
  customStyles?: CSSProperties | ConfigFunction<CSSProperties>;
  history?: HistoryConfig;
  value?: Field<string | number>;
  unit?: Field<string>;
  filter?: (this: FunctionContext, value: unknown, item: TileConfig, entity: HaEntity | null) => unknown;
  // slider family
  slider?: SliderConfig;
  sliders?: SliderConfig[];
  bottom?: boolean;
  // light
  colorpicker?: boolean;
  // media player
  hideSource?: boolean;
  hideMuteButton?: boolean;
  // camera
  refresh?: Field<number>;
  fullscreen?: TileConfig;
  objFit?: string;
  bufferLength?: number;
  // device tracker
  map?: 'google' | 'mapbox' | 'yandex';
  zoomLevels?: number[];
  hideEntityPicture?: boolean;
  // text list / weather list
  list?: Array<Record<string, Field<unknown>>>;
  hideHeader?: boolean;
  // weather
  fields?: Record<string, Field<unknown>>;
  iconImage?: Field<string>;
  // iframe / popup_iframe
  url?: Field<string>;
  iframeStyles?: Field<CSSProperties>;
  iframeClasses?: Field<string | string[]>;
  // gauge
  settings?: Record<string, Field<unknown>>;
  // custom
  customHtml?: Field<string>;
  // door entry
  layout?: { camera: TileConfig; tiles: TileConfig[]; page?: PageConfig };
  // runtime flags (not user-provided, mutated by the app)
  loading?: boolean;
  controlsEnabled?: boolean;
}

export interface SliderConfig {
  title?: string;
  field?: string;                      // attribute / service-data field
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  formatValue?: (conf: { value: number }) => string | number;
  request?: { type?: string; domain: string; service: string; field?: string };
}

export interface GroupConfig {
  title?: string;
  width?: number;
  height?: number;
  groupMarginCss?: string;
  hidden?: Field<boolean>;
  items: TileConfig[];
}

export interface PageConfig {
  title?: string;
  id?: string;
  bg?: Field<string>;
  bgSuffix?: Field<string>;
  icon?: string;
  tileSize?: number;
  tileMargin?: number;
  groupMarginCss?: string;
  hidden?: Field<boolean>;
  header?: HeaderConfig;
  groups: GroupConfig[];
}

export type HeaderItemType = 'time' | 'date' | 'datetime' | 'weather' | 'custom_html';

export interface HeaderItemConfig {
  type: HeaderItemType;
  format?: string;                     // date-fns format for 'date'/'datetime'
  dateFormat?: string;
  styles?: CSSProperties;
  html?: string;
  icon?: Field<string>;
  icons?: Record<string, string> | ((icon: string, item: unknown, entity: unknown) => string);
  iconImage?: Field<string>;
  fields?: Record<string, Field<unknown>>;
  hidden?: Field<boolean>;
}

export interface HeaderConfig {
  styles?: CSSProperties;
  left?: HeaderItemConfig[];
  right?: HeaderItemConfig[];
}

export interface SlideConfig {
  bg: string;
  styles?: CSSProperties;
  leftTop?: HeaderItemConfig[];
  leftBottom?: HeaderItemConfig[];
  rightTop?: HeaderItemConfig[];
  rightBottom?: HeaderItemConfig[];
}

export interface ScreensaverConfig {
  timeout: number;                     // seconds idle before showing
  slidesTimeout?: number;              // seconds per slide, default 1
  styles?: CSSProperties;
  leftTop?: HeaderItemConfig[];
  leftBottom?: HeaderItemConfig[];
  rightTop?: HeaderItemConfig[];
  rightBottom?: HeaderItemConfig[];
  slides: SlideConfig[];
}

export interface EventConfig {
  command: string;
  action: (this: FunctionContext, event: Record<string, unknown>) => void;
}

export interface TileBoardConfig {
  serverUrl: string;
  wsUrl?: string;                      // default: derived from serverUrl
  authToken?: string | null;
  customTheme?: string | string[] | null;
  transition?: 'animated' | 'animated_gpu' | 'simple';
  tileSize?: number;
  tileMargin?: number;
  entitySize?: 'small' | 'normal' | 'big';
  groupMarginCss?: string;
  pingConnection?: boolean;
  debug?: boolean;
  timeFormat?: 12 | 24;
  googleApiKey?: string | null;
  mapboxToken?: string | null;
  mapboxStyle?: string | null;
  menuPosition?: 'left' | 'bottom';
  hideScrollbar?: boolean;
  groupsAlign?: 'horizontally' | 'vertically';
  notiesPosition?: 'left' | 'right';
  ignoreErrors?: boolean;
  rememberLastPage?: boolean;
  doorEntryTimeout?: number;           // seconds
  clockStyles?: CSSProperties;
  onReady?: (this: FunctionContext) => void;
  pages: PageConfig[];
  events?: EventConfig[];
  screensaver?: ScreensaverConfig;
  header?: HeaderConfig;
}
```

### src/config/constants.ts

Port from `git show LEGACY_REF:scripts/app.js` verbatim (as typed consts): `FEATURES`
(light/media_player/vacuum bitmasks), `GAUGE_DEFAULTS` (see step 06), `DEFAULT_HEADER`.
Tile/header type strings are already the literal values of the types above — do NOT
create enum objects for them.

### src/config/schema.ts

```ts
import { ZodError } from 'zod';

export type ConfigResult =
  | { ok: true; config: TileBoardConfig }
  | { ok: false; errors: string[] };

export function validateConfig(raw: unknown): ConfigResult;
```

Zod schema rules:
- `serverUrl` required string; `pages` required non-empty array; every group `items`
  required array; every tile requires `type` (enum of TileType values), `id`
  (string or object), `position` (tuple of two numbers).
- Function-valued fields use `z.custom<Function>()` unions with their literal types.
- `.catchall`-style strictness NOT required: unknown extra keys are allowed (forward
  compat) except on tiles, where unknown keys are allowed too (tile-type-specific keys
  are numerous) — do not reject unknown keys anywhere.
- `errors` is a human-readable list: `pages[0].groups[1].items[2].type: invalid tile type "foo"`.

### src/config/defaults.ts

```ts
export function applyDefaults(config: TileBoardConfig): TileBoardConfig;
```

Defaults (legacy sources in parens): `transition: 'animated'`, `tileSize: 150`,
`tileMargin: 6`, `entitySize: 'normal'`, `menuPosition: 'left'`,
`groupsAlign: 'horizontally'`, `notiesPosition: 'right'`, `timeFormat: 24`,
`pingConnection: true`, `doorEntryTimeout: 10`, `header: DEFAULT_HEADER`,
`wsUrl`: if absent derive from `serverUrl` (`http(s)://host` → `ws(s)://host/api/websocket`).
(app.js DEFAULT_HEADER; config.example.js defaults.)

### src/config/load.ts

```ts
export function loadConfig(): ConfigResult;
```

Reads `window.CONFIG`. Missing → `{ ok: false, errors: ['config.js is missing or did not set window.CONFIG. Copy public/config.example.js to config.js.'] }`.
Valid → run zod, then `applyDefaults`.

### src/components/ConfigError.tsx

Renders `<div className="config-error">` with the heading "TileBoard config error" and
one `<p>` per error string. Minimal inline styling is fine (plain `.config-error` class
added to main.less is optional).

- [ ] **Step 1: Write failing tests** (`src/config/schema.test.ts`)

Cover at minimum:
- minimal valid config (`serverUrl` + one page/group/tile with type `switch`) → ok.
- missing `serverUrl` → not ok, error mentions `serverUrl`.
- tile with `type: 'bogus'` → not ok, error includes the path `pages[0].groups[0].items[0].type`.
- function values accepted: `states: (item, entity) => 'x'` validates.
- defaults: `applyDefaults` fills `tileSize` 150, derives `wsUrl`
  (`http://h:8123` → `ws://h:8123/api/websocket`; `https://h` → `wss://h/api/websocket`).

- [ ] **Step 2: Run tests — expect failures** (module missing)

- [ ] **Step 3: Implement types.ts, constants.ts, schema.ts, defaults.ts, load.ts**

- [ ] **Step 4: Run tests — expect pass.** `npm run typecheck` clean.

- [ ] **Step 5: Wire into main.tsx**

```tsx
const result = loadConfig();
if (!result.ok) { root.render(<ConfigError errors={result.errors} />); }
else { root.render(<App config={result.config} />); }
```

`App` accepts `config: TileBoardConfig` prop (store wiring happens in step 03; for now
App can ignore it).

- [ ] **Step 6: Rewrite public/config.example.js**

Same structure as `git show LEGACY_REF:config.example.js` but with string literals
(`transition: 'animated_gpu'`, `type: 'sensor'`, ...), no legacy globals, and a comment
header explaining the file is loaded at runtime (no build needed). Keep the example
pages/tiles so it renders something against a real HA instance.

- [ ] **Step 7: Verify** — `npm run lint && npm run typecheck && npm run test && npm run build`

- [ ] **Step 8: Commit** — `git commit -m "step 02: config types, zod schema, defaults, loader"`

**Acceptance criteria:** With no `config.js`, the app renders the error screen naming
the problem. With a copy of the example config, it renders the shell (step 01) and
tests cover validation + defaults.

**Out of scope:** anything consuming the config beyond storing it (steps 03+).
