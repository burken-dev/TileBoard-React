# Step 11: Screensaver

**Goal:** Implement the idle screensaver: timeout, slide rotation with crossfade
classes, corner content items, and show/hide globals.

**Legacy reference:** `git show LEGACY_REF:scripts/controllers/screensaver.js`,
`git show LEGACY_REF:index.html` (`screensaver` markup).

**Files:**
- Create: `src/components/Screensaver.tsx`
- Test: `src/components/Screensaver.test.tsx`
- Modify: `src/App.tsx` (render + store wiring), `src/store/index.ts` (idle tracking if
  needed)

## Behavior (port of screensaver.js)

Activation: only when `config.screensaver?.timeout` is set.
- Track `lastActivity` (module ref): window listeners `click`, `keypress`,
  `touchstart`, `focus` reset it to `Date.now()`.
- Every 1000 ms: `inactivity = Date.now() - lastActivity`; show when
  `config.timeout < inactivity / 1000`; hide otherwise. Transition only on change.
- Show/hide calls `setScreensaverShown(state)` (store field created in step 08; camera
  tiles already freeze on it).
- Click anywhere on the screensaver hides it (legacy `ng-click hideScreensaver`).

Slide rotation:
- `slidesTimeout = config.slidesTimeout ?? 1` seconds; interval advances `activeSlide`
  cyclically over `config.slides`.
- Per slide classes (legacy `getSlideClasses`): `-active` when `activeSlide === index`;
  `-prev` when `wasActive` where `wasActive = activeSlide === index + 1 ||
  (slides.length === index + 1 && activeSlide === 0)`.
- Slide style: `backgroundImage: url(slide.bg)` merged with `slide.styles`.

Markup per legacy:

```
div.screensaver (style = config.styles) onClick hide
  div.screensaver-slides
    per slide: div.screensaver-slide (-active/-prev)
      corner divs for slide.rightBottom/rightTop/leftBottom/leftTop
        -> HeaderItem per entry (step 10 component)
  div.screensaver-content
    corner divs for config.rightBottom/rightTop/leftBottom/leftTop -> HeaderItem
```

Globals (legacy exposed for automations):

```ts
window.showScreensaver = () => { lastActivity = 0; force show (100 ms deferred like legacy) };
window.hideScreensaver = () => { lastActivity = Date.now(); force hide };
```

Declare them on `window` in `src/vite-env.d.ts` alongside `openPage`.

## Tests

`src/components/Screensaver.test.tsx` (fake timers, config `{ timeout: 5,
slidesTimeout: 1, slides: [{bg:'a.jpg'},{bg:'b.jpg'}] }`):
- not visible before timeout; visible after advancing fake time past 5 s.
- click hides and resets idle timer.
- active slide advances each second while shown; `-active`/`-prev` classes correct for
  a 2-slide loop.
- corner items render (datetime item → clock present).

- [ ] **Step 1:** Write failing tests.
- [ ] **Step 2:** Run — expect failures.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run — expect pass.
- [ ] **Step 5:** Manual check with a screensaver config: idle shows it, any click
  dismisses, slides rotate.
- [ ] **Step 6:** Verify — all four npm scripts green.
- [ ] **Step 7:** Commit — `git commit -m "step 11: screensaver"`

**Acceptance criteria:** Screensaver behavior matches legacy timing and classes; camera
tiles freeze while it is shown (already wired via store).

**Out of scope:** none — screensaver is self-contained.
