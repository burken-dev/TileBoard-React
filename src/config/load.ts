import { applyDefaults } from './defaults';
import { validateConfig } from './schema';
import type { ConfigResult } from './schema';

export function configName(): string {
  return new URLSearchParams(window.location.search).get('config') ?? 'config';
}

export function loadConfigScript(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `/config/${name}.js`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`${name}.js not found`));
    document.head.appendChild(script);
  });
}

export function loadScript(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`${url} failed to load`));
    document.head.appendChild(script);
  });
}

export function loadConfig(): ConfigResult {
  const raw = window.CONFIG;
  if (raw === undefined || raw === null) {
    return {
      ok: false,
      errors: [
        `config/${configName()}.js is missing or did not set window.CONFIG. Copy public/config/config.example.js to ${configName()}.js.`,
      ],
    };
  }
  const result = validateConfig(raw);
  if (!result.ok) {
    return result;
  }
  return { ok: true, config: applyDefaults(result.config) };
}