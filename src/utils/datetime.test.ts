import { describe, expect, it } from 'vitest';
import type { HaEntity } from '../config/types';
import {
  buildDatetimePayload,
  datetimePlaceholder,
  datetimeValid,
  interleaveDigits,
} from './datetime';

const dt: HaEntity = {
  entity_id: 'input_datetime.x',
  state: '2026-08-13 10:30',
  attributes: { has_date: true, has_time: true },
};

describe('datetimePlaceholder', () => {
  it('date + time', () => {
    expect(datetimePlaceholder(dt)).toBe('YYYY-MM-DD hh:mm');
  });

  it('date only', () => {
    expect(datetimePlaceholder({ ...dt, attributes: { has_date: true } })).toBe('YYYY-MM-DD');
  });

  it('time only (leading space)', () => {
    expect(datetimePlaceholder({ ...dt, attributes: { has_time: true } })).toBe(' hh:mm');
  });
});

describe('interleaveDigits', () => {
  it('fills 12 digits into placeholder', () => {
    const res = interleaveDigits('YYYY-MM-DD hh:mm', '202608131030');
    expect(res.filled).toBe('2026-08-13 10:30');
    expect(res.remaining).toBe('');
  });

  it('leaves remaining suffix for short input', () => {
    const res = interleaveDigits('YYYY-MM-DD hh:mm', '2026');
    expect(res.filled).toBe('2026');
    expect(res.remaining).toBe('-MM-DD hh:mm');
  });
});

describe('datetimeValid', () => {
  it('valid when digits fill all word slots', () => {
    expect(datetimeValid('YYYY-MM-DD hh:mm', '202608131030')).toBe(true);
  });

  it('invalid when short', () => {
    expect(datetimeValid('YYYY-MM-DD hh:mm', '2026')).toBe(false);
  });
});

describe('buildDatetimePayload', () => {
  it('splits date and time', () => {
    expect(buildDatetimePayload(dt, '2026-08-13 10:30')).toEqual({
      date: '2026-08-13',
      time: '10:30',
    });
  });

  it('time only', () => {
    expect(buildDatetimePayload({ ...dt, attributes: { has_time: true } }, '10:30')).toEqual({
      time: '10:30',
    });
  });
});