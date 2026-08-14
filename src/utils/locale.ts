import { sv } from 'date-fns/locale';
import type { Locale } from 'date-fns';

// ponytail: static registry; add locales here as needed (dynamic import glob is overkill)
const REGISTRY: Record<string, Locale> = {
  sv,
};

export function getDateLocale(locale?: string): Locale | undefined {
  if (!locale) return undefined;
  const key = locale.toLowerCase().split('-')[0];
  return REGISTRY[key];
}
