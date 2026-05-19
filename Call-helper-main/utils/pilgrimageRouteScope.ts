import type { Route } from '../contexts/AdvancedSettingsContext';

export type PilgrimageScope = 'umrah' | 'hajj' | 'both';

/** أنواع جهات الحج (عربي + مفاتيح i18n) */
const HAJJ_ENTITY_TOKENS = new Set([
  'housing',
  'affairs',
  'subOrganizer',
  'مقدم خدمة سكن',
  'مكتب شؤون',
  'منظم تابع',
]);

/** أنواع جهات العمرة (عربي + مفاتيح i18n) */
const UMRAH_ENTITY_TOKENS = new Set([
  'external',
  'umrahCompany',
  'وكيل خارجي',
  'شركة عمرة',
]);

/**
 * يستنتج سياق الحج/العمرة من أنواع الجهات (للمسارات القديمة بدون توسيم صريح).
 */
export function inferPilgrimageScopeFromEntityTypes(
  entityTypes?: string[],
): 'umrah' | 'hajj' | null {
  const list = (entityTypes ?? []).map((e) => (e || '').trim()).filter(Boolean);
  if (list.length === 0) return null;

  const hasHajj = list.some((e) => HAJJ_ENTITY_TOKENS.has(e));
  const hasUmrah = list.some((e) => UMRAH_ENTITY_TOKENS.has(e));
  if (hasHajj && !hasUmrah) return 'hajj';
  if (hasUmrah && !hasHajj) return 'umrah';
  return null;
}

/**
 * للعرض/الشارات: عمرة أو حج فقط (مسار «الكل» يُعاد كـ umrah للتمييز البصري الافتراضي).
 */
export function effectivePilgrimageScope(
  route: Pick<Route, 'pilgrimageScope' | 'entityTypes'>,
): 'umrah' | 'hajj' {
  if (route.pilgrimageScope === 'both') return 'umrah';
  if (route.pilgrimageScope === 'umrah' || route.pilgrimageScope === 'hajj') {
    return route.pilgrimageScope;
  }
  return inferPilgrimageScopeFromEntityTypes(route.entityTypes) ?? 'umrah';
}

/** هل يظهر هذا المسار في تبويب العمرة أو الحج المحدد؟ */
export function routeMatchesPilgrimageScope(
  route: Pick<Route, 'pilgrimageScope' | 'entityTypes'>,
  scope: 'umrah' | 'hajj',
): boolean {
  if (route.pilgrimageScope === 'both') return true;
  if (route.pilgrimageScope === 'umrah' || route.pilgrimageScope === 'hajj') {
    return route.pilgrimageScope === scope;
  }
  return inferPilgrimageScopeFromEntityTypes(route.entityTypes) === scope
    ? true
    : inferPilgrimageScopeFromEntityTypes(route.entityTypes) === null && scope === 'umrah';
}
