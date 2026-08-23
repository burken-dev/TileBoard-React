import type { CSSProperties } from 'react';
import type { ChartModel, GraphStyleObject } from '../utils/graph';

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
  slide: string | null;       // current screensaver slide bg URL, null when not shown
  slideIndex: number | null;  // 0-based index of the active slide, null when not shown
  slideCount: number | null;  // number of screensaver slides, null when not shown
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
  | 'popup_iframe' | 'dimmer_switch' | 'gauge' | 'graph' | 'image' | 'multi';

export interface HistoryConfig {
  entity?: Field<string | string[]>;
  offset?: Field<number>;
  options?: Field<Record<string, unknown>>;
  styles?: Field<CSSProperties>;
  classes?: Field<string>;
}

export interface GraphConfig {
  offset?: Field<number>;
  options?: Field<Record<string, unknown>>;
  data?: ConfigFunction<ChartModel>;
  style?: Field<string | GraphStyleObject>;
}

export interface TileConfig {
  type: TileType;
  id: string | HaEntity;
  position: [number, number];
  title?: Field<string>;
  subtitle?: Field<string>;
  width?: Field<number>;
  height?: Field<number>;
  state?: Field<string> | false;
  states?: Record<string, string> | ConfigFunction<string>;
  icon?: Field<string>;
  icons?: Record<string, string> | ConfigFunction<string>;
  bg?: Field<string>;
  bgSuffix?: Field<string>;
  bgOpacity?: Field<number>;
  bgSize?: Field<string>;
  theme?: TileType;
  slides?: Array<{ bg: Field<string> }>;
  slidesDelay?: Field<number>;
  action?: ConfigFunction;
  secondaryAction?: ConfigFunction;
  actionPlus?: ConfigFunction;
  actionMinus?: ConfigFunction;
  hidden?: Field<boolean>;
  dateTitle?: Field<string>;
  iconTitle?: Field<string>;
  primaryTitle?: Field<string>;
  secondaryTitle?: Field<string>;
  classes?: string[];
  customStyles?: Record<string, unknown> | ConfigFunction<Record<string, unknown>>;
  history?: HistoryConfig;
  graph?: GraphConfig;
  value?: Field<string | number>;
  unit?: Field<string>;
  filter?: (this: FunctionContext, value: unknown, item: TileConfig, entity: HaEntity | null) => unknown;
  slider?: SliderConfig;
  sliders?: SliderConfig[];
  bottom?: Field<boolean>;
  colorpicker?: Field<boolean>;
  hideSource?: Field<boolean>;
  hideMuteButton?: Field<boolean>;
  refresh?: Field<number>;
  fullscreen?: TileConfig;
  objFit?: Field<string>;
  bufferLength?: Field<number>;
  map?: Field<'google' | 'mapbox' | 'yandex'>;
  zoomLevels?: Field<number[]>;
  hideEntityPicture?: Field<boolean>;
  list?: Array<Record<string, Field<unknown>>>;
  hideHeader?: Field<boolean>;
  fields?: Record<string, Field<unknown>>;
  iconImage?: Field<string>;
  url?: Field<string>;
  iframeStyles?: Field<CSSProperties>;
  iframeClasses?: Field<string | string[]>;
  settings?: Record<string, Field<unknown>>;
  customHtml?: Field<string>;
  entities?: string[];
  layout?: { camera: TileConfig; tiles: TileConfig[]; page?: PageConfig };
  loading?: boolean;
  controlsEnabled?: boolean;
  items?: TileConfig[]; // multi tile: child tiles to rotate between
  autorotate?: Field<number>; // multi tile: ms per child, -1/absent = off
  key?: string; // multi child: stable identifier used by setUiState('multi:<id>', key)
}

export interface SliderConfig {
  title?: Field<string>;
  field?: Field<string>;
  min?: Field<number>;
  max?: Field<number>;
  step?: Field<number>;
  value?: Field<number>;
  formatValue?: (conf: { value: number }) => string | number;
  request?: Field<{ type?: string; domain: string; service: string; field?: string }>;
}

export interface GroupConfig {
  title?: Field<string>;
  width?: Field<number>;
  height?: Field<number>;
  groupMarginCss?: Field<string>;
  hidden?: Field<boolean>;
  items: TileConfig[];
}

export interface PageConfig {
  title?: string;
  id?: string;
  bg?: Field<string>;
  bgSuffix?: Field<string>;
  icon?: Field<string>;
  tileSize?: Field<number>;
  tileMargin?: Field<number>;
  groupMarginCss?: Field<string>;
  hidden?: Field<boolean>;
  header?: HeaderConfig;
  groups: GroupConfig[];
}

export type HeaderItemType = 'time' | 'date' | 'datetime' | 'weather' | 'custom_html' | 'photo_date';

export interface HeaderItemConfig {
  type: HeaderItemType;
  format?: Field<string>;
  dateFormat?: Field<string>;
  styles?: Field<CSSProperties>;
  html?: Field<string>;
  icon?: Field<string>;
  icons?: Record<string, string> | ((icon: string, item: unknown, entity: unknown) => string);
  iconImage?: Field<string>;
  fields?: Record<string, Field<unknown>>;
  hidden?: Field<boolean>;
}

export interface HeaderConfig {
  styles?: Field<CSSProperties>;
  left?: HeaderItemConfig[];
  right?: HeaderItemConfig[];
}

export interface SlideConfig {
  bg: Field<string>;
  styles?: Field<CSSProperties>;
  leftTop?: HeaderItemConfig[];
  leftBottom?: HeaderItemConfig[];
  rightTop?: HeaderItemConfig[];
  rightBottom?: HeaderItemConfig[];
}

export type ScreensaverButtonType = 'previous' | 'play_pause' | 'next';

export interface ScreensaverButtonContext {
  bg: string;     // current slide bg URL (resolved, incl. cache-bust)
  index: number;  // 0-based index of the active slide
  total: number;  // slide count
}

export type ScreensaverButtonAction = (
  this: FunctionContext,
  ctx: ScreensaverButtonContext,
) => void;

export interface ScreensaverButtonConfig {
  type?: ScreensaverButtonType;     // absent -> custom button
  icon?: string;                    // mdi class; defaults for built-ins, required for custom
  action?: ScreensaverButtonAction; // required for custom buttons
  enabled?: boolean;                // default true; false hides the button
}

export interface ScreensaverConfig {
  timeout: Field<number>;
  slidesTimeout?: Field<number>;
  slideCacheBust?: Field<number>; // seconds; append a rolling cache-bust query to slide bg urls
  ambient_backdrop?: Field<boolean>; // true = show slide contained with a blurred grayscale backdrop
  styles?: Field<CSSProperties>;
  leftTop?: HeaderItemConfig[];
  leftBottom?: HeaderItemConfig[];
  rightTop?: HeaderItemConfig[];
  rightBottom?: HeaderItemConfig[];
  slides: SlideConfig[];
  buttons?: ScreensaverButtonConfig[];                                   // default: [prev, play_pause, next]
  buttonsPosition?: 'bottom-center' | 'bottom-left' | 'bottom-right';    // default 'bottom-center'
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