import type { PermUserLike } from './appRoles';
import { canCreateElevatedContentUser } from './appRoles';

/** مفتاح صفحة في الشريط الجانبي — يطابق `page_` + استبدال `-` بـ `_` في معرف الخدمة */
export const UI_VISIBILITY_PAGE_KEYS = [
  'page_live_indicators',
  'page_public_issues',
  'page_knowledge_base',
  'page_operational_updates',
  'page_what_did_rafeeq_learn',
  'page_teach_rafeeq_experience',
] as const;

export const UI_VISIBILITY_VIEW_KEYS = ['view_dashboard', 'view_callhelper'] as const;

/** أزرار إنشاء المحتوى المرتفع — كل مفتاح يتحكم بزر واحد */
export const UI_VISIBILITY_GRANULAR_CREATE_KEYS = [
  'action_common_issue_create',
  'action_knowledge_article_create',
  'action_operational_update_create',
  'action_training_example_create',
] as const;

/** صلاحيات إجراءات إدارية (افتراضيًا معطّلة إلا إذا فُعّلت صراحةً أو كان الدور admin) */
export const UI_VISIBILITY_ADMIN_ACTION_KEYS = [
  'action_delete_confirmed_briefing',
] as const;

/** قديم: كان يعطّل كل أزرار الإنشاء معاً — ما زال يُقرأ للتوافق مع بيانات قديمة */
const LEGACY_ACTIONS_ELEVATED_CREATE = 'actions_elevated_create';

export type UiVisibilityPageKey = (typeof UI_VISIBILITY_PAGE_KEYS)[number];
export type UiVisibilityViewKey = (typeof UI_VISIBILITY_VIEW_KEYS)[number];
export type UiVisibilityGranularCreateKey = (typeof UI_VISIBILITY_GRANULAR_CREATE_KEYS)[number];
export type UiVisibilityAdminActionKey = (typeof UI_VISIBILITY_ADMIN_ACTION_KEYS)[number];
export type UiVisibilityKey =
  | UiVisibilityPageKey
  | UiVisibilityViewKey
  | UiVisibilityGranularCreateKey
  | UiVisibilityAdminActionKey;

export const UI_VISIBILITY_SURFACE_KEY_LIST: readonly (UiVisibilityPageKey | UiVisibilityViewKey)[] = [
  ...UI_VISIBILITY_PAGE_KEYS,
  ...UI_VISIBILITY_VIEW_KEYS,
];

export const UI_VISIBILITY_KEY_LIST: readonly UiVisibilityKey[] = [
  ...UI_VISIBILITY_SURFACE_KEY_LIST,
  ...UI_VISIBILITY_GRANULAR_CREATE_KEYS,
  ...UI_VISIBILITY_ADMIN_ACTION_KEYS,
];

export const UI_SURFACE_LABELS_AR: Record<UiVisibilityPageKey | UiVisibilityViewKey, string> = {
  page_live_indicators: 'المؤشرات اللحظية (في القائمة)',
  page_public_issues: 'المشاكل العامة (في القائمة)',
  page_knowledge_base: 'سجل المعرفة (في القائمة)',
  page_operational_updates: 'التحديثات التشغيلية (في القائمة)',
  page_what_did_rafeeq_learn: 'وش تعلم رفيق؟ (في القائمة)',
  page_teach_rafeeq_experience: 'تجربة علّم رفيق (عند فتحها من التطبيق)',
  view_dashboard: 'تبويب لوحة التحكم',
  view_callhelper: 'تبويب مساعد المكالمات',
};

export const GRANULAR_CREATE_LABELS_AR: Record<UiVisibilityGranularCreateKey, string> = {
  action_common_issue_create: 'إضافة مشكلة عامة',
  action_knowledge_article_create: 'إضافة مقال جديد',
  action_operational_update_create: 'إضافة تحديث جديد',
  action_training_example_create: 'إضافة مثال تدريبي',
};

export const ADMIN_ACTION_LABELS_AR: Record<UiVisibilityAdminActionKey, string> = {
  action_delete_confirmed_briefing: 'حذف إفادة مؤكدة (لوحة المؤشرات)',
};

export const UI_VISIBILITY_LABELS_AR: Record<UiVisibilityKey, string> = {
  ...UI_SURFACE_LABELS_AR,
  ...GRANULAR_CREATE_LABELS_AR,
  ...ADMIN_ACTION_LABELS_AR,
};

const ADMIN_ACTION_KEY_SET = new Set<string>(UI_VISIBILITY_ADMIN_ACTION_KEYS);

export type UserWithUiVisibility = PermUserLike & { uiVisibility?: Record<string, boolean> | null };

/** القيمة الافتراضية: ظهور كامل ما لم يُخزَّن صراحةً `false` */
export function isUiFlagEnabled(u: UserWithUiVisibility | null | undefined, key: string): boolean {
  const v = u?.uiVisibility?.[key];
  if (v === false) return false;
  return true;
}

export function pageKeyForServiceId(serviceId: string): string {
  return `page_${serviceId.replace(/-/g, '_')}`;
}

export function buildVisibilityDraft(raw?: Record<string, boolean> | null): Record<UiVisibilityKey, boolean> {
  const d = {} as Record<UiVisibilityKey, boolean>;
  for (const key of UI_VISIBILITY_KEY_LIST) {
    if (ADMIN_ACTION_KEY_SET.has(key)) {
      d[key] = raw?.[key] === true;
    } else {
      d[key] = raw?.[key] !== false;
    }
  }
  return d;
}

/** تعريفات أربعة أزرار الإنشاء (لحوارات إدارة المستخدمين) */
export const GRANULAR_CREATE_DEFINITIONS: { key: UiVisibilityGranularCreateKey; label: string }[] =
  UI_VISIBILITY_GRANULAR_CREATE_KEYS.map((key) => ({ key, label: GRANULAR_CREATE_LABELS_AR[key] }));

export const ADMIN_ACTION_DEFINITIONS: { key: UiVisibilityAdminActionKey; label: string }[] =
  UI_VISIBILITY_ADMIN_ACTION_KEYS.map((key) => ({ key, label: ADMIN_ACTION_LABELS_AR[key] }));

/** أزرار المحتوى + صلاحيات الإجراءات (حوار صلاحيات المستخدم) */
export const CONTENT_PERMISSION_DEFINITIONS: {
  key: UiVisibilityGranularCreateKey | UiVisibilityAdminActionKey;
  label: string;
  /** true = يُفعَّل صراحةً فقط (افتراض off)، وإلا افتراض on */
  optIn: boolean;
}[] = [
  ...GRANULAR_CREATE_DEFINITIONS.map((d) => ({ ...d, optIn: false })),
  ...ADMIN_ACTION_DEFINITIONS.map((d) => ({ ...d, optIn: true })),
];

/** حذف إفادة مؤكدة من لوحة المؤشرات — للمسؤول دائمًا، وللآخرين عند تفعيل الصلاحية صراحةً */
export function canDeleteConfirmedBriefing(
  u: UserWithUiVisibility | null | undefined,
): boolean {
  if (u?.role === 'admin') return true;
  return u?.uiVisibility?.action_delete_confirmed_briefing === true;
}

/** صفحات وتبويبات فقط (بدون أزرار الإنشاء الأربعة) */
export const UI_SURFACE_DEFINITIONS: { key: UiVisibilityPageKey | UiVisibilityViewKey; label: string }[] =
  UI_VISIBILITY_SURFACE_KEY_LIST.map((key) => ({ key, label: UI_SURFACE_LABELS_AR[key] }));

/** القائمة الكاملة للتوافق مع كود قديم يستورد الاسم */
export const UI_VISIBILITY_DEFINITIONS: { key: UiVisibilityKey; label: string }[] = UI_VISIBILITY_KEY_LIST.map(
  (key) => ({ key, label: UI_VISIBILITY_LABELS_AR[key] }),
);

const STAFF_ELEVATED_CREATE_ROLES = new Set(['moderator', 'customer_service']);

/**
 * زر إنشاء محدد: دور + permContentCreate + مفتاح الواجهة (أو المفتاح القديم `actions_elevated_create` إن وُجد).
 * للمشرف وموظف خدمة العملاء: أزرار الإنشاء الأربعة تُفعَّل بلا اشتراط permContentCreate (يُحترم إخفاء الواجهة فقط).
 */
export function isGranularCreateEnabled(
  u: UserWithUiVisibility | null | undefined,
  key: UiVisibilityGranularCreateKey,
): boolean {
  const role = u?.role as string | undefined;
  if (STAFF_ELEVATED_CREATE_ROLES.has(role ?? '')) {
    const direct = u?.uiVisibility?.[key];
    if (direct === false) return false;
    const legacy = u?.uiVisibility?.[LEGACY_ACTIONS_ELEVATED_CREATE];
    if (legacy === false) return false;
    return true;
  }

  if (!canCreateElevatedContentUser(u)) return false;
  const direct = u?.uiVisibility?.[key];
  if (direct === false) return false;
  if (direct === true) return true;
  const legacy = u?.uiVisibility?.[LEGACY_ACTIONS_ELEVATED_CREATE];
  if (legacy === false) return false;
  return true;
}
