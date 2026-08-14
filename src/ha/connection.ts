import {
  createConnection,
  createLongLivedTokenAuth,
  getAuth,
  subscribeEntities,
} from 'home-assistant-js-websocket';
import type { Connection } from 'home-assistant-js-websocket';
import type { ConfigFunction, EntityStates, EventConfig } from '../config/types';
import { getAppStore } from '../store';
import { setConnection, sendMessage } from './services';
import { callFunction } from '../utils/functions';

let initStarted = false;

let pendingStates: EntityStates | null = null;
let flushScheduled = false;

function flushEntities(): void {
  flushScheduled = false;
  if (!pendingStates) return;
  const states = pendingStates;
  pendingStates = null;
  getAppStore().setEntities(Object.values(states));
}

function scheduleFlush(): void {
  if (flushScheduled || !pendingStates) return;
  flushScheduled = true;
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(flushEntities);
  } else {
    // jsdom / tests
    setTimeout(flushEntities, 0);
  }
}

export function initConnection(): void {
  if (initStarted) return;
  initStarted = true;

  const { config } = getAppStore();
  const setStatus = getAppStore().setStatus;

  setStatus('loading');

  const authPromise = config.authToken
    ? Promise.resolve(createLongLivedTokenAuth(config.serverUrl, config.authToken))
    : getAuth({ hassUrl: config.serverUrl });

  authPromise
    .then((auth) => createConnection({ auth }))
    .then((connection) => {
      setConnection(connection);
      setStatus('ready');

      subscribeEntities(connection, (states) => {
        pendingStates = states;
        scheduleFlush();
        if (config.debug) console.log('entities updated', states);
      });

      connection.subscribeEvents(
        (ev: { event?: { data?: Record<string, unknown> } }) => {
          handleTileboardEvent(ev?.event?.data);
        },
        'tileboard',
      );

      connection.addEventListener('disconnected', () => setStatus('reconnecting'));
      connection.addEventListener('ready', () => {
        setStatus('ready');
        if (config.onReady) callFunction(config.onReady, []);
      });
      connection.addEventListener('reconnect-error', () => {
        const { config, addNotification } = getAppStore();
        if (!config.ignoreErrors) {
          addNotification({
            type: 'error',
            title: 'Connection',
            message: 'Connection error',
            lifetime: 10,
          });
        }
      });

      if (config.pingConnection !== false) {
        setInterval(() => pingConnection(connection), 5000);
        window.addEventListener('focus', () => pingConnection(connection));
      }
    })
    .catch((err) => {
      console.error(err);
      setStatus('error');
    });
}

export function matchEvent(
  events: EventConfig[] | undefined,
  eventData: Record<string, unknown>,
): EventConfig | undefined {
  if (!events) return undefined;
  return events.find((event) => event.command === eventData.command);
}

function handleTileboardEvent(data: Record<string, unknown> | undefined): void {
  if (!data) return;
  const { config } = getAppStore();
  if (config.debug) console.log('tileboard event', data);
  const event = matchEvent(config.events, data);
  if (event && typeof event.action === 'function') {
    callFunction(event.action as unknown as ConfigFunction, [data]);
  }
}

function pingConnection(connection: Connection): void {
  if (getAppStore().status !== 'ready') return;

  let success = false;
  sendMessage({ type: 'ping' }).then(() => {
    success = true;
  });

  setTimeout(() => {
    if (success) return;
    const { addNotification } = getAppStore();
    getAppStore().setStatus('reconnecting');
    addNotification({
      type: 'warning',
      title: 'Ping unsuccessful',
      message: 'Trying to reconnect',
      id: 'ping',
    });
    connection.reconnect();

    const onReady = () => {
      connection.removeEventListener('ready', onReady);
      getAppStore().removeNotification('ping');
      addNotification({
        type: 'success',
        title: 'Reconnection',
        message: 'Reconnection successful',
        lifetime: 1,
        id: 'ping-ok',
      });
    };
    connection.addEventListener('ready', onReady);
  }, 3000);
}