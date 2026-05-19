/** عرض التواريخ بالعربية مع التقويم الميلادي (غير هجري) */
const LOCALE = 'ar-SA';

export type AppDateLocale = 'ar' | 'en';

function intlTag(locale: AppDateLocale): string {
  return locale === 'en' ? 'en-US' : LOCALE;
}

const GREGORY: Pick<Intl.DateTimeFormatOptions, 'calendar'> = { calendar: 'gregory' };

/** أرقام إنجليزية (لاتينية) 0–9 بدل الأرقام العربية الهندية */
const LATN_DIGITS: Pick<Intl.DateTimeFormatOptions, 'numberingSystem'> = {
  numberingSystem: 'latn',
};

function toDate(d: Date | string | number): Date {
  return d instanceof Date ? d : new Date(d);
}

export function formatAppDate(
  d: Date | string | number,
  locale: AppDateLocale = 'ar',
): string {
  const x = toDate(d);
  if (Number.isNaN(x.getTime())) return '—';
  return x.toLocaleDateString(intlTag(locale), {
    ...GREGORY,
    ...LATN_DIGITS,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** تاريخ مع اسم اليوم — للمعاينة في منتقي الفترة */
export function formatAppDateWithWeekday(
  d: Date | string | number,
  locale: AppDateLocale = 'ar',
): string {
  const x = toDate(d);
  if (Number.isNaN(x.getTime())) return '—';
  return x.toLocaleDateString(intlTag(locale), {
    ...GREGORY,
    ...LATN_DIGITS,
    weekday: 'short',
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

/** مفتاح يوم تقويمي محلي YYYY-MM-DD */
export function toLocalCalendarDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** مفتاح يوم للتحليلات — نفس منطقة الخادم (Asia/Riyadh) */
export const ANALYTICS_TIMEZONE = 'Asia/Riyadh';

export function toAnalyticsDateKey(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ANALYTICS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

function tzOffsetMinutesAt(instant: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = dtf.formatToParts(instant);
  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = p.value;
  }
  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second),
  );
  return (asUtc - instant.getTime()) / 60000;
}

/** بداية/نهاية يوم تقويمي YYYY-MM-DD بتوقيت التحليلات (مطابق للخادم) */
export function calendarDayBounds(
  ymd: string,
  timeZone: string = ANALYTICS_TIMEZONE,
): { start: Date; end: Date } {
  const [y, m, d] = ymd.split('-').map(Number);
  const noonUtc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));
  const offsetMin = tzOffsetMinutesAt(noonUtc, timeZone);
  const startMs = Date.UTC(y, m - 1, d, 0, 0, 0, 0) - offsetMin * 60000;
  const endMs = Date.UTC(y, m - 1, d, 23, 59, 59, 999) - offsetMin * 60000;
  return { start: new Date(startMs), end: new Date(endMs) };
}

export function addCalendarDayYmd(ymd: string, deltaDays: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + deltaDays));
  const yy = next.getUTCFullYear();
  const mm = String(next.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(next.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

const WEEKDAY_INDEX: Record<string, number> = {
  Monday: 0,
  Tuesday: 1,
  Wednesday: 2,
  Thursday: 3,
  Friday: 4,
  Saturday: 5,
  Sunday: 6,
};

/** يوم الأسبوع في توقيت التحليلات (الاثنين = 0 … الأحد = 6) */
export function weekdayIndexInAnalyticsTz(date = new Date()): number {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: ANALYTICS_TIMEZONE,
    weekday: 'long',
  }).format(date);
  return WEEKDAY_INDEX[weekday] ?? 0;
}

export type AnalyticsPeriodRange = {
  start: Date;
  end: Date;
  fromYmd: string;
  toYmd: string;
};

/**
 * نطاق الفترة للمؤشرات — متزامن مع مفاتيح الخادم (Asia/Riyadh)
 */
export function computeAnalyticsPeriodRange(
  selectedPeriod: string,
  appliedDateRange: { start: Date; end: Date } | null,
): AnalyticsPeriodRange {
  const todayYmd = toAnalyticsDateKey(new Date());
  const todayBounds = calendarDayBounds(todayYmd);

  if (selectedPeriod === 'custom' && appliedDateRange) {
    let fromYmd = toAnalyticsDateKey(appliedDateRange.start);
    let toYmd = toAnalyticsDateKey(appliedDateRange.end);
    if (fromYmd > toYmd) [fromYmd, toYmd] = [toYmd, fromYmd];
    return {
      start: calendarDayBounds(fromYmd).start,
      end: calendarDayBounds(toYmd).end,
      fromYmd,
      toYmd,
    };
  }

  switch (selectedPeriod) {
    case 'today':
      return {
        start: todayBounds.start,
        end: todayBounds.end,
        fromYmd: todayYmd,
        toYmd: todayYmd,
      };
    case 'week': {
      const fromYmd = addCalendarDayYmd(todayYmd, -weekdayIndexInAnalyticsTz(new Date()));
      const toYmd = addCalendarDayYmd(fromYmd, 6);
      return {
        start: calendarDayBounds(fromYmd).start,
        end: calendarDayBounds(toYmd).end,
        fromYmd,
        toYmd,
      };
    }
    case 'month': {
      const fromYmd = `${todayYmd.slice(0, 7)}-01`;
      return {
        start: calendarDayBounds(fromYmd).start,
        end: todayBounds.end,
        fromYmd,
        toYmd: todayYmd,
      };
    }
    case 'year': {
      const fromYmd = `${todayYmd.slice(0, 4)}-01-01`;
      return {
        start: calendarDayBounds(fromYmd).start,
        end: todayBounds.end,
        fromYmd,
        toYmd: todayYmd,
      };
    }
    default:
      return {
        start: todayBounds.start,
        end: todayBounds.end,
        fromYmd: todayYmd,
        toYmd: todayYmd,
      };
  }
}

/** كل أيام YYYY-MM-DD من البداية إلى النهاية (شامل) */
export function enumerateCalendarDaysYmd(fromYmd: string, toYmd: string): string[] {
  if (!YMD_RE.test(fromYmd) || !YMD_RE.test(toYmd)) return [];
  const from = fromYmd <= toYmd ? fromYmd : toYmd;
  const to = fromYmd <= toYmd ? toYmd : fromYmd;
  const keys: string[] = [];
  let cur = from;
  while (cur <= to) {
    keys.push(cur);
    if (cur === to) break;
    cur = addCalendarDayYmd(cur, 1);
  }
  return keys;
}

/** تعبئة أيام ناقصة في السلسلة اليومية (للمخطط) */
export function fillDailyTimeSeriesForRange(
  points: Array<{ date?: string; count?: number }>,
  fromYmd: string,
  toYmd: string,
): Array<{ date: string; count: number }> {
  const byDate = new Map<string, number>();
  for (const p of points) {
    if (p?.date && YMD_RE.test(p.date)) {
      byDate.set(p.date, Number(p.count) || 0);
    }
  }
  return enumerateCalendarDaysYmd(fromYmd, toYmd).map((date) => ({
    date,
    count: byDate.get(date) ?? 0,
  }));
}

/** تسمية محور المخطط اليومي من مفتاح YYYY-MM-DD (توقيت التحليلات) */
export function formatAnalyticsChartDay(ymd: string): string {
  if (!YMD_RE.test(ymd)) return ymd;
  const { start } = calendarDayBounds(ymd);
  return new Intl.DateTimeFormat(LOCALE, {
    ...GREGORY,
    ...LATN_DIGITS,
    timeZone: ANALYTICS_TIMEZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(start);
}

/** تسمية ساعة للمخطط (0 → 12 ص، 14 → 2 م) */
export function formatChartHourLabel(hour: number, fallbackName?: string): string {
  if (fallbackName && fallbackName !== `${hour}:00`) return fallbackName;
  const h = hour % 24;
  if (h === 0) return '12 ص';
  if (h < 12) return `${h} ص`;
  if (h === 12) return '12 م';
  return `${h - 12} م`;
}

export function formatAppTime(d: Date | string | number): string {
  const x = toDate(d);
  if (Number.isNaN(x.getTime())) return '—';
  return x.toLocaleTimeString(LOCALE, { ...GREGORY, ...LATN_DIGITS, hour: '2-digit', minute: '2-digit' });
}
