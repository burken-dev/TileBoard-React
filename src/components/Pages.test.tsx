import { fireEvent, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TileBoardConfig } from '../config/types';

vi.mock('../ha/services', () => ({
  callService: vi.fn(() => Promise.resolve()),
  sendMessage: vi.fn(() => Promise.resolve()),
}));

import { callService } from '../ha/services';

const callServiceMock = vi.mocked(callService);

let createAppStore: typeof import('../store').createAppStore;
let getAppStore: typeof import('../store').getAppStore;
let Pages: typeof import('./Pages').default;

beforeEach(async () => {
  vi.resetModules();
  callServiceMock.mockClear();
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

  it('input_select opens select overlay with page-overlay, choosing option calls service and closes', () => {
    createAppStore({
      serverUrl: 'http://h',
      pages: [
        {
          title: 'P1',
          groups: [
            {
              items: [
                { type: 'input_select', id: 'input_select.mode', position: [0, 0] },
              ],
            },
          ],
        },
      ],
    });
    getAppStore().setEntities([
      {
        entity_id: 'input_select.mode',
        state: 'Eco',
        attributes: { options: ['Eco', 'Comfort', 'Boost'] },
      },
    ]);
    const { container } = render(<Pages />);
    expect(container.querySelector('.page-overlay')).toBeNull();
    expect(container.querySelector('.item-select')).toBeNull();

    // Click tile to open select
    const tile = container.querySelector('.item')!;
    fireEvent.pointerDown(tile);
    fireEvent.pointerUp(tile);
    fireEvent.click(tile);

    expect(container.querySelector('.page-overlay')).not.toBeNull();
    const select = container.querySelector('.item-select');
    expect(select).not.toBeNull();
    const options = select!.querySelectorAll('.item-select--option');
    expect(options).toHaveLength(3);

    // Clicking an option selects it, calls service, and closes overlay
    fireEvent.click(options[1]);
    expect(callServiceMock).toHaveBeenCalledWith('input_select', 'select_option', {
      entity_id: 'input_select.mode',
      option: 'Comfort',
    });
    expect(container.querySelector('.page-overlay')).toBeNull();
    expect(container.querySelector('.item-select')).toBeNull();
  });

  it('clicking page-overlay closes active select without calling service', () => {
    createAppStore({
      serverUrl: 'http://h',
      pages: [
        {
          title: 'P1',
          groups: [
            {
              items: [
                { type: 'input_select', id: 'input_select.mode', position: [0, 0] },
              ],
            },
          ],
        },
      ],
    });
    getAppStore().setEntities([
      {
        entity_id: 'input_select.mode',
        state: 'Eco',
        attributes: { options: ['Eco', 'Comfort', 'Boost'] },
      },
    ]);
    const { container } = render(<Pages />);

    const tile = container.querySelector('.item')!;
    fireEvent.pointerDown(tile);
    fireEvent.pointerUp(tile);
    fireEvent.click(tile);

    const overlay = container.querySelector('.page-overlay')!;
    expect(overlay).not.toBeNull();

    fireEvent.click(overlay);
    expect(callServiceMock).not.toHaveBeenCalled();
    expect(container.querySelector('.page-overlay')).toBeNull();
    expect(container.querySelector('.item-select')).toBeNull();
  });

  it('applies no transform in fixed mode', () => {
    setup();
    const { container } = render(<Pages />);
    expect((container.querySelector('.page') as HTMLElement).style.transform).toBe('');
  });

  it('renders all tiles in scale mode without crashing', () => {
    createAppStore({ ...fixture, displayMode: 'scale' });
    getAppStore().setEntities([
      { entity_id: 'a', state: 'off', attributes: {} },
      { entity_id: 'b', state: 'off', attributes: {} },
      { entity_id: 'c', state: 'off', attributes: {} },
    ]);
    const { container } = render(<Pages />);
    expect(container.querySelectorAll('.item')).toHaveLength(3);
  });

  it('wraps page content in an inner scaler so the viewport never scales', () => {
    setup();
    const { container } = render(<Pages />);
    const page = container.querySelector('.page') as HTMLElement;
    const scaler = page.querySelector(':scope > .page-scale') as HTMLElement;
    expect(scaler).not.toBeNull();
    expect(scaler.querySelectorAll('.group').length).toBeGreaterThan(0);
  });

  it('renders the page header inside the scaler so it scales with the tiles', () => {
    createAppStore({
      ...fixture,
      pages: [{ ...fixture.pages[0], header: { left: [{ type: 'custom_html', html: 'Hi' }] } }],
    });
    getAppStore().setEntities([
      { entity_id: 'a', state: 'off', attributes: {} },
      { entity_id: 'b', state: 'off', attributes: {} },
      { entity_id: 'c', state: 'off', attributes: {} },
    ]);
    const { container } = render(<Pages />);
    const scaler = container.querySelector('.page > .page-scale') as HTMLElement;
    expect(scaler).not.toBeNull();
    expect(scaler.querySelector('.header')?.textContent).toContain('Hi');
  });
});
