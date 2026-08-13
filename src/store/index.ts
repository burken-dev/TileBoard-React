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

export type AppStore = AppData & AppDataActions;

type AppStoreApi = UseBoundStore<StoreApi<AppStore>>;

let appStore: AppStoreApi | null = null;

export function createAppStore(config: TileBoardConfig): void {
  if (appStore) return;
  appStore = create<AppStore>()((set) => ({
    config,
    entities: {},
    status: 'loading',
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
  }));
}

export function useAppStore(): AppStore {
  if (!appStore) throw new Error('createAppStore() must be called before useAppStore()');
  return appStore();
}

export function getAppStore(): AppStore {
  if (!appStore) throw new Error('createAppStore() must be called before getAppStore()');
  return appStore.getState();
}