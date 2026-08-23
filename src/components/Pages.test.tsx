import { fireEvent, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TileBoardConfig } from '../config/types';

let createAppStore: typeof import('../store').createAppStore;
let getAppStore: typeof import('../store').getAppStore;
let Pages: typeof import('./Pages').default;

beforeEach(async () => {
  vi.resetModules();
  ({ createAppStore, getAppStore } = await import('../store'));
  ({ default: Pages } = await import('./Pages'));
});

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

  it('resolves a function page background', () => {
    createAppStore({
      ...fixture,
      pages: [{ ...fixture.pages[0], bg: () => 'http://h/bg.jpg' }],
    });
    getAppStore().setEntities([
      { entity_id: 'a', state: 'off', attributes: {} },
      { entity_id: 'b', state: 'off', attributes: {} },
      { entity_id: 'c', state: 'off', attributes: {} },
    ]);
    const { container } = render(<Pages />);
    const page = container.querySelector('.page') as HTMLElement;
    expect(page.style.backgroundImage).toContain('http://h/bg.jpg');
  });

  it('resolves a function group title', () => {
    createAppStore({
      ...fixture,
      pages: [
        {
          ...fixture.pages[0],
          groups: [{ ...fixture.pages[0].groups[0], title: () => 'Fn' }],
        },
        fixture.pages[1],
      ],
    });
    getAppStore().setEntities([
      { entity_id: 'a', state: 'off', attributes: {} },
      { entity_id: 'b', state: 'off', attributes: {} },
      { entity_id: 'c', state: 'off', attributes: {} },
    ]);
    const { container } = render(<Pages />);
    expect(container.textContent).toContain('Fn');
  });

  it('renders the global header inside the pan container with the pages', () => {
    createAppStore({ ...fixture, header: { left: [{ type: 'custom_html', html: 'Hi' }] } });
    getAppStore().setEntities([
      { entity_id: 'a', state: 'off', attributes: {} },
      { entity_id: 'b', state: 'off', attributes: {} },
      { entity_id: 'c', state: 'off', attributes: {} },
    ]);
    const { container } = render(<Pages />);
    const panContainer = container.querySelector('.page-container');
    expect(panContainer?.querySelector('#pages')).not.toBeNull();
    expect(panContainer?.querySelector('.header')?.textContent).toContain('Hi');
  });

  it('does not pan page when dragging inside a scrollable tile container', () => {
    createAppStore({
      ...fixture,
      pages: [
        {
          title: 'P1',
          groups: [
            {
              title: 'G1',
              items: [
                {
                  type: 'custom',
                  id: 'a',
                  position: [0, 0],
                  customHtml: () =>
                    '<div class="electricity-longlist" style="overflow-y: auto;"><div class="item-list--item">Price</div></div>',
                },
              ],
            },
          ],
        },
        fixture.pages[1],
      ],
    });
    getAppStore().setEntities([{ entity_id: 'a', state: 'off', attributes: {} }]);
    const { container } = render(<Pages />);
    const pagesEl = container.querySelector('#pages') as HTMLElement;
    const scrollItem = container.querySelector('.item-list--item')!;

    fireEvent.pointerDown(scrollItem, { clientY: 300 });
    fireEvent.pointerMove(scrollItem, { clientY: 100 });
    // Transform should NOT be set on drag since target is in a scrollable element
    expect(pagesEl.style.transform).toBe('translate(0, 0%)');
  });
});
