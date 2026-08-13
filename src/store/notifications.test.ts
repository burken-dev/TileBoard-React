import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppStore, getAppStore } from './index';
import type { TileBoardConfig } from '../config/types';

const config: TileBoardConfig = { serverUrl: 'http://h', pages: [{ groups: [] }] };

describe('notifications slice', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    createAppStore(config);
    getAppStore().clearNotifications();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('adds a notification and flips showed after 100 ms', () => {
    getAppStore().addNotification({ id: 1, message: 'hi' });
    expect(getAppStore().notifications).toHaveLength(1);
    expect(getAppStore().notifications[0].showed).toBe(false);
    vi.advanceTimersByTime(100);
    expect(getAppStore().notifications[0].showed).toBe(true);
  });

  it('auto-removes after lifetime', () => {
    getAppStore().addNotification({ id: 2, message: 'b', lifetime: 1 });
    vi.advanceTimersByTime(999);
    expect(getAppStore().notifications).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(getAppStore().notifications).toHaveLength(0);
  });

  it('same-id update resets the lifetime timer', () => {
    getAppStore().addNotification({ id: 3, message: 'c', lifetime: 2 });
    vi.advanceTimersByTime(1500);
    getAppStore().addNotification({ id: 3, message: 'c2', lifetime: 2 });
    expect(getAppStore().notifications).toHaveLength(1);
    expect(getAppStore().notifications[0].message).toBe('c2');
    vi.advanceTimersByTime(1500);
    expect(getAppStore().notifications).toHaveLength(1);
    vi.advanceTimersByTime(600);
    expect(getAppStore().notifications).toHaveLength(0);
  });

  it('keeps seen history after removal', () => {
    getAppStore().addNotification({ id: 4, message: 'd' });
    expect(getAppStore().notificationSeen(4)).toBe(true);
    getAppStore().removeNotification(4);
    expect(getAppStore().notifications).toHaveLength(0);
    expect(getAppStore().notificationSeen(4)).toBe(true);
  });

  it('removeNotification clears pending timers', () => {
    getAppStore().addNotification({ id: 5, message: 'e', lifetime: 5 });
    getAppStore().removeNotification(5);
    vi.advanceTimersByTime(6000);
    expect(getAppStore().notifications).toHaveLength(0);
  });

  it('clearNotifications empties the list', () => {
    getAppStore().addNotification({ id: 6, message: 'f' });
    getAppStore().addNotification({ id: 7, message: 'g' });
    getAppStore().clearNotifications();
    expect(getAppStore().notifications).toHaveLength(0);
  });
});