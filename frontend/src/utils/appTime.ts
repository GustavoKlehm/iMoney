export const APP_TIMEZONE = 'America/Sao_Paulo';

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function readPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
  return Number(parts.find((part) => part.type === type)?.value);
}

export function appDateParts(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  return {
    year: readPart(parts, 'year'),
    month: readPart(parts, 'month'),
    day: readPart(parts, 'day'),
    hour: readPart(parts, 'hour'),
    minute: readPart(parts, 'minute'),
  };
}

export function toAppDateTimeLocal(value: string | Date = new Date()) {
  const { year, month, day, hour, minute } = appDateParts(value);
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`;
}

export function getAppPeriod(value: string | Date = new Date()) {
  const { year, month } = appDateParts(value);
  return { year, month };
}
