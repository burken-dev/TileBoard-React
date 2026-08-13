import { fireEvent, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TileConfig } from '../../config/types';
import { createAppStore, getAppStore } from '../../store';
import AlarmPopup from './AlarmPopup';

vi.mock('../../ha/services', () => ({
  callService: vi.fn(() => Promise.resolve()),
  sendMessage: vi.fn(() => Promise.resolve()),
}));

import { callService } from '../../ha/services';

const callServiceMock = vi.mocked(callService);

const item: TileConfig = { type: 'alarm', id: 'alarm.x', position: [0, 0] };

function setup(state: string, code_format?: string) {
  createAppStore({ serverUrl: 'http://h', pages: [] });
  getAppStore().setEntities([
    {
      entity_id: 'alarm.x',
      state,
      attributes: code_format ? { code_format } : {},
    },
  ]);
  getAppStore().openAlarm(item);
}

beforeEach(() => {
  vi.clearAllMocks();
});

function digitButton(container: HTMLElement, digit: string): HTMLElement {
  const buttons = Array.from(container.querySelectorAll('.alarm-popup-button'));
  return buttons.find((b) => b.textContent === digit) as HTMLElement;
}

describe('AlarmPopup', () => {
  it('keypad builds alarmCode and disarm sends code when code_format present', () => {
    setup('armed_away', 'number');
    const { container } = render(<AlarmPopup />);

    fireEvent.click(digitButton(container, '1'));
    fireEvent.click(digitButton(container, '2'));
    fireEvent.click(digitButton(container, '3'));
    expect(container.querySelector('.alarm-popup-input-code')?.textContent).toBe('•••');

    fireEvent.click(container.querySelector('.alarm-popup-button.-icon.-disarm')!);
    expect(callServiceMock).toHaveBeenCalledWith('alarm_control_panel', 'alarm_disarm', {
      entity_id: 'alarm.x',
      code: '123',
    });
  });

  it('does not include code when no code_format', () => {
    setup('armed_home');
    const { container } = render(<AlarmPopup />);
    fireEvent.click(container.querySelector('.alarm-popup-button.-icon.-disarm')!);
    expect(callServiceMock).toHaveBeenCalledWith('alarm_control_panel', 'alarm_disarm', {
      entity_id: 'alarm.x',
    });
  });

  it('shows arm buttons only when disarmed', () => {
    setup('disarmed');
    const { container } = render(<AlarmPopup />);
    expect(container.querySelector('.alarm-popup-button.-icon.-home')).toBeTruthy();
    expect(container.querySelector('.alarm-popup-button.-icon.-away')).toBeTruthy();
    expect(container.querySelector('.alarm-popup-button.-icon.-night')).toBeTruthy();
    expect(container.querySelector('.alarm-popup-button.-icon.-disarm')).toBeNull();
  });

  it('shows disarm button when armed', () => {
    setup('armed_home');
    const { container } = render(<AlarmPopup />);
    expect(container.querySelector('.alarm-popup-button.-icon.-home')).toBeNull();
    expect(container.querySelector('.alarm-popup-button.-icon.-disarm')).toBeTruthy();
  });
});