# Screensaver Ambient Backdrop

Date: 2026-08-16

## Goal

Add an opt-in `ambient_backdrop` option to the screensaver. When enabled, each
slide is displayed fully contained within the screen, with a blurred and
grayscale version of the same image filling the screen behind it. This replaces
a workaround from the Angular version that used a MutationObserver to duplicate
the active slide's background image onto the slides container.

## Approach

Per-slide backdrop element rendered declaratively in React. When
`ambient_backdrop: true`, each `.screensaver-slide` gains a
`.screensaver-slide-backdrop` child using the same (cache-busted) bg URL.
CSS scoped under `.screensaver-slides.-ambient` flips the slide to `contain`
and styles the backdrop as `cover` + `blur(10px) grayscale(85%)` with a
`drop-shadow` on the foreground image.

Because the backdrop is a child of the crossfading slide element, the
existing `-active`/`-prev` opacity transition applies to both layers in sync
with no extra logic. The off-path (option unset) rendering is unchanged.

## Config

- Add `ambient_backdrop?: Field<boolean>` to `ScreensaverConfig` in
  `src/config/types.ts`.
- Add `'ambient_backdrop'` to the `SCREENSAVER_FIELDS` array in
  `src/utils/fields.ts` so it can be HA-field-resolved like the other
  screensaver options.
- Boolean-only (per decision). Tuning (blur radius, grayscale %, shadow) is
  left to existing custom CSS / per-slide `styles` overrides.

## Component (`src/components/Screensaver.tsx`)

- Compute `const ambient = Boolean(conf?.ambient_backdrop)`.
- Slides container class becomes `screensaver-slides` + ` -ambient` when on.
- Inside each slide, as the first child, render when `ambient`:

  ```jsx
  <div
    key="backdrop"
    className="screensaver-slide-backdrop"
    style={{ backgroundImage: `url(${slideBgUrl(slide.bg)})` }}
  />
  ```

- Reuses the existing cache-busted URL helper (`slideBgUrl`), so the backdrop
  busts on the same cadence as the slide.
- Per-slide `styles` keep spreading onto the slide div (which holds the
  contain image), so existing overrides behave as before.

## Styles (`styles/main.less`)

Scoped under `.screensaver-slides.-ambient`:

```less
.screensaver-slides.-ambient {
  .screensaver-slide {
    background-size: contain;
    background-repeat: no-repeat;
    filter: drop-shadow(black 10px 10px 20px);
  }
  .screensaver-slide-backdrop {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
    filter: blur(10px) grayscale(85%);
    z-index: -1;
  }
}
```

The `z-index: -1` is safe because `.screensaver-slide` is already
`position: absolute; z-index: 51`, which creates its own stacking context, so
the backdrop paints behind the contain image and the slide content. The
`filter: drop-shadow` on the slide applies to the composited slide output;
since the backdrop fills the screen its shadow edge is off-screen and
invisible.

## Docs

- Add `ambient_backdrop: true` (with a short comment) to the screensaver
  blocks in `public/config/config.example.js` and
  `public/config/reference_config_react.js`.

## Tests

Extend `src/components/Screensaver.test.tsx`:

- With `ambient_backdrop: true`: slides container has `-ambient` and a
  `.screensaver-slide-backdrop` exists per slide.
- With the option absent/false: no `-ambient` class and no
  `.screensaver-slide-backdrop` elements.

## Out of scope

- Configurable blur/grayscale/shadow values (boolean-only per decision).
- Per-slide ambient override.
- The photo-date / EXIF handling from the original MutationObserver — already
  built in via the `photo_date` item type.
