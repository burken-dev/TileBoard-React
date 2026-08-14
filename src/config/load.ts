import { applyDefaults } from './defaults';
import { validateConfig } from './schema';
import type { ConfigResult } from './schema';

export function loadConfig(): ConfigResult {
  const raw = window.CONFIG;
  if (raw === undefined || raw === null) {
    return {
      ok: false,
      errors: [
        'config/config.js is missing or did not set window.CONFIG. Copy public/config/config.example.js to config.js.',
      ],
    };
  }
  const result = validateConfig(raw);
  if (!result.ok) {
    return result;
  }
  return { ok: true, config: applyDefaults(result.config) };
}