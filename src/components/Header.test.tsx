import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Header from './Header';
import { createAppStore } from '../store';
import type { TileBoardConfig } from '../config/types';

const config: TileBoardConfig = {
  serverUrl: 'http://h',
  timeFormat: 12,
  pages: [{ groups: [] }],
};

describe('Header', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T14:05:00'));
    createAppStore(config);
  });

  it('renders datetime clock with AM/PM postfix', () => {
    const { container } = render(<Header header={{ left: [{ type: 'datetime' }] }} />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    const h = container.querySelector('.clock--h');
    const postfix = container.querySelector('.clock--postfix');
    const colon = container.querySelector('.clock--colon');
    const m = container.querySelector('.clock--m');
    expect(h?.textContent).toBe('2');
    expect(postfix?.textContent).toBe('PM');
    expect(colon?.textContent).toBe(':');
    expect(m?.textContent).toBe('05');
    expect(container.querySelector('.header-item .clock')?.contains(h as Node)).toBe(true);
  });

  it('renders custom_html item', () => {
    const { container } = render(
      <Header header={{ right: [{ type: 'custom_html', html: '<b>Hi</b>' }] }} />,
    );
    expect(container.querySelector('.header-item.-custom_html')?.innerHTML).toContain('<b>Hi</b>');
  });

  it('skips hidden items', () => {
    const { container } = render(
      <Header
        header={{
          right: [
            { type: 'custom_html', html: '<b>Hi</b>' },
            { type: 'custom_html', html: '<i>hidden</i>', hidden: true },
          ],
        }}
      />,
    );
    expect(container.querySelectorAll('.header-item')).toHaveLength(1);
    expect(container.innerHTML).not.toContain('hidden');
  });
});