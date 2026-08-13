# Step 04: Core Layout — Pages, Groups, Grid, Transitions, Pan

**Goal:** Render pages → groups → positioned tile shells with the legacy grid math,
page transitions (animated / animated_gpu / simple), page menu, body classes, page
panning gesture, and hash-based page memory.

**Legacy reference:** `git show LEGACY_REF:scripts/controllers/main.js` (getBodyClass,
pageStyles, groupStyles, itemStyles, calcGroupSizes via groupStyles, openPage,
showPagesMenu, pagesMenuClasses, scrollToActivePage, getTransformCssValue, isPageActive,
shouldDrawPage, onPagePan, onPageScroll, isPanEnabled, hasOpenPopup),
`git show LEGACY_REF:index.html` (pages-menu + pages markup),
`git show LEGACY_REF:styles/main.less` (class names).

**Files:**
- Create: `src/utils/layout.ts`, `src/hooks/usePanGesture.ts`,
  `src/components/Pages.tsx`, `src/components/Page.tsx`, `src/components/Group.tsx`,
  `src/components/Tile.tsx` (minimal shell — fleshed out in step 05),
  `src/components/PagesMenu.tsx`
- Test: `src/utils/layout.test.ts`, `src/components/Pages.test.tsx`
- Modify: `src/store/index.ts` (navigation slice), `src/App.tsx`, `src/utils/functions.ts`
  (wire `openPage` into getContext)

## Interfaces produced

### src/utils/layout.ts (pure — all grid math lives here, components just call it)

```ts
export interface SizeOpts { tileSize: number; tileMargin: number; }

export function calcGroupSize(group: GroupConfig): { width: number; height: number };
// width  = max over items of item.position[0] + (item.width  ?? 1)
// height = max over items of item.position[1] + (item.height ?? 1)

export function groupSizeStyles(group: GroupConfig, opts: SizeOpts): CSSProperties;
// uses group.width/height if set, else calcGroupSize
// { width: `${tileSize*w + tileMargin*(w-1)}px`, height: same formula for h }

export function itemPositionStyles(item: TileConfig, opts: SizeOpts): CSSProperties;
// w = item.width ?? 1, h = item.height ?? 1
// width:  tileSize*w + tileMargin*(w-1) px
// height: tileSize*h + tileMargin*(h-1) px
// left:   position[0] * (tileSize + tileMargin) px
// top:    position[1] * (tileSize + tileMargin) px

export function pageOpts(page: PageConfig, config: TileBoardConfig): SizeOpts;
// { tileSize: page.tileSize ?? config.tileSize, tileMargin: page.tileMargin ?? config.tileMargin }

export function groupMargin(page: PageConfig, group: GroupConfig, config: TileBoardConfig): string;
// page.groupMarginCss ?? group.groupMarginCss ?? config.groupMarginCss

export function pageBackground(page: PageConfig, config: TileBoardConfig): CSSProperties;
// page.bg -> { backgroundImage: url("...") }; page.bgSuffix -> wrapped with toAbsoluteServerURL

export function bodyClasses(config: TileBoardConfig, scroll: { horizontal: boolean; vertical: boolean }): string[];
// '-theme-{t}' for each entry of customTheme (string or array)
// '-{entitySize}-entity', '-menu-{menuPosition}', '-groups-align-{groupsAlign}'
// '-hide-scrollbar' if hideScrollbar
// '-scrolled-horizontally' / '-scrolled-vertically' from scroll arg

export function pageTransform(index: number, transition: string, menuOnLeft: boolean): string | undefined;
// offset = -index * 100
// 'animated_gpu' -> `translate3d(${axis}0)` with the offset on Y if menuOnLeft else X
// 'animated'     -> `translate(...)` same axis rule
// 'simple'       -> undefined

export function shouldDrawPage(pageIndex: number, activeIndex: number, transition: string): boolean;
// 'simple' -> pageIndex === activeIndex; else true
```

### src/hooks/usePanGesture.ts

```ts
export interface PanOptions {
  axis: 'x' | 'y';                  // 'y' when menuPosition === 'left', else 'x'
  count: number;                    // number of visible (non-hidden) pages
  active: number;                   // active page index
  disabled: boolean;                // true while any popup is open (step 05 wires this)
  onDrag: (offsetPercent: number) => void;   // container offset in % during drag
  onSettle: (targetIndex: number) => void;   // final page index
}
export function usePanGesture(opts: PanOptions): {
  onPointerDown(e: React.PointerEvent): void;
  onPointerMove(e: React.PointerEvent): void;
  onPointerUp(e: React.PointerEvent): void;
  onPointerCancel(e: React.PointerEvent): void;
  dragging: boolean;
};
```

Behavior (legacy `onPagePan`):
- Track pointer while down; `offsetPercent = -active*100 + delta/(viewport size on axis)*100`.
- Call `onDrag(offsetPercent)` on every move while within
  `[-(count-1)*100, 0]`.
- On release: switch page if `|dragPercent| >= 50` OR velocity `> 0.5` px/ms in the
  drag direction (velocity from the last ~100 ms of movement). Direction:
  offset decreased → `active+1`, increased → `active-1`, clamped to `[0, count)`.
  Otherwise stay. Call `onSettle(target)`.
- Ignore gestures that start on an `INPUT`/`TEXTAREA`/`SELECT` element.

### Store additions (src/store/index.ts)

```ts
interface NavigationSlice {
  activePage: number;                              // index into config.pages
  scrolled: { horizontal: boolean; vertical: boolean };
  openPage(index: number, preventAnimation?: boolean): void;
  setScrolled(scroll: { horizontal: boolean; vertical: boolean }): void;
}
```

`openPage`: clamp index to visible pages, set `activePage`; if `config.rememberLastPage`
set `location.hash = String(index)`; reset `scrolled` to `{false,false}`.
On store creation (step 03's `createAppStore`): if `config.rememberLastPage` and
`location.hash` parses to a valid page index, use it as initial `activePage`, else 0.
Also here: `window.openPage = (i: number) => getAppStore().openPage(i)` (legacy exposed
`window.openPage(page)` — new signature is index-based; documented for user event
handlers). Wire `getContext().openPage` in `src/utils/functions.ts` to the store
(replacing the step-03 placeholder).

### Components

- `App.tsx`: computes `bodyClasses` from store (config + scrolled) and applies to
  `document.body.className` (effect). Renders `<Pages />` inside
  `<div className="page-container">`, then (later specs) popups/screensaver/noties.
- `Pages.tsx`:
  - `pages` = `config.pages` filtered by `!isHidden(page)` — `isHidden` implemented
    here as a small helper using `callFunction` (shared version lands in step 05; a
    local copy is fine but must be replaced by the step-05 import when available).
  - Container div `#pages` class `pages`, style: `transform: pageTransform(...)` or the
    live drag offset while `dragging`; `transition: 'none'` while dragging.
  - Pointer handlers from `usePanGesture` (`disabled: false` for now; step 05 passes
    popup state).
  - Renders visible pages (`shouldDrawPage`) as `<Page page index />`.
  - Renders `<PagesMenu />`.
- `Page.tsx`: div class `page` + `-active` when active; `pageBackground` style; when
  transition !== 'simple' and menuPosition !== 'left' and index > 0: style
  `{ position: 'absolute', left: `${index*100}%`, top: 0 }` (legacy pageStyles).
  onScroll handler → `setScrolled({horizontal: scrollLeft!==0, vertical: scrollTop!==0})`
  only when changed. Renders `<Group>` for each non-hidden group.
- `Group.tsx`: div class `group`, `groupSizeStyles` + `margin` from `groupMargin`,
  title div class `group-title` if `group.title`. Renders `<Tile item page />` for each
  non-hidden item.
- `Tile.tsx` (shell only): div class `item`, style `itemPositionStyles(item, pageOpts)`,
  `onClick` noop for now. Step 05 owns the internals.
- `PagesMenu.tsx`: hidden unless visible-page count > 1. div class
  `pages-menu -{menuPosition}`; items: per visible non-hidden page a div
  `pages-menu--item` (+ `-active`), containing `<i className={"mdi " + page.icon} />`,
  onClick → `openPage(index)`. Include `pages-menu--scroll-indicator` and
  `pages-menu--aligner` divs per legacy markup.

- [ ] **Step 1: Write failing tests**

`src/utils/layout.test.ts` — exact formulas, e.g. with `tileSize 150, tileMargin 6`:
- `calcGroupSize` for items at `[1,0]` w2h1 and `[0,2]` → `{width:3, height:3}`.
- `itemPositionStyles({position:[1,2], width:2}, {150,6})` →
  `{width:'306px', height:'150px', left:'156px', top:'312px'}`.
- `groupSizeStyles` width string `150*w + 6*(w-1)` px.
- `pageTransform(1,'animated_gpu',false)` → `'translate3d(-100%, 0, 0)'`;
  `(1,'animated_gpu',true)` → `'translate3d(0, -100%, 0)'`;
  `(1,'animated',false)` → `'translate(-100%, 0)'`; `(1,'simple',false)` → `undefined`.
- `shouldDrawPage(2, 1, 'simple')` → false; `('animated')` → true.
- `bodyClasses` with `customTheme: ['material']`, entitySize big → includes
  `-theme-material` and `-big-entity`.

`src/components/Pages.test.tsx` (mock store via `createAppStore` with a fixture config
of 2 pages / 1 group / 2 tiles + empty entities):
- renders one `.group`, two `.item`, `.group-title` text.
- clicking a `.pages-menu--item` switches the `-active` page.

- [ ] **Step 2: Run tests — expect failures.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run tests — expect pass.**
- [ ] **Step 5: Manual check** with `npm run dev` + a copy of the example config:
  pages menu appears with >1 page, pan/swipe (or drag with mouse) switches pages,
  transitions animate, tiles are positioned per their `position` values.
- [ ] **Step 6: Verify** — all four npm scripts green.
- [ ] **Step 7: Commit** — `git commit -m "step 04: core layout, pages, groups, transitions, pan"`

**Acceptance criteria:** Multi-page config renders and navigates exactly like legacy
(transform direction follows menuPosition; SIMPLE draws only active page and shows no
animation); grid positions match the legacy formulas (tests lock the math).

**Out of scope:** tile contents/classes/actions (step 05), header (step 10),
popup-aware pan disabling (step 05), screensaver (step 11).
