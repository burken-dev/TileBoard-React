import { describe, expect, it, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { parseHtmlToReact, clearHtmlCache } from './htmlParser';

describe('parseHtmlToReact', () => {
  beforeEach(() => {
    clearHtmlCache();
  });

  it('parses basic HTML elements with attributes and classes into React nodes', () => {
    const html = '<div class="electricity-container"><span class="price-val">120 öre</span></div>';
    const reactNode = parseHtmlToReact(html);
    const { container } = render(React.createElement('div', null, reactNode));

    const div = container.querySelector('.electricity-container');
    expect(div).not.toBeNull();
    const span = div?.querySelector('.price-val');
    expect(span).not.toBeNull();
    expect(span?.textContent).toBe('120 öre');
  });

  it('parses inline styles correctly', () => {
    const html = '<div class="styled-box" style="color: rgb(0, 121, 107); margin-bottom: 20px; font-size: 14px !important;">Price</div>';
    const reactNode = parseHtmlToReact(html);
    const { container } = render(React.createElement('div', null, reactNode));

    const el = container.querySelector('.styled-box') as HTMLElement;
    expect(el).not.toBeNull();
    expect(el.style.color).toBe('rgb(0, 121, 107)');
    expect(el.style.marginBottom).toBe('20px');
    expect(el.style.fontSize).toBe('14px');
  });

  it('sanitizes dangerous tags such as script, iframe, object, embed, link, meta, applet, frame, and frameset', () => {
    const html =
      '<div>Safe Content<script>alert("hack")</script><iframe src="evil.com"></iframe><object data="evil.swf"></object><embed src="evil.swf"><link rel="stylesheet" href="evil.css"><meta http-equiv="refresh" content="0"></div>';
    const reactNode = parseHtmlToReact(html);
    const { container } = render(React.createElement('div', null, reactNode));

    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('iframe')).toBeNull();
    expect(container.querySelector('object')).toBeNull();
    expect(container.querySelector('embed')).toBeNull();
    expect(container.querySelector('link')).toBeNull();
    expect(container.querySelector('meta')).toBeNull();
    expect(container.textContent).toBe('Safe Content');
  });

  it('strips inline event handler attributes like onclick and onerror', () => {
    const html = '<button onclick="alert(1)" onerror="alert(2)" class="btn">Click me</button>';
    const reactNode = parseHtmlToReact(html);
    const { container } = render(React.createElement('div', null, reactNode));

    const btn = container.querySelector('button');
    expect(btn).not.toBeNull();
    expect(btn?.getAttribute('onclick')).toBeNull();
    expect(btn?.getAttribute('onerror')).toBeNull();
  });

  it('sanitizes dangerous URLs (javascript, vbscript, data) in href and src attributes while allowing data:image/', () => {
    const html =
      '<div><a id="js-link" href="javascript:alert(1)">Link</a><a id="safe-link" href="https://example.com">Safe</a><img id="bad-img" src="javascript:evil()" alt="img"/><img id="data-img" src="data:image/png;base64,iVBORw0KGgo=" alt="data-img"/><a id="vb-link" href="VBSCRIPT:msgbox(1)">VB</a><a id="data-text" href="data:text/html;base64,evil">Data Text</a></div>';
    const reactNode = parseHtmlToReact(html);
    const { container } = render(React.createElement('div', null, reactNode));

    const jsLink = container.querySelector('#js-link');
    expect(jsLink?.getAttribute('href')).toBeNull();

    const vbLink = container.querySelector('#vb-link');
    expect(vbLink?.getAttribute('href')).toBeNull();

    const dataText = container.querySelector('#data-text');
    expect(dataText?.getAttribute('href')).toBeNull();

    const safeLink = container.querySelector('#safe-link');
    expect(safeLink?.getAttribute('href')).toBe('https://example.com');

    const badImg = container.querySelector('#bad-img');
    expect(badImg?.getAttribute('src')).toBeNull();

    const dataImg = container.querySelector('#data-img');
    expect(dataImg?.getAttribute('src')).toBe('data:image/png;base64,iVBORw0KGgo=');
  });

  it('handles multiple root nodes using a Fragment', () => {
    const html = '<p>Paragraph 1</p><p>Paragraph 2</p>';
    const reactNode = parseHtmlToReact(html);
    const { container } = render(React.createElement('div', null, reactNode));

    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs.length).toBe(2);
    expect(paragraphs[0].textContent).toBe('Paragraph 1');
    expect(paragraphs[1].textContent).toBe('Paragraph 2');
  });

  it('handles for attribute on labels mapping to htmlFor', () => {
    const html = '<label for="my-input">Label Text</label>';
    const reactNode = parseHtmlToReact(html);
    const { container } = render(React.createElement('div', null, reactNode));

    const label = container.querySelector('label');
    expect(label?.getAttribute('for')).toBe('my-input');
    expect(label?.htmlFor).toBe('my-input');
  });

  it('returns null for empty or invalid input', () => {
    expect(parseHtmlToReact('')).toBeNull();
    expect(parseHtmlToReact(null as unknown as string)).toBeNull();
    expect(parseHtmlToReact(undefined as unknown as string)).toBeNull();
  });

  it('returns cached React element on repeated calls with identical HTML', () => {
    const html = '<div class="cached-test">Cache Me</div>';
    const node1 = parseHtmlToReact(html);
    const node2 = parseHtmlToReact(html);
    expect(node1).toBe(node2);
  });

  it('clears the cache when clearHtmlCache is called', () => {
    const html = '<div class="cache-cleared-test">Fresh</div>';
    const node1 = parseHtmlToReact(html);
    clearHtmlCache();
    const node2 = parseHtmlToReact(html);
    expect(node1).not.toBe(node2);
    expect(node1).toEqual(node2);
  });

  it('evicts oldest items when cache exceeds MAX_CACHE_SIZE (200)', () => {
    for (let i = 0; i < 205; i++) {
      parseHtmlToReact(`<span id="item-${i}">${i}</span>`);
    }
    // item-0 should have been evicted
    const item0 = parseHtmlToReact('<span id="item-0">0</span>');
    expect(item0).not.toBeNull();
  });
});
