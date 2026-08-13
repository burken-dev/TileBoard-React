import type { HaEntity } from '../config/types';

export function datetimePlaceholder(entity: HaEntity): string {
  return (
    (entity.attributes?.has_date ? 'YYYY-MM-DD' : '') +
    (entity.attributes?.has_time ? ' hh:mm' : '')
  );
}

export function interleaveDigits(
  placeholder: string,
  digits: string,
): { filled: string; remaining: string } {
  let i = 0;
  let filled = '';
  for (const ch of placeholder) {
    if (i >= digits.length) break;
    if (/\W/.test(ch)) filled += ch;
    else filled += digits[i++];
  }
  return { filled, remaining: placeholder.slice(filled.length) };
}

export function datetimeValid(placeholder: string, digits: string): boolean {
  return digits.length === placeholder.replace(/\W/gi, '').length;
}

export function buildDatetimePayload(
  entity: HaEntity,
  formatted: string,
): { date?: string; time?: string } {
  const parts = formatted.split(' ');
  const payload: { date?: string; time?: string } = {};
  if (entity.attributes?.has_date) payload.date = parts[0];
  if (entity.attributes?.has_time) payload.time = parts[1] ?? parts[0];
  return payload;
}