/**
 * Mock Confidence Data for Problem Description Analysis
 * 
 * ⚠️ DEPRECATED: This file is now used only as a FALLBACK.
 * The primary confidence calculation is now done via backend API.
 * 
 * This file contains keyword patterns used to calculate confidence scores
 * for problem descriptions in the frontend as a fallback when the backend API is unavailable.
 * 
 * ✅ IMPLEMENTED: Backend API endpoint: POST /api/analyze-confidence
 * ✅ Frontend Service: services/confidenceService.ts
 * ✅ Documentation: CONFIDENCE_CALCULATION.md
 * 
 * This file is kept for:
 * 1. Emergency fallback if API is down
 * 2. Offline functionality
 * 3. Error handling in frontend service
 * 
 * DO NOT USE THIS DIRECTLY - Use analyzeConfidence() from services/confidenceService.ts instead
 */

export interface KeywordPattern {
  keywords: string[];
  weight: number;
}

export interface ProblemTypeConfig {
  id: string;
  name: string;
  positiveKeywords: string[];
  negativeKeywords: string[];
}

/**
 * Positive keywords that increase confidence
 * Higher weight = more confidence boost
 */
export const POSITIVE_KEYWORDS: KeywordPattern[] = [
  {
    keywords: ['تعطل', 'عطل', 'خطأ', 'مشكلة', 'لا يعمل', 'توقف'],
    weight: 15
  },
  {
    keywords: ['نظام', 'برنامج', 'تطبيق', 'موقع', 'منصة'],
    weight: 12
  },
  {
    keywords: ['دفع', 'مالي', 'فاتورة', 'رسوم', 'تحويل', 'استرداد'],
    weight: 12
  },
  {
    keywords: ['تشغيلي', 'عملية', 'إجراء', 'خدمة', 'معالجة'],
    weight: 10
  },
  {
    keywords: ['شكوى', 'اعتراض', 'استياء', 'غير راضي'],
    weight: 10
  },
  {
    keywords: ['استفسار', 'سؤال', 'معلومات', 'توضيح'],
    weight: 8
  }
];

/**
 * Negative keywords that decrease confidence
 * These indicate vague or unclear descriptions
 */
export const NEGATIVE_KEYWORDS: string[] = [
  'شيء',
  'شي',
  'حاجة',
  'مدري',
  'ما أدري',
  'تقريبا',
  'ممكن',
  'يمكن',
  'شوف',
  'شف',
  'كذا',
  'مو متأكد',
  'مش متأكد'
];

/**
 * Problem type configurations for Gray Area selection
 */
export const PROBLEM_TYPES: ProblemTypeConfig[] = [
  {
    id: 'technical',
    name: 'مشكلة تقنية',
    positiveKeywords: ['تعطل', 'خطأ', 'نظام', 'برنامج', 'تطبيق', 'موقع', 'لا يعمل', 'بطء', 'انقطاع'],
    negativeKeywords: []
  },
  {
    id: 'operational',
    name: 'مشكلة تشغيلية',
    positiveKeywords: ['عملية', 'إجراء', 'خدمة', 'تأخير', 'معالجة', 'تنفيذ', 'تشغيل'],
    negativeKeywords: []
  },
  {
    id: 'financial',
    name: 'مشكلة مالية',
    positiveKeywords: ['دفع', 'فاتورة', 'رسوم', 'مبلغ', 'تحويل', 'استرداد', 'خصم', 'مالي'],
    negativeKeywords: []
  },
  {
    id: 'complaint',
    name: 'شكوى',
    positiveKeywords: ['شكوى', 'اعتراض', 'استياء', 'غير راضي', 'سيء', 'رديء'],
    negativeKeywords: []
  },
  {
    id: 'general_inquiry',
    name: 'استفسار عام',
    positiveKeywords: ['استفسار', 'سؤال', 'معلومات', 'توضيح', 'كيف', 'هل', 'متى'],
    negativeKeywords: []
  }
];

/**
 * Calculate confidence score based on problem description
 * 
 * @param description - The problem description text
 * @returns Confidence score between 0-100
 * 
 * TODO: Replace with backend API call
 * Example: const response = await fetch('/api/analyze-confidence', { method: 'POST', body: JSON.stringify({ description }) })
 */
export function calculateConfidence(description: string): number {
  if (!description || description.trim().length < 10) {
    return 0;
  }

  const lowerDescription = description.toLowerCase();
  let score = 30; // Base score for having any description

  // Check for positive keywords
  POSITIVE_KEYWORDS.forEach(pattern => {
    const matches = pattern.keywords.filter(keyword => 
      lowerDescription.includes(keyword.toLowerCase())
    );
    score += matches.length * pattern.weight;
  });

  // Check for negative keywords (reduce score)
  NEGATIVE_KEYWORDS.forEach(keyword => {
    if (lowerDescription.includes(keyword.toLowerCase())) {
      score -= 8;
    }
  });

  // Bonus for description length (more details = more confidence)
  const wordCount = description.trim().split(/\s+/).length;
  if (wordCount > 15) {
    score += 10;
  } else if (wordCount > 8) {
    score += 5;
  }

  // Ensure score is between 0-100
  return Math.max(0, Math.min(100, score));
}

/**
 * Suggest best matching problem type based on description
 * 
 * @param description - The problem description text
 * @returns Best matching problem type ID or null
 * 
 * TODO: Replace with backend ML model prediction
 */
export function suggestProblemType(description: string): string | null {
  if (!description) return null;

  const lowerDescription = description.toLowerCase();
  let bestMatch = { typeId: '', score: 0 };

  PROBLEM_TYPES.forEach(type => {
    let typeScore = 0;
    type.positiveKeywords.forEach(keyword => {
      if (lowerDescription.includes(keyword.toLowerCase())) {
        typeScore += 1;
      }
    });

    if (typeScore > bestMatch.score) {
      bestMatch = { typeId: type.id, score: typeScore };
    }
  });

  return bestMatch.score > 0 ? bestMatch.typeId : null;
}
