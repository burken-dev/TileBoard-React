# Step 06: Simple Tiles — Display, Icon Toggles, Text List, Image, Gauge

**Goal:** Implement the display-only and toggle tile families: SENSOR, SENSOR_ICON,
SWITCH, LOCK, COVER_TOGGLE, SCRIPT, AUTOMATION, SCENE, INPUT_BOOLEAN, VACUUM, CUSTOM,
TEXT_LIST, IMAGE, GAUGE.

**Legacy reference:** `git show LEGACY_REF:index.html` (tile.html sections for these
types), `git show LEGACY_REF:scripts/controllers/main.js` (`toggleSwitch`, `toggleLock`,
`toggleCover`, `toggleVacuum`, `triggerAutomation`, `callScript`, `callScene`,
`getGaugeField`, `GAUGE_DEFAULTS`, `itemURL`, `itemCustomHtml`, `listField`).

**Files:**
- Create: `src/components/tiles/SensorTile.tsx`, `IconTile.tsx`, `CustomTile.tsx`,
  `TextListTile.tsx`, `ImageTile.tsx`, `GaugeTile.tsx`
- Test: `src/components/tiles/simple-tiles.test.tsx`, `src/tiles/handlers.test.ts`
- Modify: `src/components/tiles/TileBody.tsx` (cases), `src/tiles/actions.ts` (cases),
  `src/config/constants.ts` (GAUGE_DEFAULTS if not already present)

## Rendering (legacy markup parity)

All bodies are wrapped in `<div className="item-entity-container">`.

- **SENSOR**: `<div className="item-entity"><span className="item-entity--value">{entityValue}</span>{unit && <span className="item-entity--unit">{unit}</span>}</div>`
- **SWITCH, LOCK, COVER_TOGGLE, SCRIPT, AUTOMATION, VACUUM, SENSOR_ICON, INPUT_BOOLEAN,
  SCENE** (IconTile): `<div className="item-entity"><span className={"item-entity--icon mdi " + entityIcon} /></div>`
- **CUSTOM** (CustomTile): if `item.customHtml` → `<div dangerouslySetInnerHTML={{__html: itemCustomHtml}} />`
  (itemCustomHtml = parseFieldValue of item.customHtml); else IconTile markup.
- **TEXT_LIST** (TextListTile):
  ```
  div.item-list
    per line in item.list:
      div.item-list--item
        div.item-list--name   -> <i class="mdi {listField('icon')}"> if icon, <span>{listField('title')}</span>
        div.item-list--value  -> <span>{listField('value')}</span><span>{listField('unit')}</span>
  ```
- **IMAGE** (ImageTile): `<div className="item-image" style={{backgroundImage: url(...)}} />`
  where url = `itemURL` = parseFieldValue of `item.url`.
- **GAUGE** (GaugeTile): `<div className="item-gauge"><Gauge ... /></div>` — see below.

## Click handlers (src/tiles/actions.ts cases, all wrapped in `withLoading`)

Port exactly (domain = first segment of `entity.entity_id` unless noted):

| Type | Behavior | Service |
|---|---|---|
| SWITCH, INPUT_BOOLEAN (also LIGHT/FAN added in step 07 via same function) | state `'off'` → turn_on; `'on'` → turn_off; else toggle. Domain: entity's own domain for switch/light/fan, else `homeassistant` | `{domain}/turn_on|turn_off|toggle` `{entity_id}` |
| LOCK | `'locked'` → unlock, `'unlocked'` → lock | `lock/unlock|lock` |
| COVER_TOGGLE | `'open'` → close_cover, `'closed'` → open_cover | `cover/...` |
| VACUUM | `'off'`→turn_on, `'on'`→turn_off, `idle/docked/paused`→start, `'cleaning'`→return_to_base | `vacuum/...` |
| AUTOMATION | always | `automation/trigger` |
| SCRIPT | always | `script/turn_on` |
| SCENE | always | `scene/turn_on` |

Extract the switch-family function as `toggleSwitch(item, entity)` exported from
`src/tiles/actions.ts` — step 07 reuses it for LIGHT and FAN.
SENSOR_ICON, CUSTOM, TEXT_LIST, IMAGE, GAUGE: no default click handler (custom
`action` only).

## Gauge component

`src/components/tiles/GaugeTile.tsx` implements a small SVG gauge replacing the legacy
`angularjs-gauge` vendor lib.

Settings resolution (`getGaugeField(field, item, entity)`):
`item.settings[field]` via parseFieldValue → else `GAUGE_DEFAULTS[field]`. If
`item.filter` is a function it wraps the resolved value: `filter(value)`.

`GAUGE_DEFAULTS` (constants.ts):

```ts
export const GAUGE_DEFAULTS = {
  backgroundColor: 'rgba(0, 0, 0, 0.1)',
  foregroundColor: 'rgba(0, 150, 136, 1)',
  duration: 1500,
  thick: 6,
  type: 'full',        // 'full' | 'semi' | 'arch'
  min: 0,
  max: 100,
  cap: 'butt',         // 'butt' | 'round'
  thresholds: {},
  labelOnly: false,
  fractionSize: undefined as number | undefined,
};
// size default computed at render: 0.8 * tileSize * Math.min(item.height ?? 1, item.width ?? 1)
// (tileSize/tileMargin from pageOpts fallback to config — pass via context or prop)
```

SVG behavior:
- Arc from angle for `min` to angle for `max`: `full` = 360° circle, `semi` = top 180°,
  `arch` = 270° (gap at bottom).
- Background arc stroke = backgroundColor, foreground arc stroke = color from
  `thresholds`: largest threshold key ≤ current value wins; none → foregroundColor.
  `cap: 'round'` → `stroke-linecap: round`. Stroke width = `thick`.
- Value = `entityValue(item, entity)` clamped to [min, max].
- Center label: `{prepend}{formatted value}{append}` where formatted value uses
  `fractionSize` decimals (locale default when undefined); `label` shown beneath;
  `labelOnly: true` renders only the label, no value.
- Animate foreground arc on value change with a CSS transition of `duration` ms.

## Tests

`src/tiles/handlers.test.ts` (mock `callService`):
- switch on → `callService('switch','turn_off',{entity_id})`; off → turn_on; unknown
  state → toggle.
- input_boolean with id `input_boolean.x` uses domain `input_boolean`? NO — legacy uses
  `homeassistant` domain for input_boolean (only switch/light/fan keep their own domain).
  Assert `homeassistant/turn_on`.
- lock locked → `lock/unlock`; vacuum cleaning → `vacuum/return_to_base`;
  cover_toggle open → `cover/close_cover`; scene → `scene/turn_on`.

`src/components/tiles/simple-tiles.test.tsx`:
- SENSOR renders value + unit from entity.
- SWITCH renders icon from `icons` map.
- TEXT_LIST renders list rows with `&`-resolved values.
- GAUGE renders label and clamps value (e.g. value 150, max 100 → arc at max; DOM check
  via rendered text/aria attribute you choose).

Wire `TileBody` cases and run render tests through the real `Tile` component with a
mocked store.

- [ ] **Step 1:** Write the failing tests above.
- [ ] **Step 2:** Run — expect failures.
- [ ] **Step 3:** Implement components + handler cases.
- [ ] **Step 4:** Run — expect pass.
- [ ] **Step 5:** Manual check: example config with a sensor, a switch (click toggles
  against a real HA or shows the service call in debug log), a gauge. Compare rendered
  tiles with legacy screenshots in `public/images/tile-screenshots/`.
- [ ] **Step 6:** Verify — all four npm scripts green.
- [ ] **Step 7:** Commit — `git commit -m "step 06: simple tile families + gauge"`

**Acceptance criteria:** All 14 tile types render per legacy markup; toggle services
match the table exactly (tests lock it).

**Out of scope:** LIGHT/FAN rendering details and sliders (step 07), history long-press
(step 09), custom CSS beyond what legacy classes provide.
