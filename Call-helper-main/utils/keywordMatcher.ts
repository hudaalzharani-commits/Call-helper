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
    'username',
    'registration',
    'register',
    'signup',
    'sign up',
  ],
  'الدفع': [
    'دفع',
    'سداد',
    'مدفوعات',
    'فاتورة',
    'رسوم',
    'مبلغ',
    'تحويل',
    'بنك',
    'بطاقة',
    'فيزا',
    'ماستركارد',
    'payment',
    'pay',
    'invoice',
    'credit',
    'debit',
    'transfer',
  ],
  'التأشيرة': [
    'تأشيرة',
    'فيزا',
    'تصريح',
    'إصدار تأشيرة',
    'طلب تأشيرة',
    'تجديد تأشيرة',
    'visa',
    'permit',
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

  // ترتيب حسب النتيجة (الأعلى أولاً)
  results.sort((a, b) => b.matchScore - a.matchScore);

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
