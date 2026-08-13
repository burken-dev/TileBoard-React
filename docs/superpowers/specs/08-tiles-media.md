# Step 08: Media Tiles — Cameras, Streams, Media Player

**Goal:** Implement CAMERA, CAMERA_THUMBNAIL, CAMERA_STREAM (hls.js), MEDIA_PLAYER, and
the fullscreen camera popup.

**Legacy reference:** `git show LEGACY_REF:scripts/directives.js` (camera,
cameraThumbnail, cameraStream directives), `git show LEGACY_REF:index.html` (camera
tile sections, `camera-popup`, media player section), `git show LEGACY_REF:scripts/
controllers/main.js` (`openCamera/closeCamera/getCameraList/getCameraEntityFullscreen`,
`sendPlayer/mutePlayer/setSourcePlayer/getVolumeConf/volumeChanged/
shouldShowVolumeSlider/shouldShowVolumeButtons`).

**Files:**
- Create: `src/components/cameras/Camera.tsx`, `CameraThumbnail.tsx`, `CameraStream.tsx`,
  `src/components/tiles/MediaPlayerTile.tsx`, `src/components/popups/CameraPopup.tsx`,
  `src/utils/cameras.ts`
- Test: `src/utils/cameras.test.ts`, `src/components/cameras/cameras.test.tsx`,
  `src/components/tiles/MediaPlayerTile.test.tsx`
- Modify: `src/components/tiles/TileBody.tsx`, `src/tiles/actions.ts`,
  `src/store/index.ts` (camera slice + screensaverShown)

## Store additions

```ts
activeCamera: TileConfig | null;
openCamera(item: TileConfig): void;
closeCamera(): void;
screensaverShown: boolean;                 // created here, driven by step 11
setScreensaverShown(shown: boolean): void;
```

Click handlers added: CAMERA, CAMERA_THUMBNAIL, CAMERA_STREAM → `openCamera(item)`.

## Freeze rule (shared)

Camera tiles receive `freezed = !isPageActive(page) || activeCamera !== null ||
screensaverShown`. TileBody passes it down.

## Camera (refreshing still image) — cameras/Camera.tsx

Props `{ item, entity, freezed }`. Legacy directive behavior:
- URL = `item.filter(item, entity)` if function, else `entity.attributes.entity_picture`;
  resolved through `toAbsoluteServerURL`.
- If `item.refresh` (number, or function evaluated once): every `refresh` ms reload by
  appending cache buster `_i=N` (`?` or `&` depending on existing query). While
  `freezed`, stop reloading after 2 loads (legacy `$i > 1 && freezed`).
- Crossfade: render the new image div (backgroundImage, `backgroundSize: item.bgSize ??
  'cover'`, opacity 0), set opacity 1 after 100 ms, then drop the previous layer.
  Implement with two state slots (current/prev) — no direct DOM manipulation.

## Camera thumbnail — cameras/CameraThumbnail.tsx

- `refresh = 'refresh' in item ? item.refresh : 2000` (function evaluated once);
  `throttle = refresh ? refresh * 0.9 : 100`.
- On interval: skip if throttled (`Date.now() - last < throttle`), if `freezed` and
  already loaded once, or if `entity.state === 'off'`.
- `sendMessage({ type: 'camera_thumbnail', entity_id })` → `res.result.content` →
  render `data:{content_type};base64,{content}` with the same crossfade + bgSize as above.

## Camera stream — cameras/CameraStream.tsx

- On entity change: if `state === 'off'` do nothing; `sendMessage({ type: 'camera/stream',
  entity_id })` → `res.result.url` via `toAbsoluteServerURL` → hls.js.
- `import Hls from 'hls.js'`; config `{ maxBufferLength: n, maxMaxBufferLength: n }`
  with `n = item.bufferLength ?? 5`; on `Hls.Events.MANIFEST_PARSED` → `video.play()`.
- `<video muted style={{ objectFit: item.objFit ?? 'fill', width: '100%', height: '100%' }}>`.
  Destroy the Hls instance on unmount / URL change.

## Camera popup — popups/CameraPopup.tsx

Rendered when `activeCamera` is set and a fullscreen entity resolves. Legacy markup:
`camera-popup` → `camera-popup-container` → title (with close button mdi-close, title =
entityTitle) → `camera-popup--list` (one `camera-popup--list-item` per camera in the
list, `-active` for current, click → `openCamera(thatItem)`) → `camera-popup--camera`
rendering the fullscreen tile's camera component per its type.

`src/utils/cameras.ts` (pure, tested):

```ts
export function getCameraList(pages: PageConfig[]): TileConfig[];
// flat scan pages -> groups -> items; keep types camera/camera_thumbnail/camera_stream

export function getFullscreenEntity(item: TileConfig, entities: EntityStates): HaEntity | null;
// id = item.fullscreen?.id ?? item.id; object id -> itself; string -> entities[id] ?? null
```

Fullscreen config = `item.fullscreen` (a tile config of a camera type); when absent,
render nothing (legacy requires it for the popup body).

## Media player — tiles/MediaPlayerTile.tsx

Markup per legacy `media-player-table` (table layout kept — classes exist in main.less):
root classes `-has-state` / `-has-subtitle` when tile state/subtitle render.

- Main button (only when `state !== 'off'`): PAUSE feature && `'playing'` → mdi-pause
  (`media_pause`); no PAUSE feature && `'playing'` → mdi-stop (`media_stop`);
  `'stopped' | 'paused' | 'idle'` → mdi-play (`media_play`).
- Track buttons (when state !== 'off' and feature present): PREVIOUS_TRACK →
  `media_previous_track`, NEXT_TRACK → `media_next_track`.
- Power: TURN_ON feature && `'off'` → `turn_on`; TURN_OFF feature && not off → `turn_off`.
  All via `media_player/<service>` with `{ entity_id }` (`sendPlayer`).
- Source row: when `attributes.source_list?.length && !item.hideSource`:
  `media-player--source` showing `attributes.source || 'Source'`, click →
  `openSelect(item)`. Overlay (step 07's SelectOverlay) options = source_list,
  active = attributes.source; choose → `media_player/select_source { entity_id, source }`.
- Volume slider when `shouldShowVolumeSlider`: VOLUME_SET feature && `'volume_level' in
  attributes` && state !== 'off'. Conf `{ max: 100, min: 0, step: 1, value:
  Math.round(volume_level * 100) }`; onChange → debounce 250 ms →
  `media_player/volume_set { entity_id, volume_level: value / 100 }`.
- Volume buttons when `shouldShowVolumeButtons`: (no VOLUME_SET feature or no
  volume_level) && VOLUME_STEP feature && state !== 'off' → `volume_down` / `volume_up`.
- Mute button when state !== 'off' && !item.hideMuteButton && VOLUME_MUTE feature:
  icon mdi-volume-mute if `attributes.is_volume_muted` else mdi-volume-high →
  `media_player/volume_mute { entity_id, is_volume_muted: !current }`.

## Tests

`src/utils/cameras.test.ts`: camera list extraction from nested pages; fullscreen entity
resolution (own id, fullscreen.id, synthetic object id).
`src/components/cameras/cameras.test.tsx` (mock `sendMessage`, fake timers):
- thumbnail requests `camera_thumbnail` and renders data URL from mocked result; skips
  when state off.
- stream requests `camera/stream` (mock Hls via `vi.mock('hls.js')`).
- photo camera appends `_i=1` cache buster on refresh tick.
`src/components/tiles/MediaPlayerTile.test.tsx`:
- playing + PAUSE feature renders pause; clicking calls `media_player/media_pause`.
- volume slider renders when VOLUME_SET + volume_level; dragging calls volume_set with
  `volume_level` 0..1.
- mute button flips `is_volume_muted`.

- [ ] **Step 1:** Write failing tests.
- [ ] **Step 2:** Run — expect failures.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run — expect pass.
- [ ] **Step 5:** Manual check with a camera entity if available; otherwise verify popup
  opens/closes and list navigation with a mocked entity. Compare rendered tiles with
  legacy screenshots in `public/images/tile-screenshots/`.
- [ ] **Step 6:** Verify — all four npm scripts green.
- [ ] **Step 7:** Commit — `git commit -m "step 08: cameras, streams, media player"`

**Acceptance criteria:** All four tile types render and act per legacy; popup matches
legacy markup/classes; hls.js is only loaded when a stream tile exists (static import is
acceptable — note dynamic import as optional optimization, not required).

**Out of scope:** door entry popup reuses camera components but is wired in step 09.
