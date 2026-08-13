# Step 09: Complex Tiles — Weather, Maps, Alarm, Door Entry, Iframes, History

**Goal:** Implement the remaining tile types and popups: WEATHER, WEATHER_LIST,
DEVICE_TRACKER (static maps), ALARM + keypad popup, DOOR_ENTRY + popup, IFRAME,
POPUP_IFRAME + popup, and the history chart popup (long-press default).

**Legacy reference:** `git show LEGACY_REF:index.html` (weather, weather-list, device
tracker, alarm-popup, door-entry-popup, iframe-popup, history-popup markup),
`git show LEGACY_REF:scripts/controllers/main.js` (`getWeatherIcon/getWeatherImageStyles/
getWeatherField/getWeatherLine`, `weatherListField/weatherListIcon/
weatherListImageStyles`, `slideMapStyles/trackerZoomLevels/trackerSlidesClass/trackerBg/
showTrackerBg/hasTrackerCoords`, `openAlarm/closeAlarm/inputAlarm/clearAlarm/
actionAlarm/checkAlarmState`, `openDoorEntry/closeDoorEntry/getEntryCameraEntity`,
`openPopupIframe/closePopupIframe/getPopupIframeStyles/itemURL`,
`openPopupHistory/closePopupHistory/getPopupHistoryStyles`),
`git show LEGACY_REF:scripts/init.js` (Chart.js defaults).

**Files:**
- Create: `src/components/tiles/WeatherTile.tsx`, `WeatherListTile.tsx`,
  `DeviceTrackerTile.tsx`, `IframeTile.tsx`, `src/utils/maps.ts`, `src/utils/history.ts`,
  `src/utils/datetime.ts` (append alarm helpers if you prefer `src/utils/alarm.ts`),
  `src/components/popups/AlarmPopup.tsx`, `DoorEntryPopup.tsx`, `IframePopup.tsx`,
  `HistoryPopup.tsx`
- Test: `src/utils/maps.test.ts`, `src/utils/history.test.ts`,
  `src/components/popups/alarm.test.tsx`, `src/components/tiles/complex-tiles.test.tsx`
- Modify: `src/components/tiles/TileBody.tsx`, `src/tiles/actions.ts`,
  `src/store/index.ts` (alarm / door entry / iframe / history slices)

## Store additions

```ts
activeAlarm: TileConfig | null;
alarmCode: string;                                   // digit string
openAlarm(item: TileConfig): void;
closeAlarm(): void;
inputAlarmDigit(d: number): void;
clearAlarmCode(): void;
actionAlarm(action: 'alarm_arm_home' | 'alarm_arm_away' | 'alarm_arm_night' | 'alarm_disarm'): void;

activeDoorEntry: TileConfig | null;
openDoorEntry(item: TileConfig): void;               // (re)starts auto-close timer
closeDoorEntry(): void;

activeIframe: TileConfig | null;
openIframe(item: TileConfig): void;
closeIframe(): void;

activeHistory: { item: TileConfig; isLoading: boolean; errorText: string | null } | null;
openHistory(item: TileConfig, entity: HaEntity | null): void;   // async fetch inside
closeHistory(): void;
```

`actionAlarm`: service data `{ entity_id, ...(code_format ? { code: alarmCode } : {}) }`
→ `alarm_control_panel/{action}`; record `Date.now()` in a module-level map
`latestAlarmActions[entity_id]`; clear `alarmCode`. In the entity-update path
(`updateEntity` or the subscription callback in connection.ts): if the updated entity
has an entry in `latestAlarmActions` less than 3000 ms old → `closeAlarm()` (legacy
`checkAlarmState`).

`openDoorEntry`: auto-close after `config.doorEntryTimeout` seconds (timer replaced on
re-open, cleared on close).

## Click / long-press wiring (actions.ts)

- Click: DOOR_ENTRY → openDoorEntry; ALARM → openAlarm; POPUP_IFRAME → openIframe.
- Long-press default (after `secondaryAction` and type cases): if `item.history` or the
  item resolves to an entity with `entity_id` → `openHistory(item, entity)`.

## WEATHER

`WeatherTile.tsx` per legacy markup (`weather` block):
- Icon: `getWeatherIcon(item, entity)`:
  1. if `item.icon || item.icons` → `entityIcon(item, entity)`
  2. else `parseFieldValue(item.fields.icon)` (console.warn once: deprecated)
  then map: `item.icons` (function → call with `(icon, item, entity)`, object → lookup)
  else `item.fields.iconMap` lookup (console.warn once: deprecated); fallback to the raw
  icon. Render `<div className={"wu wu-" + icon} />` (styles in weather-icons.css).
  Alternative: `item.iconImage` → resolved through same map → `backgroundImage` style div
  (`weather-icon-image`).
- `weather-temperature`: `getWeatherField('temperature')` + `temperatureUnit` spans
  (only if `item.fields.temperature` set). `getWeatherField(f)` =
  `parseFieldValue(item.fields[f])`.
- Lines: high (`mdi-arrow-collapse-up`), low (`mdi-arrow-collapse-down`) each with unit;
  one line with humidity (`mdi-water`) and windSpeed (`mdi-weather-windy`) with units;
  then each `item.fields.list` entry rendered via `parseFieldValue` (weather-line).
- Deprecated fields kept for parity: `apparentTemperature` ("Feels like"), `pressure`
  ("Pressure"), `pollen` ("Pollen"), `precipProbability` ("... chance of rain").

## WEATHER_LIST

Table per legacy markup. Header row hidden when `item.hideHeader`; titles from
`itemField('dateTitle') ?? 'Date'`, `iconTitle`, `itemField('primaryTitle') ??
'Forecast'`, `secondaryTitle`. Per row in `item.list`: `weatherListField('date'|'primary'|
'secondary', line)` = `parseFieldValue(line[field])`; icon: `line.icon` (function or map
lookup like weather icon) → `wu wu-{icon}`; or `line.iconImage` → background-image div.

## DEVICE_TRACKER

`hasTrackerCoords(entity)` = `attributes.longitude || attributes.latitude`.

With coords: `item-slides-container` → `item-slides` class `-c{n}` where
`n = zoomLevels.length + (showTrackerBg ? 1 : 0)`:
- optional first slide `-bg` with `trackerBg` style (entity_picture via
  toAbsoluteServerURL) when `entity.attributes.entity_picture && !item.hideEntityPicture`
- one `-map` slide per zoom in `trackerZoomLevels` (`item.zoomLevels ?? [9, 13]`), style
  from `mapStyles` below.

Without coords but with `entity_picture`: single `item-background` with trackerBg style.

### src/utils/maps.ts (pure, tested)

```ts
export function staticMapUrl(opts: {
  provider: 'google' | 'mapbox' | 'yandex';
  lat: number; lon: number; zoom: number;
  widthPx: number; heightPx: number;          // tileSize * item width/height
  state: string; friendlyName?: string;
  googleApiKey?: string | null;
  mapboxToken?: string | null;
  mapboxStyle?: string | null;
}): string | null;
```

- Google (default): size `{ceil(w)}x{ceil(h + 80)}`, scale 2, roadmap, marker
  `color:gray|label:{FIRST LETTER OF friendlyName UPPERCASE}|{lat},{lon}` (marker string
  URI-encoded), `&key={googleApiKey}`. URL base
  `https://maps.googleapis.com/maps/api/staticmap`.
- Mapbox: marker `pin-s-{first letter of friendlyName lowercase}({lon},{lat})`; style =
  `mapboxStyle` match of `^mapbox://styles/(.+)$` else `mapbox/streets-v11`; URL
  `https://api.mapbox.com/styles/v1/{style}/static/{marker}/{lon},{lat},{zoom},0/{ceil(w)}x{ceil(h + 80)}?access_token={mapboxToken}`.
- Yandex: `https://static-maps.yandex.ru/1.x/?lang=en-US&ll={lon},{lat}&z={zoom}&l=map&size={ceil(w)},{ceil(h + 80)}&pt={lon},{lat},{icon}`
  with icon: state `'home'` → `home`, `'office'` → `work`, else `round`.
  (Verify exact pt/icon syntax against legacy `slideMapStyles` while implementing.)
- Returns null when the provider's required key is missing.

Render each map slide as `backgroundImage: url(...)` with `backgroundSize: 'cover'`.

## ALARM popup (AlarmPopup.tsx)

Markup per legacy `alarm-popup`: overlay (click closes), container with `-no-code` when
`!entity.attributes.code_format`, close button, state line (`entityState`), code display
(one `•` per digit of `alarmCode`, placeholder "Enter code"), keypad rows `[6,3,0]` x
`[1,2,3]` (legacy pattern), last code row: `0` (`-l2`) + clear (`-warning`, mdi-close).

`isArmed(entity)` = `entity.state !== 'disarmed'` (legacy function was named
`isDisarmed` but inverted — rename documented). When disarmed show action buttons:
Arm home (`mdi-bell-plus`), Arm away (`mdi-bell`), Arm night (`mdi-sleep`); when armed:
Disarm (`mdi-bell-off`). Buttons call `actionAlarm(...)`.

## DOOR_ENTRY popup (DoorEntryPopup.tsx)

Markup per legacy `door-entry-popup`: title + close; camera area rendering
`item.layout.camera` with its camera component (step 08 components), entity =
`getFullscreenEntity`-style resolution using `layout.camera.id ?? item.id`; tiles area
rendering `item.layout.tiles` each through the standard `Tile` component (page context:
`layout.page ?? current page`).

## IFRAME / POPUP_IFRAME

- IFRAME tile: `<div className="item-iframe"><iframe src={itemURL} frameBorder="0" /></div>`;
  if `item.refresh` (function evaluated): reload every `Math.max(1000, refresh)` ms by
  re-assigning `iframe.src` (ref).
- POPUP_IFRAME tile body: same as CUSTOM (customHtml or icon).
- IframePopup: markup per legacy `iframe-popup`; classes from
  `parseFieldValue(item.iframeClasses)` (string or array); container styles from
  `parseFieldValue(item.iframeStyles)`; title = entityTitle; iframe src = itemURL.

## HISTORY popup (HistoryPopup.tsx + src/utils/history.ts)

Trigger: long-press (see wiring above). Store `openHistory` flow:
1. `entityId = parseFieldValue(item.history?.entity) ?? entity?.entity_id`; missing →
   `errorText: 'No entity was specified'`.
2. `startDate = new Date(Date.now() - (item.history?.offset ?? 24*60*60*1000)).toISOString()`.
3. `getHistory(startDate, entityId)` → on empty/`[]` → `errorText: 'No history data found'`.
4. Build chart model with pure `buildHistoryDatasets` below; close popup state holds
   `{ datasets, options }` for rendering.

```ts
export interface HistoryChartModel {
  datasets: Array<{ label: string; data: Array<{ x: number; y: number | string }>; yAxisID: string; }>;
  yAxes: Record<string, { type: 'linear' | 'category'; labels?: string[]; }>;
  interactionMode: 'nearest' | 'index';
}
export function buildHistoryDatasets(
  response: Array<Array<{ state: string; last_changed: string; }>>,
  seriesMeta: Array<{ name: string; unit?: string }>,
  now: number,
): HistoryChartModel;
```

Legacy mapping rules (port exactly):
- per series: points `{ x: new Date(last_changed).getTime(), y: state }` plus one extra
  trailing point `{ x: now, y: current entity state }`.
- y-axis type per series: `'linear'` if the last y parses as a number, else `'category'`;
  axis id `{type}-{unit ?? ''}` deduplicated across series (shared axis per unit).
- category labels: unique values sorted descending; exactly one label that is
  `'on'`/`'off'` → `['on','off']`; otherwise pad with `''` at both ends.
- label: `{name} / {unit}` if unit else name.
- `interactionMode`: `'nearest'` when more than one dataset, else `'index'`.

Chart.js v4 rendering (replaces legacy Chart.js 2 + angular-chart): time x-axis via
`chartjs-adapter-date-fns`; line options from legacy init.js — `maintainAspectRatio:
false`, stepped lines, `pointRadius: 0`, `pointHitRadius: 5`, `borderWidth: 1`, legend
displayed (`align: 'start'`), tooltips/hover `intersect: false`; y-axis
`ticks.maxTicksLimit: 7`; time display formats honor `config.timeFormat` (24 vs 12 h).
Merge `item.history.options` on top (deep-merge). Popup markup per legacy
`history-popup` (classes from `history.classes`, container styles from
`history.styles`); placeholder text while loading / on errorText.

## Tests

`src/utils/maps.test.ts`: one URL assertion per provider including marker/label/size
details and null on missing keys.
`src/utils/history.test.ts`: numeric series → linear axis; on/off series → category axis
with `['on','off']` labels; two series same unit share one axis; interactionMode rule.
`src/components/popups/alarm.test.tsx`: keypad input builds alarmCode; disarm sends
`alarm_control_panel/alarm_disarm` with code when code_format present; arm buttons only
when disarmed.
`src/components/tiles/complex-tiles.test.tsx`: weather renders temperature/summary from
`&` fields; device tracker renders two map slides with zoomLevels default; iframe tile
sets src.

- [ ] **Step 1:** Write failing tests.
- [ ] **Step 2:** Run — expect failures.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run — expect pass.
- [ ] **Step 5:** Manual check: long-press any tile with history config opens the chart;
  alarm keypad flow; door entry auto-close. Compare rendered tiles with legacy
  screenshots in `public/images/tile-screenshots/`.
- [ ] **Step 6:** Verify — all four npm scripts green.
- [ ] **Step 7:** Commit — `git commit -m "step 09: weather, maps, alarm, door entry, iframes, history"`

**Acceptance criteria:** All remaining tile types at legacy behavior; popup markup
classes match; chart options reproduce legacy init.js defaults translated to Chart.js 4.

**Out of scope:** header weather item (step 10 has its own weather rendering).
