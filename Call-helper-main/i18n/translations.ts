import { mergeLocales } from './merge';
import { commonAr, commonEn } from './modules/common';
import { callHelperAr, callHelperEn } from './modules/callHelper';
import { dashboardAr, dashboardEn } from './modules/dashboard';
import { adminAr, adminEn } from './modules/admin';

export type Locale = 'ar' | 'en';

const shellAr = {
  lang: {
    switchToEnglish: 'English',
    switchToArabic: 'العربية',
  },
  nav: {
    dashboard: 'لوحة التحكم',
    callHelper: 'مساعد المكالمات',
    admin: 'الأدمن',
    hideRail: 'إخفاء القائمة',
    showRail: 'إظهار القائمة',
    services: 'الخدمات',
    noPagesEnabled: 'لا توجد صفحات مفعّلة في القائمة.',
    accountSettings: 'إعدادات الحساب',
    logout: 'تسجيل الخروج',
  },
  services: {
    'live-indicators': 'المؤشرات اللحظية',
    'public-issues': 'المشاكل العامة',
    'knowledge-base': 'سجل المعرفة',
    'operational-updates': 'التحديثات التشغيلية',
    'what-did-rafeeq-learn': 'وش تعلم رفيق؟',
  },
  askRafeeq: {
    title: 'اسأل رفيق',
    subtitle: 'مساعدك الذكي',
  },
  login: {
    subtitle: 'سجّل الدخول إلى لوحة التحكم',
    usernameLabel: 'اسم المستخدم أو البريد',
    usernamePlaceholder: 'مثال: admin',
    passwordLabel: 'كلمة المرور',
    showPassword: 'إظهار كلمة المرور',
    hidePassword: 'إخفاء كلمة المرور',
    submit: 'تسجيل الدخول',
    submitting: 'جاري تسجيل الدخول…',
    back: 'العودة',
    backAria: 'العودة لصفحة البداية',
    invalidCredentials: 'البريد الإلكتروني أو اسم المستخدم أو كلمة المرور غير صحيحة',
    error: 'حدث خطأ أثناء تسجيل الدخول',
    footer: 'رفيق · مساعد المكالمات · v1.0',
  },
  knowledge: {
    title: 'سجل المعرفة',
    newEntry: 'معلومة جديدة',
    newEntryDialog: 'معلومة جديدة',
    newEntryDescription: 'أضف معلومة إلى قاعدة المعرفة (منشور افتراضياً)',
    editDialog: 'تعديل المعلومة',
    editDescription: 'تعديل محتوى المعلومة',
    tabs: { all: 'الكل', published: 'المنشور', draft: 'أرشيف / موقوف' },
    searchPlaceholder: 'بحث في العنوان والوصف والوسوم…',
    category: 'الفئة',
    allCategories: 'جميع الفئات',
    loading: 'جاري التحميل...',
    empty: 'لا توجد معلومات مطابقة',
    table: {
      title: 'العنوان',
      type: 'النوع',
      category: 'الفئة',
      source: 'المصدر',
      author: 'المؤلف',
      updated: 'آخر تحديث',
      views: 'مشاهدات',
      helpful: 'مفيد',
      actions: 'إجراءات',
    },
    form: {
      title: 'العنوان',
      titlePlaceholder: 'عنوان المعلومة...',
      content: 'المحتوى',
      contentPlaceholder: 'محتوى المعلومة...',
      tags: 'الوسوم (مفصولة بفواصل)',
      tagsPlaceholder: 'مثال: حجز, دفع',
      tagsShort: 'الوسوم',
    },
    types: {
      referenceCase: 'حالة مرجع',
      commonIssue: 'مشكلة عامة',
      operationalUpdate: 'تحديث تشغيلي',
      training: 'وش تعلم رفيق',
      article: 'مقال معرفة',
      referenceCaseFull: 'حالة مرجع (Case)',
    },
    categories: {
      technical: 'تقني',
      billing: 'فواتير',
      general: 'عام',
      registration: 'تسجيل',
      umrah: 'عمرة',
      agent: 'وكيل',
    },
    sources: {
      database: 'من قاعدة البيانات',
      archive: 'من الأرشيف',
      rafeeq_training: 'من وش تعلم رفيق؟',
      operational_feed: 'من التحديثات التشغيلية',
      kb_operational_origin: 'من تحديث تشغيلي (مقال معرفة)',
      common_issues: 'من المشاكل العامة',
    },
    status: {
      archived: 'مؤرشف',
      draft: 'أرشيف / مسودة',
      suspended: 'موقوف',
      active: 'نشط',
      published: 'منشور',
    },
    actions: {
      view: 'عرض',
      edit: 'تعديل',
      publish: 'نشر',
      delete: 'حذف',
      cancel: 'إلغاء',
      publishEntry: 'نشر المعلومة',
      save: 'حفظ التعديلات',
    },
    view: {
      helpfulQuestion: 'هل كانت هذه المعلومة مفيدة؟',
      yes: 'نعم',
      no: 'لا',
      tags: 'الوسوم:',
    },
    tooltips: {
      pageViews: 'عدد مرات فتح السجل من صفحة سجل المعرفة',
      matchCount: 'مرات التطابق في المكالمات (ليست مشاهدات)',
      repeatCount: 'عدد التكرار في المكالمات (ليست مشاهدات)',
    },
  },
};

const shellEn = {
  lang: {
    switchToEnglish: 'English',
    switchToArabic: 'العربية',
  },
  nav: {
    dashboard: 'Dashboard',
    callHelper: 'Call Assistant',
    admin: 'Admin',
    hideRail: 'Hide sidebar',
    showRail: 'Show sidebar',
    services: 'Services',
    noPagesEnabled: 'No pages are enabled in the menu.',
    accountSettings: 'Account settings',
    logout: 'Sign out',
  },
  services: {
    'live-indicators': 'Live indicators',
    'public-issues': 'Public issues',
    'knowledge-base': 'Knowledge base',
    'operational-updates': 'Operational updates',
    'what-did-rafeeq-learn': 'What did Rafiq learn?',
  },
  askRafeeq: {
    title: 'Ask Rafiq',
    subtitle: 'Your AI assistant',
  },
  login: {
    subtitle: 'Sign in to the dashboard',
    usernameLabel: 'Username or email',
    usernamePlaceholder: 'e.g. admin',
    passwordLabel: 'Password',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    submit: 'Sign in',
    submitting: 'Signing in…',
    back: 'Back',
    backAria: 'Back to start page',
    invalidCredentials: 'Invalid email, username, or password',
    error: 'An error occurred while signing in',
    footer: 'Rafiq · Call Assistant · v1.0',
  },
  knowledge: {
    title: 'Knowledge base',
    newEntry: 'New entry',
    newEntryDialog: 'New entry',
    newEntryDescription: 'Add an entry to the knowledge base (published by default)',
    editDialog: 'Edit entry',
    editDescription: 'Edit entry content',
    tabs: { all: 'All', published: 'Published', draft: 'Archive / suspended' },
    searchPlaceholder: 'Search title, description, tags…',
    category: 'Category',
    allCategories: 'All categories',
    loading: 'Loading...',
    empty: 'No matching entries',
    table: {
      title: 'Title',
      type: 'Type',
      category: 'Category',
      source: 'Source',
      author: 'Author',
      updated: 'Last updated',
      views: 'Views',
      helpful: 'Helpful',
      actions: 'Actions',
    },
    form: {
      title: 'Title',
      titlePlaceholder: 'Entry title...',
      content: 'Content',
      contentPlaceholder: 'Entry content...',
      tags: 'Tags (comma-separated)',
      tagsPlaceholder: 'e.g. booking, payment',
      tagsShort: 'Tags',
    },
    types: {
      referenceCase: 'Reference case',
      commonIssue: 'Public issue',
      operationalUpdate: 'Operational update',
      training: 'Rafiq training',
      article: 'Knowledge article',
      referenceCaseFull: 'Reference case (Case)',
    },
    categories: {
      technical: 'Technical',
      billing: 'Billing',
      general: 'General',
      registration: 'Registration',
      umrah: 'Umrah',
      agent: 'Agent',
    },
    sources: {
      database: 'From database',
      archive: 'From archive',
      rafeeq_training: 'From Rafiq training',
      operational_feed: 'From operational updates',
      kb_operational_origin: 'From operational update (KB article)',
      common_issues: 'From public issues',
    },
    status: {
      archived: 'Archived',
      draft: 'Draft / archive',
      suspended: 'Suspended',
      active: 'Active',
      published: 'Published',
    },
    actions: {
      view: 'View',
      edit: 'Edit',
      publish: 'Publish',
      delete: 'Delete',
      cancel: 'Cancel',
      publishEntry: 'Publish entry',
      save: 'Save changes',
    },
    view: {
      helpfulQuestion: 'Was this entry helpful?',
      yes: 'Yes',
      no: 'No',
      tags: 'Tags:',
    },
    tooltips: {
      pageViews: 'Times opened from the knowledge registry page',
      matchCount: 'Call match count (not page views)',
      repeatCount: 'Call repeat count (not page views)',
    },
  },
};

export const translations = {
  ar: mergeLocales(commonAr, callHelperAr, dashboardAr, { admin: adminAr }, shellAr),
  en: mergeLocales(commonEn, callHelperEn, dashboardEn, { admin: adminEn }, shellEn),
} as const;

export type TranslationKey = string;

export type TranslateParams = Record<string, string | number>;

export function translate(
  locale: Locale,
  key: TranslationKey,
  params?: TranslateParams,
): string {
  const parts = key.split('.');
  let node: unknown = translations[locale];
  for (const part of parts) {
    if (node && typeof node === 'object' && part in (node as object)) {
      node = (node as Record<string, unknown>)[part];
    } else {
      return key;
    }
  }
  if (typeof node !== 'string') return key;
  if (!params) return node;
  return Object.entries(params).reduce(
    (str, [k, v]) => str.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v)),
    node,
  );
}

/** Category label with fallback */
export function tCategory(
  t: (key: TranslationKey, params?: TranslateParams) => string,
  cat: string,
): string {
  const key = `categories.${cat}`;
  const label = t(key);
  return label === key ? cat : label;
}

/** Entity type keys for selects and API mapping */
export const ENTITY_KEYS = [
  'external',
  'umrahCompany',
  'housing',
  'affairs',
  'subOrganizer',
] as const;

export type EntityKey = (typeof ENTITY_KEYS)[number];

/** Entity type label — maps Arabic legacy values or keys */
export const ENTITY_KEY_BY_AR: Record<string, EntityKey> = {
  'وكيل خارجي': 'external',
  'شركة عمرة': 'umrahCompany',
  'مقدم خدمة سكن': 'housing',
  'مكتب شؤون': 'affairs',
  'منظم تابع': 'subOrganizer',
};

const AR_BY_ENTITY_KEY: Record<EntityKey, string> = {
  external: 'وكيل خارجي',
  umrahCompany: 'شركة عمرة',
  housing: 'مقدم خدمة سكن',
  affairs: 'مكتب شؤون',
  subOrganizer: 'منظم تابع',
};

/** Normalize stored value (Arabic legacy or key) to entity key */
export function entityKeyFromValue(value: string): EntityKey | '' {
  if (!value) return '';
  const fromAr = ENTITY_KEY_BY_AR[value];
  if (fromAr) return fromAr;
  if ((ENTITY_KEYS as readonly string[]).includes(value)) return value as EntityKey;
  return '';
}

/** Arabic label for API / legacy backends */
export function entityForApi(value: string): string {
  if (!value) return value;
  if (ENTITY_KEY_BY_AR[value]) return value;
  const key = entityKeyFromValue(value);
  return key ? AR_BY_ENTITY_KEY[key] : value;
}

/**
 * يطابق نموذج قاعدة البيانات (Service Type): عمرة ↔ وكيل/شركة عمرة، حج ↔ سكن/شؤون/منظم تابع.
 * يُستخدم لفلترة مسارات الوضع المتقدم دون أن يختار المستخدم يدوياً.
 */
export function pilgrimageScopeFromEntityType(value: string): 'umrah' | 'hajj' {
  const key = entityKeyFromValue(value);
  if (key === 'housing' || key === 'affairs' || key === 'subOrganizer') return 'hajj';
  return 'umrah';
}

export function tEntity(
  t: (key: TranslationKey, params?: TranslateParams) => string,
  value: string,
): string {
  const key = entityKeyFromValue(value) || value;
  const path = `entities.${key}`;
  const label = t(path);
  return label === path ? value : label;
}
