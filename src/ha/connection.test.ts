import { describe, expect, it } from 'vitest';
import { matchEvent } from './connection';
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