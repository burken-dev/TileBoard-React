import type { ConfigFunction, FunctionContext } from '../config/types';
import { callService, sendMessage } from '../ha/services';
import { getAppStore } from '../store';
import { parseFieldValue } from './fields';
import { memo } from './memo';

export type { FunctionContext };

export function getContext(): FunctionContext {
  const store = getAppStore();
  return {
    states: store.entities,
    parseFieldValue: (value, item, entity) =>
      parseFieldValue(value, getAppStore().entities, item, entity),
    callService,
    sendMessage,
    openPage: (pageIndex) => getAppStore().openPage(pageIndex),
    addNotification: (data) => getAppStore().addNotification(data),
    memo,
    uiState: (key) => getAppStore().uiState[key],
    setUiState: (key, value) => getAppStore().setUiState(key, value),
    slide: store.screensaverShown ? store.screensaverBg : null,
    slideIndex: store.screensaverShown ? store.screensaverSlide : null,
    slideCount: store.screensaverShown ? store.config.screensaver?.slides?.length ?? null : null,
  };
}

export function callFunction<T>(funcOrValue: T | ConfigFunction<T>, args: unknown[]): unknown {
  if (typeof funcOrValue !== 'function') return funcOrValue;
  return (funcOrValue as (this: FunctionContext, ...a: unknown[]) => unknown).apply(
    getContext(),
    args,
  );
}