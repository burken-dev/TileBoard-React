import { create } from 'zustand';
import type { StoreApi, UseBoundStore } from 'zustand';
import type { EntityStates, HaEntity, TileBoardConfig } from '../config/types';

export type ConnectionStatus = 'loading' | 'ready' | 'reconnecting' | 'error';

interface AppData {
  config: TileBoardConfig;
  entities: EntityStates;
  status: ConnectionStatus;
}

interface AppDataActions {
  setEntities(states: HaEntity[]): void;
  updateEntity(state: HaEntity): void;
  setStatus(status: ConnectionStatus): void;
}

interface NavigationSlice {
  activePage: number;
  scrolled: { horizontal: boolean; vertical: boolean };
  openPage(index: number, preventAnimation?: boolean): void;
  setScrolled(scroll: { horizontal: boolean; vertical: boolean }): void;
}

export type AppStore = AppData & AppDataActions & NavigationSlice;

type AppStoreApi = UseBoundStore<StoreApi<AppStore>>;

let appStore: AppStoreApi | null = null;

function initialPage(config: TileBoardConfig): number {
  if (config.rememberLastPage && location.hash) {
    const parsed = parseInt(location.hash.replace('#', ''), 10);
    if (!isNaN(parsed) && parsed >= 0 && parsed < config.pages.length) return parsed;
  }
  return 0;
}

export function createAppStore(config: TileBoardConfig): void {
  if (appStore) return;
  appStore = create<AppStore>()((set) => ({
    config,
    entities: {},
    status: 'loading',
    activePage: initialPage(config),
    scrolled: { horizontal: false, vertical: false },
    setEntities: (states) =>
      set({
        entities: Object.fromEntries(states.map((state) => [state.entity_id, state])),
      }),
    updateEntity: (state) =>
      set((prev) => ({
        entities: {
          ...prev.entities,
          [state.entity_id]: { ...prev.entities[state.entity_id], ...state },
        },
      })),
    setStatus: (status) => set({ status }),
    openPage: (index, _preventAnimation) =>
      set((prev) => {
        const clamped = Math.max(0, Math.min(index, prev.config.pages.length - 1));
        if (prev.config.rememberLastPage) location.hash = String(clamped);
        return { activePage: clamped, scrolled: { horizontal: false, vertical: false } };
      }),
    setScrolled: (scroll) => set({ scrolled: scroll }),
  }));

  window.openPage = (index: number) => getAppStore().openPage(index);
}

export function useAppStore(): AppStore;
export function useAppStore<U>(selector: (state: AppStore) => U): U;
export function useAppStore<U>(selector?: (state: AppStore) => U): AppStore | U {
  if (!appStore) throw new Error('createAppStore() must be called before useAppStore()');
  return selector ? appStore(selector) : appStore();
}

export function getAppStore(): AppStore {
  if (!appStore) throw new Error('createAppStore() must be called before getAppStore()');
  return appStore.getState();
}