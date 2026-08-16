# Screensaver Ambient Backdrop

Date: 2026-08-16

## Goal

Add an opt-in `ambient_backdrop` option to the screensaver. When enabled, each
slide is displayed fully contained within the screen, with a blurred and
grayscale version of the same image filling the screen behind it. This replaces
a workaround from the Angular version that used a MutationObserver to duplicate
the active slide's background image onto the slides container.

## Approach

The slides container shows the active slide's image as a `cover` background;
each slide keeps its sharp `contain` image as its own background;
`backdrop-filter: blur(10px) grayscale(85%)` on the slide blurs/grayscales
what is painted behind it (the container's cover image, visible through the
slide's transparent margins). The slide's own background always paints above
the container's background (per CSS painting order, an element's own
background paints before its descendants), so the sharp image stays on top
with no z-index tricks. The container background updates with the active slide
(same cache-busted URL via `activeBg`) — matching the original Angular
behavior where the MutationObserver swapped the parent background when the
active slide changed.

Because the background is painted by the slides container rather than a child
of the crossfading slide element, the `-active`/`-prev` opacity transition
still applies to the sharp foreground in sync; the container backdrop does not
crossfade but that matches the original Angular behavior (the MutationObserver
swapped the parent background instantly). The off-path (option unset)
rendering is unchanged.

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
- Slides container class becomes `screensaver-slides` + ` -ambient` when on,
  and its inline style carries the active slide's cache-busted URL as the
  container background:

  ```jsx
  <div
    className={'screensaver-slides' + (ambient ? ' -ambient' : '')}
    style={ambient && activeBg ? { backgroundImage: `url(${activeBg})` } : undefined}
  >
  ```

- There is NO per-slide `.screensaver-slide-backdrop` element; it was removed
  after review (it painted over the sharp foreground via `z-index: -1`).
- Slides keep their existing `backgroundImage: url(${slideBgUrl(slide.bg)})`
  and `...(slide.styles ?? {})` — the slide's own background paints above the
  container's, keeping the sharp contain image on top.
- Reuses the existing cache-busted URL helper (`slideBgUrl`), so both the
  container and the slide bust on the same cadence.

## Styles (`styles/main.less`)

Scoped under `.screensaver-slides.-ambient`:

```less
.screensaver-slides.-ambient {
  background-size: cover;
  background-position: center;

  .screensaver-slide {
    background-size: contain;
    background-repeat: no-repeat;
    filter: drop-shadow(black 10px 10px 20px);
    backdrop-filter: blur(10px) grayscale(85%);
    -webkit-backdrop-filter: blur(10px) grayscale(85%);
  }
}
```

Note: the slide selector must be written as plain `.screensaver-slide`, not
`&-slide` — the `&`-prefix form compiles to the dead compound selector
`.screensaver-slides.-ambient-slide` (fixed in commit e64ee1b).

The container's `cover` background fills the screen behind every slide. Each
slide keeps its `contain` background as the sharp foreground; per CSS painting
order (CSS 2.1 Appendix E, steps 1–2) an element's own background paints
before negative-z-index descendants — which is why the previous `z-index: -1`
backdrop child painted OVER the foreground. With the backdrop gone, the
`backdrop-filter: blur(10px) grayscale(85%)` on the slide blurs and
grayscales the container's cover image visible through the slide's transparent
margins, while the slide's own contained image stays sharp. The `filter:
drop-shadow` applies to the slide's own composite (no backdrop child), so it
correctly shadows the contained foreground image.

## Docs

- Add `ambient_backdrop: true` (with a short comment) to the screensaver
  blocks in `public/config/config.example.js` and
  `public/config/reference_config_react.js`.

## Tests

Extend `src/components/Screensaver.test.tsx`:

- With `ambient_backdrop: true`: slides container has `-ambient` and its
  inline background is the active slide's cache-busted URL (updates as the
  slide rotates); no `.screensaver-slide-backdrop` elements.
- With the option absent/false: no `-ambient` class, no inline container
  background, and no `.screensaver-slide-backdrop` elements.

## Out of scope

- Configurable blur/grayscale/shadow values (boolean-only per decision).
- Per-slide ambient override.
- The photo-date / EXIF handling from the original MutationObserver — already
  built in via the `photo_date` item type.
