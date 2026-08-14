import type { ConfigFunction, FunctionContext } from '../config/types';
import { callService, sendMessage } from '../ha/services';
import { getAppStore } from '../store';
import { parseFieldValue } from './fields';

export type { FunctionContext };

const memoCache = new Map<string, { expiresAt: number; value: unknown }>();
const uiStateCache = new Map<string, unknown>();

export function getContext(): FunctionContext {
  return {
    states: getAppStore().entities,
    parseFieldValue: (value, item, entity) =>
      parseFieldValue(value, getAppStore().entities, item, entity),
    callService,
    sendMessage,
    openPage: (pageIndex) => getAppStore().openPage(pageIndex),
    addNotification: (data) => getAppStore().addNotification(data),
    memo: <T,>(key: string, ttlSeconds: number, fn: () => T): T => {
      const now = Date.now();
      const hit = memoCache.get(key);
      if (hit && hit.expiresAt > now) return hit.value as T;
      const value = fn();
      memoCache.set(key, { expiresAt: now + ttlSeconds * 1000, value });
      return value;
    },
    uiState: (key: string): unknown => uiStateCache.get(key),
    setUiState: (key: string, value: unknown): void => {
      uiStateCache.set(key, value);
    },
  };
}

export function callFunction<T>(funcOrValue: T | ConfigFunction<T>, args: unknown[]): unknown {
  if (typeof funcOrValue !== 'function') return funcOrValue;
  return (funcOrValue as (this: FunctionContext, ...a: unknown[]) => unknown).apply(
    getContext(),
    args,
  );
}