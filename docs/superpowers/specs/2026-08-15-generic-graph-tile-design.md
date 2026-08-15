# Generic Graph Component + Graph Tile

Date: 2026-08-15

## Goal

Make chart rendering reusable. Today the only chart is the history popup, which
owns both chart rendering and history data loading inline. We want:

1. A generic graph renderer that any data can drive (history, future electricity
   prices, daily temperature forecasts, arbitrary datasets).
2. A `graph` tile type that renders a small chart in a tile and opens the large
   graph popup on click (with a configurable, wider range).
3. Confirm the chart library is current.

## Current state

- `src/components/popups/HistoryPopup.tsx` — the only chart renderer. It owns
  the canvas/Chart.js lifecycle and a `deepMerge` of base chart options.
- `src/utils/history.ts` — `HistoryChartModel` + `buildHistoryDatasets`, which
  turns the HA history API response into datasets/y-axes.
- `src/store/index.ts` — `openHistory` fetches history, builds the model, stores
  it in `activeHistory`; the popup renders from the store.
- Config: a `history` block on any tile (`entity`, `offset`, `options`, `styles`,
  `classes`) opens the history popup on long press.
- `tiles/actions.ts` — `entityLongPress` opens history when `item.history` is set.

## Library check

- `chart.js` is at `4.5.1`, the latest published version. No Chart.js 5 exists.
- `chartjs-adapter-date-fns` `3.0.0` and `date-fns` `4.4.0` are also current.
- Conclusion: **no update available**; the library is already modern. Re-verify
  with `npm outdated` during implementation and report.

## Design

### 1. Generic chart model and component

In `src/utils/graph.ts` (renamed from `utils/history.ts`):

- `HistoryChartModel` becomes `ChartModel`, adding optional
  `type?: 'line' | 'bar'`:
  ```ts
  interface ChartModel {
    type?: 'line' | 'bar';
    datasets: Array<{
      label: string;
      data: Array<{ x: number; y: number | string }>;
      yAxisID: string;
    }>;
    yAxes: Record<string, { type: 'linear' | 'category'; labels?: string[] }>;
    interactionMode: 'nearest' | 'index';
  }
  ```
- `buildHistoryDatasets` is renamed `buildHistoryModel` (same body/signature,
  returns `ChartModel`). History's y-axis auto-classification (linear vs
  category) stays history-specific inside this function.
- `deepMerge` moves here from `HistoryPopup.tsx`.

New `src/components/charts/Graph.tsx` — the reusable renderer:

- Props: `{ model: ChartModel; options?: Record<string, unknown> }`.
- Owns the canvas + Chart.js lifecycle (create on model change, destroy on
  unmount) and applies `deepMerge` of the base options currently inline in
  `HistoryPopup` (time x-axis, DPR, responsive, interaction, legend, tooltip).
- This is the "generic graph function": any caller passes a `ChartModel` and
  optional Chart.js options; the component handles the rest.

### 2. Data loading and generalized naming

- Rename across the codebase (popup, store, utils, config, styles):
  - `HistoryPopup.tsx` → `components/popups/GraphPopup.tsx`
  - `utils/history.ts` → `utils/graph.ts`
  - Store `activeHistory`/`openHistory`/`closeHistory`/`HistorySlice` →
    `activeGraph`/`openGraph`/`closeGraph`/`GraphSlice`
- `openGraph` becomes trivial: `set({ activeGraph: { item } })`, and the store
  type simplifies to `{ item: TileConfig } | null`. The popup itself loads and
  renders its data — no fetch logic in the store.
- New `src/components/charts/useGraphData.ts` hook, shared by popup and tile:

  ```ts
  useGraphData(item, entity, scope: 'history' | 'graph')
  // returns { model, options, isLoading, error }
  ```

  Resolution order:
  - entity: `history.entity` → tile id (single source; `graph` has no entity key)
  - If `graph.data` is a function: `model = callFunction(graph.data, [item, entity])`,
    no fetch. Covers forecast/attribute data like electricity prices.
  - Else fetch HA history via `getHistory` and build with `buildHistoryModel`.
    Offset per scope: `graph` scope uses `graph.offset ?? history.offset ?? 1 day`,
    `history` scope uses `history.offset ?? 1 day`.
  - Options per scope: `graph` scope `graph.options ?? {}`, `history` scope
    `history.options ?? {}`.

- `GraphPopup` renders: title, close button, loading/error placeholder (as today),
  then `<Graph model={...} options={...} />`. Reuses `history.classes`/`styles`
  for the popup container.

### 3. Graph tile

- Add `'graph'` to `TileType` in `config/types.ts`.
- New config on `TileConfig`:
  ```ts
  graph?: {
    offset?: Field<number>;                 // range shown in the tile
    options?: Field<Record<string, unknown>>; // Chart.js options for the tile
    data?: ConfigFunction<ChartModel>;      // custom datasets, skips history fetch
  };
  ```
- New `src/components/tiles/GraphTile.tsx`:
  - `useGraphData(item, entity, 'graph')`, renders `<Graph>` inside the tile.
  - Renders nothing (or placeholder) while loading / on error.
  - Wired into `TileBody`'s switch.
- Click behavior in `tiles/actions.ts` `entityClick`:
  - New `case 'graph': getAppStore().openGraph(item, entity); return;`
  - Default click opens the enlarged popup (`history.offset` = wider range).
    A custom `item.action` function still overrides click.
  - In `entityLongPress`, return early for `'graph'` (click already opens the
    popup; avoid a redundant second popup).
- Styling: add minimal CSS for the tile chart container (`.item-graph`), reusing
  the existing `.chart.chart-line` canvas class.

### 4. Config fallback summary

| Value | Inline tile (scope `graph`) | Popup (scope `history`) |
|---|---|---|
| entity | `history.entity` → item id | `history.entity` → item id |
| offset | `graph.offset ?? history.offset ?? 1 day` | `history.offset ?? 1 day` |
| options | `graph.options ?? {}` | `history.options ?? {}` |
| custom data | `graph.data` (skips fetch) | `graph.data` (skips fetch) |

## Error handling

- No entity: popup shows "No entity was specified" (existing behavior).
- Fetch fail / empty: popup shows "No history data found" (existing behavior).
- Tile: on error/empty, render nothing in the tile.

## Testing

- Rename `utils/history.test.ts` → `utils/graph.test.ts` (same cases, still
  green).
- Add a `deepMerge` unit test (extracted util, currently untested inline code).
- Smoke test: `GraphTile` renders a canvas given a model; graph tile click opens
  the popup.

## Out of scope

- No chart library change (already latest).
- No changes to `history.*` config semantics for non-graph tiles.
- No chart type switcher in the UI; `ChartModel.type` is data-driven only.