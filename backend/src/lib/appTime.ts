export const APP_TIMEZONE = 'America/Sao_Paulo';
export const APP_OFFSET = '-03:00';

const HAS_OFFSET = /(?:Z|[+-]\d{2}:\d{2})$/i;

function pad(value: number) {
  return String(value).padStart(2, '0');
}

export function parseAppDateTime(value: string): Date {
  if (HAS_OFFSET.test(value)) return new Date(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00${APP_OFFSET}`);
  }
  const withSeconds = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) ? `${value}:00` : value;
  return new Date(`${withSeconds}${APP_OFFSET}`);
}

export function appNowParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);

  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour'),
    minute: read('minute'),
  };
}

export function monthStart(year: number, month: number) {
  return new Date(`${year}-${pad(month)}-01T00:00:00${APP_OFFSET}`);
}
