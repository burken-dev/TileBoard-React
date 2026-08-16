import { describe, expect, it } from 'vitest';
import { cssStyles } from './styles';

describe('cssStyles', () => {
  it('converts kebab-case keys to camelCase and preserves custom properties', () => {
    const out = cssStyles({ 'background-color': '#fff', 'font-size': '12px', '--x': '1', color: 'red' });
    expect(out).toEqual({ backgroundColor: '#fff', fontSize: '12px', '--x': '1', color: 'red' });
  });
});