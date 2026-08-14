import { describe, expect, it } from 'vitest';
import { validateConfig } from './schema';

const minimalValidConfig = {
  serverUrl: 'http://localhost:8123',
  pages: [
    {
      groups: [
        {
          items: [
            {
              type: 'switch' as const,
              id: 'switch.test',
              position: [0, 0],
            },
          ],
        },
      ],
    },
  ],
};

describe('validateConfig', () => {
  it('accepts minimal valid config', () => {
    const result = validateConfig(minimalValidConfig);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.serverUrl).toBe('http://localhost:8123');
      expect(result.config.pages).toHaveLength(1);
    }
  });

  it('rejects missing serverUrl', () => {
    const config: Record<string, unknown> = { ...minimalValidConfig };
    delete config.serverUrl;
    const result = validateConfig(config);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes('serverUrl'))).toBe(true);
    }
  });

  it('rejects invalid tile type', () => {
    const config = {
      ...minimalValidConfig,
      pages: [
        {
          groups: [
            {
              items: [
                {
                  type: 'bogus',
                  id: 'switch.test',
                  position: [0, 0],
                },
              ],
            },
          ],
        },
      ],
    };
    const result = validateConfig(config);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.errors.some((e) => e.includes('pages[0].groups[0].items[0].type')),
      ).toBe(true);
      expect(result.errors.some((e) => e.includes('bogus'))).toBe(true);
    }
  });

  it('accepts function values for states', () => {
    const config = {
      ...minimalValidConfig,
      pages: [
        {
          groups: [
            {
              items: [
                {
                  type: 'switch' as const,
                  id: 'switch.test',
                  position: [0, 0],
                  states: () => 'x',
                },
              ],
            },
          ],
        },
      ],
    };
    const result = validateConfig(config);
    expect(result.ok).toBe(true);
  });

  it('accepts function values for title', () => {
    const config = {
      ...minimalValidConfig,
      pages: [
        {
          groups: [
            {
              items: [
                {
                  type: 'switch' as const,
                  id: 'switch.test',
                  position: [0, 0],
                  title: () => 'Dynamic Title',
                },
              ],
            },
          ],
        },
      ],
    };
    const result = validateConfig(config);
    expect(result.ok).toBe(true);
  });

  it('rejects empty pages array', () => {
    const config = { ...minimalValidConfig, pages: [] };
    const result = validateConfig(config);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes('pages'))).toBe(true);
    }
  });

  it('rejects missing tile position', () => {
    const config = {
      ...minimalValidConfig,
      pages: [
        {
          groups: [
            {
              items: [
                {
                  type: 'switch' as const,
                  id: 'switch.test',
                },
              ],
            },
          ],
        },
      ],
    };
    const result = validateConfig(config);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes('position'))).toBe(true);
    }
  });

  it('rejects invalid position tuple', () => {
    const config = {
      ...minimalValidConfig,
      pages: [
        {
          groups: [
            {
              items: [
                {
                  type: 'switch' as const,
                  id: 'switch.test',
                  position: [0],
                },
              ],
            },
          ],
        },
      ],
    };
    const result = validateConfig(config);
    expect(result.ok).toBe(false);
  });

  it('accepts the new optional config keys', () => {
    const config = {
      ...minimalValidConfig,
      autoReloadInterval: 3600,
      scripts: ['https://cdn.example.com/lib.js'],
      locale: 'sv-se',
      screensaver: {
        timeout: 180,
        slideCacheBust: 300,
        slides: [{ bg: 'a.jpg' }],
      },
    };
    const result = validateConfig(config);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.autoReloadInterval).toBe(3600);
      expect(result.config.scripts).toEqual(['https://cdn.example.com/lib.js']);
      expect(result.config.locale).toBe('sv-se');
    }
  });

  it('accepts empty object id', () => {
    const config = {
      ...minimalValidConfig,
      pages: [
        {
          groups: [
            {
              items: [
                {
                  type: 'switch' as const,
                  id: {},
                  position: [0, 0],
                },
              ],
            },
          ],
        },
      ],
    };
    const result = validateConfig(config);
    expect(result.ok).toBe(true);
  });
});