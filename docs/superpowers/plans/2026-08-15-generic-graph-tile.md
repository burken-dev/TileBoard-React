# Generic Graph Component + Graph Tile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract a reusable chart renderer (`Graph`) + data-loading hook (`useGraphData`) so the history popup and a new `graph` tile type share one code path, and any data (history, forecasts, custom functions) can be plotted.

**Architecture:** A `ChartModel` data type + `buildHistoryModel` (history-specific builder) + `deepMerge` live in `utils/graph.ts`. A presentational `Graph` component owns the canvas/Chart.js lifecycle. A `useGraphData(item, entity, scope)` hook loads data (custom `graph.data` function OR HA history) and returns `{ model, options, isLoading, error }`. The popup (renamed `GraphPopup`) and the new `GraphTile` both render `<Graph>` from the hook. The store slice simplifies to `{ activeGraph: { item } }` — the popup fetches its own data.

**Tech Stack:** React 18, Zustand, Chart.js 4.5.1 + chartjs-adapter-date-fns, Vitest + @testing-library/react.

## Global Constraints

- Chart.js is already at latest (`4.5.1`). **No dependency changes.**
- `ChartModel` = `{ type?: 'line' | 'bar'; datasets: Array<{ label: string; data: Array<{ x: number; y: number | string }>; yAxisID: string }>; yAxes: Record<string, { type: 'linear' | 'category'; labels?: string[] }>; interactionMode: 'nearest' | 'index' }`.
- Entity source is always `history.entity` → tile id (the `graph` config has no `entity` key).
- Scope resolution: `graph` scope reads `graph.offset`/`graph.options` (fallback `history.offset`/`{}`); `history` scope reads `history.offset`/`history.options` (fallback 1 day / `{}`).
- Popup container keeps existing class names (`history-popup` etc.) — no CSS rename.
- Follow repo conventions: `getItemFieldValue('graph.offset', states, item, entity)` for field resolution; `callFunction` for config functions.
- Run `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` after each task. Tests run in jsdom (vitest).
- Tests that render charts must `vi.mock('chart.js/auto')` and stub `HTMLCanvasElement.prototype.getContext`.
- Config field resolution depends on a created store (`createAppStore(config)` in `beforeEach`, see `src/store/notifications.test.ts`).

---

### Task 1: Generic chart model in `utils/graph.ts`

**Files:**
- Create: `src/utils/graph.ts` (renamed from `src/utils/history.ts`)
- Test: `src/utils/graph.test.ts` (renamed from `src/utils/history.test.ts`)
- Modify: `src/store/index.ts` (imports only)

**Interfaces:**
- Consumes: existing `buildHistoryDatasets` body from `src/utils/history.ts`.
- Produces: `ChartModel`, `SeriesMeta`, `buildHistoryModel(response, seriesMeta, now): ChartModel`, `deepMerge<T>(base, extra): T` — all exported from `src/utils/graph.ts`.

- [ ] **Step 1: Write the failing test**

`git mv src/utils/history.test.ts src/utils/graph.test.ts` then replace the whole file content:

```ts
import { describe, expect, it } from 'vitest';
import { buildHistoryModel, deepMerge } from './graph';

const NOW = 1700000000000;

function states(list: Array<[string, string]>) {
  return list.map(([state, last_changed]) => ({ state, last_changed }));
}

describe('buildHistoryModel', () => {
  it('numeric series gets a linear axis and trailing current point', () => {
    const model = buildHistoryModel(
      [states([['20', '2024-01-01T00:00:00Z'], ['21', '2024-01-01T01:00:00Z']])],
      [{ name: 'Temp', unit: '°C', currentState: '22' }],
      NOW,
    );
    expect(model.datasets).toHaveLength(1);
    expect(model.datasets[0].label).toBe('Temp / °C');
    expect(model.datasets[0].yAxisID).toBe('linear-°C');
    expect(model.datasets[0].data).toHaveLength(3);
    expect(model.datasets[0].data[2].x).toBe(NOW);
    expect(model.datasets[0].data[2].y).toBe('22');
    expect(model.yAxes['linear-°C'].type).toBe('linear');
    expect(model.interactionMode).toBe('index');
  });

  it('on/off series gets a category axis with on/off labels', () => {
    const model = buildHistoryModel(
      [states([['off', '2024-01-01T00:00:00Z']])],
      [{ name: 'Power', currentState: 'off' }],
      NOW,
    );
    expect(model.datasets[0].yAxisID).toBe('category-');
    expect(model.yAxes['category-'].type).toBe('category');
    expect(model.yAxes['category-'].labels).toEqual(['on', 'off']);
  });

  it('two series with the same unit share one axis', () => {
    const model = buildHistoryModel(
      [states([['a', '2024-01-01T00:00:00Z']]), states([['b', '2024-01-01T00:00:00Z']])],
      [
        { name: 'A', unit: 'V', currentState: 'a' },
        { name: 'B', unit: 'V', currentState: 'b' },
      ],
      NOW,
    );
    expect(Object.keys(model.yAxes)).toEqual(['category-V']);
    expect(model.datasets.map((d) => d.yAxisID)).toEqual(['category-V', 'category-V']);
  });

  it('uses nearest interaction mode for multiple datasets', () => {
    const model = buildHistoryModel(
      [states([['20', '2024-01-01T00:00:00Z']]), states([['1', '2024-01-01T00:00:00Z']])],
      [
        { name: 'A', currentState: '21' },
        { name: 'B', currentState: '2' },
      ],
      NOW,
    );
    expect(model.interactionMode).toBe('nearest');
  });

  it('pads single non-on/off label with empty strings', () => {
    const model = buildHistoryModel(
      [states([['home', '2024-01-01T00:00:00Z']])],
      [{ name: 'Zone', currentState: 'home' }],
      NOW,
    );
    expect(model.yAxes['category-'].labels).toEqual(['', 'home', '']);
  });
});

describe('deepMerge', () => {
  it('merges nested objects and replaces scalars', () => {
    expect(deepMerge({ a: { b: 1, c: 2 }, d: 3 }, { a: { c: 9 }, d: 4 })).toEqual({
      a: { b: 1, c: 9 },
      d: 4,
    });
  });

  it('returns extra as-is when it is not an object', () => {
    expect(deepMerge({ a: 1 }, undefined)).toBeUndefined();
    expect(deepMerge({ a: 1 }, 5)).toBe(5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/utils/graph.test.ts`
Expected: FAIL — module `./graph` not found.

- [ ] **Step 3: Write minimal implementation**

`git mv src/utils/history.ts src/utils/graph.ts`. Then in `src/utils/graph.ts`:

- Rename `HistoryChartModel` → `ChartModel`, add `type?: 'line' | 'bar';` as the first field.
- Rename `buildHistoryDatasets` → `buildHistoryModel` (return type `ChartModel`; body unchanged).
- Add `deepMerge` (moved verbatim from `src/components/popups/HistoryPopup.tsx`):

```ts
export function deepMerge<T>(base: T, extra: unknown): T {
  if (extra === null || typeof extra !== 'object' || Array.isArray(extra)) {
    return extra as T;
  }
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const key of Object.keys(extra as Record<string, unknown>)) {
    const value = (extra as Record<string, unknown>)[key];
    out[key] = key in out ? deepMerge(out[key], value) : value;
  }
  return out as T;
}
```

- `rm src/utils/history.ts` (after `git mv` it is already the new file; just keep the rename).

Update `src/store/index.ts` imports (line ~19-20) so the build stays green:

```ts
import { buildHistoryModel } from '../utils/graph';
import type { ChartModel } from '../utils/graph';
```

and change the `HistorySlice` `model` field type from `HistoryChartModel` to `ChartModel` (line ~106). Do not touch `openHistory` logic yet — it keeps working through `buildHistoryModel`.

- [ ] **Step 4: Run tests and typecheck**

Run: `npm run test` and `npm run typecheck`
Expected: PASS. No other `buildHistoryDatasets`/`HistoryChartModel` references remain (`rg "buildHistoryDatasets|HistoryChartModel" src` should be empty).

- [ ] **Step 5: Commit**

```bash
git add src/utils/graph.ts src/utils/graph.test.ts src/store/index.ts
git rm src/utils/history.ts src/utils/history.test.ts
git commit -m "Extract generic ChartModel and buildHistoryModel into utils/graph"
```

---

### Task 2: `Graph` render component

**Files:**
- Create: `src/components/charts/Graph.tsx`
- Test: `src/components/charts/Graph.test.tsx`

**Interfaces:**
- Consumes: `ChartModel` + `deepMerge` from `../utils/graph`.
- Produces: default-exported `Graph({ model, options }: { model: ChartModel; options?: Record<string, unknown> })` — renders a `<canvas className="chart chart-line" />` and owns the Chart.js instance lifecycle.

- [ ] **Step 1: Write the failing test**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { createAppStore } from '../../store';
import type { TileBoardConfig } from '../../config/types';
import Graph from './Graph';

const { chartInstances } = vi.hoisted(() => ({ chartInstances: [] as Array<{ destroy: ReturnType<typeof vi.fn> }> }));

vi.mock('chart.js/auto', () => ({
  default: vi.fn().mockImplementation(() => {
    const inst = { destroy: vi.fn() };
    chartInstances.push(inst);
    return inst;
  }),
}));

vi.mock('chartjs-adapter-date-fns', () => ({}));

const config: TileBoardConfig = { serverUrl: 'http://h', pages: [{ groups: [] }] };
const model = {
  datasets: [{ label: 'T', data: [{ x: 0, y: 1 }], yAxisID: 'y' }],
  yAxes: { y: { type: 'linear' as const } },
  interactionMode: 'index' as const,
};

describe('Graph', () => {
  beforeEach(() => {
    createAppStore(config);
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({});
  });
  afterEach(() => {
    cleanup();
    chartInstances.length = 0;
  });

  it('creates a chart with the model datasets and merged options', () => {
    const ChartMock = (await import('chart.js/auto')).default as ReturnType<typeof vi.fn>;
    render(<Graph model={model} options={{ plugins: { legend: { display: false } } }} />);
    expect(ChartMock).toHaveBeenCalledTimes(1);
    const configArg = ChartMock.mock.calls[0][1];
    expect(configArg.data.datasets).toEqual(model.datasets);
    expect(configArg.type).toBe('line');
    expect(configArg.options.plugins.legend.align).toBe('start');
    expect(configArg.options.plugins.legend.display).toBe(false);
    expect(configArg.options.scales.x.type).toBe('time');
  });

  it('destroys the chart on unmount', () => {
    const { unmount } = render(<Graph model={model} />);
    expect(chartInstances).toHaveLength(1);
    unmount();
    expect(chartInstances[0].destroy).toHaveBeenCalledTimes(1);
  });
});
```

Note: `createAppStore` must be called once per test; the store module memoizes it (`if (appStore) return`). If a prior test in the same file already created it, `createAppStore` is a no-op and `useAppStore` still works. Safe because each test file runs in its own module registry.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/charts/Graph.test.tsx`
Expected: FAIL — cannot find module `./Graph`.

- [ ] **Step 3: Write minimal implementation**

```tsx
import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import 'chartjs-adapter-date-fns';
import type { ChartConfiguration } from 'chart.js';
import { useAppStore } from '../../store';
import { deepMerge } from '../../utils/graph';
import type { ChartModel } from '../../utils/graph';

const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

export default function Graph({
  model,
  options,
}: {
  model: ChartModel;
  options?: Record<string, unknown>;
}) {
  const timeFormat = useAppStore((s) => s.config.timeFormat);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    chartRef.current?.destroy();
    const c24 = timeFormat !== 12;
    const timeFormats = {
      datetime: c24 ? 'MMM D, YYYY, H:mm:ss' : 'MMM D, YYYY, h:mm:ss a',
      hour: c24 ? 'H:mm' : 'h:mm a',
      millisecond: c24 ? 'H:mm:ss.SSS' : 'h:mm:ss.SSS a',
      minute: c24 ? 'H:mm' : 'h:mm a',
      second: c24 ? 'H:mm:ss' : 'h:mm:ss a',
    };

    const baseOptions: Record<string, unknown> = {
      animation: false,
      devicePixelRatio: dpr,
      maintainAspectRatio: false,
      responsive: true,
      interaction: {
        mode: model.interactionMode,
        intersect: false,
      },
      scales: {
        x: { type: 'time', time: { displayFormats: timeFormats } },
        ...model.yAxes,
      },
      plugins: {
        legend: { align: 'start' },
        tooltip: {
          displayColors: false,
          intersect: false,
          mode: model.interactionMode,
        },
      },
    };

    const chart = new Chart(
      ctx,
      {
        type: model.type ?? 'line',
        data: { datasets: model.datasets },
        options: deepMerge(baseOptions, options ?? {}),
      } as ChartConfiguration,
    );
    chartRef.current = chart;
    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [model, options, timeFormat]);

  return <canvas ref={canvasRef} className="chart chart-line" />;
}
```

Note: `deepMerge(baseOptions, options ?? {})` ensures base options are always applied (the original popup dropped them when `options` was undefined).

- [ ] **Step 4: Run tests, lint, typecheck**

Run: `npm run test -- src/components/charts/Graph.test.tsx && npm run lint && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/charts/Graph.tsx src/components/charts/Graph.test.tsx
git commit -m "Add reusable Graph chart component"
```

---

### Task 3: `loadGraphModel` + `useGraphData` hook

**Files:**
- Create: `src/components/charts/useGraphData.ts`
- Test: `src/components/charts/useGraphData.test.ts`

**Interfaces:**
- Consumes: `getHistory` from `../../ha/services`, `getItemFieldValue` from `../../utils/fields`, `callFunction` from `../../utils/functions`, `buildHistoryModel`/`ChartModel` from `../../utils/graph`, `useAppStore` from `../../store`.
- Produces:
  - `export type GraphScope = 'history' | 'graph'`
  - `export interface GraphData { model?: ChartModel; options?: Record<string, unknown>; isLoading: boolean; error: string | null }`
  - `export function loadGraphModel(item: TileConfig, entity: HaEntity | null, states: Record<string, HaEntity>, scope: GraphScope): Promise<{ model: ChartModel; options?: Record<string, unknown> } | { error: string }>`
  - `export function useGraphData(item: TileConfig, entity: HaEntity | null, scope: GraphScope): GraphData`

- [ ] **Step 1: Write the failing test**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppStore, getAppStore } from '../../store';
import type { TileConfig } from '../../config/types';
import { loadGraphModel } from './useGraphData';
import { getHistory } from '../../ha/services';

vi.mock('../../ha/services', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../ha/services')>();
  return { ...actual, getHistory: vi.fn() };
});

const getHistoryMock = vi.mocked(getHistory);
const config = { serverUrl: 'http://h', pages: [{ groups: [] }] };

const entity = {
  entity_id: 'sensor.temp',
  state: '22',
  attributes: { friendly_name: 'Temp', unit_of_measurement: '°C' },
};

function item(extra: Partial<TileConfig> = {}): TileConfig {
  return { type: 'graph', id: 'sensor.temp', position: [0, 0], ...extra } as TileConfig;
}

describe('loadGraphModel', () => {
  beforeEach(() => {
    createAppStore(config);
    getAppStore().setEntities([entity]);
  });
  afterEach(() => {
    getHistoryMock.mockReset();
  });

  it('returns an error when no entity can be resolved', async () => {
    const result = await loadGraphModel(item({ id: 'sensor.missing' }), null, getAppStore().entities, 'history');
    expect(result).toEqual({ error: 'No entity was specified' });
  });

  it('uses a graph.data function directly and skips history fetch', async () => {
    const custom = {
      datasets: [{ label: 'Price', data: [{ x: 1, y: 2 }], yAxisID: 'y' }],
      yAxes: { y: { type: 'linear' as const } },
      interactionMode: 'index' as const,
    };
    const result = await loadGraphModel(
      item({ graph: { data: () => custom, options: { animation: false } } }),
      entity,
      getAppStore().entities,
      'graph',
    );
    expect(getHistoryMock).not.toHaveBeenCalled();
    expect(result).toEqual({ model: custom, options: { animation: false } });
  });

  it('fetches history with the graph.offset range', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-02T00:00:00Z'));
    getHistoryMock.mockResolvedValue([
      [{ entity_id: 'sensor.temp', state: '20', last_changed: '2024-01-01T00:00:00Z', attributes: { unit_of_measurement: '°C' } }],
    ]);
    const result = await loadGraphModel(
      item({ graph: { offset: 60 * 60 * 1000 } }),
      entity,
      getAppStore().entities,
      'graph',
    );
    vi.useRealTimers();
    expect(getHistoryMock).toHaveBeenCalledWith('2024-01-01T23:00:00.000Z', 'sensor.temp');
    expect(result).toHaveProperty('model');
  });

  it('falls back to a 1-day offset for the history scope', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-02T00:00:00Z'));
    getHistoryMock.mockResolvedValue([]);
    const result = await loadGraphModel(item(), entity, getAppStore().entities, 'history');
    vi.useRealTimers();
    expect(getHistoryMock).toHaveBeenCalledWith('2024-01-01T00:00:00.000Z', 'sensor.temp');
    expect(result).toEqual({ error: 'No history data found' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/charts/useGraphData.test.ts`
Expected: FAIL — module `./useGraphData` not found.

- [ ] **Step 3: Write minimal implementation**

```ts
import { useEffect, useState } from 'react';
import type { HaEntity, TileConfig } from '../../config/types';
import { getHistory } from '../../ha/services';
import { useAppStore } from '../../store';
import { getItemFieldValue } from '../../utils/fields';
import { callFunction } from '../../utils/functions';
import { buildHistoryModel } from '../../utils/graph';
import type { ChartModel } from '../../utils/graph';

export type GraphScope = 'history' | 'graph';

export interface GraphData {
  model?: ChartModel;
  options?: Record<string, unknown>;
  isLoading: boolean;
  error: string | null;
}

const DAY = 24 * 60 * 60 * 1000;

function fieldNumber(key: string, states: Record<string, HaEntity>, item: TileConfig, entity: HaEntity | null): number {
  return Number(getItemFieldValue(key, states, item, entity));
}

function fieldOptions(key: string, states: Record<string, HaEntity>, item: TileConfig, entity: HaEntity | null): Record<string, unknown> | undefined {
  return getItemFieldValue(key, states, item, entity) as Record<string, unknown> | undefined;
}

export function loadGraphModel(
  item: TileConfig,
  entity: HaEntity | null,
  states: Record<string, HaEntity>,
  scope: GraphScope,
): Promise<{ model: ChartModel; options?: Record<string, unknown> } | { error: string }> {
  const entityId =
    (getItemFieldValue('history.entity', states, item, entity) as string) || entity?.entity_id;
  if (!entityId) return Promise.resolve({ error: 'No entity was specified' });

  const options =
    scope === 'graph'
      ? fieldOptions('graph.options', states, item, entity)
      : fieldOptions('history.options', states, item, entity);

  const dataFn = getItemFieldValue('graph.data', states, item, entity);
  if (dataFn) {
    return Promise.resolve({ model: callFunction(dataFn, [item, entity]) as ChartModel, options });
  }

  const offset =
    fieldNumber(scope === 'graph' ? 'graph.offset' : 'history.offset', states, item, entity) ||
    (scope === 'graph' ? fieldNumber('history.offset', states, item, entity) : 0) ||
    DAY;
  const startDate = new Date(Date.now() - offset).toISOString();

  return getHistory(startDate, entityId).then((data) => {
    if (!data || data.length === 0) return { error: 'No history data found' };
    const series = data as unknown as Array<Array<Record<string, unknown>>>;
    const seriesMeta = series.map((points) => {
      const first = points[0] ?? {};
      const attrs = (first.attributes ?? {}) as Record<string, unknown>;
      const id = String(first.entity_id ?? entityId);
      return {
        name: String(attrs.friendly_name ?? id),
        unit: attrs.unit_of_measurement != null ? String(attrs.unit_of_measurement) : undefined,
        currentState: states[id]?.state,
      };
    });
    return { model: buildHistoryModel(series as never, seriesMeta, Date.now()), options };
  });
}

export function useGraphData(item: TileConfig, entity: HaEntity | null, scope: GraphScope): GraphData {
  const states = useAppStore((s) => s.entities);
  const [data, setData] = useState<GraphData>({ isLoading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    setData({ isLoading: true, error: null });
    loadGraphModel(item, entity, states, scope)
      .then((result) => {
        if (cancelled) return;
        if ('error' in result) setData({ isLoading: false, error: result.error });
        else setData({ model: result.model, options: result.options, isLoading: false, error: null });
      })
      .catch(() => {
        if (!cancelled) setData({ isLoading: false, error: 'No history data found' });
      });
    return () => {
      cancelled = true;
    };
    // ponytail: fetch once per item/scope; entity/states are read at fetch time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, scope]);

  return data;
}
```

- [ ] **Step 4: Run tests, lint, typecheck**

Run: `npm run test -- src/components/charts/useGraphData.test.ts && npm run lint && npm run typecheck`
Expected: PASS. If the deep-merged/mock typing of `getHistory` complains, cast its mock as `vi.mocked(getHistory)` (already done) and type the resolved value as `unknown[][]`.

- [ ] **Step 5: Commit**

```bash
git add src/components/charts/useGraphData.ts src/components/charts/useGraphData.test.ts
git commit -m "Add useGraphData hook for history and custom chart data"
```

---

### Task 4: `GraphPopup` + store slice rename

**Files:**
- Rename: `src/components/popups/HistoryPopup.tsx` → `src/components/popups/GraphPopup.tsx`
- Modify: `src/store/index.ts` (slice rename + trivial `openGraph`)
- Modify: `src/App.tsx`
- Modify: `src/tiles/actions.ts` (call `openGraph`)
- Test: `src/components/popups/GraphPopup.test.tsx`

**Interfaces:**
- Consumes: `useGraphData` + `Graph` from Tasks 2-3.
- Produces: store API `activeGraph: { item: TileConfig } | null`, `openGraph(item, entity)`, `closeGraph()`; default-exported `GraphPopup`.

- [ ] **Step 1: Rewrite the store slice**

In `src/store/index.ts`:

1. Replace the `HistorySlice` interface (lines ~103-113):

```ts
interface GraphSlice {
  activeGraph: { item: TileConfig } | null;
  openGraph(item: TileConfig, entity: HaEntity | null): void;
  closeGraph(): void;
}
```

2. In the `AppStore` type union (line ~145): `HistorySlice` → `GraphSlice`.
3. State init (line ~203): `activeHistory: null` → `activeGraph: null`.
4. Remove the whole `openHistory` implementation (lines ~326-377) and replace with:

```ts
openGraph: (item, _entity) => set({ activeGraph: { item } }),
closeGraph: () => set({ activeGraph: null }),
```

5. Update imports (lines ~11, ~19-20): remove `getHistory`, `buildHistoryModel`, and `ChartModel` — the store no longer fetches or builds models.

- [ ] **Step 2: Rename and rewrite the popup**

`git mv src/components/popups/HistoryPopup.tsx src/components/popups/GraphPopup.tsx`, then replace the file content:

```tsx
import type { CSSProperties } from 'react';
import { useAppStore } from '../../store';
import { entityTitle, getItemEntity } from '../../utils/entity';
import { getItemFieldValue } from '../../utils/fields';
import Graph from '../charts/Graph';
import { useGraphData } from '../charts/useGraphData';

export default function GraphPopup() {
  const activeGraph = useAppStore((s) => s.activeGraph);
  const closeGraph = useAppStore((s) => s.closeGraph);
  const states = useAppStore((s) => s.entities);

  if (!activeGraph) return null;
  const entity = getItemEntity(activeGraph.item, states);
  const { model, options, isLoading, error } = useGraphData(activeGraph.item, entity, 'history');

  const classes = getItemFieldValue('history.classes', states, activeGraph.item, entity);
  const styles = (getItemFieldValue(
    'history.styles',
    states,
    activeGraph.item,
    entity,
  ) ?? {}) as CSSProperties;

  return (
    <div
      className={
        'history-popup' +
        (classes ? ' ' + (Array.isArray(classes) ? classes.join(' ') : String(classes)) : '')
      }
    >
      <div className="history-popup-container" style={styles}>
        <div className="history-popup-title">
          <div className="history-popup-close" onClick={() => closeGraph()}>
            <i className="mdi mdi-close" />
          </div>
          {entityTitle(activeGraph.item, entity, states)}
        </div>
        <div className="history-popup-container history-popup-container--canvas">
          <div className="history-popup--canvas">
            <div className="history-popup--placeholder">
              {isLoading && !error && <span>Loading history data...</span>}
              {error && <span>{error}</span>}
            </div>
            {!isLoading && !error && model && <Graph model={model} options={options} />}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update callers**

In `src/App.tsx`:
- `const HistoryPopup = lazy(() => import('./components/popups/HistoryPopup'));` → `const GraphPopup = lazy(() => import('./components/popups/GraphPopup'));`
- `<HistoryPopup />` → `<GraphPopup />`

In `src/tiles/actions.ts` (two call sites, lines ~74 and ~88): `getAppStore().openHistory(item, entity)` → `getAppStore().openGraph(item, entity)`.

- [ ] **Step 4: Write the popup test**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createAppStore, getAppStore } from '../../store';
import { getHistory } from '../../ha/services';
import GraphPopup from './GraphPopup';

const { chartInstances } = vi.hoisted(() => ({ chartInstances: [] as Array<{ destroy: ReturnType<typeof vi.fn> }> }));

vi.mock('chart.js/auto', () => ({
  default: vi.fn().mockImplementation(() => {
    const inst = { destroy: vi.fn() };
    chartInstances.push(inst);
    return inst;
  }),
}));
vi.mock('chartjs-adapter-date-fns', () => ({}));
vi.mock('../../ha/services', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../ha/services')>();
  return { ...actual, getHistory: vi.fn() };
});

const getHistoryMock = vi.mocked(getHistory);
const config = { serverUrl: 'http://h', pages: [{ groups: [] }] };
const entity = {
  entity_id: 'sensor.temp',
  state: '22',
  attributes: { friendly_name: 'Temp', unit_of_measurement: '°C' },
};
const item = { type: 'graph', id: 'sensor.temp', position: [0, 0] };

describe('GraphPopup', () => {
  beforeEach(() => {
    createAppStore(config);
    getAppStore().setEntities([entity]);
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({});
  });
  afterEach(() => {
    cleanup();
    chartInstances.length = 0;
    getHistoryMock.mockReset();
    getAppStore().closeGraph();
  });

  it('renders nothing when closed', () => {
    const { container } = render(<GraphPopup />);
    expect(container.firstChild).toBeNull();
  });

  it('loads history and renders the graph with a title', async () => {
    getHistoryMock.mockResolvedValue([
      [{ entity_id: 'sensor.temp', state: '20', last_changed: '2024-01-01T00:00:00Z', attributes: { unit_of_measurement: '°C' } }],
    ]);
    getAppStore().openGraph(item, entity);
    render(<GraphPopup />);
    expect(await screen.findByText('Temp')).toBeDefined();
    await waitFor(() => expect(chartInstances).toHaveLength(1));
  });

  it('closes the popup on the close button', async () => {
    getHistoryMock.mockResolvedValue([]);
    getAppStore().openGraph(item, entity);
    render(<GraphPopup />);
    await screen.findByText('No history data found');
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(getAppStore().activeGraph).toBeNull();
  });
});
```

Note: the close button is a `<div>` with an `<i class="mdi mdi-close">`; if the button role query fails, fall back to `container.querySelector('.history-popup-close')`.

- [ ] **Step 5: Run tests, lint, typecheck**

Run: `npm run test -- src/components/popups/GraphPopup.test.tsx && npm run lint && npm run typecheck`
Expected: PASS. Verify no `openHistory`/`activeHistory`/`HistoryPopup` references remain: `rg "openHistory|activeHistory|HistoryPopup" src`.

- [ ] **Step 6: Commit**

```bash
git add src/components/popups/GraphPopup.tsx src/components/popups/GraphPopup.test.tsx src/store/index.ts src/App.tsx src/tiles/actions.ts
git rm src/components/popups/HistoryPopup.tsx
git commit -m "Rename history popup to generic GraphPopup"
```

---

### Task 5: Graph tile

**Files:**
- Modify: `src/config/types.ts`
- Create: `src/components/tiles/GraphTile.tsx`
- Modify: `src/components/tiles/TileBody.tsx`
- Modify: `src/tiles/actions.ts`
- Modify: `styles/main.less`
- Test: `src/components/tiles/GraphTile.test.tsx`

**Interfaces:**
- Consumes: `useGraphData` + `Graph` from Tasks 2-3, `openGraph` from store.
- Produces: `GraphConfig` type; `GraphTile` tile body component; `entityClick` case for `'graph'`.

- [ ] **Step 1: Write the failing test**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { createAppStore, getAppStore } from '../../store';
import { getHistory } from '../../ha/services';
import { entityClick } from '../../tiles/actions';
import { GraphTile } from './GraphTile';

const { chartInstances } = vi.hoisted(() => ({ chartInstances: [] as Array<{ destroy: ReturnType<typeof vi.fn> }> }));

vi.mock('chart.js/auto', () => ({
  default: vi.fn().mockImplementation(() => {
    const inst = { destroy: vi.fn() };
    chartInstances.push(inst);
    return inst;
  }),
}));
vi.mock('chartjs-adapter-date-fns', () => ({}));
vi.mock('../../ha/services', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../ha/services')>();
  return { ...actual, getHistory: vi.fn() };
});

const getHistoryMock = vi.mocked(getHistory);
const config = { serverUrl: 'http://h', pages: [{ groups: [] }] };
const entity = {
  entity_id: 'sensor.temp',
  state: '22',
  attributes: { friendly_name: 'Temp', unit_of_measurement: '°C' },
};
const item = { type: 'graph', id: 'sensor.temp', position: [0, 0] };

describe('GraphTile', () => {
  beforeEach(() => {
    createAppStore(config);
    getAppStore().setEntities([entity]);
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({});
  });
  afterEach(() => {
    cleanup();
    chartInstances.length = 0;
    getHistoryMock.mockReset();
  });

  it('renders a chart once history data loads', async () => {
    getHistoryMock.mockResolvedValue([
      [{ entity_id: 'sensor.temp', state: '20', last_changed: '2024-01-01T00:00:00Z', attributes: { unit_of_measurement: '°C' } }],
    ]);
    render(<GraphTile item={item as never} entity={entity} />);
    await waitFor(() => expect(chartInstances).toHaveLength(1));
  });

  it('clicking a graph tile opens the graph popup', () => {
    entityClick(item as never, entity);
    expect(getAppStore().activeGraph).toEqual({ item });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/tiles/GraphTile.test.tsx`
Expected: FAIL — module `./GraphTile` not found (and `activeGraph` missing on the store).

- [ ] **Step 3: Add types**

In `src/config/types.ts`:
1. Add `'graph'` to the `TileType` union (after `'gauge'`).
2. Add the interface and the tile field:

```ts
export interface GraphConfig {
  offset?: Field<number>;
  options?: Field<Record<string, unknown>>;
  data?: ConfigFunction<ChartModel>;
}
```

and on `TileConfig` (next to `history?`):

```ts
graph?: GraphConfig;
```

3. Import the type at the top of the file:

```ts
import type { ChartModel } from '../utils/graph';
```

(Type-only import; `utils/graph.ts` does not import `config/types`, so no cycle.)

- [ ] **Step 4: Create GraphTile and wire it up**

`src/components/tiles/GraphTile.tsx`:

```tsx
import { memo } from 'react';
import type { HaEntity, TileConfig } from '../../config/types';
import Graph from '../charts/Graph';
import { useGraphData } from '../charts/useGraphData';

export const GraphTile = memo(function GraphTile({
  item,
  entity,
}: {
  item: TileConfig;
  entity: HaEntity;
}) {
  const { model, options, isLoading, error } = useGraphData(item, entity, 'graph');
  if (isLoading || error || !model) return <div className="item-graph" />;
  return (
    <div className="item-graph">
      <Graph model={model} options={options} />
    </div>
  );
});
```

`src/components/tiles/TileBody.tsx` — add the case (after `case 'gauge'`):

```ts
case 'graph':
  return <GraphTile item={item} entity={entity} />;
```

and the import `import { GraphTile } from './GraphTile';`.

`src/tiles/actions.ts` — in `entityClick`, add the case (before the closing brace of the switch):

```ts
case 'graph':
  getAppStore().openGraph(item, entity);
  return;
```

and in `entityLongPress`, right after the `secondaryAction` check, add:

```ts
if (item.type === 'graph') return;
```

(Click already opens the popup; long-press should not open a second one.)

`styles/main.less` — add next to `.item-gauge` (line ~1105):

```less
.item-graph {
   height: 100%;
   width: 100%;
   position: relative;
}
```

- [ ] **Step 5: Run tests, lint, typecheck**

Run: `npm run test -- src/components/tiles/GraphTile.test.tsx && npm run lint && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/config/types.ts src/components/tiles/GraphTile.tsx src/components/tiles/GraphTile.test.tsx src/components/tiles/TileBody.tsx src/tiles/actions.ts styles/main.less
git commit -m "Add graph tile type"
```

---

### Task 6: Docs, library verification, full suite

**Files:**
- Modify: `README.md`
- Modify: `TILE_EXAMPLES.md`

**Interfaces:**
- Consumes: final public config surface: `type: 'graph'`, `graph: { offset, options, data }`, `history: { entity, offset, options, styles, classes }`.

- [ ] **Step 1: Document the graph tile in README**

Add after the `history` block documentation (README.md line ~301), inside the shared tile settings:

```md
  /* type: 'graph' **/
  graph: {
     offset: 24 * 3600 * 1000, // Range shown in the tile. Default: history.offset or one day
     options: { elements: { point: { radius: 0 } } }, // Chart.js options for the tile
     data: function (item, entity) { return { datasets: [...], yAxes: {} }; }, // Custom data; skips history fetch
  },
  /* Clicking a graph tile opens the graph popup. Configure its (wider) range via
     history.offset; entity via history.entity. */
```

- [ ] **Step 2: Add a TILE_EXAMPLES entry**

Add a `type: 'graph'` example to `TILE_EXAMPLES.md` following the existing entry format, e.g. a temperature history mini-graph whose popup spans 5 days.

- [ ] **Step 3: Verify the chart library is current**

Run: `npm outdated chart.js chartjs-adapter-date-fns date-fns`
Expected: no output (all up to date). Record the result; the design's library-check claim (Chart.js 4.5.1 latest) holds. If `npm outdated` reports anything, do **not** upgrade unless the user asks.

- [ ] **Step 4: Run the full verification suite**

Run: `npm run lint && npm run typecheck && npm run test && npm run build`
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add README.md TILE_EXAMPLES.md
git commit -m "Document graph tile config"
```

---

## Self-Review Notes

- **Spec coverage:** generic renderer (Task 2), shared data loading (Task 3), popup reuse + naming (Task 4), graph tile + click-to-wider-range (Task 5), library check (Task 6), docs (Task 6). All spec sections covered.
- **Placeholder scan:** no TBD/TODO; every code step shows the full code.
- **Type consistency:** `ChartModel`, `GraphScope`, `GraphData`, `buildHistoryModel`, `deepMerge`, `loadGraphModel`, `useGraphData`, `Graph`, `GraphPopup`, `GraphTile`, `GraphConfig`, store `activeGraph`/`openGraph`/`closeGraph` names are consistent across tasks. `deepMerge(baseOptions, options ?? {})` everywhere in `Graph`.
- **Behavior preserved:** popup refetches on every open (fresh mount runs the hook effect); tile fetches once on mount. `history.*` config semantics unchanged for non-graph tiles.