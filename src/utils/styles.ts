import type { CSSProperties } from 'react';

export function cssStyles(styles: Record<string, unknown>): CSSProperties {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(styles)) {
    out[cssPropertyName(key)] = styles[key];
  }
  return out as CSSProperties;
}

function cssPropertyName(key: string): string {
  if (key.startsWith('--')) return key;
  return key.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());
}