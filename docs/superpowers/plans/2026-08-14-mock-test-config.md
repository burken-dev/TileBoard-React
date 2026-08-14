# Mock Test Config Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a test config (`public/config/test.js`, loaded via `?config=test`) covering all 34 tile types across 4 pages with varied layouts, backed by a config-driven mock mode that feeds HA-shaped entities into the store and simulates live updates.

**Architecture:** An optional `mock` block in the config seeds the store and, via `ha/mock.ts`, simulates entity updates and locally mutates state on `callService`/`getHistory` (skipping the real websocket). A coverage test pins the config to the schema's tile types and to the mock entity set.

**Tech Stack:** TypeScript, React 18, zustand, zod, vitest, `home-assistant-js-websocket`, vite.

## Global Constraints

- Config files are plain browser scripts (`var CONFIG = {...}`) loaded via `/config/<name>.js`; `?config=<name>` selects them (`src/config/load.ts`).
- Mock entities MUST match the `HaEntity` shape the real websocket delivers: `{ entity_id, state, attributes, last_changed?, last_updated? }` (see `src/config/types.ts`).
- Do NOT change the real websocket connection path — only branch around it when `config.mock` is present.
- `callService`/`getHistory` must keep rejecting with `new Error('not connected')` when not connected AND mock mode is off.
- No new dependencies.
- `test.js` must not reference `location` at module top level; use `window.location.origin` for `serverUrl` (the coverage test loads it in a sandboxed function).
- After every task: `npm run lint && npm run typecheck && npm run test`.

---

### Task 1: Mock core — `src/ha/mock.ts` + unit tests

**Files:**
- Create: `src/ha/mock.ts`
- Create: `src/ha/mock.test.ts`

**Interfaces:**
- Produces:
  - `export function stepMockEntities(entities: HaEntity[]): HaEntity[]` — one simulation tick: jitters numeric `sensor.*` states, cycles `media_player.living_room_speaker` playing→paused→idle→playing, drifts `weather.*` temperature attr, and bumps `last_updated` on every entity.
  - `export function mockCallService(domain: string, service: string, serviceData?: Record<string, unknown>): Promise<void>` — mutates the matching store entity locally. Resolves even when the service is unknown.
  - `export function mockGetHistory(entityId: string | string[], startDate: string): Promise<unknown[][]>` — returns a synthesized HA `/api/history`-shaped series.
  - `export function startMockSimulator(mock: MockConfig): () => void` — seeds the store with `mock.entities`, runs `stepMockEntities` every `mock.interval ?? 2000` ms (full `setEntities` replace), returns a cleanup that clears the interval.

- [ ] **Step 1: Write the failing test** `src/ha/mock.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { createAppStore, getAppStore } from '../store';
import { mockCallService, stepMockEntities } from './mock';

const lamp = {
  entity_id: 'light.living_room_lamp',
  state: 'on',
  attributes: { brightness: 200, rgb_color: [255, 150, 50], supported_features: 1 },
  last_updated: '2026-01-01T00:00:00.000Z',
};

describe('stepMockEntities', () => {
  it('jitters numeric sensors and leaves other entities untouched', () => {
    const sensor = {
      entity_id: 'sensor.outdoor_temperature',
      state: '18.5',
      attributes: { unit_of_measurement: '°C' },
      last_updated: '2026-01-01T00:00:00.000Z',
    };
    const [sensorNext, lampNext] = stepMockEntities([sensor, lamp]);
    expect(Number(sensorNext.state)).not.toBe(18.5);
    expect(Math.abs(Number(sensorNext.state) - 18.5)).toBeLessThan(2);
    expect(lampNext).toEqual(lamp);
  });

  it('bumps last_updated on every entity', () => {
    const [next] = stepMockEntities([lamp]);
    expect(next.last_updated).not.toBe('2026-01-01T00:00:00.000Z');
  });

  it('cycles media player states', () => {
    const mp = { entity_id: 'media_player.living_room_speaker', state: 'playing', attributes: {}, last_updated: 'x' };
    const [next] = stepMockEntities([mp]);
    expect(next.state).toBe('paused');
  });
});

describe('mockCallService', () => {
  it('toggles a switch', async () => {
    createAppStore({ serverUrl: 'http://mock', pages: [] });
    getAppStore().setEntities([{ entity_id: 'switch.kitchen', state: 'off', attributes: {} }]);
    await mockCallService('switch', 'toggle', { entity_id: 'switch.kitchen' });
    expect(getAppStore().entities['switch.kitchen'].state).toBe('on');
  });

  it('writes light brightness and color back to attributes', async () => {
    createAppStore({ serverUrl: 'http://mock', pages: [] });
    getAppStore().setEntities([lamp]);
    await mockCallService('light', 'turn_on', { entity_id: 'light.living_room_lamp', brightness: 150, rgb_color: [1, 2, 3] });
    expect(getAppStore().entities['light.living_room_lamp'].attributes.brightness).toBe(150);
    expect(getAppStore().entities['light.living_room_lamp'].attributes.rgb_color).toEqual([1, 2, 3]);
  });

  it('arms the alarm', async () => {
    createAppStore({ serverUrl: 'http://mock', pages: [] });
    getAppStore().setEntities([{ entity_id: 'alarm_control_panel.home_alarm', state: 'disarmed', attributes: {} }]);
    await mockCallService('alarm_control_panel', 'alarm_arm_away', { entity_id: 'alarm_control_panel.home_alarm' });
    expect(getAppStore().entities['alarm_control_panel.home_alarm'].state).toBe('armed_away');
  });

  it('resolves for unknown services without touching the entity', async () => {
    createAppStore({ serverUrl: 'http://mock', pages: [] });
    getAppStore().setEntities([{ entity_id: 'switch.kitchen', state: 'off', attributes: {} }]);
    await expect(
      mockCallService('input_text', 'set_value', { entity_id: 'switch.kitchen', value: 'x' }),
    ).resolves.toBeUndefined();
    expect(getAppStore().entities['switch.kitchen'].state).toBe('off');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/ha/mock.test.ts`
Expected: FAIL — module `./mock` not found / `stepMockEntities is not a function`.

- [ ] **Step 3: Write the implementation** `src/ha/mock.ts`

```ts
import type { HaEntity, MockConfig } from '../config/types';
import { getAppStore } from '../store';

export function stepMockEntities(entities: HaEntity[]): HaEntity[] {
  const now = new Date().toISOString();
  return entities.map((entity) => {
    let state = entity.state;
    const attributes = { ...entity.attributes };
    if (entity.entity_id.startsWith('sensor.') && state.trim() !== '' && !isNaN(Number(state))) {
      const base = Number(state);
      const delta = (Math.random() - 0.5) * Math.max(0.6, Math.abs(base) * 0.04);
      state = String(Math.round((base + delta) * 10) / 10);
    } else if (entity.entity_id === 'media_player.living_room_speaker') {
      const cycle: Record<string, string> = { playing: 'paused', paused: 'idle', idle: 'playing' };
      state = cycle[entity.state] ?? 'playing';
    } else if (entity.entity_id.startsWith('weather.')) {
      if (typeof attributes.temperature === 'number') {
        attributes.temperature =
          Math.round((attributes.temperature + (Math.random() - 0.5) * 0.4) * 10) / 10;
      }
    }
    return { ...entity, state, attributes, last_updated: now };
  });
}

export function mockCallService(
  domain: string,
  service: string,
  serviceData?: Record<string, unknown>,
): Promise<void> {
  const store = getAppStore();
  const id = String(serviceData?.entity_id ?? '');
  const current = id ? store.entities[id] : null;
  if (!current) return Promise.resolve();

  let state = current.state;
  const attributes = { ...current.attributes };
  const write = (key: string): void => {
    if (serviceData && key in serviceData) attributes[key] = serviceData[key];
  };

  if (
    domain === 'switch' || domain === 'input_boolean' || domain === 'fan' ||
    domain === 'vacuum' || domain === 'scene' || domain === 'script' ||
    domain === 'automation' || domain === 'homeassistant'
  ) {
    if (service === 'toggle') state = state === 'on' ? 'off' : 'on';
    else if (service === 'turn_on') state = 'on';
    else if (service === 'turn_off') state = 'off';
    else if (service === 'start' || service === 'turn_on') state = 'cleaning';
    else if (service === 'return_to_base') state = 'docked';
    else if (service === 'pause') state = 'paused';
    if (domain === 'fan' && service === 'set_speed') write('speed');
  } else if (domain === 'lock') {
    if (service === 'lock') state = 'locked';
    else if (service === 'unlock') state = 'unlocked';
  } else if (domain === 'cover') {
    if (service === 'open_cover') { state = 'open'; attributes.current_position = 100; }
    else if (service === 'close_cover') { state = 'closed'; attributes.current_position = 0; }
    else if (service === 'stop_cover') state = 'open';
  } else if (domain === 'light') {
    if (service === 'turn_on') {
      state = 'on';
      if (serviceData && 'brightness_pct' in serviceData) {
        attributes.brightness = Math.round((Number(serviceData.brightness_pct) / 100) * 255);
      }
      write('brightness');
      write('color_temp');
      write('rgb_color');
    } else if (service === 'turn_off') {
      state = 'off';
    }
  } else if (domain === 'media_player') {
    if (service === 'media_play') state = 'playing';
    else if (service === 'media_pause') state = 'paused';
    else if (service === 'media_stop') state = 'idle';
    else if (service === 'turn_on') state = 'on';
    else if (service === 'turn_off') state = 'off';
    else if (service === 'volume_set') write('volume_level');
    else if (service === 'volume_up') attributes.volume_level = Math.min(1, (Number(attributes.volume_level) || 0) + 0.05);
    else if (service === 'volume_down') attributes.volume_level = Math.max(0, (Number(attributes.volume_level) || 0) - 0.05);
    else if (service === 'select_source') write('source');
    else if (service === 'volume_mute') attributes.is_volume_muted = true;
    else if (service === 'volume_unmute') attributes.is_volume_muted = false;
  } else if (domain === 'input_number') {
    if (service === 'set_value') state = String(serviceData?.value ?? state);
  } else if (domain === 'input_select') {
    if (service === 'select_option') state = String(serviceData?.option ?? state);
  } else if (domain === 'climate') {
    if (service === 'set_temperature') write('temperature');
    else if (service === 'set_preset_mode') write('preset_mode');
  } else if (domain === 'alarm_control_panel') {
    if (service === 'alarm_arm_home') state = 'armed_home';
    else if (service === 'alarm_arm_away') state = 'armed_away';
    else if (service === 'alarm_arm_night') state = 'armed_night';
    else if (service === 'alarm_disarm') state = 'disarmed';
  }

  store.updateEntity({ ...current, state, attributes, last_updated: new Date().toISOString() });
  return Promise.resolve();
}

export function mockGetHistory(entityId: string | string[], startDate: string): Promise<unknown[][]> {
  const store = getAppStore();
  const ids = Array.isArray(entityId) ? entityId : [entityId];
  const start = new Date(startDate).getTime();
  const now = Date.now();
  const step = 2 * 60 * 60 * 1000;
  const series = ids.map((id) => {
    const entity = store.entities[id];
    if (!entity) return [];
    const points: Array<Record<string, unknown>> = [];
    const base = Number(entity.state) || 0;
    for (let t = start; t <= now; t += step) {
      const value = base + Math.sin(t / 3600000) * (Math.abs(base) * 0.1 + 1);
      points.push({
        entity_id: id,
        state: String(Math.round(value * 100) / 100),
        last_changed: new Date(t).toISOString(),
        attributes: { ...entity.attributes },
      });
    }
    return points;
  });
  return Promise.resolve(series);
}

export function startMockSimulator(mock: MockConfig): () => void {
  const store = getAppStore();
  store.setEntities(mock.entities);
  const interval = mock.interval ?? 2000;
  const timer = window.setInterval(() => {
    store.setEntities(stepMockEntities(Object.values(store.entities)));
  }, interval);
  return () => window.clearInterval(timer);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/ha/mock.test.ts`
Expected: PASS (4 test cases).

- [ ] **Step 5: Run full verification**

Run: `npm run lint && npm run typecheck && npm run test`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/ha/mock.ts src/ha/mock.test.ts
git commit -m "Add mock entity simulator and local service mutations"
```

---

### Task 2: MockConfig type, TILE_TYPES export, mock seam in services

**Files:**
- Modify: `src/config/types.ts` (add `MockConfig` + `mock?` field)
- Modify: `src/config/schema.ts` (export `TILE_TYPES`)
- Modify: `src/ha/services.ts` (mock-mode flag + routing)
- Create: `src/ha/services.test.ts`

**Interfaces:**
- Consumes: `mockCallService`, `mockGetHistory` from `src/ha/mock.ts`.
- Produces:
  - `MockConfig` (`src/config/types.ts`): `{ entities: HaEntity[]; interval?: number }`; `TileBoardConfig.mock?: MockConfig`.
  - `export const TILE_TYPES` (readonly string array) from `src/config/schema.ts`.
  - `export function setMockMode(enabled: boolean): void` from `src/ha/services.ts`.

- [ ] **Step 1: Write the failing test** `src/ha/services.test.ts`

```ts
import { afterEach, describe, expect, it } from 'vitest';
import { createAppStore, getAppStore } from '../store';
import { callService, setMockMode } from './services';

afterEach(() => {
  setMockMode(false);
});

describe('callService mock routing', () => {
  it('routes to the mock implementation when mock mode is enabled', async () => {
    createAppStore({ serverUrl: 'http://mock', pages: [] });
    getAppStore().setEntities([{ entity_id: 'switch.kitchen', state: 'off', attributes: {} }]);
    setMockMode(true);
    await callService('switch', 'toggle', { entity_id: 'switch.kitchen' });
    expect(getAppStore().entities['switch.kitchen'].state).toBe('on');
  });

  it('rejects when not connected and mock mode is off', async () => {
    createAppStore({ serverUrl: 'http://mock', pages: [] });
    setMockMode(false);
    await expect(
      callService('switch', 'toggle', { entity_id: 'switch.kitchen' }),
    ).rejects.toThrow('not connected');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/ha/services.test.ts`
Expected: FAIL — no `setMockMode` export.

- [ ] **Step 3: Add the `MockConfig` type** in `src/config/types.ts`

Add after the `EntityStates` interface:

```ts
export interface MockConfig {
  entities: HaEntity[];
  interval?: number;
}
```

Add `mock?: MockConfig;` to `TileBoardConfig` (alphabetical order, after `menuPosition`/`groupsAlign` — place near `mapboxStyle`).

- [ ] **Step 4: Export `TILE_TYPES`** in `src/config/schema.ts`

Change `const TILE_TYPES = [...]` to `export const TILE_TYPES = [...]`.

- [ ] **Step 5: Add the mock seam** in `src/ha/services.ts`

At the top (after `let conn`):

```ts
let mockMode = false;

export function setMockMode(enabled: boolean): void {
  mockMode = enabled;
}
```

Replace the `callService` guard:

```ts
export function callService(
  domain: string,
  service: string,
  serviceData?: Record<string, unknown>,
): Promise<void> {
  if (!conn) {
    return mockMode
      ? mockCallService(domain, service, serviceData)
      : Promise.reject(new Error('not connected'));
  }
  return haCallService(conn, domain, service, serviceData) as Promise<void>;
}
```

Add the import: `import { mockCallService, mockGetHistory } from './mock';`

Replace the `getHistory` guard:

```ts
export function getHistory(
  startDate: string,
  entityIds: string | string[],
  endDate?: string,
): Promise<unknown[][]> {
  if (!conn) {
    return mockMode
      ? mockGetHistory(entityIds, startDate)
      : Promise.reject(new Error('not connected'));
  }
  const { config } = getAppStore();
  // ... rest unchanged
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm run test -- src/ha/services.test.ts src/ha/mock.test.ts`
Expected: PASS.

- [ ] **Step 7: Run full verification**

Run: `npm run lint && npm run typecheck && npm run test`
Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add src/config/types.ts src/config/schema.ts src/ha/services.ts src/ha/services.test.ts
git commit -m "Add mock config type and mock-mode seam in services"
```

---

### Task 3: Mock branch in `initConnection`

**Files:**
- Modify: `src/ha/connection.ts`

**Interfaces:**
- Consumes: `MockConfig`, `startMockSimulator` (Task 1), `setMockMode` (Task 2).
- Produces: nothing new — behavior: when `config.mock` is set, the app boots in mock mode with no websocket.

- [ ] **Step 1: Add the mock branch** in `initConnection()`

Insert between `setStatus('loading')` and the `authPromise` block:

```ts
if (config.mock) {
  setMockMode(true);
  startMockSimulator(config.mock);
  setStatus('ready');
  if (config.onReady) callFunction(config.onReady, []);
  return;
}
```

Add the imports at the top (from `./mock` and existing import line for `callFunction`):

```ts
import { startMockSimulator } from './mock';
import { setMockMode } from './services';
```

Note: `callFunction` and `getAppStore` are already imported.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Verify no regressions**

Run: `npm run test`
Expected: PASS (no mock config used in existing tests, real path untouched).

- [ ] **Step 4: Commit**

```bash
git add src/ha/connection.ts
git commit -m "Boot in mock mode when config provides mock data"
```

---

### Task 4: Test config — `public/config/test.js`

**Files:**
- Create: `public/config/test.js`

**Interfaces:**
- Consumes: `MockConfig`, `TileBoardConfig` shapes (Tasks 1–2).
- Produces: the config consumed by the coverage test (Task 5). Every tile `id` string and every `&entity` reference must resolve to an entity in `CONFIG.mock.entities`.

- [ ] **Step 1: Write `public/config/test.js`**

```js
/*
  Test config for TileBoard development.
  Load with:  ?config=test
  Covers every tile type across 4 pages/groups with varied layouts, backed by
  mock entities that match the Home Assistant websocket entity shape.
  mock.interval controls how often simulated updates fire (ms).
*/
var CONFIG = {
   customTheme: null,
   transition: 'animated_gpu',
   entitySize: 'normal',
   tileSize: 150,
   tileMargin: 6,
   serverUrl: window.location.origin,
   authToken: null,
   debug: false,
   pingConnection: false,
   timeFormat: 24,
   menuPosition: 'left',
   hideScrollbar: false,
   groupsAlign: 'horizontally',

   mock: {
      interval: 2000,
      entities: [
         // ---- numeric sensors (jittered by the simulator) ----
         { entity_id: 'sensor.outdoor_temperature', state: '18.5', attributes: { unit_of_measurement: '°C', friendly_name: 'Outdoor temperature' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'sensor.living_room_humidity', state: '45', attributes: { unit_of_measurement: '%', friendly_name: 'Living room humidity' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'sensor.energy_consumption', state: '1234.5', attributes: { unit_of_measurement: 'kWh', friendly_name: 'Energy consumption' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'sensor.battery_level', state: '87', attributes: { unit_of_measurement: '%', friendly_name: 'Battery level' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'sensor.my_sample_sensor', state: '12345', attributes: { friendly_name: 'Sample sensor' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         // ---- weather sensors ----
         { entity_id: 'sensor.weather_temperature', state: '18', attributes: { unit_of_measurement: '°C', friendly_name: 'Temperature' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'sensor.weather_humidity', state: '62', attributes: { unit_of_measurement: '%', friendly_name: 'Humidity' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'sensor.weather_wind_speed', state: '12', attributes: { unit_of_measurement: 'km/h', friendly_name: 'Wind speed' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'sensor.weather_pressure', state: '1013', attributes: { unit_of_measurement: 'hPa', friendly_name: 'Pressure' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'sensor.weather_summary', state: 'Partly Cloudy', attributes: { friendly_name: 'Summary' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'sensor.weather_icon', state: 'partly-cloudy-day', attributes: { friendly_name: 'Icon' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'sensor.weather_apparent_temperature', state: '17', attributes: { unit_of_measurement: '°C', friendly_name: 'Apparent temperature' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'sensor.weather_precip_probability', state: '20', attributes: { unit_of_measurement: '%', friendly_name: 'Precip probability' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         // 3-day forecast sensors for weather_list
         { entity_id: 'sensor.weather_day_high_1d', state: '21', attributes: { unit_of_measurement: '°C', friendly_name: 'Day 1 high' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'sensor.weather_day_low_1d', state: '12', attributes: { unit_of_measurement: '°C', friendly_name: 'Day 1 low' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'sensor.weather_day_icon_1d', state: 'rain', attributes: { friendly_name: 'Day 1 icon' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'sensor.weather_day_high_2d', state: '19', attributes: { unit_of_measurement: '°C', friendly_name: 'Day 2 high' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'sensor.weather_day_low_2d', state: '11', attributes: { unit_of_measurement: '°C', friendly_name: 'Day 2 low' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'sensor.weather_day_icon_2d', state: 'cloudy', attributes: { friendly_name: 'Day 2 icon' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'sensor.weather_day_high_3d', state: '17', attributes: { unit_of_measurement: '°C', friendly_name: 'Day 3 high' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'sensor.weather_day_low_3d', state: '10', attributes: { unit_of_measurement: '°C', friendly_name: 'Day 3 low' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'sensor.weather_day_icon_3d', state: 'snow', attributes: { friendly_name: 'Day 3 icon' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         // ---- sensor_icon (binary-style state) ----
         { entity_id: 'sensor.hot_water', state: 'on', attributes: { friendly_name: 'Hot water' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         // ---- inputs ----
         { entity_id: 'input_number.volume', state: '50', attributes: { min: 0, max: 100, step: 1, friendly_name: 'Volume' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'input_select.house_mode', state: 'Normal', attributes: { options: ['Normal', 'Vacation', 'Sick', 'Travel'], friendly_name: 'House mode' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'input_select.climate_mode', state: 'Auto', attributes: { options: ['Auto', 'Cool', 'Heat', 'Dry', 'Fan only'], friendly_name: 'Climate mode' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'input_datetime.both_date_and_time', state: '2026-08-14 12:30:00', attributes: { has_date: true, has_time: true, friendly_name: 'Date & time' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'input_boolean.play_radio', state: 'off', attributes: { friendly_name: 'Play radio' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         // ---- switches / cover / fan / lock ----
         { entity_id: 'switch.kitchen_spotlights', state: 'off', attributes: { friendly_name: 'Kitchen spotlights' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'switch.outdoor_lights', state: 'off', attributes: { friendly_name: 'Outdoor lights' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'switch.intercom', state: 'off', attributes: { friendly_name: 'Intercom' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'cover.garage_door', state: 'closed', attributes: { current_position: 0, friendly_name: 'Garage door' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'cover.living_room_blinds', state: 'open', attributes: { current_position: 100, friendly_name: 'Living room blinds' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'fan.living_room_fan', state: 'on', attributes: { speed_list: ['off', 'low', 'medium', 'high'], speed: 'medium', percentage: 66, supported_features: 1, friendly_name: 'Living room fan' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'lock.front_door', state: 'locked', attributes: { friendly_name: 'Front door' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         // ---- lights ----
         { entity_id: 'light.living_room_lamp', state: 'on', attributes: { brightness: 200, color_temp: 300, min_mireds: 153, max_mireds: 588, rgb_color: [255, 150, 50], supported_features: 1, friendly_name: 'Living room lamp' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'light.floor_lamp', state: 'off', attributes: { supported_features: 1, friendly_name: 'Floor lamp' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         // ---- climate / media_player / alarm / vacuum ----
         { entity_id: 'climate.kitchen', state: 'heat', attributes: { current_temperature: 19, temperature: 21, preset_modes: ['none', 'eco', 'comfort'], preset_mode: 'comfort', hvac_modes: ['off', 'heat', 'cool', 'auto'], min_temp: 5, max_temp: 35, target_temp_step: 1, unit_of_measurement: '°C', friendly_name: 'Kitchen climate' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'media_player.living_room_speaker', state: 'playing', attributes: { supported_features: 1469, volume_level: 0.7, is_volume_muted: false, source_list: ['Spotify', 'Radio', 'Bluetooth'], source: 'Spotify', media_title: 'Hotel California', media_artist: 'Eagles', friendly_name: 'Living room speaker' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'alarm_control_panel.home_alarm', state: 'disarmed', attributes: { code_format: 'number', friendly_name: 'Home alarm' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'automation.sunrise_actions', state: 'on', attributes: { friendly_name: 'Sunrise actions' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'script.front_gate_open', state: 'off', attributes: { friendly_name: 'Open front gate' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'scene.movie_time', state: 'idle', attributes: { friendly_name: 'Movie time' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'vacuum.roborock', state: 'docked', attributes: { battery_level: 80, fan_speed: 'Balanced', status: 'Docked', supported_features: 4351, friendly_name: 'Roborock' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         // ---- camera / device tracker / weather ----
         { entity_id: 'camera.front_gate', state: 'idle', attributes: { entity_picture: 'config/images/bg3.jpg', friendly_name: 'Front gate' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'device_tracker.phone', state: 'home', attributes: { latitude: 59.3293, longitude: 18.0686, source: 'gps', friendly_name: 'Phone' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'weather.home', state: 'partlycloudy', attributes: { temperature: 18, humidity: 62, wind_speed: 12, pressure: 1013, friendly_name: 'Home weather' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' }
      ]
   },

   header: {
      styles: { padding: '30px 130px 0', fontSize: '28px' },
      left: [{ type: 'datetime', dateFormat: 'EEEE, LLLL dd' }],
      right: [{ type: 'custom_html', html: 'Test config — <b>?config=test</b>' }]
   },

   screensaver: {
      timeout: 120,
      slidesTimeout: 10,
      styles: { fontSize: '40px' },
      leftBottom: [{ type: 'datetime' }],
      slides: [
         { bg: 'config/images/bg1.jpeg' },
         { bg: 'config/images/bg2.png', rightTop: [{ type: 'custom_html', html: 'Slide <b>2</b>', styles: { fontSize: '40px' } }] },
         { bg: 'config/images/bg3.jpg' }
      ]
   },

   events: [
      {
         command: 'hello',
         action: function (event) {
            this.addNotification({ type: 'info', title: 'Event', message: 'hello received' });
         }
      }
   ],

   pages: [
      {
         title: 'Core tiles',
         bg: 'config/images/bg1.jpeg',
         icon: 'mdi-home-outline',
         tileSize: 130,
         groups: [
            {
               title: 'Buttons & switches',
               width: 4,
               height: 4,
               items: [
                  { position: [0, 0], type: 'switch', id: 'switch.kitchen_spotlights', title: 'Spotlights', subtitle: 'switch', icons: { on: 'mdi-lightbulb-on', off: 'mdi-lightbulb' }, states: { on: 'On', off: 'Off' } },
                  { position: [0, 1], type: 'switch', id: 'switch.outdoor_lights', title: 'Outdoor', subtitle: 'switch', icons: { on: 'mdi-lightbulb-on', off: 'mdi-lightbulb' } },
                  { position: [0, 2], type: 'input_boolean', id: 'input_boolean.play_radio', title: 'Radio', subtitle: 'input_boolean', icons: { on: 'mdi-stop', off: 'mdi-play' }, states: { on: 'Playing', off: 'Stopped' } },
                  { position: [0, 3], type: 'lock', id: 'lock.front_door', title: 'Front door', subtitle: 'lock', icons: { locked: 'mdi-lock', unlocked: 'mdi-lock-open' }, states: { locked: 'Locked', unlocked: 'Unlocked' } },
                  { position: [1, 0], type: 'script', id: 'script.front_gate_open', title: 'Gate', subtitle: 'script', icon: 'mdi-gate' },
                  { position: [1, 1], type: 'automation', id: 'automation.sunrise_actions', title: 'Sunrise', subtitle: 'automation', icon: 'mdi-weather-sunny' },
                  { position: [1, 2], type: 'scene', id: 'scene.movie_time', title: 'Movie time', subtitle: 'scene', icon: 'mdi-movie-roll', state: false },
                  { position: [1, 3], type: 'sensor_icon', id: 'sensor.hot_water', title: 'Hot water', subtitle: 'sensor_icon', icons: { on: 'mdi-hot-tub', off: 'mdi-hot-tub' }, states: { on: 'On', off: 'Off' } },
                  { position: [2, 0], width: 2, type: 'vacuum', id: 'vacuum.roborock', title: 'Roborock', subtitle: 'vacuum', icon: 'mdi-roomba', state: '@attributes.status' },
                  { position: [2, 2], type: 'custom', id: {}, title: 'Custom', subtitle: 'custom', icon: 'mdi-monitor', state: false, customHtml: '<b>Hi</b>' },
                  { position: [3, 0], width: 2, height: 2, type: 'gauge', id: 'sensor.my_sample_sensor', title: 'Energy', subtitle: 'gauge', state: false, settings: { type: 'full', min: 0, max: 25000, thick: 8, label: 'kWh', append: ' W', thresholds: { 0: { color: 'green' }, 80: { color: 'red' } } } }
               ]
            },
            {
               title: 'Light & climate',
               width: 4,
               height: 4,
               items: [
                  { position: [0, 0], width: 2, type: 'light', id: 'light.living_room_lamp', title: 'Floor lamp', subtitle: 'light', icons: { on: 'mdi-lightbulb-on', off: 'mdi-lightbulb' }, states: { on: 'On', off: 'Off' }, colorpicker: true, sliders: [
                     { title: 'Brightness', field: 'brightness', min: 0, max: 255, step: 5, request: { type: 'call_service', domain: 'light', service: 'turn_on', field: 'brightness' } },
                     { title: 'Color temp', field: 'color_temp', min: 153, max: 588, step: 15, request: { type: 'call_service', domain: 'light', service: 'turn_on', field: 'color_temp' } }
                  ] },
                  { position: [2, 0], type: 'dimmer_switch', id: 'light.floor_lamp', title: 'Dimmer', subtitle: 'dimmer_switch', icon: 'mdi-lightbulb-on' },
                  { position: [3, 0], height: 2, type: 'climate', id: 'climate.kitchen', title: 'Kitchen', subtitle: 'climate', unit: 'C', state: function (item, entity) { return 'Target ' + entity.attributes.temperature; } },
                  { position: [0, 1], type: 'cover', id: 'cover.garage_door', title: 'Garage', subtitle: 'cover', icons: { open: 'mdi-garage-open', closed: 'mdi-garage' } },
                  { position: [1, 1], type: 'cover_toggle', id: 'cover.living_room_blinds', title: 'Blinds', subtitle: 'cover_toggle', icons: { open: 'mdi-blinds-open', closed: 'mdi-blinds' } },
                  { position: [2, 1], type: 'fan', id: 'fan.living_room_fan', title: 'Fan', subtitle: 'fan', icon: 'mdi-fan' },
                  { position: [3, 1], type: 'alarm', id: 'alarm_control_panel.home_alarm', title: 'Home alarm', subtitle: 'alarm', icons: { disarmed: 'mdi-bell-off', pending: 'mdi-bell', armed_home: 'mdi-bell-plus', armed_away: 'mdi-bell', triggered: 'mdi-bell-ring' }, states: { disarmed: 'Disarmed', pending: 'Pending', armed_home: 'Armed home', armed_away: 'Armed away', triggered: 'Triggered' } }
               ]
            },
            {
               title: 'Inputs & sensors',
               width: 4,
               height: 4,
               items: [
                  { position: [0, 0], type: 'sensor', id: 'sensor.outdoor_temperature', title: 'Outdoor', subtitle: 'sensor', unit: 'C' },
                  { position: [1, 0], type: 'sensor', id: 'sensor.living_room_humidity', title: 'Humidity', subtitle: 'sensor' },
                  { position: [0, 1], type: 'sensor', id: 'sensor.energy_consumption', title: 'Energy', subtitle: 'sensor' },
                  { position: [1, 1], type: 'sensor', id: 'sensor.battery_level', title: 'Battery', subtitle: 'sensor' },
                  { position: [2, 0], type: 'slider', id: 'input_number.volume', title: 'Volume', subtitle: 'slider', unit: '%', slider: { min: 0, max: 100, step: 1, request: { type: 'call_service', domain: 'input_number', service: 'set_value', field: 'value' } } },
                  { position: [2, 1], type: 'input_number', id: 'input_number.volume', title: 'Input number', subtitle: 'input_number', icon: 'mdi-numeric' },
                  { position: [3, 0], type: 'input_select', id: 'input_select.house_mode', title: 'House mode', subtitle: 'input_select', icons: { Normal: 'mdi-home', Vacation: 'mdi-palm-tree', Sick: 'mdi-medical-bag', Travel: 'mdi-airplane' } },
                  { position: [3, 1], type: 'input_select', id: 'input_select.climate_mode', title: 'Climate mode', subtitle: 'input_select', state: false },
                  { position: [0, 2], width: 2, type: 'input_datetime', id: 'input_datetime.both_date_and_time', title: 'Date & time', subtitle: 'input_datetime', state: false },
                  { position: [2, 2], type: 'sensor_icon', id: 'sensor.battery_level', title: 'Battery icon', subtitle: 'sensor_icon', icon: 'mdi-battery' }
               ]
            }
         ]
      },
      {
         title: 'Media & lists',
         bg: 'config/images/bg2.png',
         icon: 'mdi-numeric-2-box-outline',
         tileSize: 150,
         groups: [
            {
               title: 'Media & weather',
               width: 4,
               height: 3,
               items: [
                  { position: [0, 0], width: 2, height: 2, type: 'media_player', id: 'media_player.living_room_speaker', title: 'Speaker', subtitle: 'media_player', state: false, hideSource: false, hideMuteButton: false },
                  { position: [2, 0], height: 2, type: 'weather', id: 'weather.home', subtitle: 'weather', icon: '&sensor.weather_icon.state', icons: { 'clear-day': 'clear', 'cloudy': 'cloudy', 'rain': 'rain', 'snow': 'snow', 'partly-cloudy-day': 'partlycloudy' }, fields: {
                     summary: '&sensor.weather_summary.state',
                     temperature: '&sensor.weather_temperature.state',
                     temperatureUnit: '&sensor.weather_temperature.attributes.unit_of_measurement',
                     windSpeed: '&sensor.weather_wind_speed.state',
                     windSpeedUnit: '&sensor.weather_wind_speed.attributes.unit_of_measurement',
                     humidity: '&sensor.weather_humidity.state',
                     humidityUnit: '&sensor.weather_humidity.attributes.unit_of_measurement',
                     apparentTemperature: '&sensor.weather_apparent_temperature.state',
                     apparentTemperatureUnit: '&sensor.weather_apparent_temperature.attributes.unit_of_measurement',
                     pressure: '&sensor.weather_pressure.state',
                     pressureUnit: '&sensor.weather_pressure.attributes.unit_of_measurement',
                     precipProbability: '&sensor.weather_precip_probability.state',
                     precipProbabilityUnit: '&sensor.weather_precip_probability.attributes.unit_of_measurement'
                  } },
                  { position: [0, 2], type: 'image', id: {}, title: 'Image', subtitle: 'image', url: 'config/images/bg5.jpg' },
                  { position: [2, 2], width: 2, type: 'sensor', id: 'sensor.outdoor_temperature', title: 'Outdoor', subtitle: 'sensor (filter)', filter: function (value) { return value + ' C'; } }
               ]
            },
            {
               title: 'Lists',
               width: 4,
               height: 3,
               items: [
                  { position: [0, 0], width: 2, height: 2, type: 'text_list', id: {}, title: 'House', subtitle: 'text_list', state: false, list: [
                     { title: 'Outdoor', icon: 'mdi-thermometer', value: '&sensor.outdoor_temperature.state &sensor.outdoor_temperature.attributes.unit_of_measurement' },
                     { title: 'Humidity', icon: 'mdi-water-percent', value: '&sensor.living_room_humidity.state &sensor.living_room_humidity.attributes.unit_of_measurement' },
                     { title: 'Energy', icon: 'mdi-lightning-bolt', value: '&sensor.energy_consumption.state &sensor.energy_consumption.attributes.unit_of_measurement' },
                     { title: 'Weather', icon: 'mdi-weather-partly-cloudy', value: '&sensor.weather_summary.state' }
                  ] },
                  { position: [2, 0], width: 2, height: 2, type: 'weather_list', id: {}, title: 'Forecast', subtitle: 'weather_list', hideHeader: false, icons: { 'clear-day': 'clear', 'cloudy': 'cloudy', 'rain': 'rain', 'snow': 'snow', 'partly-cloudy-day': 'partlycloudy' }, list: [
                     { date: 'Tomorrow', icon: '&sensor.weather_day_icon_1d.state', primary: '&sensor.weather_day_low_1d.state - &sensor.weather_day_high_1d.state&sensor.weather_day_high_1d.attributes.unit_of_measurement', secondary: '&sensor.weather_day_high_1d.attributes.unit_of_measurement' },
                     { date: 'Day 2', icon: '&sensor.weather_day_icon_2d.state', primary: '&sensor.weather_day_low_2d.state - &sensor.weather_day_high_2d.state&sensor.weather_day_high_2d.attributes.unit_of_measurement', secondary: '&sensor.weather_day_high_2d.attributes.unit_of_measurement' },
                     { date: 'Day 3', icon: '&sensor.weather_day_icon_3d.state', primary: '&sensor.weather_day_low_3d.state - &sensor.weather_day_high_3d.state&sensor.weather_day_high_3d.attributes.unit_of_measurement', secondary: '&sensor.weather_day_high_3d.attributes.unit_of_measurement' }
                  ] },
                  { position: [0, 2], width: 4, type: 'text_list', id: {}, title: 'Gauge target', subtitle: 'text_list (2)', state: false, list: [
                     { title: 'Sample', icon: 'mdi-gauge', value: '&sensor.my_sample_sensor.state' }
                  ] }
               ]
            }
         ]
      },
      {
         title: 'Network & cameras',
         bg: 'config/images/bg3.jpg',
         icon: 'mdi-numeric-3-box-outline',
         tileSize: 160,
         groups: [
            {
               title: 'Cameras',
               width: 4,
               height: 4,
               items: [
                  { position: [0, 0], width: 2, height: 2, type: 'camera', id: 'camera.front_gate', subtitle: 'camera', refresh: 5000, bgSize: 'cover' },
                  { position: [2, 0], type: 'camera_thumbnail', id: 'camera.front_gate', title: 'Thumbnail', subtitle: 'camera_thumbnail', state: false, bgSize: 'cover', fullscreen: { type: 'camera', refresh: 1500, bgSize: 'contain' }, refresh: 5000 },
                  { position: [3, 0], type: 'camera_stream', id: 'camera.front_gate', title: 'Stream', subtitle: 'camera_stream', state: false, objFit: 'contain' },
                  { position: [0, 2], width: 2, height: 2, type: 'device_tracker', id: 'device_tracker.phone', title: 'Phone', subtitle: 'device_tracker', map: 'yandex', states: { home: 'Home', not_home: 'Away', office: 'Office' }, zoomLevels: [13], slidesDelay: 1 },
                  { position: [2, 2], type: 'iframe', id: {}, title: 'Iframe', subtitle: 'iframe', state: false, url: 'https://example.com', refresh: 10000 },
                  { position: [3, 2], type: 'popup_iframe', id: {}, title: 'Popup iframe', subtitle: 'popup_iframe', state: false, customHtml: '<b>Tap to open</b>', url: 'https://example.com' }
               ]
            },
            {
               title: 'Door entry',
               width: 2,
               height: 4,
               items: [
                  { position: [0, 0], width: 2, type: 'door_entry', id: {}, title: 'Door entry', subtitle: 'door_entry', state: false, icon: 'mdi-phone', layout: {
                     camera: { type: 'camera', id: 'camera.front_gate', refresh: 1500, bgSize: 'cover' },
                     tiles: [
                        { position: [0, 0], type: 'switch', id: 'switch.intercom', title: 'Intercom', states: { on: 'Active', off: 'Idle' }, icons: { on: 'mdi-phone-in-talk', off: 'mdi-phone' } },
                        { position: [0, 1], type: 'script', id: 'script.front_gate_open', title: 'Open gate', icon: 'mdi-gate', state: false },
                        { position: [0, 2], type: 'switch', id: 'switch.outdoor_lights', title: 'Lights', states: { on: 'On', off: 'Off' }, icons: { on: 'mdi-lightbulb-on', off: 'mdi-lightbulb' } }
                     ]
                  } }
               ]
            }
         ]
      },
      {
         title: 'Layout torture',
         bg: 'config/images/bg5.jpg',
         icon: 'mdi-numeric-4-box-outline',
         tileSize: 110,
         tileMargin: 4,
         groupMarginCss: 'margin: 24px;',
         groups: [
            {
               title: 'Mixed sizes',
               width: 6,
               height: 3,
               items: [
                  { position: [0, 0], width: 1, height: 2, type: 'sensor', id: 'sensor.outdoor_temperature', title: 'Tall', subtitle: 'sensor' },
                  { position: [1, 0], width: 2, type: 'switch', id: 'switch.kitchen_spotlights', title: 'Wide', subtitle: 'switch' },
                  { position: [3, 0], type: 'sensor', id: 'sensor.living_room_humidity', title: 'Normal', subtitle: 'sensor' },
                  { position: [4, 0], width: 2, type: 'weather', id: 'weather.home', classes: ['-compact'], subtitle: 'weather (-compact)', icon: '&sensor.weather_icon.state', icons: { 'partly-cloudy-day': 'partlycloudy', 'rain': 'rain' }, fields: {
                     summary: '&sensor.weather_summary.state',
                     temperature: '&sensor.weather_temperature.state',
                     temperatureUnit: '&sensor.weather_temperature.attributes.unit_of_measurement'
                  } },
                  { position: [1, 1], type: 'cover_toggle', id: 'cover.living_room_blinds', title: 'Blinds', subtitle: 'cover_toggle' },
                  { position: [2, 1], type: 'input_boolean', id: 'input_boolean.play_radio', title: 'Radio', subtitle: 'input_boolean' },
                  { position: [3, 1], type: 'fan', id: 'fan.living_room_fan', title: 'Fan', subtitle: 'fan' },
                  { position: [4, 1], type: 'input_select', id: 'input_select.house_mode', title: 'Mode', subtitle: 'input_select' },
                  { position: [5, 1], type: 'light', id: 'light.floor_lamp', title: 'Lamp', subtitle: 'light' }
               ]
            },
            {
               title: 'Narrow column',
               width: 1,
               height: 4,
               items: [
                  { position: [0, 0], type: 'slider', id: 'input_number.volume', title: 'Vol', subtitle: 'slider', slider: { min: 0, max: 100, request: { type: 'call_service', domain: 'input_number', service: 'set_value', field: 'value' } } },
                  { position: [0, 1], type: 'sensor', id: 'sensor.battery_level', title: 'Bat', subtitle: 'sensor' },
                  { position: [0, 2], type: 'scene', id: 'scene.movie_time', title: 'Movie', subtitle: 'scene', icon: 'mdi-movie-roll', state: false },
                  { position: [0, 3], type: 'lock', id: 'lock.front_door', title: 'Lock', subtitle: 'lock' }
               ]
            },
            {
               title: 'Sparse group (overflow test)',
               width: 3,
               height: 1,
               items: [
                  { position: [0, 0], type: 'custom', id: {}, title: 'Only one tile', subtitle: 'custom', icon: 'mdi-information-outline', state: false, customHtml: '<i>sparse</i>' }
               ]
            }
         ]
      }
   ]
};
```

- [ ] **Step 2: Verify the config loads**

Run: `npm run build`
Expected: PASS (config is a static asset; build just copies it). Then a quick sanity check that the file has no syntax errors:

```bash
node --check public/config/test.js
```

Expected: no output, exit 0.

- [ ] **Step 3: Commit**

```bash
git add public/config/test.js
git commit -m "Add test config covering all tile types with mock entities"
```

---

### Task 5: Coverage test — `src/config/mock.test.ts`

**Files:**
- Create: `src/config/mock.test.ts`

**Interfaces:**
- Consumes: `TILE_TYPES` from `src/config/schema.ts` (Task 2), `public/config/test.js` (Task 4), `TileBoardConfig`/`TileConfig` types.

- [ ] **Step 1: Write the test** `src/config/mock.test.ts`

```ts
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { TileBoardConfig, TileConfig } from './types';
import { TILE_TYPES } from './schema';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(here, '../../public/config/test.js'), 'utf8');
const CONFIG = new Function('window', `${source}\n;return CONFIG;`)({
  location: { origin: 'http://localhost:5173' },
}) as TileBoardConfig;

function collectTiles(config: TileBoardConfig): TileConfig[] {
  const out: TileConfig[] = [];
  const walk = (items: TileConfig[]): void => {
    for (const item of items) {
      out.push(item);
      if (item.layout?.tiles) walk(item.layout.tiles);
      if (item.fullscreen) walk([item.fullscreen]);
    }
  };
  for (const page of config.pages) {
    for (const group of page.groups) walk(group.items);
  }
  return out;
}

function collectStrings(value: unknown, out: unknown[]): void {
  if (value == null) return;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    out.push(value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v) => collectStrings(v, out));
    return;
  }
  if (typeof value === 'object') {
    Object.values(value).forEach((v) => collectStrings(v, out));
  }
}

describe('test config coverage', () => {
  it('covers every tile type', () => {
    expect(CONFIG.mock, 'test.js must define mock.entities').toBeDefined();
    const tiles = collectTiles(CONFIG);
    const present = new Set(tiles.map((t) => t.type));
    const missing = TILE_TYPES.filter((t) => !present.has(t));
    expect(missing).toEqual([]);
  });

  it('references only entity ids that exist in mock data', () => {
    const mockIds = new Set((CONFIG.mock?.entities ?? []).map((e) => e.entity_id));
    const missing: string[] = [];
    for (const tile of collectTiles(CONFIG)) {
      if (typeof tile.id === 'string' && !mockIds.has(tile.id)) missing.push(tile.id);
      const values: unknown[] = [];
      collectStrings(tile, values);
      for (const v of values) {
        if (typeof v !== 'string') continue;
        for (const m of v.matchAll(/&([a-z0-9_]+\.[a-z0-9_]+)(?:\.|$)/gi)) {
          if (!mockIds.has(m[1])) missing.push(m[1]);
        }
      }
    }
    expect([...new Set(missing)]).toEqual([]);
  });

  it('mock entities match the HaEntity shape', () => {
    for (const e of CONFIG.mock?.entities ?? []) {
      expect(typeof e.entity_id).toBe('string');
      expect(typeof e.state).toBe('string');
      expect(e.attributes).toEqual(expect.any(Object));
    }
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npm run test -- src/config/mock.test.ts`
Expected: PASS (3 cases). If a tile type is reported missing, add a tile for it to `test.js` before proceeding.

- [ ] **Step 3: Commit**

```bash
git add src/config/mock.test.ts
git commit -m "Add coverage test pinning test config to tile types and mock entities"
```

---

### Task 6: Docs + full verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add a "Test config" section to README.md**

Append a section (before the final section of the file) describing:

```md
## Test config

For developing tile types and layouts, a test configuration ships at
`public/config/test.js` covering every tile type across four pages with varied
group sizes, alignment, and tile sizes. It runs in **mock mode**: instead of
connecting to Home Assistant, `?config=test` seeds the app with synthetic
entities matching the HA websocket shape and simulates live updates
(`mock.interval` ms between ticks). Tapping tiles mutates the mock state locally
(switches toggle, lights dim, media players play/pause), so behavior can be
tested without a server.

Run it with:

```bash
npm run dev
# open http://localhost:5173/?config=test
```

Pages:

- **Core tiles** — switches, lights, climate, covers, fans, sensors, inputs, alarm, gauge, custom.
- **Media & lists** — media_player, text_list, weather, weather_list, image.
- **Network & cameras** — camera, camera_thumbnail, camera_stream, device_tracker, iframe, popup_iframe, door_entry.
- **Layout torture** — varied tile sizes, a compact weather tile, narrow and sparse groups for overflow/scrollbar testing.

Adding a tile type: add the tile to `test.js` and any new entity to
`mock.entities`. `npm run test` fails if a tile type in `src/config/schema.ts`
is not present in the test config, or if a config tile references an entity id
that is not in the mock data.
```

- [ ] **Step 2: Full verification**

Run: `npm run lint && npm run typecheck && npm run test && npm run build`
Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "Document mock test config usage"
```

---

## Self-Review

- **Spec coverage:**
  - Mock config field + branch in connection → Tasks 1–3.
  - Mock `callService` / `getHistory` → Tasks 1–2.
  - Simulator jitter / media cycle / weather drift → Task 1.
  - Test config all 34 tile types + 4 pages + header/screensaver/events → Task 4.
  - HA-shaped entities with realistic attributes → Task 4 entity list.
  - Coverage test (types, entity refs, shape) → Task 5.
  - README docs → Task 6.
- **Placeholder scan:** All steps contain full code; no TODOs.
- **Type consistency:** `MockConfig`, `TILE_TYPES`, `setMockMode`, `startMockSimulator`, `mockCallService`, `mockGetHistory`, `stepMockEntities` are defined once (Task 1/2) and consumed consistently (Tasks 2–5). `toggleSwitch`'s `homeassistant` domain and `brightness_pct` are handled in `mockCallService` (verified against `src/tiles/actions.ts`).