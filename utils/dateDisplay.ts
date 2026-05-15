/** عرض التواريخ بالعربية مع التقويم الميلادي (غير هجري) */
const LOCALE = 'ar-SA';

const GREGORY: Pick<Intl.DateTimeFormatOptions, 'calendar'> = { calendar: 'gregory' };

/** أرقام إنجليزية (لاتينية) 0–9 بدل الأرقام العربية الهندية */
const LATN_DIGITS: Pick<Intl.DateTimeFormatOptions, 'numberingSystem'> = {
  numberingSystem: 'latn',
};

function toDate(d: Date | string | number): Date {
  return d instanceof Date ? d : new Date(d);
}

export function formatAppDate(d: Date | string | number): string {
  const x = toDate(d);
  if (Number.isNaN(x.getTime())) return '—';
  return x.toLocaleDateString(LOCALE, {
    ...GREGORY,
    ...LATN_DIGITS,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatAppDateTime(d: Date | string | number): string {
  const x = toDate(d);
  if (Number.isNaN(x.getTime())) return '—';
  return x.toLocaleString(LOCALE, {
    ...GREGORY,
    ...LATN_DIGITS,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

/** مثل السابق في المشاكل العامة: يوم قصير + تاريخ + وقت */
export function formatAppDateShort(iso: string | undefined | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(LOCALE, {
    ...GREGORY,
    ...LATN_DIGITS,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatAppWeekdayShort(d: Date | string | number): string {
  const x = toDate(d);
  if (Number.isNaN(x.getTime())) return '—';
  return x.toLocaleDateString(LOCALE, { ...GREGORY, ...LATN_DIGITS, weekday: 'short' });
}

export function formatAppMonthDay(d: Date | string | number): string {
  const x = toDate(d);
  if (Number.isNaN(x.getTime())) return '—';
  return x.toLocaleDateString(LOCALE, { ...GREGORY, ...LATN_DIGITS, month: 'short', day: 'numeric' });
}

export function formatAppWeekdayFullDate(d: Date | string | number): string {
  const x = toDate(d);
  if (Number.isNaN(x.getTime())) return '—';
  return x.toLocaleDateString(LOCALE, {
    ...GREGORY,
    ...LATN_DIGITS,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatAppTime(d: Date | string | number): string {
  const x = toDate(d);
  if (Number.isNaN(x.getTime())) return '—';
  return x.toLocaleTimeString(LOCALE, { ...GREGORY, ...LATN_DIGITS, hour: '2-digit', minute: '2-digit' });
}
