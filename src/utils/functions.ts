import type { ConfigFunction, FunctionContext } from '../config/types';
import { getAppStore } from '../store';
import { callService, sendMessage } from '../ha/services';

export type { FunctionContext };

function parseFieldValue(value: unknown, item?: unknown, entity?: unknown): unknown {
  if (typeof value === 'function') return callFunction(value as ConfigFunction, [item, entity]);
  if (typeof value === 'string') return value;
  return value;
}

export function getContext(): FunctionContext {
  return {
    states: getAppStore().entities,
    parseFieldValue: parseFieldValue as FunctionContext['parseFieldValue'],
    callService,
    sendMessage,
    openPage: () => {
      // wired in step 04
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