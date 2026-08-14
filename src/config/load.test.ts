import { describe, expect, it, vi } from 'vitest';
import { configName, loadConfigScript } from './load';

describe('configName', () => {
  it('defaults to config', () => {
    expect(configName()).toBe('config');
  });

  it('reads the config query parameter', () => {
    window.history.replaceState(null, '', '/?config=garage');
    expect(configName()).toBe('garage');
    window.history.replaceState(null, '', '/');
  });
});

describe('loadConfigScript', () => {
  it('injects the script tag and resolves on load', async () => {
    const loadHandler: typeof document.head.appendChild = (node) => {
      node.dispatchEvent(new Event('load'));
      return node;
    };
    const appendChild = vi.fn(loadHandler);
    const spy = vi.spyOn(document.head, 'appendChild').mockImplementation(appendChild);

    await expect(loadConfigScript('garage')).resolves.toBeUndefined();
    expect(appendChild).toHaveBeenCalledOnce();
    expect(appendChild.mock.calls[0][0]).toHaveProperty('src', expect.stringMatching(/\/config\/garage\.js$/));
    spy.mockRestore();
  });

  it('rejects when the script fails to load', async () => {
    const rejectHandler: typeof document.head.appendChild = (node) => {
      node.dispatchEvent(new Event('error'));
      return node;
    };
    const spy = vi.spyOn(document.head, 'appendChild').mockImplementation(rejectHandler);

    await expect(loadConfigScript('missing')).rejects.toThrow('missing.js not found');
    spy.mockRestore();
  });
});