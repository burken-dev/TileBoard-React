import { callService as haCallService } from 'home-assistant-js-websocket';
import type { Connection, MessageBase } from 'home-assistant-js-websocket';
import { mockCallService, mockGetHistory } from './mock';

let conn: Connection | null = null;
let mockMode = false;

export function setConnection(connection: Connection): void {
  conn = connection;
}

export function setMockMode(enabled: boolean): void {
  mockMode = enabled;
}

export function callService(
  domain: string,
  service: string,
  serviceData?: Record<string, unknown>,
): Promise<void> {
  if (!conn) {
    return mockMode
      ? mockCallService(domain, service, serviceData)
      : Promise.reject(new Error('not connected'));
  }
  return haCallService(conn, domain, service, serviceData) as Promise<void>;
}

export function sendMessage<T = unknown>(data: Record<string, unknown>): Promise<T> {
  if (!conn) return Promise.reject(new Error('not connected'));
  return conn.sendMessagePromise<T>(data as unknown as MessageBase);
}

export function getHistory(
  startDate: string,
  entityIds: string | string[],
  endDate?: string,
): Promise<unknown[][]> {
  if (!conn) {
    return mockMode
      ? mockGetHistory(entityIds, startDate)
      : Promise.reject(new Error('not connected'));
  }
  const ids = Array.isArray(entityIds) ? entityIds : [entityIds];
  return sendMessage<Record<string, Array<Record<string, unknown>>>>({
    type: 'history/history_during_period',
    start_time: startDate,
    end_time: endDate,
    entity_ids: ids,
    significant_changes_only: false,
  }).then((byEntity) =>
    ids
      .map((id) => (byEntity[id] ?? []).map((state) => toFullState(id, state)))
      .filter((series) => series.length > 0),
  );
}

// ponytail: the websocket history command returns compressed states ({c,a,lu,lc}),
// this expands them back to the REST shape the graph code already consumes.
function toFullState(
  entityId: string,
  state: Record<string, unknown>,
): Record<string, unknown> {
  const toIso = (key: string): string | undefined => {
    const ts = Number(state[key]);
    return Number.isFinite(ts) && ts > 0 ? new Date(ts * 1000).toISOString() : undefined;
  };
  const lastUpdated = toIso('lu');
  return {
    entity_id: entityId,
    state: state.c,
    attributes: (state.a ?? {}) as Record<string, unknown>,
    last_changed: toIso('lc') ?? lastUpdated,
    last_updated: lastUpdated,
  };
}