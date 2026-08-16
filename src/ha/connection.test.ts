import { describe, expect, it } from 'vitest';
import { cleanAuthCallbackUrl, matchEvent } from './connection';
import type { EventConfig } from '../config/types';

const events: EventConfig[] = [
  {
    command: 'x',
    action: () => {},
  },
  {
    command: 'y',
    action: () => {},
  },
];

describe('matchEvent', () => {
  it('returns the matching event', () => {
    expect(matchEvent(events, { command: 'x' })).toBe(events[0]);
  });

  it('returns undefined when no match', () => {
    expect(matchEvent(events, { command: 'z' })).toBeUndefined();
  });

  it('returns undefined when events undefined', () => {
    expect(matchEvent(undefined, { command: 'x' })).toBeUndefined();
  });
});

describe('cleanAuthCallbackUrl', () => {
  it('strips auth callback params but keeps other query params', () => {
    const url =
      '/?auth_callback=1&code=f4b47f6f&state=eyJ&config=garage';
    expect(cleanAuthCallbackUrl(url)).toBe('/?config=garage');
  });

  it('returns the pathname when only auth callback params present', () => {
    expect(cleanAuthCallbackUrl('/?auth_callback=1&code=x&state=y')).toBe('/');
  });

  it('leaves the url untouched without auth_callback', () => {
    expect(cleanAuthCallbackUrl('/?config=garage')).toBe('/?config=garage');
    expect(cleanAuthCallbackUrl('/')).toBe('/');
  });
});
