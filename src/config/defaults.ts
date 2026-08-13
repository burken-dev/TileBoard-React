import { DEFAULT_HEADER } from './constants';
import type { TileBoardConfig } from './types';

function deriveWsUrl(serverUrl: string): string {
  const url = new URL(serverUrl);
  const protocol = url.protocol === 'https:' ? 'wss' : 'ws';
  return `${protocol}://${url.host}/api/websocket`;
}

export function applyDefaults(config: TileBoardConfig): TileBoardConfig {
  return {
    ...config,
    transition: config.transition ?? 'animated',
    tileSize: config.tileSize ?? 150,
    tileMargin: config.tileMargin ?? 6,
    entitySize: config.entitySize ?? 'normal',
    menuPosition: config.menuPosition ?? 'left',
    groupsAlign: config.groupsAlign ?? 'horizontally',
    notiesPosition: config.notiesPosition ?? 'right',
    timeFormat: config.timeFormat ?? 24,
    pingConnection: config.pingConnection ?? true,
    doorEntryTimeout: config.doorEntryTimeout ?? 10,
    header: config.header ?? DEFAULT_HEADER,
    wsUrl: config.wsUrl ?? deriveWsUrl(config.serverUrl),
  };
}