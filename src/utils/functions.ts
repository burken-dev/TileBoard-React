import type { ConfigFunction, FunctionContext } from '../config/types';
import { callService, sendMessage } from '../ha/services';
import { getAppStore } from '../store';
import { parseFieldValue } from './fields';

export type { FunctionContext };

export function getContext(): FunctionContext {
  return {
    states: getAppStore().entities,
    parseFieldValue: (value, item, entity) =>
      parseFieldValue(value, getAppStore().entities, item, entity),
    callService,
    sendMessage,
    openPage: (pageIndex) => getAppStore().openPage(pageIndex),
    addNotification: (data) => getAppStore().addNotification(data),
  };
}

export function callFunction<T>(funcOrValue: T | ConfigFunction<T>, args: unknown[]): unknown {
  if (typeof funcOrValue !== 'function') return funcOrValue;
  return (funcOrValue as (this: FunctionContext, ...a: unknown[]) => unknown).apply(
    getContext(),
    args,
  );
}