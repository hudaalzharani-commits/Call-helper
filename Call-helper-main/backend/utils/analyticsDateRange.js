/**
 * نطاقات التقويم للتحليلات — مفتاح YYYY-MM-DD بتوقيت واحد (افتراضي: الرياض)
 */
export const ANALYTICS_TZ = process.env.ANALYTICS_TIMEZONE || 'Asia/Riyadh';

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isCalendarDateKey(s) {
  return typeof s === 'string' && YMD_RE.test(s);
}

/** إزاحة المنطقة بالدقائق عند لحظة معيّنة */
function tzOffsetMinutesAt(instant, timeZone) {
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
  const map = {};
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

/** بداية ونهاية يوم تقويمي (YYYY-MM-DD) ضمن المنطقة الزمنية */
export function calendarDayBounds(ymd, timeZone = ANALYTICS_TZ) {
  const [y, m, d] = ymd.split('-').map(Number);
  const noonUtc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));
  const offsetMin = tzOffsetMinutesAt(noonUtc, timeZone);
  const startMs = Date.UTC(y, m - 1, d, 0, 0, 0, 0) - offsetMin * 60000;
  const endMs = Date.UTC(y, m - 1, d, 23, 59, 59, 999) - offsetMin * 60000;
  return { start: new Date(startMs), end: new Date(endMs) };
}

export function addCalendarDay(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  const yy = next.getUTCFullYear();
  const mm = String(next.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(next.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/** كل أيام التقويم من fromYmd إلى toYmd شاملاً */
export function enumerateCalendarDays(fromYmd, toYmd) {
  if (!isCalendarDateKey(fromYmd) || !isCalendarDateKey(toYmd)) return [];
  const keys = [];
  let cur = fromYmd;
  while (cur <= toYmd) {
    keys.push(cur);
    if (cur === toYmd) break;
    cur = addCalendarDay(cur);
  }
  return keys;
}

/**
 * يحوّل period أو from/to إلى حدود استعلام + مفاتيح أيام للتعبئة
 */
export function resolveAnalyticsRange(period = '7d', range = {}) {
  const { from, to } = range;

  if (isCalendarDateKey(from) && isCalendarDateKey(to)) {
    const fromYmd = from <= to ? from : to;
    const toYmd = from <= to ? to : from;
    const startBounds = calendarDayBounds(fromYmd);
    const endBounds = calendarDayBounds(toYmd);
    return {
      startDate: startBounds.start,
      endDate: endBounds.end,
      fromYmd,
      toYmd,
    };
  }

  const days = parseInt(String(period).replace(/[^\d]/g, ''), 10) || 7;
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const endYmd = dateKeyFromInstant(endDate, ANALYTICS_TZ);
  const startYmd = dateKeyFromInstant(startDate, ANALYTICS_TZ);

  return {
    startDate,
    endDate,
    fromYmd: startYmd,
    toYmd: endYmd,
  };
}

export function dateKeyFromInstant(instant, timeZone = ANALYTICS_TZ) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}
