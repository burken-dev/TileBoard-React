import { create } from 'zustand';
import type { StoreApi, UseBoundStore } from 'zustand';
import type { EntityStates, HaEntity, TileBoardConfig, TileConfig } from '../config/types';
import { callService } from '../ha/services';
import {
  buildDatetimePayload,
  datetimePlaceholder,
  datetimeValid,
  interleaveDigits,
} from '../utils/datetime';
import { leadZero } from '../utils/misc';

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

interface LoadingSlice {
  loadingItems: Set<TileConfig>;
  isLoading(item: TileConfig): boolean;
  setLoading(item: TileConfig, loading: boolean): void;
}

interface SelectSlice {
  activeSelect: TileConfig | null;
  openSelect(item: TileConfig): void;
  closeSelect(): void;
  selectOpened(item: TileConfig): boolean;
}

interface DatetimeSlice {
  activeDatetime: TileConfig | null;
  datetimeInput: string;
  openDatetime(item: TileConfig): void;
  closeDatetime(): void;
  inputDatetimeDigit(d: number): void;
  clearDatetimeChar(): void;
  sendDatetime(): void;
}

interface LightControlsSlice {
  lightControls: Set<TileConfig>;
  openLightControls(item: TileConfig): void;
  closeLightControls(item: TileConfig): void;
}

export type AppStore = AppData &
  AppDataActions &
  NavigationSlice &
  LoadingSlice &
  SelectSlice &
  DatetimeSlice &
  LightControlsSlice;

type AppStoreApi = UseBoundStore<StoreApi<AppStore>>;

let appStore: AppStoreApi | null = null;

function initialPage(config: TileBoardConfig): number {
  if (config.rememberLastPage && location.hash) {
    const parsed = parseInt(location.hash.replace('#', ''), 10);
    if (!isNaN(parsed) && parsed >= 0 && parsed < config.pages.length) return parsed;
  }
  return 0;
}

function entityFor(item: TileConfig, entities: EntityStates): HaEntity | null {
  return typeof item.id === 'string' ? (entities[item.id] ?? null) : null;
}

export function createAppStore(config: TileBoardConfig): void {
  if (appStore) return;
  appStore = create<AppStore>()((set, get) => ({
    config,
    entities: {},
    status: 'loading',
    activePage: initialPage(config),
    scrolled: { horizontal: false, vertical: false },
    loadingItems: new Set(),
    activeSelect: null,
    activeDatetime: null,
    datetimeInput: '',
    lightControls: new Set(),
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
    isLoading: (item) => get().loadingItems.has(item),
    setLoading: (item, loading) =>
      set((prev) => {
        const next = new Set(prev.loadingItems);
        if (loading) next.add(item);
        else next.delete(item);
        return { loadingItems: next };
      }),
    openSelect: (item) => set({ activeSelect: item }),
    closeSelect: () => set({ activeSelect: null }),
    selectOpened: (item) => get().activeSelect === item,
    openDatetime: (item) =>
      set((prev) => {
        const entity = entityFor(item, prev.entities);
        let digits = '';
        if (entity?.attributes?.has_date) {
          const d = new Date();
          digits = String(d.getFullYear()) + leadZero(d.getMonth() + 1) + leadZero(d.getDate());
        }
        return { activeDatetime: item, datetimeInput: digits };
      }),
    closeDatetime: () => set({ activeDatetime: null, datetimeInput: '' }),
    inputDatetimeDigit: (num) =>
      set((prev) => {
        if (!prev.activeDatetime) return {};
        const entity = entityFor(prev.activeDatetime, prev.entities);
        if (!entity) return {};
        const wordCount = datetimePlaceholder(entity).replace(/\W/gi, '').length;
        if (prev.datetimeInput.length >= wordCount) return {};
        return { datetimeInput: prev.datetimeInput + num };
      }),
    clearDatetimeChar: () =>
      set((prev) => ({
        datetimeInput: prev.datetimeInput.slice(0, prev.datetimeInput.length - 1),
      })),
    sendDatetime: () => {
      const { activeDatetime, datetimeInput, entities } = get();
      if (!activeDatetime) return;
      const entity = entityFor(activeDatetime, entities);
      if (!entity) return;
      const placeholder = datetimePlaceholder(entity);
      if (!datetimeValid(placeholder, datetimeInput)) return;
      const formatted = interleaveDigits(placeholder, datetimeInput).filled;
      const payload = buildDatetimePayload(entity, formatted);
      callService('input_datetime', 'set_datetime', {
        entity_id: activeDatetime.id,
        ...payload,
      });
      set({ activeDatetime: null, datetimeInput: '' });
    },
    openLightControls: (item) =>
      set((prev) => ({ lightControls: new Set(prev.lightControls).add(item) })),
    closeLightControls: (item) =>
      set((prev) => {
        const next = new Set(prev.lightControls);
        next.delete(item);
        return { lightControls: next };
      }),
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