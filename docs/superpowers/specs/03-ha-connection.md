# Step 03: HA Connection, Entity Store, Services

**Goal:** Connect to Home Assistant (auth + WebSocket) via `home-assistant-js-websocket`,
keep entity states in a zustand store, expose service calls / raw messages / history REST,
handle `tileboard` events from HA, and ping the connection.

**Legacy reference:** `git show LEGACY_REF:scripts/models/api.js` (auth/OAuth/token/
reconnect/ping behavior), `git show LEGACY_REF:scripts/controllers/main.js` lines
~1976-2320 (init, handleMessage, pingConnection, setStates/setNewState, triggerEvents,
callFunction context, apiRequest/sendItemData).

**Files:**
- Create: `src/store/index.ts`, `src/ha/connection.ts`, `src/ha/services.ts`,
  `src/utils/functions.ts`, `src/utils/misc.ts`
- Test: `src/store/store.test.ts`, `src/ha/services.test.ts`, `src/ha/connection.test.ts`,
  `src/utils/misc.test.ts`
- Modify: `src/App.tsx`

## Interfaces produced

### src/utils/misc.ts (pure utilities, ported from legacy app.js)

```ts
export function leadZero(num: number): string | number;      // 5 -> "05", 12 -> 12
export function timeAgo(time: string | number | Date): string;
export function debounce<A extends unknown[]>(fn: (...args: A) => void, wait: number, immediate?: boolean): (...args: A) => void;
export function toAbsoluteServerURL(path: string, serverUrl: string): string;
export function escapeClass(text: unknown): string;          // non-alnum -> '_', lowercased; non-string -> 'non'
```

`toAbsoluteServerURL` takes `serverUrl` explicitly (no global CONFIG access; legacy read
the global). Port logic verbatim: absolute if starts with `http`, else `serverUrl + '/' + path`,
collapse duplicate slashes outside the protocol.

### src/store/index.ts

```ts
export type ConnectionStatus = 'loading' | 'ready' | 'reconnecting' | 'error';

interface AppData {
  config: TileBoardConfig;
  entities: EntityStates;
  status: ConnectionStatus;
}

interface AppDataActions {
  setEntities(states: HaEntity[]): void;      // index by entity_id, replace map
  updateEntity(state: HaEntity): void;        // merge into existing entry, new object identity
  setStatus(status: ConnectionStatus): void;
}

export type AppStore = AppData & AppDataActions;      // later specs extend this interface
export function createAppStore(config: TileBoardConfig): void;   // create singleton once
export function useAppStore(): AppStore;                          // zustand hook
export function getAppStore(): AppStore;                          // for non-component code
```

Implementation: zustand `create<AppStore>()`. `createAppStore` stores config, empty
entities, status `'loading'`. `updateEntity` merges: `{ ...existing, ...state }`
(replaces map entry — React needs new identity; legacy mutated in place).

### src/utils/functions.ts

```ts
export interface FunctionContext { ... }        // re-export type from config/types.ts
export function getContext(): FunctionContext;
export function callFunction<T>(funcOrValue: T | ConfigFunction<T>, args: unknown[]): unknown;
```

`getContext()` returns `{ states: getAppStore().entities, parseFieldValue, callService,
sendMessage, openPage, }` where `parseFieldValue` is imported from `utils/fields.ts`
(created in step 05 — until then use a temporary local implementation: functions passed
through, strings returned as-is; step 05 replaces the import). `openPage` delegates to
the store's `openPage` (added in step 04 — until then a no-op placeholder; step 04 wires it).
`callFunction`: if `typeof funcOrValue !== 'function'` return it unchanged, else
`funcOrValue.apply(getContext(), args)`.

### src/ha/connection.ts

```ts
export function initConnection(): void;        // uses config from getAppStore()
export function matchEvent(events: EventConfig[] | undefined, eventData: Record<string, unknown>): EventConfig | undefined;
```

`initConnection()` behavior:
1. status `'loading'`.
2. Auth: if `config.authToken` → `createLongLivedTokenAuth(config.serverUrl, config.authToken)`;
   else `getAuth({ hassUrl: config.serverUrl })` (library handles OAuth redirect +
   localStorage tokens, replacing legacy api.js `_getToken`/`redirectOAuth`).
3. `createConnection({ auth })`. On established:
   - status `'ready'`
   - `subscribeEntities(connection, states => setEntities(states))`
     (library also applies state_changed updates; this replaces legacy getStates +
     state_changed subscription)
   - `subscribeEvents(connection, e => handleTileboardEvent(e.event?.data), 'tileboard')`
     → `matchEvent` → `callFunction(action, [eventData])`
   - `callFunction(config.onReady, [])` if present
4. `connection.addEventListener('disconnected', ...)` → status `'reconnecting'`;
   `'ready'` event → status `'ready'` (library auto-reconnects; replaces legacy
   `_reconnect`).
5. Ping (unless `config.pingConnection === false`): every 5000 ms send
   `{ type: 'ping' }` via `sendMessage`; if no pong within 3000 ms → status
   `'reconnecting'`, `connection.reconnect()`. Also ping once on window `focus`.
   (Legacy additionally showed toasts here — toasts are wired to status transitions in
   step 10.)
6. Debug: if `config.debug`, log entity updates and tileboard events to console.

`matchEvent(events, data)`: returns first event where `event.command === data.command`.

### src/ha/services.ts

```ts
export function setConnection(conn: Connection): void;   // called by connection.ts
export function callService(domain: string, service: string, serviceData?: Record<string, unknown>): Promise<void>;
export function sendMessage<T = any>(data: Record<string, unknown>): Promise<T>;
export function getHistory(startDate: string, entityIds: string | string[], endDate?: string): Promise<any[][]>;
```

- `callService` → library `callService(conn, domain, service, serviceData)`;
  if no connection yet, reject with Error('not connected').
- `sendMessage` → `conn.sendMessagePromise(data)` (used by camera_thumbnail / camera/stream
  in step 08, ping here).
- `getHistory` → REST GET `{serverUrl}/api/history/period/{startDateISO}?end_time={endDateISO}&filter_entity_id={ids}`
  with header `Authorization: Bearer {auth.accessToken}` (legacy `Api.getHistory`).
  `endDate` defaults to now. Returns parsed JSON.

- [ ] **Step 1: Write failing tests**

`src/utils/misc.test.ts`:
- `leadZero(5)` → `'05'`; `leadZero(15)` → `15`.
- `toAbsoluteServerURL('/api/x', 'http://h:8123')` → `'http://h:8123/api/x'`;
  absolute URLs pass through; double slashes collapsed.
- `escapeClass('on')` → `'on'`; `escapeClass('not_home')` → `'not_home'`;
  `escapeClass('A B')` → `'a_b'`; `escapeClass(undefined)` → `'non'`.
- `timeAgo(Date.now() - 3000)` → `'just now'`; minutes/hours cases.
- `debounce` with fake timers: only last call within window runs.

`src/store/store.test.ts`:
- `createAppStore(minimalConfig)`; `setEntities([{entity_id:'a.b', state:'on', attributes:{}}])`
  → `entities['a.b'].state === 'on'`.
- `updateEntity({entity_id:'a.b', state:'off', attributes:{}})` → state `'off'`, object
  identity changed (`entities['a.b'] !== previous ref`).
- `setStatus('ready')` → status ready.

`src/ha/connection.test.ts`:
- `matchEvent([{command:'x', action}], {command:'x'})` returns the entry; no match → undefined.

`src/ha/services.test.ts`:
- with a fake connection object, `callService('switch','toggle',{entity_id:'a'})` calls
  the fake with those args; before `setConnection`, rejects.

- [ ] **Step 2: Run tests — expect failures.**

- [ ] **Step 3: Implement** misc.ts, store, functions.ts, services.ts, connection.ts.

- [ ] **Step 4: Run tests — expect pass.**

- [ ] **Step 5: Wire App.tsx**

`App.tsx`: on mount call `createAppStore(config)` then `initConnection()` once
(useEffect with empty deps; guard against double-invocation in StrictMode with a
module-level flag or remove StrictMode from main.tsx). Render placeholder until step 04.

- [ ] **Step 6: Verify** — all four npm scripts green.

- [ ] **Step 7: Commit** — `git commit -m "step 03: HA connection, entity store, services"`

**Acceptance criteria:** Against a reachable HA instance with a valid config, the app
connects, `useAppStore().entities` fills (verify via React DevTools or a temporary
console.log guarded by `config.debug`), and disconnecting the network flips status to
`'reconnecting'`. Unit tests cover store + pure helpers.

**Out of scope:** UI depending on entities (steps 04+), ping toasts (step 10),
window.openPage global (step 04), full parseFieldValue (step 05).
