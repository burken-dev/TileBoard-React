import React from 'react';

const DANGEROUS_TAGS = new Set([
  'SCRIPT',
  'IFRAME',
  'OBJECT',
  'EMBED',
  'LINK',
  'META',
  'APPLET',
  'FRAME',
  'FRAMESET',
]);

const DANGEROUS_PROTOCOLS = /^(?:javascript:|vbscript:|data:(?!image\/))/i;

const htmlCache = new Map<string, React.ReactNode>();
const MAX_CACHE_SIZE = 200;

function parseStyleString(styleStr: string): React.CSSProperties {
  const styles: Record<string, string> = {};
  const rules = styleStr.split(';');
  for (const rule of rules) {
    const colonIndex = rule.indexOf(':');
    if (colonIndex === -1) continue;
    const rawProp = rule.slice(0, colonIndex).trim();
    const rawVal = rule.slice(colonIndex + 1).replace(/!important/g, '').trim();
    if (!rawProp || !rawVal) continue;
    const prop = rawProp.startsWith('--')
      ? rawProp
      : rawProp.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase());
    styles[prop] = rawVal;
  }
  return styles as React.CSSProperties;
}

function domNodeToReact(node: Node, key: number | string): React.ReactNode {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const el = node as HTMLElement;
  const tagName = el.tagName.toUpperCase();

  if (DANGEROUS_TAGS.has(tagName)) {
    return null;
  }

  const props: Record<string, unknown> = { key };

  for (let i = 0; i < el.attributes.length; i++) {
    const attr = el.attributes[i];
    const name = attr.name.toLowerCase();
    const value = attr.value;

    if (name.startsWith('on')) {
      continue;
    }

    if (name === 'href' || name === 'src' || name === 'action' || name === 'formaction') {
      if (DANGEROUS_PROTOCOLS.test(value.trim())) {
        continue;
      }
    }

    if (name === 'class') {
      props.className = value;
    } else if (name === 'style') {
      props.style = parseStyleString(value);
    } else if (name === 'for') {
      props.htmlFor = value;
    } else {
      props[name] = value;
    }
  }

  const children: React.ReactNode[] = [];
  for (let i = 0; i < el.childNodes.length; i++) {
    const childReactNode = domNodeToReact(el.childNodes[i], i);
    if (childReactNode !== null) {
      children.push(childReactNode);
    }
  }

  return React.createElement(el.tagName.toLowerCase(), props, ...children);
}

export function parseHtmlToReact(html: string): React.ReactNode {
  if (!html || typeof html !== 'string') {
    return null;
  }

  const cached = htmlCache.get(html);
  if (cached !== undefined) {
    return cached;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<body>${html}</body>`, 'text/html');
    const body = doc.body;

    let result: React.ReactNode;
    if (body.childNodes.length === 1) {
      result = domNodeToReact(body.childNodes[0], 0);
    } else {
      const nodes: React.ReactNode[] = [];
      for (let i = 0; i < body.childNodes.length; i++) {
        const child = domNodeToReact(body.childNodes[i], i);
        if (child !== null) nodes.push(child);
      }
      result = React.createElement(React.Fragment, null, ...nodes);
    }

    if (htmlCache.size >= MAX_CACHE_SIZE) {
      const firstKey = htmlCache.keys().next().value;
      if (firstKey) htmlCache.delete(firstKey);
    }
    htmlCache.set(html, result);
    return result;
  } catch {
    return null;
  }
}

export function clearHtmlCache(): void {
  htmlCache.clear();
}
