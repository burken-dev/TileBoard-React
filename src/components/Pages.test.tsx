import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Pages from './Pages';
import { createAppStore, getAppStore } from '../store';
import type { TileBoardConfig } from '../config/types';

const fixture: TileBoardConfig = {
  serverUrl: 'http://h',
  pages: [
    {
      title: 'P1',
      groups: [
        {
          title: 'G1',
          items: [
            { type: 'switch', id: 'a', position: [0, 0] },
            { type: 'switch', id: 'b', position: [0, 1] },
          ],
        },
      ],
    },
    {
      title: 'P2',
      groups: [
        {
          items: [{ type: 'switch', id: 'c', position: [0, 0] }],
        },
      ],
    },
  ],
};

function setup() {
  createAppStore(fixture);
  getAppStore().setEntities([
    { entity_id: 'a', state: 'off', attributes: {} },
    { entity_id: 'b', state: 'off', attributes: {} },
    { entity_id: 'c', state: 'off', attributes: {} },
  ]);
}

describe('Pages', () => {
  it('renders groups, items and group titles', () => {
    setup();
    const { container } = render(<Pages />);
    expect(container.querySelectorAll('.group')).toHaveLength(2);
    expect(container.querySelectorAll('.item')).toHaveLength(3);
    expect(container.textContent).toContain('G1');
  });

  it('menu switches active page', () => {
    setup();
    const { container } = render(<Pages />);
    const items = container.querySelectorAll('.pages-menu--item');
    expect(items).toHaveLength(2);
    fireEvent.click(items[1]);
    expect(items[1].className).toContain('-active');
    expect(items[0].className).not.toContain('-active');
  });
});