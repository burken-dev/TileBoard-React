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
const REFRESH_MS = 60_000;

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
    let inFlight = false;
    const load = () => {
      if (inFlight) return;
      inFlight = true;
      loadGraphModel(item, entity, states, scope)
        .then((result) => {
          if (cancelled) return;
          if ('error' in result) setData({ isLoading: false, error: result.error });
          else setData({ model: result.model, options: result.options, isLoading: false, error: null });
        })
        .catch(() => {
          if (!cancelled) setData({ isLoading: false, error: 'No history data found' });
        })
        .finally(() => {
          inFlight = false;
        });
    };
    setData({ isLoading: true, error: null });
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // ponytail: fixed 60s refresh keeps the trailing point current on live dashboards;
    // switch to a throttled `states` dep if per-change freshness matters more.
  }, [item, scope]);

  return data;
}