import type { ConfigFunction, FunctionContext } from '../config/types';
import { callService, sendMessage } from '../ha/services';
import { getAppStore } from '../store';
import { parseFieldValue } from './fields';
import { memo } from './memo';

export type { FunctionContext };

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
    memo,
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