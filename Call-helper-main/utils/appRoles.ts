/** أدوار التطبيق — تُخزَّن في MongoDB كحقل `role` */
export const APP_ROLES = ['user', 'customer_service', 'moderator', 'admin'] as const;
export type AppRole = (typeof APP_ROLES)[number];

export const ROLE_LABEL_AR: Record<AppRole, string> = {
  admin: 'مسؤول النظام',
  user: 'مستخدم عادي',
  customer_service: 'موظف خدمة عملاء',
  moderator: 'مشرف',
};

export function isPrivilegedStaff(role: string | undefined): boolean {
  return role === 'admin' || role === 'moderator' || role === 'customer_service';
}

export function isModeratorOrAdmin(role: string | undefined): boolean {
  return role === 'admin' || role === 'moderator';
}

/** مستخدم أو جلسة — للتحقق من الصلاحيات المخزّنة */
export type PermUserLike = {
  role?: AppRole | string;
  permAdminPanel?: boolean;
  permContentCreate?: boolean;
} | null | undefined;

/** لوحة الإدارة: أي مستخدم بدور admin يرى التبويب دائماً (لا نعتمد على permAdminPanel حتى لا يُخفى التبويب بسبب false خاطئ في DB أو بعد تحديث الجلسة). */
export function effectivePermAdminPanel(u: PermUserLike): boolean {
  const role = u?.role as AppRole | undefined;
  return role === 'admin';
}

/** إنشاء محتوى مرتفع: admin/moderator + العلم permContentCreate (افتراضي true للقديم) */
export function effectivePermContentCreate(u: PermUserLike): boolean {
  const role = u?.role as AppRole | undefined;
  if (role !== 'admin' && role !== 'moderator') return false;
  if (typeof u?.permContentCreate === 'boolean') return u.permContentCreate;
  return true;
}

export function canShowAdminTab(u: PermUserLike): boolean {
  return effectivePermAdminPanel(u);
}

export function canCreateElevatedContentUser(u: PermUserLike): boolean {
  return effectivePermContentCreate(u);
}

/** نصوص توضيحية لحوار المستخدمين (حسب الدور المختار) */
export function rolePermissionsSummary(role: AppRole): string[] {
  switch (role) {
    case 'admin':
      return [
        'تبويب «الأدمن» ولوحة الإدارة: يظهران دائماً لمسؤول النظام.',
        'إنشاء محتوى (مشكلة عامة، مقال، تحديث، تدريب): يُضبط من نفس العمود عند الحاجة.',
        'ظهور صفحات لوحة التحكم وأزرار الإجراءات: يُضبط من حوار «تعديل المستخدم» → قسم «ظهور الصفحات وأزرار الإجراءات».',
        'حذف مقالات المعرفة من الواجهة: للمسؤول فقط (حسب النظام).',
      ];
    case 'moderator':
      return [
        'تبويب «الأدمن» ولوحة الإدارة: غير متاحين لهذا الدور.',
        'أزرار إضافة المحتوى (مشكلة عامة، مقال، تحديث تشغيلي، مثال تدريبي): تُضبط من حوار «صلاحيات».',
        'تعديل المحتوى والتحديثات والتدريب حيث تسمح الصفحة.',
      ];
    case 'customer_service':
      return [
        'تبويب «الأدمن» ولوحة الإدارة: مخفيان.',
        'أزرار إضافة المحتوى (مشكلة عامة، مقال، تحديث تشغيلي، مثال تدريبي): تُضبط من حوار «صلاحيات».',
        'يمكن التعديل على مقالات المعرفة والتحديثات التشغيلية عند توفر الإجراء في الجدول.',
      ];
    case 'user':
    default:
      return [
        'تبويب «الأدمن» ولوحة الإدارة: مخفيان.',
        'أزرار الإضافة السريعة أعلاه: مخفية.',
        'استخدام الخدمات للقراءة والمساعدة حسب كل صفحة.',
      ];
  }
}
