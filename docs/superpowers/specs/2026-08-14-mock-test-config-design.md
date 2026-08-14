# Design: Mock test config and simulated entity data

Date: 2026-08-14
Status: Approved

## Goal

A test configuration (`public/config/test.js`, loaded via `?config=test`) containing
every tile type, spread across multiple pages and groups with varied sizes/alignment,
backed by simulated entity data that matches the Home Assistant websocket entity shape
(`home-assistant-js-websocket` `subscribeEntities`). This is the quick feedback loop for
developing new tile types and modifying existing ones.

## 1. Mock config data flow

New optional field in `TileBoardConfig` (`src/config/types.ts`):

```ts
interface MockConfig {
  entities: HaEntity[]; // seeded once into the store
  interval?: number;    // ms between simulated updates, default 2000
}
```

`initConnection()` in `src/ha/connection.ts` branches when `config.mock` is present:

- Do not create a real websocket connection.
- `setStatus('ready')` immediately.
- `setEntities(mock.entities)` to seed the store.
- Start an interval (every `mock.interval` ms) that runs the simulator.
- Do not call `setConnection()`, so `callService`/`getHistory`/`sendMessage` fall back to
  mock implementations.

Ping/reconnect logic is inert because status is always `ready`.

## 2. Mock implementations in `src/ha/services.ts`

### callService

In mock mode (`!conn`), mutate the matching entity in the store based on
`(domain, service)` and `serviceData`:

- `switch`, `input_boolean`, `fan`, `lock`, `script`, `scene` → toggle or set state
- `light` → `turn_on`/`turn_off`; write `brightness` / `color_temp` / `rgb_color` from
  `serviceData` back into attributes
- `media_player` → `media_play`/`media_pause`/`media_stop`, `volume_set` (from
  `serviceData.volume_level`), `volume_up`/`volume_down`, `mute`, `turn_on`/`turn_off`,
  `select_source`
- `cover` → `open_cover`/`close_cover`/`stop_cover` set state and `current_position`
- `input_number`, `slider` (`input_number` domain), `climate` → write `value`/`temperature`
  back to state/attributes
- `alarm_control_panel` → `alarm_arm_home`/`alarm_arm_away`/`alarm_disarm` set state
- unknown services → ignore silently (no console spam)

Mutating the store calls `getAppStore().updateEntity(...)` so tiles re-render exactly as
they would on a real state change.

### getHistory

In mock mode, return a synthesized series matching HA's `/api/history/period/...` shape:
a 2D array `[[{ entity_id, state, last_changed, attributes }]]`, one inner series per
requested entity, spanning `startDate` → now, sampled at a coarse interval (e.g. 12
points/day) with plausible values. Enough for `HistoryPopup` to render a chart.

### sendMessage

Unchanged: without a connection it rejects. No UI path calls it in mock mode.

## 3. Simulator — `src/ha/mock.ts`

On each tick, build updated `HaEntity` objects and call `setEntities(updatedArray)`
(full replace — same store path as the real `subscribeEntities` flush).

Rules (keep dumb, by domain):

- `sensor` with a numeric state → jitter value around its seeded baseline within a small
  band (so temperature/humidity/battery look alive).
- `media_player` → cycle `playing` → `paused` → `idle`, and drift `media_title`.
- `weather` → drift `temperature`/`temperatureUnit`-style fields.
- Everything else → unchanged.

No automatic toggling of switches/lights; reactivity from taps is covered by the
`callService` mock. This keeps the simulator to a handful of rules.

## 4. Test config — `public/config/test.js`

Loaded via `?config=test`. Structure:

- **Page 1 "Core tiles"** — one tile per always-renderable type: `sensor`,
  `sensor_icon`, `switch`, `light` (with sliders + colorpicker), `input_boolean`,
  `input_number` (slider), `input_select`, `input_datetime`, `slider`, `gauge`, `alarm`,
  `cover`, `cover_toggle`, `fan`, `climate`, `script`, `automation`, `scene`, `lock`,
  `vacuum`, `custom`. Every tile has `subtitle: '<type>'` so types are visually
  identifiable at a glance.
- **Page 2 "Media & lists"** — `media_player`, `text_list`, `weather`, `weather_list`,
  `dimmer_switch`, `image`.
- **Page 3 "Network & cameras"** — `camera`, `camera_thumbnail`, `camera_stream`,
  `iframe`, `popup_iframe`, `door_entry` (with internal `layout.tiles`), `device_tracker`
  (coords set; `map: 'yandex'` — the only keyless static-map provider in
  `utils/maps.ts`).
- **Page 4 "Layout torture"** — varied tile widths/heights, groups with different
  `width`/`height`, a compact 1×1 weather, a near-full page and a sparse group to test
  overflow/scrollbars.

Each page uses different `tileSize`/`tileMargin`/`groupMarginCss` and a distinct `bg`.
3–4 groups per page with different sizes. Also configure `header` items (datetime,
weather, custom_html), a `screensaver` block, and an `events` demo.

Mock entities (~40) carry realistic HA attributes per domain:

- `light`: `brightness`, `color_temp`, `rgb_color`, `supported_features`, `min_mireds`,
  `max_mireds`
- `climate`: `current_temperature`, `temperature`, `preset_modes`, `preset_mode`,
  `hvac_modes`, `unit_of_measurement`
- `media_player`: `supported_features`, `volume_level`, `is_volume_muted`,
  `source_list`, `source`, `media_title`, `media_artist`, `entity_picture`
- `fan`: `speed_list`, `speed`, `percentage`, `supported_features`
- `cover`: `current_position`, `supported_features`
- `alarm_control_panel`: `code_format`
- `input_datetime`: `has_date`, `has_time`, `timestamp`
- `camera`/`camera_thumbnail`/`camera_stream`: `entity_picture`
- `device_tracker`: `latitude`, `longitude`, `friendly_name`, `source`
- `sensor`: `unit_of_measurement`, `friendly_name`

Every entity includes `entity_id`, `state`, `attributes`, `last_changed`, `last_updated`
— matching the exact `HaEntity` shape the websocket delivers.

## 5. Coverage test — `src/config/mock.test.ts`

Vitest file that:

1. Asserts every `TileType` in `src/config/schema.ts` appears somewhere in
   `public/config/test.js` tiles (recursively, including `door_entry.layout.tiles`).
2. Asserts every string `id` referenced by a config tile (recursively, including
   `&entity` refs inside `text_list.list` and `weather.fields`) exists in
   `mock.entities`.
3. Asserts all mock entities satisfy the `HaEntity` shape (entity_id, state, attributes).

These assertions make `npm run test` fail when a tile type is added without a test tile,
or an entity id is typo'd (which would render a blank tile).

## 6. Docs

Add a short "Test config" section to `README.md`: how to run (`npm run dev`, open
`/?config=test`), what the pages cover, and how to add a new tile type (add the tile to
`test.js` and an entity to `mock.entities`).

## Out of scope

- Standalone mock HA websocket server (real connection path not exercised).
- Per-tile snapshot tests.
- Automatic toggling of switches/lights in the simulator.