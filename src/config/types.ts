import type { CSSProperties } from 'react';

export interface HaEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed?: string;
  last_updated?: string;
}

export type EntityStates = Record<string, HaEntity>;

export interface MockConfig {
  entities: HaEntity[];
  interval?: number;
}

export interface NotificationData {
  id?: string | number;
  type?: 'info' | 'warning' | 'error' | 'success';
  title?: string;
  message?: string;
  icon?: string;
  lifetime?: number;
}

export interface FunctionContext {
  states: EntityStates;
  parseFieldValue: (value: unknown, item?: TileConfig, entity?: HaEntity | null) => unknown;
  callService: (domain: string, service: string, serviceData?: Record<string, unknown>) => void;
  sendMessage: <T = unknown>(data: Record<string, unknown>) => Promise<T>;
  openPage: (pageIndex: number) => void;
  addNotification: (data: NotificationData) => void;
  memo: <T>(key: string, ttlSeconds: number, fn: () => T) => T;
  uiState: (key: string) => unknown;
  setUiState: (key: string, value: unknown) => void;
}

export type ConfigFunction<T = unknown> = (
  this: FunctionContext,
  item: TileConfig,
  entity: HaEntity | null,
) => T;

export type Field<T> = T | ConfigFunction<T>;

export type TileType =
  | 'device_tracker' | 'script' | 'automation' | 'sensor' | 'sensor_icon' | 'switch'
  | 'lock' | 'cover' | 'cover_toggle' | 'fan' | 'input_boolean' | 'light' | 'text_list'
  | 'input_number' | 'input_select' | 'input_datetime' | 'camera' | 'camera_thumbnail'
  | 'camera_stream' | 'scene' | 'slider' | 'iframe' | 'door_entry' | 'weather'
  | 'climate' | 'media_player' | 'custom' | 'alarm' | 'weather_list' | 'vacuum'
  | 'popup_iframe' | 'dimmer_switch' | 'gauge' | 'image';

export interface HistoryConfig {
  entity?: Field<string | string[]>;
  offset?: number;
  options?: Record<string, unknown>;
  styles?: CSSProperties;
  classes?: string;
}

export interface TileConfig {
  type: TileType;
  id: string | HaEntity;
  position: [number, number];
  title?: Field<string>;
  subtitle?: Field<string>;
  width?: number;
  height?: number;
  state?: Field<string> | false;
  states?: Record<string, string> | ConfigFunction<string>;
  icon?: Field<string>;
  icons?: Record<string, string> | ConfigFunction<string>;
  bg?: Field<string>;
  bgSuffix?: Field<string>;
  bgOpacity?: Field<number>;
  bgSize?: string;
  theme?: TileType;
  slides?: Array<{ bg: Field<string> }>;
  slidesDelay?: number;
  action?: ConfigFunction;
  secondaryAction?: ConfigFunction;
  hidden?: Field<boolean>;
  classes?: string[];
  customStyles?: CSSProperties | ConfigFunction<CSSProperties>;
  history?: HistoryConfig;
  value?: Field<string | number>;
  unit?: Field<string>;
  filter?: (this: FunctionContext, value: unknown, item: TileConfig, entity: HaEntity | null) => unknown;
  slider?: SliderConfig;
  sliders?: SliderConfig[];
  bottom?: boolean;
  colorpicker?: boolean;
  hideSource?: boolean;
  hideMuteButton?: boolean;
  refresh?: Field<number>;
  fullscreen?: TileConfig;
  objFit?: string;
  bufferLength?: number;
  map?: 'google' | 'mapbox' | 'yandex';
  zoomLevels?: number[];
  hideEntityPicture?: boolean;
  list?: Array<Record<string, Field<unknown>>>;
  hideHeader?: boolean;
  fields?: Record<string, Field<unknown>>;
  iconImage?: Field<string>;
  url?: Field<string>;
  iframeStyles?: Field<CSSProperties>;
  iframeClasses?: Field<string | string[]>;
  settings?: Record<string, Field<unknown>>;
  customHtml?: Field<string>;
  layout?: { camera: TileConfig; tiles: TileConfig[]; page?: PageConfig };
  loading?: boolean;
  controlsEnabled?: boolean;
}

export interface SliderConfig {
  title?: string;
  field?: string;
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  formatValue?: (conf: { value: number }) => string | number;
  request?: { type?: string; domain: string; service: string; field?: string };
}

export interface GroupConfig {
  title?: string;
  width?: number;
  height?: number;
  groupMarginCss?: string;
  hidden?: Field<boolean>;
  items: TileConfig[];
}

export interface PageConfig {
  title?: string;
  id?: string;
  bg?: Field<string>;
  bgSuffix?: Field<string>;
  icon?: string;
  tileSize?: number;
  tileMargin?: number;
  groupMarginCss?: string;
  hidden?: Field<boolean>;
  header?: HeaderConfig;
  groups: GroupConfig[];
}

export type HeaderItemType = 'time' | 'date' | 'datetime' | 'weather' | 'custom_html' | 'photo_date';

export interface HeaderItemConfig {
  type: HeaderItemType;
  format?: string;
  dateFormat?: string;
  styles?: CSSProperties;
  html?: string;
  icon?: Field<string>;
  icons?: Record<string, string> | ((icon: string, item: unknown, entity: unknown) => string);
  iconImage?: Field<string>;
  fields?: Record<string, Field<unknown>>;
  hidden?: Field<boolean>;
}

export interface HeaderConfig {
  styles?: CSSProperties;
  left?: HeaderItemConfig[];
  right?: HeaderItemConfig[];
}

export interface SlideConfig {
  bg: string;
  styles?: CSSProperties;
  leftTop?: HeaderItemConfig[];
  leftBottom?: HeaderItemConfig[];
  rightTop?: HeaderItemConfig[];
  rightBottom?: HeaderItemConfig[];
}

export interface ScreensaverConfig {
  timeout: number;
  slidesTimeout?: number;
  slideCacheBust?: number; // seconds; append a rolling cache-bust query to slide bg urls
  styles?: CSSProperties;
  leftTop?: HeaderItemConfig[];
  leftBottom?: HeaderItemConfig[];
  rightTop?: HeaderItemConfig[];
  rightBottom?: HeaderItemConfig[];
  slides: SlideConfig[];
}

export interface EventConfig {
  command: string;
  action: (this: FunctionContext, event: Record<string, unknown>) => void;
}

export interface TileBoardConfig {
  serverUrl: string;
  wsUrl?: string;
  authToken?: string | null;
  customTheme?: string | string[] | null;
  transition?: 'animated' | 'animated_gpu' | 'simple';
  tileSize?: number;
  tileMargin?: number;
  entitySize?: 'small' | 'normal' | 'big';
  groupMarginCss?: string;
  pingConnection?: boolean;
  debug?: boolean;
  timeFormat?: 12 | 24;
  googleApiKey?: string | null;
  mapboxToken?: string | null;
  mapboxStyle?: string | null;
  mock?: MockConfig;
  menuPosition?: 'left' | 'bottom';
  hideScrollbar?: boolean;
  groupsAlign?: 'horizontally' | 'vertically';
  notiesPosition?: 'left' | 'right';
  ignoreErrors?: boolean;
  rememberLastPage?: boolean;
  autoReloadInterval?: number; // seconds between full page reloads
  scripts?: string[];          // extra scripts to load after config, before app render
  locale?: string;             // date-fns locale name, e.g. 'sv-se'
  doorEntryTimeout?: number;
  clockStyles?: CSSProperties;
  onReady?: (this: FunctionContext) => void;
  pages: PageConfig[];
  events?: EventConfig[];
  screensaver?: ScreensaverConfig;
  header?: HeaderConfig;
}