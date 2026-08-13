import { act, fireEvent, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Notifications from './Notifications';
import { createAppStore, getAppStore } from '../store';
import type { TileBoardConfig } from '../config/types';

const config: TileBoardConfig = { serverUrl: 'http://h', pages: [{ groups: [] }] };

describe('Notifications', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    createAppStore(config);
  });

  it('renders notification with type class and HTML message', () => {
    const { container } = render(<Notifications />);
    getAppStore().addNotification({
      id: 1,
      type: 'warning',
      title: 'Careful',
      message: '<b>x</b>',
    });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    const noty = container.querySelector('.noty');
    expect(noty?.classList.contains('-warning')).toBe(true);
    expect(noty?.classList.contains('-showed')).toBe(true);
    expect(container.querySelector('.noty-title')?.textContent).toBe('Careful');
    expect(container.querySelector('.noty-message')?.innerHTML).toBe('<b>x</b>');
  });

  it('renders lifetime bar', () => {
    const { container } = render(<Notifications />);
    act(() => {
      getAppStore().addNotification({ id: 2, message: 'm', lifetime: 3 });
    });
    const line = container.querySelector('.noty-lifetime-line') as HTMLElement;
    expect(line.style.animationDuration).toBe('3s');
  });

  it('shows clear-all and clears notifications', () => {
    const { container } = render(<Notifications />);
    act(() => {
      getAppStore().addNotification({ id: 3, message: 'a' });
      getAppStore().addNotification({ id: 4, message: 'b' });
    });
    expect(container.querySelector('.noties-button')).toBeTruthy();
    fireEvent.click(container.querySelector('.noties-button')!);
    expect(getAppStore().notifications).toHaveLength(0);
  });

  it('removes a single notification via close button', () => {
    const { container } = render(<Notifications />);
    act(() => {
      getAppStore().addNotification({ id: 5, message: 'solo' });
    });
    fireEvent.click(container.querySelector('.noty-close')!);
    expect(getAppStore().notifications).toHaveLength(0);
  });
});