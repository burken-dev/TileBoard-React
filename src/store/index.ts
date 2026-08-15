import { create } from 'zustand';
import type { StoreApi, UseBoundStore } from 'zustand';
import { useCallback, useRef, useSyncExternalStore } from 'react';
import type {
  EntityStates,
  HaEntity,
  NotificationData,
  TileBoardConfig,
  TileConfig,
} from '../config/types';
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

interface GraphSlice {
  activeGraph: { item: TileConfig } | null;
  openGraph(item: TileConfig, entity: HaEntity | null): void;
  closeGraph(): void;
}

export interface NotificationModel extends NotificationData {
  showed: boolean;
}

export type { NotificationData };

interface NotificationsSlice {
  notifications: NotificationModel[];
  addNotification(data: NotificationData): void;
  removeNotification(id: string | number): void;
  clearNotifications(): void;
  notificationSeen(id: string | number): boolean;
}

interface UiStateSlice {
  uiState: Record<string, unknown>;
  setUiState(key: string, value: unknown): void;
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
  GraphSlice &
  NotificationsSlice &
  UiStateSlice;

type AppStoreApi = UseBoundStore<StoreApi<AppStore>>;

let appStore: AppStoreApi | null = null;
const latestAlarmActions = new Map<string, number>();
let doorEntryTimeout: ReturnType<typeof setTimeout> | null = null;

const notyTimers = new Map<string | number, Set<ReturnType<typeof setTimeout>>>();
const notyHistory = new Set<string | number>();

function clearNotyTimers(id: string | number): void {
  const timers = notyTimers.get(id);
  if (!timers) return;
  timers.forEach((timer) => clearTimeout(timer));
  notyTimers.delete(id);
}

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
    notifications: [],
    activeAlarm: null,
    alarmCode: '',
    activeDoorEntry: null,
    activeIframe: null,
    activeGraph: null,
    uiState: {},
    setUiState: (key, value) =>
      set((prev) => ({ uiState: { ...prev.uiState, [key]: value } })),
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
    selectOpened: (item) => get().activeSelect?.id === item.id,
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
      set((prev) => ({
        lightControls: new Set([...prev.lightControls].filter((c) => c.id !== item.id)),
      })),
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
    openGraph: (item, _entity) => set({ activeGraph: { item } }),
    closeGraph: () => set({ activeGraph: null }),
    addNotification: (data) => {
      const id = data.id ?? Math.random();
      const existing = get().notifications.find((n) => n.id === id);
      clearNotyTimers(id);
      if (existing) {
        set({
          notifications: get().notifications.map((n) =>
            n.id === id ? { ...n, ...data, id, showed: n.showed } : n,
          ),
        });
      } else {
        notyHistory.add(id);
        set({
          notifications: [...get().notifications, { ...data, id, showed: false }],
        });
      }
      const timers = new Set<ReturnType<typeof setTimeout>>();
      timers.add(
        setTimeout(() => {
          set({
            notifications: get().notifications.map((n) =>
              n.id === id ? { ...n, showed: true } : n,
            ),
          });
        }, 100),
      );
      if (data.lifetime) {
        timers.add(
          setTimeout(() => {
            set({ notifications: get().notifications.filter((n) => n.id !== id) });
            clearNotyTimers(id);
          }, data.lifetime * 1000),
        );
      }
      notyTimers.set(id, timers);
    },
    removeNotification: (id) => {
      clearNotyTimers(id);
      set({ notifications: get().notifications.filter((n) => n.id !== id) });
    },
    clearNotifications: () => {
      notyTimers.forEach((timers) => timers.forEach((timer) => clearTimeout(timer)));
      notyTimers.clear();
      set({ notifications: [] });
    },
    notificationSeen: (id) => notyHistory.has(id),
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

export function useEntity(item: TileConfig): HaEntity | null {
  return useAppStore((s) => {
    if (typeof item.id === 'object') return item.id as HaEntity;
    return s.entities[item.id] ?? null;
  });
}

export function useEntities(ids: string[]): EntityStates {
  const idsRef = useRef(ids);
  idsRef.current = ids;
  const lastRef = useRef<EntityStates | null>(null);

  const subscribe = useCallback((onStoreChange: () => void): (() => void) => {
    if (!appStore) throw new Error('createAppStore() must be called before useAppStore()');
    return appStore.subscribe((state, prev) => {
      for (const id of idsRef.current) {
        if (prev.entities[id] !== state.entities[id]) {
          onStoreChange();
          return;
        }
      }
    });
  }, []);

  const getSnapshot = useCallback((): EntityStates => {
    if (!appStore) throw new Error('createAppStore() must be called before useAppStore()');
    const current = appStore.getState().entities;
    if (lastRef.current && idsRef.current.every((id) => lastRef.current![id] === current[id])) {
      return lastRef.current;
    }
    lastRef.current = current;
    return current;
  }, []);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
