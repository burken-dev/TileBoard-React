export function leadZero(num: number): string | number {
  if (num >= 0 && num < 10) {
    return '0' + num;
  }
  return num;
}

type TimeFormat = [number, number | string, number | string];

const TIME_FORMATS: TimeFormat[] = [
  [60, 'seconds', 1],
  [120, '1 minute ago', '1 minute from now'],
  [3600, 'minutes', 60],
  [7200, '1 hour ago', '1 hour from now'],
  [86400, 'hours', 3600],
  [172800, 'a day ago', 'Tomorrow'],
  [604800, 'days', 86400],
  [1209600, 'Last week', 'Next week'],
  [2419200, 'weeks', 604800],
  [4838400, 'a month ago', 'Next month'],
  [29030400, 'months', 2419200],
  [58060800, 'a year ago', 'Next year'],
  [2903040000, 'years', 29030400],
];

export function timeAgo(time: string | number | Date): string {
  const t = +new Date(time);

  let seconds = (+new Date() - t) / 1000;
  let token = 'ago';
  let listChoice = 1;

  if (seconds < 0) {
    seconds = Math.abs(seconds);
    token = 'from now';
    listChoice = 2;
  }

  if (seconds >= 0 && seconds < 5) {
    return 'just now';
  }

  for (let i = 0; i < TIME_FORMATS.length; i++) {
    const format = TIME_FORMATS[i];
    if (seconds < format[0]) {
      if (typeof format[2] === 'string') {
        return format[listChoice] as string;
      }
      return Math.floor(seconds / format[2]) + ' ' + format[1] + ' ' + token;
    }
  }

  return String(time);
}

export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  wait: number,
  immediate?: boolean,
): (...args: A) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: A) => {
    const callNow = immediate && !timeout;
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      timeout = null;
      if (!immediate) fn(...args);
    }, wait);
    if (callNow) fn(...args);
  };
}

export function toAbsoluteServerURL(path: string, serverUrl: string): string {
  const startsWithProtocol = path.indexOf('http') === 0;
  const url = startsWithProtocol ? path : serverUrl + '/' + path;
  return url.replace(/([^:])\/+/g, '$1/');
}

export function escapeClass(text: unknown): string {
  return text && typeof text === 'string'
    ? text.replace(/[^a-z0-9]/gi, '_').toLowerCase()
    : 'non';
}