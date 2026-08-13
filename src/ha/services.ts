import { callService as haCallService } from 'home-assistant-js-websocket';
import type { Connection, MessageBase } from 'home-assistant-js-websocket';
import { getAppStore } from '../store';
import { toAbsoluteServerURL } from '../utils/misc';

let conn: Connection | null = null;

export function setConnection(connection: Connection): void {
  conn = connection;
}

export function callService(
  domain: string,
  service: string,
  serviceData?: Record<string, unknown>,
): Promise<void> {
  if (!conn) return Promise.reject(new Error('not connected'));
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
  if (!conn) return Promise.reject(new Error('not connected'));
  const { config } = getAppStore();
  const ids = Array.isArray(entityIds) ? entityIds.join(',') : entityIds;
  let url = `/api/history/period/${startDate}?end_time=${endDate ?? new Date(Date.now()).toISOString()}`;
  url += `&filter_entity_id=${ids}`;
  const token = conn.options.auth?.accessToken;
  return fetch(toAbsoluteServerURL(url, config.serverUrl), {
    headers: { Authorization: `Bearer ${token}` },
  }).then((response) => response.json());
}