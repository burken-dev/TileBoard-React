import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { cssStyles } from './styles';

describe('cssStyles', () => {
  it('converts kebab-case keys to camelCase and preserves custom properties', () => {
    const out = cssStyles({ 'background-color': '#fff', 'font-size': '12px', '--x': '1', color: 'red' });
    expect(out).toEqual({ backgroundColor: '#fff', fontSize: '12px', '--x': '1', color: 'red' });
  });

  it('ensures .page does not use content-visibility to prevent stacking context traps', () => {
    const mainLess = fs.readFileSync(path.resolve(__dirname, '../../styles/main.less'), 'utf8');
    // .page must not contain content-visibility which creates an isolated stacking context
    // and traps .item.-top-entity / .item-select beneath .page-overlay
    expect(mainLess).not.toMatch(/\.page\s*\{[^}]*content-visibility/);
  });
});