import { create } from 'zustand';
import type { StoreApi, UseBoundStore } from 'zustand';
import type { EntityStates, HaEntity, TileBoardConfig, TileConfig } from '../config/types';
import { callService, getHistory } from '../ha/services';
import {
  buildDatetimePayload,
  datetimePlaceholder,
  datetimeValid,
  interleaveDigits,
} from '../utils/datetime';
import { getItemFieldValue } from '../utils/fields';
import { buildHistoryDatasets } from '../utils/history';
import type { HistoryChartModel } from '../utils/history';
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

interface CameraSlice {
  activeCamera: TileConfig | null;
  openCamera(item: TileConfig): void;
  closeCamera(): void;
  screensaverShown: boolean;
  setScreensaverShown(shown: boolean): void;
}

interface AlarmSlice {
  activeAlarm: TileConfig | null;
  alarmCode: string;
  openAlarm(item: TileConfig): void;
  closeAlarm(): void;
  inputAlarmDigit(d: number): void;
  clearAlarmCode(): void;
  actionAlarm(action: string): void;
}

interface DoorEntrySlice {
  activeDoorEntry: TileConfig | null;
  openDoorEntry(item: TileConfig): void;
  closeDoorEntry(): void;
}

interface IframeSlice {
  activeIframe: TileConfig | null;
  openIframe(item: TileConfig): void;
  closeIframe(): void;
}

interface HistorySlice {
  activeHistory: {
    item: TileConfig;
    isLoading: boolean;
    errorText: string | null;
    model?: HistoryChartModel;
    options?: Record<string, unknown>;
  } | null;
  openHistory(item: TileConfig, entity: HaEntity | null): void;
  closeHistory(): void;
}

export type AppStore = AppData &
  AppDataActions &
  NavigationSlice &
  LoadingSlice &
  SelectSlice &
  DatetimeSlice &
  LightControlsSlice &
  CameraSlice &
  AlarmSlice &
  DoorEntrySlice &
  IframeSlice &
  HistorySlice;

type AppStoreApi = UseBoundStore<StoreApi<AppStore>>;

let appStore: AppStoreApi | null = null;
const latestAlarmActions = new Map<string, number>();
let doorEntryTimeout: ReturnType<typeof setTimeout> | null = null;

function checkAlarmState(entityId: string): void {
  const ts = latestAlarmActions.get(entityId);
  if (typeof ts === 'undefined') return;
  if (Date.now() - ts < 3000) getAppStore().closeAlarm();
}

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
    activeCamera: null,
    screensaverShown: false,
    activeAlarm: null,
    alarmCode: '',
    activeDoorEntry: null,
    activeIframe: null,
    activeHistory: null,
    setEntities: (states) => {
      set({
        entities: Object.fromEntries(states.map((state) => [state.entity_id, state])),
      });
      if (latestAlarmActions.size > 0) {
        states.forEach((state) => {
          if (latestAlarmActions.has(state.entity_id)) checkAlarmState(state.entity_id);
        });
      }
    },
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
    openCamera: (item) => set({ activeCamera: item }),
    closeCamera: () => set({ activeCamera: null }),
    setScreensaverShown: (shown) => set({ screensaverShown: shown }),
    openAlarm: (item) => set({ activeAlarm: item, alarmCode: '' }),
    closeAlarm: () => set({ activeAlarm: null, alarmCode: '' }),
    inputAlarmDigit: (num) =>
      set((prev) => ({ alarmCode: prev.alarmCode + num })),
    clearAlarmCode: () => set({ alarmCode: '' }),
    actionAlarm: (action) => {
      const { activeAlarm, entities, alarmCode } = get();
      if (!activeAlarm) return;
      const entity = entityFor(activeAlarm, entities);
      const data: Record<string, unknown> = { entity_id: activeAlarm.id };
      if (entity?.attributes?.code_format && alarmCode) data.code = alarmCode;
      latestAlarmActions.set(String(activeAlarm.id), Date.now());
      callService('alarm_control_panel', action, data);
      set({ alarmCode: '' });
    },
    openDoorEntry: (item) => {
      set({ activeDoorEntry: item });
      if (doorEntryTimeout) clearTimeout(doorEntryTimeout);
      doorEntryTimeout = null;
      const timeout = get().config.doorEntryTimeout;
      if (timeout) {
        doorEntryTimeout = setTimeout(() => {
          if (get().activeDoorEntry === item) set({ activeDoorEntry: null });
        }, timeout * 1000);
      }
    },
    closeDoorEntry: () => {
      if (doorEntryTimeout) {
        clearTimeout(doorEntryTimeout);
        doorEntryTimeout = null;
      }
      set({ activeDoorEntry: null });
    },
    openIframe: (item) => set({ activeIframe: item }),
    closeIframe: () => set({ activeIframe: null }),
    openHistory: (item, entity) => {
      const states = get().entities;
      const entityId =
        (getItemFieldValue('history.entity', states, item, entity) as string) ||
        entity?.entity_id;
      if (!entityId) {
        set({
          activeHistory: { item, isLoading: false, errorText: 'No entity was specified' },
        });
        return;
      }
      const day = 24 * 60 * 60 * 1000;
      const offset = Number(getItemFieldValue('history.offset', states, item, entity)) || day;
      const startDate = new Date(Date.now() - offset).toISOString();
      set({ activeHistory: { item, isLoading: true, errorText: null } });
      getHistory(startDate, entityId)
        .then((data) => {
          const current = get().activeHistory;
          if (!current || current.item !== item) return;
          if (!data || data.length === 0) {
            set({ activeHistory: { item, isLoading: false, errorText: 'No history data found' } });
            return;
          }
          const series = data as unknown as Array<
            Array<Record<string, unknown>>
          >;
          const seriesMeta = series.map((points) => {
            const first = points[0] ?? {};
            const attrs = (first.attributes ?? {}) as Record<string, unknown>;
            const id = String(first.entity_id ?? entityId);
            return {
              name: String(attrs.friendly_name ?? id),
              unit:
                attrs.unit_of_measurement != null
                  ? String(attrs.unit_of_measurement)
                  : undefined,
              currentState: states[id]?.state,
            };
          });
          const model = buildHistoryDatasets(series as never, seriesMeta, Date.now());
          const options = getItemFieldValue(
            'history.options',
            states,
            item,
            entity,
          ) as Record<string, unknown> | undefined;
          set({ activeHistory: { item, isLoading: false, errorText: null, model, options } });
        })
        .catch(() => {
          set({ activeHistory: { item, isLoading: false, errorText: 'No history data found' } });
        });
    },
    closeHistory: () => set({ activeHistory: null }),
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