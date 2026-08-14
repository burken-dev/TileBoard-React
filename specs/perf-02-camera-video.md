# PERF-02: Camera & video efficiency

Target hardware: Raspberry Pi / old tablets. Camera tiles are the biggest
continuous CPU/network drain. This spec fixes the three worst offenders.

## Problems (from audit)

1. **`CameraStream` ignores `freezed`** (`src/components/cameras/CameraStream.tsx:15`):
   the prop is declared in `CameraStreamProps` but destructured as
   `({ item, entity })` — `freezed` is dropped. Every `camera_stream` tile mounts a
   `<video>` + `Hls` instance that keeps decoding and buffering on **every page,
   always** — even when its page isn't active, a fullscreen camera is open, or the
   screensaver is shown. N streams = N simultaneous H.264 decodes on a Pi.
   (Compare `Camera.tsx:41-42` and `CameraThumbnail.tsx:13-14,38` which both honor
   `freezed`.)
2. **hls.js statically imported** (`CameraStream.tsx:3`) → ~500 kB lands in the
   main JS chunk and is parsed on startup even on dashboards with zero cameras.
3. **`CameraThumbnail` polls every 2 s by default** (`CameraThumbnail.tsx:23`,
   `refresh ?? 2000`): each cycle is a websocket `camera_thumbnail` round-trip +
   base64 JPEG decode + full-tile image-layer swap. Several cameras = constant
   background load. It also keeps polling while frozen (only the `lastUpdate &&
   freezedRef.current` guard in `reload()` stops the request, but the interval
   keeps firing and `reload()` re-runs on every tick until that guard).
4. **`Camera` refresh** (`src/components/cameras/Camera.tsx:66-69`): the `freezed`
   guard only kicks in after `i > 1` iterations (`(i > 1 && freezedRef.current)`),
   so it keeps reloading the full-screen image twice after freezing. Should skip
   immediately when frozen.

## Fix

### 1. Honor `freezed` in `CameraStream` (`src/components/cameras/CameraStream.tsx`)

- Destructure `freezed` from props.
- When `freezed` is true, do NOT start the stream: the url-fetch effect should
  early-return (add `freezed` to its dependency array) and the hls-attach effect
  should skip.
- When `freezed` flips back to false, resume (effects re-run because `freezed` is
  in the deps).
- The hls effect cleanup already calls `hls.destroy()`; make sure switching to
  frozen actually tears down the `Hls` instance and pauses the video element.
  Something like: when frozen, `el.pause()` and skip creating hls; when unfrozen,
  attach and play.

Suggested shape (adapt as needed):

```tsx
export function CameraStream({ item, entity, freezed }: CameraStreamProps) {
  ...
  useEffect(() => {
    if (freezed) return;
    if (entity?.state === 'off') return;
    // fetch stream url (existing logic, add freezed to deps)
  }, [entity, serverUrl, item.id, freezed]);

  useEffect(() => {
    if (freezed || !url) return;
    // existing hls setup
  }, [url, item.bufferLength, freezed]);
  ...
}
```

### 2. Dynamic-import hls.js (`src/components/cameras/CameraStream.tsx`)

Replace the static `import Hls from 'hls.js'` with a dynamic import so Vite
splits hls.js into a separate chunk only fetched when a camera stream is used.

- Remove the static import.
- In the hls-setup effect:

```tsx
useEffect(() => {
  if (freezed || !url) return;
  const el = videoRef.current;
  if (!el) return;
  let hls: import('hls.js').default | null = null;
  let cancelled = false;
  (async () => {
    const { default: Hls } = await import('hls.js');
    if (cancelled || freezed) return;
    const len = typeof item.bufferLength !== 'undefined' ? item.bufferLength : 5;
    hls = new Hls({ maxBufferLength: len, maxMaxBufferLength: len });
    hls.loadSource(url);
    hls.attachMedia(el);
    hls.on(Hls.Events.MANIFEST_PARSED, () => el.play().catch(() => {}));
  })();
  return () => {
    cancelled = true;
    hls?.destroy();
  };
}, [url, item.bufferLength, freezed]);
```

Keep behavior identical when the stream is active. hls.js must only ever load
when a stream tile is mounted and unfrozen.

### 3. `CameraThumbnail`: slower default + skip when frozen (`CameraThumbnail.tsx`)

- Raise the default refresh from `2000` to `5000` ms (`item.refresh ?? 5000`).
- In `reload()`, return immediately when `freezedRef.current` is true (drop the
  `lastUpdate &&` condition so a frozen tile never fires requests):

```tsx
const reload = (): void => {
  if (freezedRef.current) return;
  if (Date.now() - lastUpdate < (refresh ? refresh * 0.9 : 100)) return;
  lastUpdate = Date.now();
  if (entity?.state === 'off') return;
  ...
};
```

- While frozen, `reload()` should also not clear `lastUpdate` (it returns early).
- When the tile becomes visible again, the next interval tick refreshes normally.

### 4. `Camera`: stop immediately when frozen (`Camera.tsx`)

- In `reload()` change `if (!photoUrl || (i > 1 && freezedRef.current)) return;`
  to `if (!photoUrl || freezedRef.current) return;` so a frozen camera tile stops
  reloading immediately instead of after two extra iterations.

## Do NOT touch

- `src/components/Pages.tsx`, `Page.tsx`, `usePanGesture.ts`, `Screensaver.tsx`, `Clock.tsx` (PERF-04)
- `src/App.tsx`, `src/components/popups/HistoryPopup.tsx`, `src/styles/themes.less` (PERF-03)
- `src/ha/connection.ts`, `src/store/index.ts`, `src/components/Tile.tsx`, tile bodies (PERF-01)
- Camera popups already pass `freezed={false}` intentionally (fullscreen camera
  should keep refreshing) — do not change.

## Verification (MUST run)

```
npm run typecheck
npm run lint
npm test
npm run build
```

The build should now emit a separate (smaller) chunk containing hls.js rather
than including it in the main `index-*.js` chunk.

## Outcome

- No HLS decode, no thumbnail polling, no image reload on hidden/frozen pages.
- hls.js (~500 kB) no longer ships in the critical startup chunk.
- Thumbnail polling cost per camera drops 2.5x.