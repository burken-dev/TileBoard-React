# CustomTile Safety and Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform `CustomTile` from using raw `dangerouslySetInnerHTML` into using a safe, sanitized HTML-to-React Virtual DOM parser with element caching and fine-grained entity dependency tracking for high resource efficiency and native UI state preservation.

**Architecture:** A lightweight HTML-to-React element tree parser (`src/utils/htmlParser.ts`) sanitizes markup and builds `React.ReactNode` trees cached by string in an LRU/Map. `CustomTile` uses targeted entity subscriptions (`useEntitiesSelector`) and a custom equality shield (`memo(CustomTile, areEqual)`) so unrelated Home Assistant WebSocket updates never trigger re-renders or HTML re-evaluation.

**Tech Stack:** React 18, TypeScript, Vitest, Testing Library, Zustand.

## Global Constraints

- No external npm package installations needed (browser-native `DOMParser` for clean, zero-dependency HTML-to-React parsing and sanitization).
- Full backward compatibility with existing `customHtml` configurations in `config.js`.
- All changes must pass `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`.

---

### Task 1: Safe HTML-to-React Parser and Sanitizer

**Files:**
- Create: `src/utils/htmlParser.ts`
- Create: `src/utils/htmlParser.test.ts`

**Interfaces:**
- Produces: `export function parseHtmlToReact(html: string): React.ReactNode`
- Produces: `export function clearHtmlCache(): void`

- [ ] **Step 1: Write the failing unit tests for HTML parser and sanitizer**

Create `src/utils/htmlParser.test.ts`:
```typescript
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
    const html = '<div style="color: rgb(0, 121, 107); margin-bottom: 20px;">Price</div>';
    const reactNode = parseHtmlToReact(html);
    const { container } = render(React.createElement('div', null, reactNode));

    const el = container.querySelector('div > div') as HTMLElement;
    expect(el.style.color).toBe('rgb(0, 121, 107)');
    expect(el.style.marginBottom).toBe('20px');
  });

  it('sanitizes dangerous tags such as script, iframe, and object', () => {
    const html = '<div>Safe Content<script>alert("hack")</script><iframe src="evil.com"></iframe></div>';
    const reactNode = parseHtmlToReact(html);
    const { container } = render(React.createElement('div', null, reactNode));

    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('iframe')).toBeNull();
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

  it('sanitizes javascript: URLs in href and src attributes', () => {
    const html = '<a href="javascript:alert(1)">Link</a><img src="javascript:evil()" alt="img"/>';
    const reactNode = parseHtmlToReact(html);
    const { container } = render(React.createElement('div', null, reactNode));

    const a = container.querySelector('a');
    expect(a?.getAttribute('href')).toBeNull();
    const img = container.querySelector('img');
    expect(img?.getAttribute('src')).toBeNull();
  });

  it('returns cached React element on repeated calls with identical HTML', () => {
    const html = '<div class="cached-test">Cache Me</div>';
    const node1 = parseHtmlToReact(html);
    const node2 = parseHtmlToReact(html);
    expect(node1).toBe(node2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test src/utils/htmlParser.test.ts`
Expected: FAIL with module `htmlParser` not found.

- [ ] **Step 3: Implement `src/utils/htmlParser.ts`**

Create `src/utils/htmlParser.ts`:
```typescript
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

const DANGEROUS_PROTOCOLS = /^(javascript|vbscript|data:(?!image\/)):/i;

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
    const prop = rawProp.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test src/utils/htmlParser.test.ts`
Expected: PASS (all 6 tests passing).

- [ ] **Step 5: Commit Task 1**

```bash
git add src/utils/htmlParser.ts src/utils/htmlParser.test.ts
git commit -m "Add safe HTML to React Virtual DOM parser and sanitizer with caching"
```

---

### Task 2: Fine-Grained Entity Selector in Store

**Files:**
- Modify: `src/store/index.ts`
- Modify: `src/store/store.test.ts`

**Interfaces:**
- Produces: `export function useEntitiesSelector(entityIds: string[]): EntityStates`

- [ ] **Step 1: Write test for fine-grained entity selector**

Update `src/store/store.test.ts` with tests for `useEntitiesSelector`:
```typescript
it('useEntitiesSelector returns stable reference when unrelated entities update', () => {
  // Test that updating entity_b does not change snapshot of [entity_a]
});
```

- [ ] **Step 2: Implement `useEntitiesSelector` in `src/store/index.ts`**

Add in `src/store/index.ts`:
```typescript
export function useEntitiesSelector(ids: string[]): EntityStates {
  const idsRef = useRef(ids);
  idsRef.current = ids;
  const prevSnapshotRef = useRef<EntityStates>({});

  const subscribe = useCallback((onStoreChange: () => void): (() => void) => {
    if (!appStore) throw new Error('createAppStore() must be called before useAppStore()');
    return appStore.subscribe((state, prev) => {
      let changed = false;
      for (const id of idsRef.current) {
        if (state.entities[id] !== prev.entities[id]) {
          changed = true;
          break;
        }
      }
      if (changed) {
        onStoreChange();
      }
    });
  }, []);

  const getSnapshot = useCallback((): EntityStates => {
    if (!appStore) throw new Error('createAppStore() must be called before useAppStore()');
    const allEntities = appStore.getState().entities;
    const prev = prevSnapshotRef.current;
    let changed = false;
    const next: EntityStates = {};

    for (const id of idsRef.current) {
      next[id] = allEntities[id];
      if (next[id] !== prev[id]) {
        changed = true;
      }
    }

    if (changed || Object.keys(prev).length !== idsRef.current.length) {
      prevSnapshotRef.current = next;
      return next;
    }
    return prev;
  }, []);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
```

- [ ] **Step 3: Run store tests to verify they pass**

Run: `npm run test src/store/store.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit Task 2**

```bash
git add src/store/index.ts src/store/store.test.ts
git commit -m "Add fine-grained useEntitiesSelector hook for targeted entity subscriptions"
```

---

### Task 3: Overhaul CustomTile Component

**Files:**
- Modify: `src/config/types.ts`
- Modify: `src/components/tiles/CustomTile.tsx`
- Modify: `src/components/tiles/CustomTile.test.tsx`

**Interfaces:**
- Consumes: `parseHtmlToReact` from `src/utils/htmlParser`
- Consumes: `useEntitiesSelector` from `src/store`
- Produces: `export const CustomTile = memo(CustomTileComponent, areEqual)`

- [ ] **Step 1: Update TileConfig type in `src/config/types.ts`**

Add `entities?: string[];` to `TileConfig`:
```typescript
export interface TileConfig {
  type?: string;
  id?: string | HaEntity;
  entities?: string[];
  ...
}
```

- [ ] **Step 2: Update `src/components/tiles/CustomTile.tsx`**

Replace `dangerouslySetInnerHTML` with `parseHtmlToReact` and wire `useEntitiesSelector`:
```typescript
import { memo, useMemo } from 'react';
import type { HaEntity, TileConfig } from '../../config/types';
import { useEntitiesSelector } from '../../store';
import { parseFieldValue } from '../../utils/fields';
import { parseHtmlToReact } from '../../utils/htmlParser';
import { IconTile } from './IconTile';

interface CustomTileProps {
  item: TileConfig;
  entity: HaEntity;
}

function getDependencyIds(item: TileConfig): string[] {
  if (Array.isArray(item.entities) && item.entities.length > 0) {
    return item.entities;
  }
  return item.id && typeof item.id === 'string' ? [item.id] : [];
}

function areEqual(prev: CustomTileProps, next: CustomTileProps): boolean {
  if (prev.item.id !== next.item.id) return false;
  if (prev.item.customHtml !== next.item.customHtml) return false;
  if (prev.item.customStyles !== next.item.customStyles) return false;
  if (prev.entity?.state !== next.entity?.state) return false;
  if (prev.entity?.last_updated !== next.entity?.last_updated) return false;
  return true;
}

export const CustomTile = memo(function CustomTile({
  item,
  entity,
}: CustomTileProps) {
  const depIds = useMemo(() => getDependencyIds(item), [item]);
  const states = useEntitiesSelector(depIds);

  if (item.customHtml) {
    const rawHtml = parseFieldValue(item.customHtml, states, item, entity);
    const content = parseHtmlToReact(typeof rawHtml === 'string' ? rawHtml : '');

    return (
      <div className="item-entity-container">
        {content}
      </div>
    );
  }
  return <IconTile item={item} entity={entity} />;
}, areEqual);
```

- [ ] **Step 3: Update `src/components/tiles/CustomTile.test.tsx`**

Write comprehensive tests verifying:
- Custom HTML renders safely as React Virtual DOM nodes.
- No `dangerouslySetInnerHTML` is used.
- Updating an unrelated entity does NOT trigger re-rendering.
- Updating a declared dependency entity (`item.entities`) DOES trigger re-render.
- Child element scroll states are preserved naturally by Virtual DOM reconciliation.

- [ ] **Step 4: Run CustomTile tests**

Run: `npm run test src/components/tiles/CustomTile.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit Task 3**

```bash
git add src/config/types.ts src/components/tiles/CustomTile.tsx src/components/tiles/CustomTile.test.tsx
git commit -m "Refactor CustomTile to use safe HTML-to-React parser and fine-grained entity selector"
```

---

### Task 4: Full Verification and PR Update

**Files:**
- Modify: All relevant tests

- [ ] **Step 1: Run full verification suite**

Run:
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

- [ ] **Step 2: Push changes and update PR #36**

Run:
```bash
git push origin fix/scrollable-tiles-pan-gesture
```
