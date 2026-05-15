// ========================
// Mock Data for Development
// This file provides placeholder data until backend is ready
// ========================

import type {
  Issue,
  KnowledgeArticle,
  OperationalUpdate,
  TrainingEntry,
  Statistics,
} from "../types";

// ========================
// Mock Issues
// ========================

export const mockIssues: Issue[] = [
  {
    id: "1",
    title: "مشكلة في نظام الحجز",
    description:
      "العميل يواجه صعوبة في إتمام عملية الحجز عبر الموقع الإلكتروني",
    status: "active",
    priority: "high",
    category: "تقني",
    entityType: "umrah",
    reportedBy: "وعد ماجد",
    reportedAt: new Date("2024-01-15T10:30:00"),
    assignedTo: "فريق الدعم التقني",
    tags: ["حجز", "موقع", "عاجل"],
  },
  {
    id: "2",
    title: "استفسار عن الدفع الإلكتروني",
    description:
      "العميل يسأل عن طرق الدفع المتاحة وآلية استرجاع الأموال",
    status: "pending",
    priority: "medium",
    category: "مالي",
    entityType: "external",
    reportedBy: "سليمان عسيري",
    reportedAt: new Date("2024-01-15T11:45:00"),
    tags: ["دفع", "استفسار"],
  },
  {
    id: "3",
    title: "طلب تغيير موعد الحجز",
    description: "العميل يطلب تعديل تاريخ حجزه بسبب ظروف طارئة",
    status: "resolved",
    priority: "low",
    category: "حجوزات",
    entityType: "accommodation",
    reportedBy: "هدى الزهراني",
    reportedAt: new Date("2024-01-14T09:15:00"),
    resolvedAt: new Date("2024-01-14T14:30:00"),
    tags: ["تعديل", "حجز"],
  },
  {
    id: "4",
    title: "شكوى من جودة الخدمة",
    description: "العميل غير راضٍ عن مستوى الخدمة المقدمة",
    status: "active",
    priority: "high",
    category: "خدمة عملاء",
    entityType: "umrah",
    reportedBy: "وعد ماجد",
    reportedAt: new Date("2024-01-15T13:20:00"),
    tags: ["شكوى", "جودة"],
  },
  {
    id: "5",
    title: "استفسار عن السياسات",
    description: "العميل يستفسر عن سياسة الإلغاء والاسترجاع",
    status: "resolved",
    priority: "low",
    category: "سياسات",
    entityType: "external",
    reportedBy: "سليمان عسيري",
    reportedAt: new Date("2024-01-13T16:00:00"),
    resolvedAt: new Date("2024-01-13T16:45:00"),
    tags: ["سياسات", "استفسار"],
  },
];

// ========================
// Mock Knowledge Articles
// ========================

export const mockKnowledgeArticles: KnowledgeArticle[] = [
  {
    id: "1",
    title: "كيفية التعامل مع مشاكل الحجز الإلكتروني",
    content: `
# خطوات حل مشاكل الحجز الإلكتروني

## الخطوة الأولى: التحقق من البيانات
تأكد من صحة جميع البيانات المدخلة من قبل العميل.

## الخطوة الثانية: فحص النظام
تحقق من حالة النظام والخوادم.

## الخطوة الثالثة: الحلول البديلة
في حالة استمرار المشكلة، قدم حلول بديلة للعميل.
    `,
    category: "تقني",
    tags: ["حجز", "موقع", "حلول"],
    author: "شمس",
    createdAt: new Date("2024-01-10T09:00:00"),
    updatedAt: new Date("2024-01-12T14:30:00"),
    views: 245,
    helpful: 189,
    notHelpful: 12,
    relatedIssues: ["1"],
    status: "published",
  },
  {
    id: "2",
    title: "دليل سياسات الإلغاء والاسترجاع",
    content: `
# سياسات الإلغاء والاسترجاع

## الإلغاء قبل 7 أيام
استرجاع كامل المبلغ

## الإلغاء قبل 3 أيام
استرجاع 50% من المبلغ

## الإلغاء في آخر 48 ساعة
لا يمكن استرجاع المبلغ
    `,
    category: "سياسات",
    tags: ["إلغاء", "استرجاع", "سياسات"],
    author: "قسم السياسات",
    createdAt: new Date("2024-01-08T10:00:00"),
    updatedAt: new Date("2024-01-08T10:00:00"),
    views: 432,
    helpful: 398,
    notHelpful: 8,
    relatedIssues: ["5"],
    status: "published",
  },
  {
    id: "3",
    title: "التعامل مع شكاوى العملاء بشكل احترافي",
    content: `
# دليل التعامل مع الشكاوى

## الاستماع الفعال
أعط العميل الفرصة الكاملة للتعبير عن شكواه

## التعاطف والتفهم
أظهر التفهم والتعاطف مع موقف العميل

## تقديم حلول عملية
اقترح حلول واقعية وقابلة للتنفيذ

## المتابعة
تابع مع العميل للتأكد من حل المشكلة
    `,
    category: "خدمة عملاء",
    tags: ["شكاوى", "خدمة", "احترافية"],
    author: "شمس",
    createdAt: new Date("2024-01-05T11:00:00"),
    updatedAt: new Date("2024-01-11T15:20:00"),
    views: 567,
    helpful: 512,
    notHelpful: 15,
    relatedIssues: ["4"],
    status: "published",
  },
];

// ========================
// Mock Operational Updates
// ========================

export const mockOperationalUpdates: OperationalUpdate[] = [
  {
    id: "1",
    title: "صيانة دورية للنظام",
    description:
      "سيتم إجراء صيانة دورية للنظام يوم السبت القادم من الساعة 2 صباحاً حتى 6 صباحاً",
    type: "maintenance",
    status: "scheduled",
    priority: "medium",
    startDate: new Date("2024-01-20T02:00:00"),
    endDate: new Date("2024-01-20T06:00:00"),
    affectedServices: ["نظام الحجز", "البوابة الإلكترونية"],
    createdBy: "شمس",
    createdAt: new Date("2024-01-15T10:00:00"),
    updatedAt: new Date("2024-01-15T10:00:00"),
  },
  {
    id: "2",
    title: "تحديث ميزات جديدة",
    description:
      "تم إضافة ميزة الدفع الفوري عبر Apple Pay و Google Pay",
    type: "enhancement",
    status: "completed",
    priority: "low",
    startDate: new Date("2024-01-14T08:00:00"),
    endDate: new Date("2024-01-14T10:00:00"),
    affectedServices: ["نظام الدفع"],
    createdBy: "هدى",
    createdAt: new Date("2024-01-14T07:00:00"),
    updatedAt: new Date("2024-01-14T10:30:00"),
  },
  {
    id: "3",
    title: "مشكلة فنية طارئة",
    description:
      "تم رصد بطء في الأداء ويتم العمل على حلها حالياً",
    type: "incident",
    status: "ongoing",
    priority: "high",
    startDate: new Date("2024-01-15T14:30:00"),
    affectedServices: ["نظام الحجز", "لوحة التحكم"],
    createdBy: "وعد",
    createdAt: new Date("2024-01-15T14:30:00"),
    updatedAt: new Date("2024-01-15T15:00:00"),
  },
];

// ========================
// Mock Training Entries
// ========================

export const mockTrainingEntries: TrainingEntry[] = [
  {
    id: "1",
    scenario: "ميل يشتعكي من عدم وصول رسالة التأكيد",
    correctResponse:
      "نعتذر عن هذه المشكلة. سأقوم بإرسال رسالة التأكيد مرة أخرى إلى بريدك الإلكتروني. يرجى التحقق من صندوق الرسائل غير المرغوب فيها أيضاً.",
    alternativeResponses: [
      "تم إعادة إرسال رسالة التأكيد. يرجى التحقق من بريدك.",
      "سأتأكد من إرسال التأكيد فوراً. هل يمكنك التحقق من البريد الإلكتروني المسجل؟",
    ],
    category: "خدمة عملاء",
    submittedBy: "وعد ماجد",
    submittedAt: new Date("2024-01-12T09:00:00"),
    status: "approved",
    reviewedBy: "مرف",
    reviewedAt: new Date("2024-01-12T11:00:00"),
    notes: "رد احترافي ومناسب",
  },
  {
    id: "2",
    scenario: "عميل يطلب تعديل تاريخ الحجز",
    correctResponse:
      "بالتأكيد، يمكنني مساعدتك في تعديل تاريخ الحجز. يرجى تزويدي برقم الحجز والتاريخ الجديد المطلوب.",
    category: "حجوزات",
    submittedBy: "سليمان عسيري",
    submittedAt: new Date("2024-01-13T10:30:00"),
    status: "pending",
  },
  {
    id: "3",
    scenario: "عميل يسأل عن طريقة الدفع",
    correctResponse:
      "نوفر عدة طرق للدفع: البطاقات الائتمانية (فيزا، ماستركارد)، Apple Pay، Google Pay، والتحويل البنكي. أي طريقة تفضل؟",
    alternativeResponses: [
      "يمكنك الدفع عبر البطاقة الائتمانية، المحفظة الرقمية، أو التحويل البنكي.",
    ],
    category: "مالي",
    submittedBy: "هدى الزهراني",
    submittedAt: new Date("2024-01-14T14:15:00"),
    status: "approved",
    reviewedBy: "مشرف",
    reviewedAt: new Date("2024-01-14T16:00:00"),
  },
];

// ========================
// Registered Problems with Pre-defined Responses (for Description Matching)
// ========================

export interface RegisteredProblem {
  id: string;
  description: string; // Problem description with keywords
  keywords: string[]; // Main keywords for matching
  response: string; // Pre-defined response
  category: string;
  priority: "high" | "medium" | "low";
  createdAt: Date;
  /** من حقل `why` في مجموعة الحالات (Case) عند المطابقة من قاعدة البيانات */
  why?: string;
}

export const registeredProblems: RegisteredProblem[] = [
  {
    id: "rp1",
    description: "العميل يواجه مشكلة في تعديل بيانات الحساب البنكي",
    keywords: ["تعديل", "بيانات", "حساب", "بنكي", "مشكلة", "يواجه"],
    response:
      "تمت إفادة العميل بالدخول إلى الملف الشخصي ثم الضغط على 'الحسابات البنكية' واختيار 'تعديل'. في حال استمرار المشكلة، يرجى التواصل مع الدعم التقني على الرقم 920001234",
    category: "تقني",
    priority: "high",
    createdAt: new Date("2024-01-10T10:00:00"),
  },
  {
    id: "rp2",
    description: "يواجه العميل مشكلة في تفعيل حسابه الخاص بالشركة",
    keywords: ["تفعيل", "حساب", "شركة", "مشكلة", "يواجه", "خاص"],
    response:
      "تمت إفادة العميل بالضغط على رابط تفعيل المستخدم في صفحة تسجيل الدخول. الرابط موجود أسفل زر 'تسجيل الدخول' بعنوان 'لم تتلق رسالة التفعيل؟'",
    category: "حسابات",
    priority: "high",
    createdAt: new Date("2024-01-11T09:30:00"),
  },
  {
    id: "rp3",
    description: "يواجه العميل مشكلة في تفعيل الشركة",
    keywords: ["تفعيل", "شركة", "مشكلة", "يواجه"],
    response:
      "تمت إفادة العميل بمراجعة وزارة الحج والعمرة لاستكمال إجراءات تفعيل الشركة. يمكن التواصل مع الوزارة عبر بوابة نساك الإلكترونية أو الاتصال على الرقم الموحد 8001245555",
    category: "إداري",
    priority: "medium",
    createdAt: new Date("2024-01-11T10:00:00"),
  },
  {
    id: "rp4",
    description: "العميل لا يستطيع إتمام عملية الدفع الإلكتروني",
    keywords: ["دفع", "إلكتروني", "عملية", "لا يستطيع", "إتمام"],
    response:
      "تمت إفادة العميل بالتحقق من صحة بيانات البطاقة والرصيد المتوفر. في حال استمرار المشكلة، يرجى استخدام طريقة دفع بديلة أو التواصل مع البنك للتأكد من عم وجود قيود على البطاقة",
    category: "مالي",
    priority: "high",
    createdAt: new Date("2024-01-12T11:00:00"),
  },
  {
    id: "rp5",
    description: "استفسار العميل عن كيفية إلغاء الحجز واسترداد المبلغ",
    keywords: ["إلغاء", "حجز", "استرداد", "مبلغ", "استفسار", "كيفية"],
    response:
      "تمت إفادة العميل بأنه يمكن إلغاء الحجز من خلال الدخول إلى 'حجوزاتي' واختيار 'إلغاء الحجز'. سياسة الاسترداد: إلغاء قبل 7 أيام (استرداد كامل)، قبل 3 أيام (50%)، آخر 48 ساعة (لا يمكن الاسترداد)",
    category: "حجوزات",
    priority: "medium",
    createdAt: new Date("2024-01-13T14:00:00"),
  },
  {
    id: "rp6",
    description: "مشكلة في تحميل المستندات المطلوبة للشركة",
    keywords: ["تحميل", "مستندات", "مطلوبة", "شركة", "مشكلة"],
    response:
      "تمت إفادة العميل بالتأكد من أن حجم الملف لا يتجاوز 5 ميجابايت والصيغة مدعومة (PDF, JPG, PNG). يرجى استخدام متصفح حديث وتعطيل أي برامج حجب إعلانات قد تؤثر على التحميل",
    category: "تقني",
    priority: "medium",
    createdAt: new Date("2024-01-14T09:00:00"),
  },
  {
    id: "rp7",
    description: "شكوى من تأخر في الرد على الطلبات",
    keywords: ["شكوى", "تأخر", "رد", "طلبات"],
    response:
      "نعتذر عن التأخير. تم تصعيد طلبكم إلى المدير المختص وسيتم التواصل معكم خلال 24 ساعة. رقم الطلب المرجعي: REF-" + Math.random().toString(36).substr(2, 9).toUpperCase(),
    category: "خدمة عملاء",
    priority: "high",
    createdAt: new Date("2024-01-15T10:30:00"),
  },
  {
    id: "rp8",
    description: "العميل يسأل عن طريقة تغيير كلمة المرور",
    keywords: ["تغيير", "كلمة", "مرور", "طريقة", "يسأل"],
    response:
      "تمت إفادة العميل بالضغط على 'نسيت كلمة المرور؟' في صفحة تسجيل الدخول، ثم إدخال البريد الإلكتروني المسجل. سيتم إرسال رابط إعادة تعيين كلمة المرور خلال دقائق",
    category: "حسابات",
    priority: "low",
    createdAt: new Date("2024-01-15T11:00:00"),
  },
  {
    id: "rp9",
    description: "استفسار عن أنواع الغرف المتاحة في الفناق",
    keywords: ["استفسار", "أنواع", "غرف", "متاحة", "فنادق"],
    response:
      "تمت إفادة العميل بأن الغرف المتاحة تشمل: غرف فردية، مزدوجة، عائلية، وأجنحة. يمكن الاطلاع على التفاصيل الكاملة والأسعار من خلال صفحة 'الإقامة' في الموقع أو التطبيق",
    category: "حجوزات",
    priority: "low",
    createdAt: new Date("2024-01-15T12:00:00"),
  },
  {
    id: "rp10",
    description: "مشكلة في ظهور رسالة خطأ عند تسجيل الدخول",
    keywords: ["رسالة", "خطأ", "تسجيل", "دخول", "ظهور", "مشكلة"],
    response:
      "تمت إفادة العميل بمسح ذاكرة التخزين المؤقت (Cache) وملفات تعريف الارتباط (Cookies) من المتصفح، ثم إعادة المحاولة. إذا استمرت المشكلة، يرجى استخدام ميزة 'نسيت كلمة المرور' لإعادة تعيينها",
    category: "تقني",
    priority: "medium",
    createdAt: new Date("2024-01-15T13:00:00"),
  },
];

// ========================
// Description Matching Functions
// ========================

/**
 * Calculate match percentage between problem description and registered problems
 * Returns the best matching problem with its match percentage
 */
export function findBestMatchingProblem(
  userDescription: string
): { problem: RegisteredProblem | null; matchPercentage: number } {
  if (!userDescription || userDescription.trim().length < 5) {
    return { problem: null, matchPercentage: 0 };
  }

  const normalizedUserDesc = userDescription
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:()\[\]{}،؛؟]/g, " ") // Remove punctuation
    .replace(/\s+/g, " "); // Normalize spaces

  const userWords = normalizedUserDesc.split(" ");

  let bestMatch = {
    problem: null as RegisteredProblem | null,
    matchPercentage: 0,
    matchedKeywords: [] as string[],
  };

  registeredProblems.forEach((problem) => {
    let matchedCount = 0;
    const matchedKeywords: string[] = [];

    // Check each keyword
    problem.keywords.forEach((keyword) => {
      const normalizedKeyword = keyword.toLowerCase();

      // Exact word match
      if (userWords.includes(normalizedKeyword)) {
        matchedCount += 2; // Higher weight for exact match
        matchedKeywords.push(keyword);
      }
      // Partial match (keyword contains or is contained in user words)
      else if (normalizedUserDesc.includes(normalizedKeyword)) {
        matchedCount += 1;
        matchedKeywords.push(keyword);
      }
    });

    // Calculate percentage based on matched keywords vs total keywords
    const matchPercentage = Math.round(
      (matchedCount / (problem.keywords.length * 2)) * 100
    );

    // Update best match if this is better
    if (matchPercentage > bestMatch.matchPercentage) {
      bestMatch = {
        problem,
        matchPercentage,
        matchedKeywords,
      };
    }
  });

  return {
    problem: bestMatch.problem,
    matchPercentage: bestMatch.matchPercentage,
  };
}

/**
 * Get response text based on matching result
 */
export function getResponseForProblem(
  userDescription: string,
  customerName: string,
  entityType: string
): {
  text: string;
  matchPercentage: number;
  isMatched: boolean;
  matchedProblem: RegisteredProblem | null;
} {
  const { problem, matchPercentage } = findBestMatchingProblem(userDescription);

  // If match percentage is above 40%, use the registered response
  // Updated thresholds:
  // - 90%+ = Excellent match (hide action buttons)
  // - 80-89% = Good match
  // - 41-79% = Medium match
  // - 40% or less = Gray Area (needs problem type selection)
  if (problem && matchPercentage > 40) {
    const entityTypeArabic =
      entityType === "umrah" ? "شركة عمرة" : "وكيل خارجي";

    // Format the response with customer information
    const formattedResponse = `السلام عليكم ورحمة الله وبركاته،\n\nالعميل: ${customerName}\nنوع الجهة: ${entityTypeArabic}\n\n${problem.response}\n\nشكراً لتواصلكم معنا.`;

    return {
      text: formattedResponse,
      matchPercentage,
      isMatched: true,
      matchedProblem: problem,
    };
  }

  // Otherwise, return generic response (to be used with AI generation)
  return {
    text: "",
    matchPercentage,
    isMatched: false,
    matchedProblem: null,
  };
}

// ========================
// Mock Statistics
// ========================

export const mockStatistics: Statistics = {
  totalIssues: 423,
  activeIssues: 156,
  resolvedIssues: 245,
  avgResolutionTime: 2.5,
  satisfactionRate: 4.7,
  topCategories: [
    { category: "تقني", count: 120, percentage: 28.4 },
    { category: "حجوزات", count: 98, percentage: 23.2 },
    { category: "مالي", count: 75, percentage: 17.7 },
    { category: "خدمة عملاء", count: 65, percentage: 15.4 },
    { category: "سياسات", count: 45, percentage: 10.6 },
    { category: "أخرى", count: 20, percentage: 4.7 },
  ],
  issuesByEntity: [
    { entityType: "شركات العمرة", count: 190, percentage: 45 },
    { entityType: "مزودي السكن", count: 127, percentage: 30 },
    { entityType: "وكلاء خارجيين", count: 106, percentage: 25 },
  ],
  issuesByPriority: [
    { priority: "عالية", count: 63, color: "#ef4444" },
    { priority: "متوسطة", count: 148, color: "#f59e0b" },
    { priority: "منخفضة", count: 212, color: "#10b981" },
  ],
  timeSeriesData: [
    { date: "2024-01-08", count: 45, resolved: 28, active: 17 },
    { date: "2024-01-09", count: 52, resolved: 31, active: 21 },
    { date: "2024-01-10", count: 48, resolved: 29, active: 19 },
    { date: "2024-01-11", count: 61, resolved: 38, active: 23 },
    { date: "2024-01-12", count: 55, resolved: 34, active: 21 },
    { date: "2024-01-13", count: 43, resolved: 27, active: 16 },
    { date: "2024-01-14", count: 58, resolved: 35, active: 23 },
    { date: "2024-01-15", count: 61, resolved: 23, active: 38 },
  ],
};

// ========================
// Helper Functions
// ========================

/**
 * Simulate API delay
 */
export const simulateDelay = (
  ms: number = 500,
): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Get mock data with simulated delay
 */
export async function getMockData<T>(
  data: T,
  delay: number = 500,
): Promise<T> {
  await simulateDelay(delay);
  return data;
}