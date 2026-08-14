# Move config files into a mountable subfolder

## Goal

Move runtime-customizable files (config, custom CSS, user images, manifest) into
a single `config/` subfolder so a Docker user can mount one directory and have
every override land in the container.

## Target container layout

```
/usr/share/nginx/html/
  index.html, assets/, images/weather-icons/   # bundled app assets, unchanged
  config/
    config.js
    styles/custom.css
    images/                                    # user images (bg1.jpeg, ...)
    manifest.webmanifest
```

Only `config/` is user-mountable. Bundled assets stay at the root and keep
working (the built CSS references `../images/weather-icons/...` from
`dist/assets/`, so weather-icons must remain at `dist/images/weather-icons/`).

## Changes

1. **`index.html`** — load `/config/config.js`, `/config/styles/custom.css`,
   `/config/manifest.webmanifest` instead of the root paths.

2. **Move files** in `public/`:
   - `public/config.example.js` → `public/config/config.example.js`
   - `public/manifest.webmanifest` → `public/config/manifest.webmanifest`
   - user-images referenced by the example config (`bg*.jpeg`) → `public/config/images/`
   - `public/images/weather-icons/`, `public/images/screenshots/`,
     `public/images/tile-screenshots/` **stay** where they are — weather-icons
     is a bundled CSS dependency; the other two are dev-reference assets.

3. **Example config** — image references change from `images/bg1.jpeg` to
   `config/images/bg1.jpeg` (paths resolve relative to the page root).

4. **`Dockerfile`** — copy `dist/config/config.example.js` to
   `dist/config/config.js` and create an empty `dist/config/styles/custom.css`
   so the image ships usable defaults inside the mountable folder.

5. **`nginx.conf`** — add no-cache for `/config/`; `location = /config/config.js`
   falls back to `config.example.js` when no user file is mounted.

6. **`README.md`** — Docker section: single mount
   `-v /host/config:/usr/share/nginx/html/config:ro`; document the moved image
   path convention (`config/images/...`).

## Error handling

- No `config/config.js` and no fallback → the existing load error screen shows
  (update the message text to reference the new path if it mentions paths).

## Testing

- Existing unit tests keep passing (config loading logic unchanged).
- `npm run build` produces a valid `dist/config/` tree.
- `docker build` succeeds; `docker run` without mounts serves the example; with
  a mounted `config/` folder the mounted files are used.