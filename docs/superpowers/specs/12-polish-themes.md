# Step 12: Themes, Error Toast, README, Final Parity Check

**Goal:** Verify all themes, add the global JS-error toast, rewrite the README for the
new config format, and work through the final feature-parity checklist against the
legacy app.

**Legacy reference:** `git show LEGACY_REF:scripts/app.js` (CUSTOM_THEMES,
window.onerror), `git show LEGACY_REF:styles/themes.less`, `git show LEGACY_REF:README.md`,
`git show LEGACY_REF:TILE_EXAMPLES.md`, `git show LEGACY_REF:config.example.js`.

**Files:**
- Modify: `src/main.tsx` (window.onerror), `README.md` (rewrite),
  `public/config.example.js` (sync with README if drifted)
- Test: `src/themes.test.tsx`
- Review (no changes unless broken): `styles/themes.less`, `styles/custom.css`,
  `public/manifest.webmanifest`

## Themes

Body classes are applied since step 04 (`-theme-{name}` per `customTheme`, string or
array). Verify against `styles/themes.less` that every legacy theme name works:
`transparent`, `material`, `win95`, `winphone`, `mobile`, `compact`, `homekit`,
`fresh-air`, `white-paper`. `custom.css` remains the user override file (imported by
main.tsx since step 01).

Test: for each theme name, render App with that `customTheme` and assert the body
carries the class.

## window.onerror toast

In `src/main.tsx` (port of legacy app.js):

```ts
window.onerror = (error, file, line, col) => {
  addNotification({
    type: 'error',
    title: 'JS error',
    message: [String(error), `File: ${file}`, `Line: ${line}:${col}`].join('<br>'),
    lifetime: 12,
    id: String(error),
  });
};
```

(install before React renders; guard so it doesn't crash when the store isn't ready —
queue or no-op if `getAppStore` uninitialized.)

## README rewrite

Rewrite `README.md` for the React version:
- Project intro (keep upstream credit + links).
- Install: `npm install`, `npm run dev` (development against HA), `npm run build` →
  deploy `dist/` to HA's `www/tileboard`, served at `/local/tileboard/`.
- Copy `public/config.example.js` to `public/config.js` (dev) or `dist/config.js`
  (deployed); runtime-loaded, no rebuild needed.
- Config reference: port the legacy README's sections (CONFIG fields, pages, groups,
  tiles, `&`/`@` templates, events, notifications, custom CSS) rewritten for the new
  string-literal format; keep `TILE_EXAMPLES.md` as-is but update any `TYPES.X`
  references to string literals.
- Note breaking changes vs legacy: string literals instead of globals, new config
  function context (no `$scope`; `callService` instead of `api`), `openPage(index)`.

## Final parity checklist

Go through each row: find the legacy behavior (`git show LEGACY_REF:...`), verify the
React implementation exists, fix gaps found (small fixes inline; anything large → stop
and report). Record results in the commit message body as `[x]`/`[ ]` lines.

- [ ] Auth: OAuth redirect flow, token storage, long-lived `authToken` config, 401 → re-auth
- [ ] WebSocket: entity states, state_changed updates, reconnect, ping (5 s / 3 s timeout)
- [ ] `tileboard` HA events dispatch to `config.events` actions
- [ ] `onReady` fires on (re)connect with function context
- [ ] Pages: menu (left/bottom), transitions animated/animated_gpu/simple, pan gesture,
      hash page memory (`rememberLastPage`), hidden pages
- [ ] Groups: auto width/height, margins, hidden groups
- [ ] Tile shell: position/size math, bg/bgSuffix/bgOpacity, slides, title/subtitle/state,
      classes incl. state class, customStyles, hidden, long-press 600 ms
- [ ] All 34 tile types render (compare against `public/images/tile-screenshots/`)
- [ ] All service calls: switch/light/fan/input_boolean toggle, lock, cover, vacuum,
      automation, script, scene, input_number, input_select, fan speed, climate temp +
      preset, media player (play/pause/stop/prev/next/power/source/volume/mute),
      alarm arm/disarm, input_datetime, slider request
- [ ] Popups: camera fullscreen + list navigation, iframe, history chart (incl. category
      axis + multi-series), door entry (+ auto-close timer), alarm keypad (+ 3 s
      auto-close on state change), datetime keypad
- [ ] Device tracker maps: google / mapbox / yandex URLs, zoom levels, entity picture slide
- [ ] Header: global + per-page, all 5 item types, clock 12/24 h
- [ ] Notifications: types, lifetime bar, id dedupe/update, clear all, positions,
      ping + connection + unknown-entity toasts, window.onerror toast
- [ ] Screensaver: timeout, slides, corner items, show/hide globals, camera freeze
- [ ] Themes: all 9 legacy themes + custom.css override
- [ ] Globals for automations: `openPage`, `showScreensaver`, `hideScreensaver`
- [ ] PWA manifest + favicon intact; `npm run build` output deployable as static files

## Final cleanup

- Remove any temporary/debug code added in earlier steps (search for `console.log`
  outside `config.debug` guards).
- Confirm no imports from `scripts/` remain anywhere.
- `public/config.example.js` loads without errors in the built app.

- [ ] **Step 1:** Theme test + window.onerror toast; run all scripts.
- [ ] **Step 2:** Rewrite README + sync example config.
- [ ] **Step 3:** Work the parity checklist; fix gaps.
- [ ] **Step 4:** Verify — `npm run lint && npm run typecheck && npm run test && npm run build`.
- [ ] **Step 5:** Commit — `git commit -m "step 12: themes, error toast, README, parity checklist"`
  with the completed checklist in the commit body.

**Acceptance criteria:** Every checklist row verified against legacy code; README
accurately documents the new config; build output works as a static HA dashboard.

**Out of scope:** new features, e2e browser tests, packaging/publishing.
