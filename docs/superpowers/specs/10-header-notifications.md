# Step 10: Header Items & Toast Notifications

**Goal:** Implement the header (global + per-page) with its item types, and the toast
notification system (legacy Noty), wired to connection status and unknown-entity
warnings.

**Legacy reference:** `git show LEGACY_REF:index.html` (`header.html`,
`header-items.html` templates, `noties-container`), `git show LEGACY_REF:scripts/
directives.js` (`clock`, `date`, `headerItem`), `git show LEGACY_REF:scripts/models/
noty.js`, `git show LEGACY_REF:scripts/controllers/noty.js`,
`git show LEGACY_REF:scripts/controllers/main.js` (`getHeader`, `addError`,
`warnUnknownItem`, ping noties), `git show LEGACY_REF:scripts/app.js` (DEFAULT_HEADER).

**Files:**
- Create: `src/components/Header.tsx`, `src/components/HeaderItem.tsx`,
  `src/components/Clock.tsx`, `src/components/DateDisplay.tsx`,
  `src/components/Notifications.tsx`
- Test: `src/components/Header.test.tsx`, `src/components/Notifications.test.tsx`,
  `src/store/notifications.test.ts`
- Modify: `src/store/index.ts` (notifications slice), `src/App.tsx` (render header +
  notifications), `src/components/Page.tsx` (page-level header),
  `src/ha/connection.ts` (status toasts), `src/utils/entity.ts` (unknown-item warning)

## Header

`getHeader(page)` = `page?.header ?? config.header` (default already applied by
step 02's `DEFAULT_HEADER`).

- `App.tsx`: render `<Header header={config.header} />` between menu and pages when
  config.header exists (legacy top-level position).
- `Page.tsx`: render `<Header header={page.header} />` inside the page when
  `page.header` exists (replaces the global one visually, legacy behavior).
- `Header.tsx`: `div.header > div.header-content` (style = `header.styles`) →
  `div.header--left` / `div.header--right`, each mapping items to `<HeaderItem />`.
- `HeaderItem.tsx`: outer `div.header-item -{type}` + `item.styles`; skip when
  `isHidden(item)`. Types:
  - `time` → `<Clock />`
  - `date` → `<DateDisplay format={item.format ?? 'EEEE, LLLL dd'} />`
  - `datetime` → `<Clock />` + `<DateDisplay format={item.dateFormat} />`
  - `custom_html` → `<div dangerouslySetInnerHTML={{ __html: item.html }} />`
  - `weather` → legacy `header-weather--*` markup; icon resolution reuses step 09's
    `getWeatherIcon` / image styles (export them from `src/components/tiles/WeatherTile.tsx`
    or move to `src/utils/weather.ts` — prefer moving to `src/utils/weather.ts` and
    updating step 09's import), fields via `parseFieldValue(item.fields[...])`.

`Clock.tsx` (legacy clock directive): spans `clock--h`, `clock--colon` (":"),
`clock--m`, `clock--postfix`; 1 s interval; `timeFormat === 12` → AM/PM postfix and
`h % 12 || 12`, else leading-zero 24 h. Clean up interval on unmount.

`DateDisplay.tsx`: renders `format(new Date(), fmt)` (date-fns), refreshed every 60 s.
Legacy Angular format strings map directly to date-fns tokens for the documented
default `'EEEE, LLLL dd'`; document in README (step 12) that exotic Angular tokens may
need adjustment.

## Notifications store slice

```ts
interface NotificationData {
  id?: string | number;          // default: random
  type?: 'info' | 'warning' | 'error' | 'success';   // default info
  title?: string;
  message?: string;              // HTML allowed
  icon?: string;                 // mdi class
  lifetime?: number;             // seconds; absent = persistent
}

notifications: NotificationModel[];     // visible
addNotification(data: NotificationData): void;
removeNotification(id: string | number): void;
clearNotifications(): void;
notificationSeen(id: string | number): boolean;   // history, survives removal
```

`NotificationModel` = data + `showed: boolean` (false until 100 ms after add — drives
the `-showed` CSS entrance). Behavior ported from legacy noty.js:
- same `id` as a visible notification → update it in place and reset its lifetime timer.
- `lifetime` → auto-remove after `lifetime * 1000` ms (timer reset on update).
- `notificationSeen` keeps every id ever shown (legacy `notiesHistory` /
  `hasSeenNoteId`).

## Notifications.tsx

Markup per legacy `noties-container`: container class `-{notiesPosition}` (default
right); per notification `div.noty -{type}` (+ `-showed`): header (title + close
mdi-close), content (icon + message via dangerouslySetInnerHTML), lifetime bar
(`noty-lifetime-line` with `animationDuration: {lifetime}s`). "Clear all" button when
more than one visible.

## Wiring

- `src/ha/connection.ts`:
  - connection error events → `addNotification({ type:'error', title:'Connection', message })`
    unless `config.ignoreErrors` (legacy `addError`, lifetime 10).
  - ping failure → `{ type:'warning', title:'Connection', message:'Ping unsuccessful', id:'ping' }`;
    on reconnect-ready after that → remove it and add
    `{ type:'success', title:'Connection', message:'Reconnection successful', lifetime:1, id:'ping-ok' }`.
- `src/utils/entity.ts` `getItemEntity` unknown id: replace the step-05 console.warn
  with a deduplicated warning notification
  `{ type:'warning', id: `${item.id}_not_found`, title:'Entity not found', message: item.id }`
  (skip when `notificationSeen(id)`), plus keep the console.warn.

## Tests

`src/store/notifications.test.ts` (fake timers): add → appears; showed flips after
100 ms; lifetime auto-removes; same-id update resets timer; seen history persists.
`src/components/Header.test.tsx`: renders clock (fake timers, 12 h config shows AM/PM),
custom_html item, hidden item skipped.
`src/components/Notifications.test.tsx`: renders type classes, clear-all button,
message HTML.

- [ ] **Step 1:** Write failing tests.
- [ ] **Step 2:** Run — expect failures.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run — expect pass.
- [ ] **Step 5:** Manual check: header datetime renders; killing the HA server shows
  error/reconnect toasts per wiring.
- [ ] **Step 6:** Verify — all four npm scripts green.
- [ ] **Step 7:** Commit — `git commit -m "step 10: header items and toast notifications"`

**Acceptance criteria:** Global and page headers render per config; toasts reproduce
legacy lifecycle (entrance delay, lifetime bar, id dedupe, clear all).

**Out of scope:** `window.onerror` toast (step 12), screensaver corner items reuse
HeaderItem but are wired in step 11.
