/**
 * عنوان API للواجهة.
 * محلياً: فارغ أو `/api` (بروكسي Vite).
 * إنتاج: `VITE_API_BASE_URL=https://your-app.up.railway.app/api`
 */
export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL?.trim();
  if (raw) {
    const normalized = raw.replace(/\/$/, '');
    return normalized.endsWith('/api') ? normalized : `${normalized}/api`;
  }
  return '/api';
}

/** أصل الخادم بدون `/api` — لروابط المرفقات المطلقة عند الحاجة */
export function getApiOrigin(): string {
  const base = getApiBaseUrl();
  if (base.startsWith('http')) {
    return base.replace(/\/api\/?$/i, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return '';
}
