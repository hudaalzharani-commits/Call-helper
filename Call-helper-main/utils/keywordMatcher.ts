import { categoryLabelsAlign } from './categoryContextMatch';

export type RouteKeywordTarget = {
  id: string;
  name: string;
  isActive: boolean;
  categories?: string[];
};

/**
 * ====================================================================
 * Keyword Matcher - تحليل وصف المشكلة واستخراج Keywords
 * ====================================================================
 * 
 * يحلل وصف المشكلة ويطابقه مع Routes بناءً على keywords
 * 
 * ⚠️ ملاحظات للربط بالباكند:
 * - حالياً: تحليل بسيط باستخدام JavaScript
 * - المستقبل: استبدال بـ AI/NLP API من الباكند
 * - API Endpoint: POST /api/analyze-keywords
 *   Body: { description: string }
 *   Response: { matchedRoutes: string[], keywords: string[] }
 * 
 * ====================================================================
 */

/**
 * Route Keywords Map
 * كل Route له مجموعة من الكلمات المفتاحية
 */
export const ROUTE_KEYWORDS: Record<string, string[]> = {
  'التسجيل': [
    'تسجيل',
    'حساب',
    'إنشاء حساب',
    'فتح حساب',
    'تفعيل',
    'تفعيل حساب',
    'تسجيل شركة',
    'تسجيل جديد',
    'اشتراك',
    'عضوية',
    'تصريح',
    'التصريح',
    'تصاريح',
    'إصدار تصريح',
    'تصريح تسجيل',
    'username',
    'registration',
    'register',
    'signup',
    'sign up',
    'permit',
    'authorization',
  ],
  'الدفع': [
    'دفع',
    'سداد',
    'مدفوعات',
    'مستحقات',
    'مستحق',
    'مستحقات مالية',
    'مالي',
    'مالية',
    'رواتب',
    'راتب',
    'تعويض',
    'مبالغ',
    'فاتورة',
    'رسوم',
    'مبلغ',
    'تحويل',
    'بنك',
    'بطاقة',
    'ماستركارد',
    'payment',
    'pay',
    'invoice',
    'credit',
    'debit',
    'transfer',
    'dues',
    'salary',
  ],
  'التأشيرة': [
    'تأشيرة',
    'التأشيرة',
    'تأشيرات',
    'إصدار تأشيرة',
    'طلب تأشيرة',
    'تجديد تأشيرة',
    'visa',
    'travel document',
  ],
  'العقد': [
    'عقد',
    'اتفاقية',
    'توقيع',
    'توقيع عقد',
    'شروط',
    'بنود',
    'contract',
    'agreement',
    'sign',
    'terms',
  ],
  'السكن': [
    'سكن',
    'إقامة',
    'فندق',
    'شقة',
    'حجز سكن',
    'توفير سكن',
    'accommodation',
    'hotel',
    'residence',
    'housing',
  ],
};

/**
 * تحليل وصف المشكلة واستخراج Keywords
 */
export function extractKeywords(description: string): string[] {
  if (!description || !description.trim()) {
    return [];
  }

  // تحويل النص لأحرف صغيرة للمقارنة
  const lowerDescription = description.toLowerCase().trim();

  // استخراج الكلمات
  const words = lowerDescription.split(/\s+/);

  // إزالة علامات الترقيم
  const cleanWords = words.map(word => 
    word.replace(/[^\u0600-\u06FFa-zA-Z0-9]/g, '')
  ).filter(word => word.length > 0);

  return cleanWords;
}

/**
 * مطابقة وصف المشكلة مع Routes
 * يرجع قائمة بالـ Routes المطابقة مع نسبة المطابقة
 */
export function matchRoutesFromDescription(
  description: string,
  availableRouteNames: string[]
): Array<{
  routeName: string;
  matchScore: number;
  matchedKeywords: string[];
}> {
  if (!description || !description.trim()) {
    return [];
  }

  const lowerDescription = description.toLowerCase().trim();
  const results: Array<{
    routeName: string;
    matchScore: number;
    matchedKeywords: string[];
  }> = [];

  // فحص كل Route
  availableRouteNames.forEach((routeName) => {
    const routeKeywords = ROUTE_KEYWORDS[routeName] || [];
    const matchedKeywords: string[] = [];
    let matchScore = 0;

    // فحص كل keyword
    routeKeywords.forEach((keyword) => {
      const lowerKeyword = keyword.toLowerCase();
      
      // مطابقة كاملة
      if (lowerDescription.includes(lowerKeyword)) {
        matchedKeywords.push(keyword);
        
        // حساب النقاط بناءً على طول الكلمة
        // كلمات أطول = نقاط أعلى
        if (lowerKeyword.length >= 5) {
          matchScore += 3;
        } else if (lowerKeyword.length >= 3) {
          matchScore += 2;
        } else {
          matchScore += 1;
        }
      }
    });

    // إذا وجدنا مطابقات، أضف للنتائج
    if (matchScore > 0) {
      results.push({
        routeName,
        matchScore,
        matchedKeywords,
      });
    }
  });

  // ترتيب: نقاط أعلى أولاً، ثم أطول كلمة مفتاحية مطابقة (أكثر تحديداً)
  results.sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    const maxLen = (keywords: string[]) =>
      keywords.reduce((m, k) => Math.max(m, k.length), 0);
    return maxLen(b.matchedKeywords) - maxLen(a.matchedKeywords);
  });

  return results;
}

/**
 * الحصول على أفضل Route مطابق
 */
export function getBestMatchingRoute(
  description: string,
  availableRouteNames: string[]
): {
  routeName: string;
  matchScore: number;
  matchedKeywords: string[];
} | null {
  const matches = matchRoutesFromDescription(description, availableRouteNames);
  
  if (matches.length === 0) {
    return null;
  }

  return matches[0];
}

/**
 * الحصول على جميع Routes المطابقة مع حد أدنى للنتيجة
 */
export function getMatchingRoutes(
  description: string,
  availableRouteNames: string[],
  minScore: number = 1
): Array<{
  routeName: string;
  matchScore: number;
  matchedKeywords: string[];
}> {
  const matches = matchRoutesFromDescription(description, availableRouteNames);
  
  // تصفية النتائج بحد أدنى
  return matches.filter(match => match.matchScore >= minScore);
}

/** ربط وصف المشكلة بمعرّفات مسارات الإعدادات (اسم المسار / فئاته ↔ مفاتيح ROUTE_KEYWORDS). */
export function resolveActiveRouteIdsByKeywords(
  description: string,
  routes: RouteKeywordTarget[],
  minScore = 1,
): string[] {
  const matches = matchRoutesFromDescription(description, Object.keys(ROUTE_KEYWORDS)).filter(
    (m) => m.matchScore >= minScore,
  );
  if (matches.length === 0) return [];

  const keys = matches.map((m) => m.routeName);
  const matched = routes.filter((route) => {
    if (!route.isActive) return false;
    const name = (route.name || '').trim();
    if (keys.some((k) => categoryLabelsAlign(name, k) || name.includes(k) || k.includes(name))) {
      return true;
    }
    return (route.categories || []).some((c) =>
      keys.some((k) => categoryLabelsAlign((c || '').trim(), k)),
    );
  });

  return matched.map((r) => r.id);
}

/**
 * إضافة keywords مخصصة لـ Route (للأدمن)
 * 
 * TODO: ربط بالباكند
 * POST /api/admin/routes/:routeId/keywords
 * Body: { keywords: string[] }
 */
export function addCustomKeywordsToRoute(
  routeName: string,
  keywords: string[]
): void {
  if (!ROUTE_KEYWORDS[routeName]) {
    ROUTE_KEYWORDS[routeName] = [];
  }

  keywords.forEach((keyword) => {
    if (!ROUTE_KEYWORDS[routeName].includes(keyword)) {
      ROUTE_KEYWORDS[routeName].push(keyword);
    }
  });

  console.log(`✅ Added keywords to route "${routeName}":`, keywords);
}

/**
 * حذف keyword من Route
 */
export function removeKeywordFromRoute(
  routeName: string,
  keyword: string
): void {
  if (!ROUTE_KEYWORDS[routeName]) {
    return;
  }

  const index = ROUTE_KEYWORDS[routeName].indexOf(keyword);
  if (index > -1) {
    ROUTE_KEYWORDS[routeName].splice(index, 1);
    console.log(`✅ Removed keyword "${keyword}" from route "${routeName}"`);
  }
}
