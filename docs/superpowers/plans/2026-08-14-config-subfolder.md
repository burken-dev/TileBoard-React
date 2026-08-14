# Config Subfolder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move runtime-customizable files (config, custom CSS, user images, manifest) into a single `config/` subfolder so Docker users can mount one directory and get all overrides.

**Architecture:** `public/` keeps a `config/` subfolder holding `config.example.js`, `manifest.webmanifest`, and user images (`bg*.jpeg`). The built `dist/` mirrors this. `index.html` references paths under `/config/`. `nginx.conf` adds a `/config/` location with no-cache and a `config.js`→`config.example.js` fallback. Bundled assets (`weather-icons/`, `screenshots/`, `tile-screenshots/`) stay at the static root.

**Tech Stack:** Vite, nginx, Docker, TypeScript.

## Global Constraints

- Image paths in configs resolve relative to the page root, so `images/bg1.jpeg` becomes `config/images/bg1.jpeg`.
- `public/images/weather-icons/`, `public/images/screenshots/`, `public/images/tile-screenshots/` must NOT move — the built CSS references `../images/weather-icons/...`.
- No user config file content changes beyond image paths.
- Run `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` before pushing.

---
### Task 1: Move files into `public/config/`

**Files:**
- Move: `public/config.example.js` → `public/config/config.example.js`
- Move: `public/manifest.webmanifest` → `public/config/manifest.webmanifest`
- Move: `public/images/bg1.jpeg` → `public/config/images/bg1.jpeg`
- Move: `public/images/bg2.png` → `public/config/images/bg2.png`
- Move: `public/images/bg3.jpg` → `public/config/images/bg3.jpg`
- Move: `public/images/bg5.jpg` → `public/config/images/bg5.jpg`

**Interfaces:**
- Produces: `public/config/config.example.js`, `public/config/manifest.webmanifest`, `public/config/images/{bg1.jpeg,bg2.png,bg3.jpg,bg5.jpg}`.

- [ ] **Step 1: Create the new folders and move the files**

```bash
mkdir -p public/config/images
git mv public/config.example.js public/config/config.example.js
git mv public/manifest.webmanifest public/config/manifest.webmanifest
git mv public/images/bg1.jpeg public/config/images/bg1.jpeg
git mv public/images/bg2.png public/config/images/bg2.png
git mv public/images/bg3.jpg public/config/images/bg3.jpg
git mv public/images/bg5.jpg public/config/images/bg5.jpg
```

- [ ] **Step 2: Verify the tree**

```bash
ls public/config public/config/images
# Expected:
#   public/config: config.example.js  images  manifest.webmanifest
#   public/config/images: bg1.jpeg  bg2.png  bg3.jpg  bg5.jpg
#   public/images still has: screenshots  tile-screenshots  weather-icons
```

- [ ] **Step 3: Commit**

```bash
git add -A public/
git commit -m "Move runtime config files into public/config subfolder"
```

---
### Task 2: Update example config image paths and manifest icon path

**Files:**
- Modify: `public/config/config.example.js:52,54,63,70,217`
- Modify: `public/config/manifest.webmanifest` (icon `src`)

**Interfaces:**
- Consumes: `public/config/images/bg*.{jpeg,png,jpg}` from Task 1.
- Produces: example config with `config/images/...` references; manifest icon pointing at the root favicon.

- [ ] **Step 0: Make the manifest icon path absolute**

The manifest now lives at `/config/manifest.webmanifest`, so its relative `"src": "favicon.png"` would resolve to `/config/favicon.png` (which does not exist — favicon stays at the root). Change `public/config/manifest.webmanifest` from:

```json
  "icons": [{
    "src": "favicon.png",
```

to:

```json
  "icons": [{
    "src": "/favicon.png",
```

- [ ] **Step 1: Update the image references**

In `public/config/config.example.js`, replace all `images/bg` with `config/images/bg`:

```bash
sed -i "s|images/bg|config/images/bg|g" public/config/config.example.js
```

- [ ] **Step 2: Verify no stale references**

```bash
grep -n "images/" public/config/config.example.js
# Expected: every match is `config/images/bg...`
grep -n "'images/\|\"images/" public/config/config.example.js
# Expected: no output (no bare images/ references left)
```

- [ ] **Step 4: Commit**

```bash
git add public/config/config.example.js public/config/manifest.webmanifest
git commit -m "Reference images via config/images paths in example config"
```

---
### Task 3: Point `index.html` at `/config/` paths

**Files:**
- Modify: `index.html:14,21,22`

**Interfaces:**
- Consumes: `public/config/config.example.js`, `public/config/manifest.webmanifest`.
- Produces: HTML that loads `/config/config.js`, `/config/styles/custom.css`, `/config/manifest.webmanifest`.

- [ ] **Step 1: Update the manifest, script, and stylesheet references**

Change `index.html` lines 14, 21, 22 from:

```html
  <link rel="manifest" href="/manifest.webmanifest" crossorigin="use-credentials">
```
```html
  <script src="/config.js"></script>
  <link rel="stylesheet" href="/styles/custom.css">
```

to:

```html
  <link rel="manifest" href="/config/manifest.webmanifest" crossorigin="use-credentials">
```
```html
  <script src="/config/config.js"></script>
  <link rel="stylesheet" href="/config/styles/custom.css">
```

- [ ] **Step 2: Verify**

```bash
grep -n "config/\|/manifest\|custom.css\|config.js" index.html
# Expected lines include /config/manifest.webmanifest, /config/config.js, /config/styles/custom.css
```

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "Load runtime config, styles, and manifest from /config paths"
```

---
### Task 4: Update the Dockerfile to ship defaults inside `config/`

**Files:**
- Modify: `Dockerfile:8-10`

**Interfaces:**
- Consumes: `public/config/config.example.js` (via build copy to `dist/config/config.example.js`).
- Produces: image with `/usr/share/nginx/html/config/config.js` and `/usr/share/nginx/html/config/styles/custom.css`.

- [ ] **Step 1: Update the build step**

Change `Dockerfile` lines 8-10 from:

```dockerfile
RUN npm run build \
    && cp dist/config.example.js dist/config.js \
    && mkdir -p dist/styles && touch dist/styles/custom.css
```

to:

```dockerfile
RUN npm run build \
    && cp dist/config/config.example.js dist/config/config.js \
    && mkdir -p dist/config/styles && touch dist/config/styles/custom.css
```

- [ ] **Step 2: Verify the build produces the config tree**

```bash
npm run build
find dist/config
# Expected:
#   dist/config/
#   dist/config/config.example.js
#   dist/config/config.js
#   dist/config/images/{bg1.jpeg,bg2.png,bg3.jpg,bg5.jpg}
#   dist/config/manifest.webmanifest
#   dist/config/styles/custom.css
```

- [ ] **Step 3: Commit**

```bash
git add Dockerfile
git commit -m "Ship default config.js and custom.css inside dist/config"
```

---
### Task 5: Update `nginx.conf` for `/config/`

**Files:**
- Modify: `nginx.conf:7-11`

**Interfaces:**
- Consumes: `dist/config/config.js`, `dist/config/config.example.js`.
- Produces: no-cache serving of `/config/*`; fallback from `config.js` to `config.example.js`.

- [ ] **Step 1: Replace the `/config.js` location block**

Change `nginx.conf` lines 7-11 from:

```nginx
    # Runtime config: fall back to the bundled example when no config.js is mounted.
    location = /config.js {
        try_files /config.js /config.example.js;
        add_header Cache-Control "no-cache";
    }
```

to:

```nginx
    # Runtime config: fall back to the bundled example when no config.js is mounted.
    location = /config/config.js {
        try_files /config/config.js /config/config.example.js;
        add_header Cache-Control "no-cache";
    }

    # Runtime config assets: all user overrides live in one mountable folder.
    location /config/ {
        add_header Cache-Control "no-cache";
    }
```

- [ ] **Step 2: Verify nginx config parses**

```bash
docker run --rm -v "$(pwd)/nginx.conf:/etc/nginx/conf.d/default.conf:ro" nginx:alpine nginx -t
# Expected: "syntax is ok" and "test is successful"
```

- [ ] **Step 3: Commit**

```bash
git add nginx.conf
git commit -m "Serve /config assets with no-cache and example fallback"
```

---
### Task 6: Update load error message and README

**Files:**
- Modify: `src/config/load.ts:11`
- Modify: `README.md:35-72,522-526`

**Interfaces:**
- Consumes: new `public/config/config.example.js` path and new `/config/` mount path.
- Produces: accurate user guidance.

- [ ] **Step 1: Update the load error message**

Change `src/config/load.ts:11` from:

```ts
        'config.js is missing or did not set window.CONFIG. Copy public/config.example.js to config.js.',
```

to:

```ts
        'config/config.js is missing or did not set window.CONFIG. Copy public/config/config.example.js to config.js.',
```

- [ ] **Step 2: Update the README Docker section**

Replace `README.md` lines 35-72 with:

````markdown
```sh
docker build -t tileboard .
docker run -d \
  -p 8080:80 \
  -v /path/to/config:/usr/share/nginx/html/config:ro \
  --name tileboard \
  tileboard
```

Then open `http://localhost:8080`.

The image ships defaults inside `config/`: `config.js` (a copy of the example),
an empty `styles/custom.css`, the `manifest.webmanifest`, and example
backgrounds in `images/`. Mount your own `config/` folder to override any of
them at once:

* `config/config.js` — your dashboard configuration. Start from the shipped example (`/usr/share/nginx/html/config/config.example.js`) if you want a reference.
* `config/styles/custom.css` — your custom CSS, loaded at runtime (see *Custom CSS Styles* below). The image ships an empty placeholder so a whole-folder mount is enough.
* `config/images/` — any additional images your config references (reference them as `config/images/...`).
* `config/manifest.webmanifest` — the PWA manifest.

Everything else under the served root is bundled and should not be overridden.

## Configuration

TileBoard is configured with a `config.js` file that sets the global `window.CONFIG`. It is loaded at runtime, so editing it does not require a rebuild.

* **Development:** copy `public/config/config.example.js` to `public/config/config.js`
* **Deployed build:** copy `dist/config/config.example.js` to `dist/config/config.js` (before or after `npm run build`)
* **Docker:** mount your own `config/` folder at `/usr/share/nginx/html/config` (see the Docker section)
````

- [ ] **Step 3: Update the Custom CSS section**

Replace `README.md` lines 522-526 with:

```markdown
Several classes are added to each tile depending on the type of tile and state. Custom CSS styles can be applied by creating a `custom.css` file. It is loaded at runtime from `/config/styles/custom.css`, so no rebuild is needed:

* **Development:** place it at `public/config/styles/custom.css`
* **Deployed build:** place it at `dist/config/styles/custom.css`
* **Docker:** place it inside your mounted `config/styles/` folder
```

- [ ] **Step 4: Verify the README reads correctly**

```bash
grep -n "config/config.js\|config/styles\|config/images\|/usr/share/nginx/html/config" README.md
```

- [ ] **Step 5: Commit**

```bash
git add src/config/load.ts README.md
git commit -m "Document config subfolder paths in loader and README"
```

---
### Task 7: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Run the checks**

```bash
npm run lint && npm run typecheck && npm run test && npm run build
# Expected: lint clean, typecheck clean, 171 tests pass, build succeeds
```

- [ ] **Step 2: Verify the built tree**

```bash
find dist/config
# Expected (matches Task 4 Step 2):
#   dist/config/config.example.js  dist/config/config.js
#   dist/config/images/  dist/config/manifest.webmanifest  dist/config/styles/custom.css
ls dist/images
# Expected: screenshots  tile-screenshots  weather-icons  (bundled assets still present)
grep -n "config/images\|images/bg" dist/config/config.example.js
# Expected: only config/images/... references remain
```

- [ ] **Step 3: Build and run the Docker image with and without a mounted folder**

```bash
docker build -t tileboard:config-subfolder .
docker run --rm -p 8081:80 -d --name tb-test tileboard:config-subfolder
sleep 2
curl -sI http://localhost:8081/config/config.js | head -1   # expect 200
curl -s http://localhost:8081/config/config.js | grep -c "var CONFIG"   # expect >= 1
docker rm -f tb-test

# With a mounted config folder containing a marker config.js:
mkdir -p /tmp/tb-config/styles
cp dist/config/config.example.js /tmp/tb-config/config.js
sed -i "s/tileSize: 150/tileSize: 123/" /tmp/tb-config/config.js
docker run --rm -p 8082:80 -d -v /tmp/tb-config:/usr/share/nginx/html/config:ro --name tb-test tileboard:config-subfolder
sleep 2
curl -s http://localhost:8082/config/config.js | grep -c "tileSize: 123"   # expect 1 (mounted file wins)
docker rm -f tb-test
rm -rf /tmp/tb-config
```

- [ ] **Step 4: Verify image path resolution**

```bash
# In the running container, /config/images/bg1.jpeg must exist and be served:
docker run --rm -d -p 8083:80 --name tb-test tileboard:config-subfolder
sleep 2
curl -sI http://localhost:8083/config/images/bg1.jpeg | head -1   # expect 200
docker rm -f tb-test
```

- [ ] **Step 5: Push the branch and open a PR**

```bash
git push -u origin feature/config-subfolder
gh pr create --fill
```