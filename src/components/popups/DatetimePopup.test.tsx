import { fireEvent, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TileConfig } from '../../config/types';
import { createAppStore, getAppStore } from '../../store';
import DatetimePopup from './DatetimePopup';

vi.mock('../../ha/services', () => ({
  callService: vi.fn(() => Promise.resolve()),
  sendMessage: vi.fn(() => Promise.resolve()),
}));

import { callService } from '../../ha/services';

const callServiceMock = vi.mocked(callService);

const item: TileConfig = { type: 'input_datetime', id: 'input_datetime.x', position: [0, 0] };

function setup() {
  createAppStore({ serverUrl: 'http://h', pages: [] });
  getAppStore().setEntities([
    {
      entity_id: 'input_datetime.x',
      state: '2026-08-13 10:30',
      attributes: { has_date: true, has_time: true },
    },
  ]);
  getAppStore().openDatetime(item);
}

function clickDigit(container: HTMLElement, digit: string) {
  const buttons = container.querySelectorAll('.datetime-popup-button');
  for (const b of Array.from(buttons)) {
    if (b.textContent === digit) {
      fireEvent.click(b);
      return;
    }
  }
  throw new Error('digit button not found: ' + digit);
}

beforeEach(() => callServiceMock.mockClear());

describe('DatetimePopup', () => {
  it('prefills today date digits', () => {
    setup();
    const { container } = render(<DatetimePopup />);
    const filled = container.querySelector('.datetime-popup-input--filled')?.textContent ?? '';
    expect(filled).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('check disabled until fully typed, then sends payload', () => {
    setup();
    const { container } = render(<DatetimePopup />);
    const check = container.querySelector('.datetime-popup-button.-success')!;
    expect(check.className).toContain('-disabled');

    clickDigit(container, '1');
    clickDigit(container, '0');
    clickDigit(container, '3');
    clickDigit(container, '0');

    expect(check.className).not.toContain('-disabled');
    fireEvent.click(check);

    const [domain, service, data] = callServiceMock.mock.calls[0] ?? [];
    expect(domain).toBe('input_datetime');
    expect(service).toBe('set_datetime');
    expect(data?.entity_id).toBe('input_datetime.x');
    expect(data?.time).toBe('10:30');
    expect(data?.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});