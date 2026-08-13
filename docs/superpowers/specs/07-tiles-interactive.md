# Step 07: Interactive Tiles — Numbers, Selects, Climate, Cover, Sliders, Light, Datetime

**Goal:** Implement all tiles with inline controls plus the select dropdown and the
datetime keypad popup: INPUT_NUMBER, INPUT_SELECT, FAN, CLIMATE, COVER, SLIDER,
DIMMER_SWITCH, LIGHT, INPUT_DATETIME.

**Legacy reference:** `git show LEGACY_REF:index.html` (tile.html sections for these
types + `datetime-popup` markup), `git show LEGACY_REF:scripts/controllers/main.js`
(`increaseNumber/decreaseNumber/setInputNumber`, `toggleSelect/openSelect/
closeActiveSelect/selectOpened/setSelectOption/itemSelectStyles`, `openFanSpeedSelect/
setFanSpeed`, `increaseClimateTemp/decreaseClimateTemp/setClimateTemp/setClimateOption/
climateTarget`, `sendCover`, `getSliderConf/sliderChanged/setSliderValue`,
`dimmerToggle/dimmerAction`, `openLightSliders/closeLightSliders/getLightSliderConf/
getLightSliderValue/lightSliderChanged/increaseBrightness/decreaseBrightness/
setLightBrightness/setLightColor/getRGBStringFromArray/getRGBArrayFromString/
supportsFeature`, `openDatetime/inputDatetime/clearCharDatetime/getActiveDatetimeInput/
getActiveDatetimePlaceholder/activeDatetimeValid/sendDatetime/getDatetimePlaceholder`).

**Files:**
- Create: `src/utils/sliders.ts`, `src/components/tiles/InputNumberTile.tsx`,
  `InputSelectTile.tsx`, `FanTile.tsx`, `ClimateTile.tsx`, `CoverTile.tsx`,
  `SliderTile.tsx`, `DimmerTile.tsx`, `LightTile.tsx`, `InputDatetimeTile.tsx`,
  `src/components/SelectOverlay.tsx`, `src/components/popups/DatetimePopup.tsx`
- Test: `src/utils/sliders.test.ts`, `src/components/tiles/interactive-tiles.test.tsx`,
  `src/components/popups/DatetimePopup.test.tsx`
- Modify: `src/components/tiles/TileBody.tsx`, `src/tiles/actions.ts`,
  `src/store/index.ts` (select / datetime / light-controls slices),
  `src/components/Pages.tsx` (select overlay backdrop)

## Store additions

```ts
activeSelect: TileConfig | null;
openSelect(item: TileConfig): void;         // sets activeSelect = item
closeSelect(): void;
selectOpened(item: TileConfig): boolean;    // activeSelect === item

activeDatetime: TileConfig | null;
datetimeInput: string;                      // raw digits typed
openDatetime(item: TileConfig): void;       // prefills today's YYYYMMDD digits if entity has_date
closeDatetime(): void;
inputDatetimeDigit(d: number): void;
clearDatetimeChar(): void;
sendDatetime(): void;

lightControls: Set<TileConfig>;             // tiles with sliders/colorpicker expanded
openLightControls(item: TileConfig): void;  // see LIGHT below
closeLightControls(item: TileConfig): void;
```

`Tile.tsx` passes `selectOpened(item)` into `itemClasses` now (`-top-entity`).
`Pages.tsx` renders `<div className="page-overlay" onClick={closeSelect} />` when
`activeSelect` is set (legacy markup).

## Shared slider config — src/utils/sliders.ts

```ts
export interface SliderRuntime extends SliderConfig { value: number; min: number; max: number; step: number; }

export function getSliderConf(item: TileConfig, entity: HaEntity): SliderRuntime;
// def = item.slider ?? {}
// max: attrs.max ?? def.max ?? 100 ; min: attrs.min ?? def.min ?? 0
// step: def.step ?? attrs.step ?? 1
// value: Number(attrs[def.field]) || Number(entity.state) || def.value || 0
// request default: { domain: 'input_number', service: 'set_value', field: 'value' }

export function getLightSliderConf(slider: SliderConfig, entity: HaEntity): SliderRuntime;
// max: def.max ?? attrs.max ?? 100 ; min: def.min ?? attrs.min ?? 0 ; step: def.step ?? attrs.step ?? 1
// value: Number(attrs[def.field]) || def.min ?? attrs.min ?? 0
// request default: { domain: 'input_number', service: 'set_value', field: def.field }

export const sendSliderValue: (item: TileConfig, conf: SliderRuntime) => void;   // debounced 250 ms
// requires conf.request; callService(conf.request.domain, conf.request.service,
//   { entity_id: item.id, [conf.request.field ?? 'value']: conf.value }) wrapped in withLoading
```

No legacy `_sliderInited` guards are needed — React `onChange` on `<input type=range>`
only fires on user interaction (document this deviation).

Slider markup shared by SLIDER tile and LIGHT sliders:

```
div.item-slider -> <input type="range" min max step value onChange={...}
  onTouchStart/onTouchMove/onPointerDown={e => e.stopPropagation()} />
```

## Tile rendering (legacy parity)

- **INPUT_NUMBER**: value + unit centered; two buttons `item-button -center-right` (+)
  and `-bottom-right` (−) calling increase/decrease.
  Handler: `parseFloat(entity.state)` ± `attributes.step ?? 1`, clamped to
  `[attributes.min, attributes.max]` when present → `input_number/set_value`
  `{ entity_id, value }`.
- **INPUT_SELECT**: if `item.icons` → icon entity display; else `item-entity -select`
  with value (+unit). `div.item-triangle` always. Click → `openSelect(item)`.
  When `selectOpened(item)`: `<SelectOverlay options={entity.attributes.options}
  active={entity.state} onChoose={setSelectOption} style={selectStyles} />`.
  `selectStyles(options)` → `{ marginTop: -Math.min(options.length * 17, 180) + 'px' }`.
  `setSelectOption(option)` → `input_select/select_option { entity_id, option }`, then
  `closeSelect()`.
- **FAN**: icon; when `attributes.speed_list`: entity container gets `-with-select`,
  plus `div.item-fan > div.item-fan--speed` showing `attributes.speed` (click →
  openSelect). Overlay options = `speed_list`, active = `attributes.speed`; choose →
  `fan/set_speed { entity_id, speed }` + close.
- **CLIMATE**: +/− buttons (only when `attributes.temperature` present and
  `state !== 'off'`): ± `attributes.target_temp_step ?? 1`, clamp to
  `[attributes.min_temp, attributes.max_temp]` → `climate/set_temperature
  { entity_id, temperature }`. Display `item-climate--target`:
  `climateTarget` = `attributes.temperature` ?? `${target_temp_low} - ${target_temp_high}`,
  then `item.filter(value)` if function; plus unit. If `attributes.preset_mode`:
  `item-climate--mode` showing it, click → overlay with `attributes.preset_modes`;
  choose → `climate/set_preset_mode { entity_id, preset_mode }`.
- **COVER**: three buttons in `div.item-cover`: `-open` (mdi-arrow-up, disabled when
  `state==='open' && (!attrs.current_position || attrs.current_position === 100)`),
  `-stop` (mdi-stop), `-close` (disabled when `state==='closed'`). Services
  `cover/open_cover|stop_cover|close_cover`.
- **SLIDER**: value + unit + slider input (`getSliderConf`); container class
  `item-entity-container` + `-slider-bottom` when `item.bottom`. onChange →
  `sendSliderValue(item, conf)`.
- **DIMMER_SWITCH**: icon; when `entityState` truthy and `state !== 'off'`: +/− buttons
  calling `item.actionPlus` / `item.actionMinus` via callFunction (event
  stopPropagation). Click: `item.action` function → callFunction (pass a noop callback
  as third arg for legacy compat), else if string id + entity → toggleSwitch.
- **LIGHT** (see below).
- **INPUT_DATETIME**: `item-entity--value -datetime` showing entityValue. Click →
  `openDatetime(item)`.

## LIGHT

Collapsed (`lightControls` does not contain item):
- Icon; when `supportsFeature(FEATURES.LIGHT.BRIGHTNESS, entity)` and `state !== 'off'`:
  +/− buttons. `increaseBrightness`/`decreaseBrightness`: current `attributes.brightness`
  ± 25.5, clamped `[1, 255]`; no brightness attr → do nothing. Submit:
  `light/turn_on { entity_id, brightness_pct: Math.round(brightness / 255 * 100 / 10) * 10 }`.
- `supportsFeature(feature, entity)` = `((attrs.supported_features ?? 0) & feature) === feature`
  — export from `src/utils/entity.ts` (also used by step 08 media player).

Expanded (`openLightControls`):
- Precondition `item.sliders?.length || item.colorpicker`; if `entity.state !== 'on'`
  → `toggleSwitch` then open on the next tick once state updates (implement with a
  store flag checked on entity update, or simply open immediately — legacy toggled
  first; choose: call toggleSwitch and open controls immediately).
- Markup `item-entity-sliders` (onClick stopPropagation):
  - per slider in `item.sliders`: `item-slider-container` → optional
    `item-slider-title` (`slider.title: {value}` where value =
    `slider.formatValue?.(conf) ?? conf.value`) → slider input using
    `getLightSliderConf`; onChange → `sendSliderValue`.
  - if `item.colorpicker`: `item-entity-colorpicker` with label "Color:" and
    `react-colorful` `RgbColorPicker`; color derived from
    `entity.attributes.rgb_color` ([r,g,b] array); on change →
    `light/turn_on { entity_id, rgb_color: [r, g, b] }` (debounced 250 ms).
  - Back button `item-entity--back-button` (mdi-chevron-left, "Back") →
    `closeLightControls`.
- Long-press on LIGHT tile → `openLightControls` (add to `entityLongPress` dispatch).
- Click on LIGHT tile → toggleSwitch (same as switch family).

## Datetime popup (src/components/popups/DatetimePopup.tsx)

Rendered by `App.tsx` (or `Pages.tsx`) when `activeDatetime` is set. Markup per legacy
`datetime-popup`: overlay (click → close), container, close button, state line
(`entityState`), input display, keypad.

Logic (pure helpers in `src/utils/datetime.ts` with tests):

```ts
export function datetimePlaceholder(entity: HaEntity): string;
// (attributes.has_date ? 'YYYY-MM-DD' : '') + (attributes.has_time ? ' hh:mm' : '')
// joined exactly like that (leading space before hh:mm when both)

export function interleaveDigits(placeholder: string, digits: string):
  { filled: string; remaining: string };
// non-word chars of placeholder render literally; word-char slots filled with digits
// in order; remaining = unfilled suffix

export function datetimeValid(placeholder: string, digits: string): boolean;
// digits.length === number of word chars in placeholder

export function buildDatetimePayload(entity: HaEntity, formatted: string):
  { date?: string; time?: string };
// split formatted on space: date = parts[0] (if has_date), time = parts[1] ?? parts[0] (if has_time)
```

Store `openDatetime` prefills: if `attributes.has_date`, `datetimeInput` = today as
`YYYYMMDD` digits, else `''`. Keypad: rows `[7,8,9],[4,5,6],[1,2,3]` rendered as
legacy (`button + line` for lines `[6,3,0]`), last row: backspace
(`clearDatetimeChar`), `0`, check (`sendDatetime`, class `-success`, `-disabled` unless
valid). `sendDatetime` → `input_datetime/set_datetime { entity_id, ...payload }` then
close.

## Tests

`src/utils/sliders.test.ts`: conf defaults and value resolution order for both
builders; `sendSliderValue` debounce (fake timers) + payload shape.
`src/components/tiles/interactive-tiles.test.tsx`:
- input_number + clamps at max and calls set_value.
- input_select opens overlay, choosing option calls select_option and closes.
- climate + respects target_temp_step and clamps; preset select works.
- cover disabled classes per state.
- light brightness buttons compute brightness_pct (e.g. brightness 100 → +25.5 → 125.5 →
  pct `Math.round(125.5/255*100/10)*10`).
`src/components/popups/DatetimePopup.test.tsx`: placeholder for date+time entity;
typing 12 digits interleaves to `YYYY-MM-DD hh:mm` shape; validity; payload builder.

- [ ] **Step 1:** Write failing tests.
- [ ] **Step 2:** Run — expect failures.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run — expect pass.
- [ ] **Step 5:** Manual check against real/mock HA: select dropdown positioning,
  light long-press expands sliders, datetime keypad flow end-to-end. Compare rendered
  tiles with legacy screenshots in `public/images/tile-screenshots/`.
- [ ] **Step 6:** Verify — all four npm scripts green.
- [ ] **Step 7:** Commit — `git commit -m "step 07: interactive tiles + datetime popup"`

**Acceptance criteria:** All 9 tile types fully interactive with service payloads
matching legacy (tests lock payloads); datetime popup reproduces legacy input flow.

**Out of scope:** media player (step 08), alarm/history popups (step 09).
