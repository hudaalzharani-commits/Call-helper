import fs from 'fs';

function addImportAndHook(path, hookLine) {
  let s = fs.readFileSync(path, 'utf8');
  if (s.includes('useI18nLayout')) return s;
  const lastImport = s.lastIndexOf('\nimport ');
  const end = s.indexOf('\n', lastImport + 1);
  s = s.slice(0, end) + "\nimport { useI18nLayout } from '../../hooks/useI18nLayout';" + s.slice(end);
  return s;
}

// SystemLogsPage
{
  let s = fs.readFileSync('components/admin/logs/SystemLogsPage.tsx', 'utf8');
  if (!s.includes('useI18nLayout')) {
    s = s.replace(
      'import {\n  fetchSystemLogs,',
      "import { useI18nLayout } from '../../../hooks/useI18nLayout';\nimport {\n  fetchSystemLogs,"
    );
    s = s.replace(
      'export function SystemLogsPage() {\n  const [logs',
      "export function SystemLogsPage() {\n  const { locale, dir, t } = useI18nLayout();\n  const [logs"
    );
    s = s.replace(
      'setLoadError(e instanceof Error ? e.message : "فشل تحميل السجلات");',
      "setLoadError(e instanceof Error ? e.message : t('admin.systemLogs.loadFailed'));"
    );
    s = s.replace('}, []);', '}, [t]);');
    const map = {
      "case 'logic-bug': return 'خطأ منطقي'": "case 'logic-bug': return t('admin.systemLogs.typeLogicBug')",
      "case 'flow-bug': return 'خطأ في التدفق'": "case 'flow-bug': return t('admin.systemLogs.typeFlowBug')",
      "case 'error': return 'خطأ'": "case 'error': return t('admin.systemLogs.typeError')",
      "case 'crash': return 'تعطل'": "case 'crash': return t('admin.systemLogs.typeCrash')",
      "'حرج'": "t('admin.systemLogs.severityCritical')",
      "'عالي'": "t('admin.systemLogs.severityHigh')",
      "'متوسط'": "t('admin.systemLogs.severityMedium')",
      "'منخفض'": "t('admin.systemLogs.severityLow')",
      "'مفتوح'": "t('admin.systemLogs.statusOpen')",
      "'محلول'": "t('admin.systemLogs.statusResolved')",
      "'متجاهل'": "t('admin.systemLogs.statusIgnored')",
      '>سجلات النظام<': ">{t('admin.systemLogs.title')}<",
      'سجلات تتعلق بسلوك النظام': "{t('admin.systemLogs.subtitle')}",
      '>صحة النظام<': ">{t('admin.systemLogs.systemHealth')}<",
      "'حرجة'": "t('admin.systemLogs.healthCritical')",
      "'تحذير'": "t('admin.systemLogs.healthWarning')",
      "'مستقرة'": "t('admin.systemLogs.healthStable')",
      '>تشخيص:<': ">{t('admin.systemLogs.diagnosis')}<",
      '<option value="all">الكل</option>': '<option value="all">{t(\'admin.systemLogs.filterAll\')}</option>',
      'خطأ منطقي</option>': "{t('admin.systemLogs.typeLogicBug')}</option>",
      'خطأ في التدفق</option>': "{t('admin.systemLogs.typeFlowBug')}</option>",
      '>خطأ</option>': ">{t('admin.systemLogs.typeError')}</option>",
      'تعطل</option>': "{t('admin.systemLogs.typeCrash')}</option>",
      'حرج</option>': "{t('admin.systemLogs.severityCritical')}</option>",
      'كل الفترات</option>': "{t('admin.systemLogs.periodAll')}</option>",
      'اليوم</option>': "{t('admin.systemLogs.periodToday')}</option>",
      'آخر 7 أيام</option>': "{t('admin.systemLogs.period7d')}</option>",
      'آخر 30 يوم</option>': "{t('admin.systemLogs.period30d')}</option>",
      'placeholder="بحث برقم الحالة..."': "placeholder={t('admin.systemLogs.searchPlaceholder')}",
      '>إعادة تعيين<': ">{t('admin.systemLogs.resetFilters')}<",
      '>إعادة المحاولة<': ">{t('admin.systemLogs.retry')}<",
      '>الوقت<': ">{t('admin.systemLogs.colTime')}<",
      '>نوع النظام<': ">{t('admin.systemLogs.colSystemType')}<",
      '>الخطورة<': ">{t('admin.systemLogs.colSeverity')}<",
      '>رقم الحالة<': ">{t('admin.systemLogs.colCaseId')}<",
      '>الرسالة<': ">{t('admin.systemLogs.colMessage')}<",
      '>التأثير<': ">{t('admin.systemLogs.colImpact')}<",
      '>الحالة<': ">{t('admin.systemLogs.colStatus')}<",
      '>الوسوم<': ">{t('admin.systemLogs.colTags')}<",
      'جاري تحميل السجلات': "{t('admin.systemLogs.loading')}",
      'لا توجد سجلات مطابقة': "{t('admin.systemLogs.empty')}",
      '>تفاصيل سجل النظام<': ">{t('admin.systemLogs.detailTitle')}<",
      '`${log.impact} مستخدم`': "t('admin.systemLogs.impactUsers', { count: log.impact })",
      "'لا يوجد'": "t('admin.systemLogs.noImpact')",
    };
    for (const [a, b] of Object.entries(map)) s = s.split(a).join(b);
    s = s.replace(
      '<motion className="space-y-6"',
      '<div key={locale} dir={dir} className="space-y-6"'
    ).replace(
      /return \(\s*\n\s*<div className="space-y-6">/,
      'return (\n    <motion key={locale} dir={dir} className="space-y-6">'
    );
    // fix return wrapper
    s = s.replace(
      /return \(\s*\n\s*<div className="space-y-6">/,
      'return (\n    <div key={locale} dir={dir} className="space-y-6">'
    );
  }
  fs.writeFileSync('components/admin/logs/SystemLogsPage.tsx', s);
}

// AdminOperationalMonitoringSection
{
  let s = fs.readFileSync('components/admin/AdminOperationalMonitoringSection.tsx', 'utf8');
  if (!s.includes('useI18nLayout')) {
    s = s.replace(
      'import { OperationalIssueTracker }',
      "import { useI18nLayout } from '../../hooks/useI18nLayout';\nimport { OperationalIssueTracker }"
    );
    s = s.replace(
      'export function AdminOperationalMonitoringSection() {\n  const { isAdmin }',
      "export function AdminOperationalMonitoringSection() {\n  const { locale, dir, t } = useI18nLayout();\n  const { isAdmin }"
    );
    const reps = [
      ['setThresholdError("غير مسجّل الدخول")', "setThresholdError(t('admin.operationalMonitoring.notLoggedIn'))"],
      ['"تسجيل دخول محلي — للحفظ لازم تسجّل دخول من السيرفر (admin/admin123)"', "t('admin.operationalMonitoring.localLogin')"],
      ['setDistributionLoadError("تعذّر تحميل توزيع المشاكل")', "setDistributionLoadError(t('admin.operationalMonitoring.distributionLoadFailed'))"],
      ['body?.message || `فشل تحميل الحد (HTTP ${res.status})`', "body?.message || t('admin.operationalMonitoring.thresholdLoadFailed', { status: res.status })"],
      ['err instanceof Error ? err.message : "تعذّر الاتصال بالسيرفر"', "err instanceof Error ? err.message : t('admin.operationalMonitoring.connectionFailed')"],
      ['throw new Error("انتهت الجلسة — سجّل دخول من جديد")', "throw new Error(t('admin.operationalMonitoring.sessionExpired'))"],
      ['throw new Error("صلاحيات غير كافية — يحتاج حساب admin")', "throw new Error(t('admin.operationalMonitoring.insufficientPermissions'))"],
      ['setDistributionLoadError("تعذّر تحديث توزيع المشاكل")', "setDistributionLoadError(t('admin.operationalMonitoring.distributionUpdateFailed'))"],
      ['err instanceof Error ? err.message : "فشل الحفظ"', "err instanceof Error ? err.message : t('admin.operationalMonitoring.saveFailed')"],
      ['isGeneralIssuesOpen ? "إخفاء تفاصيل المشاكل العامة" : "إظهار تفاصيل المشاكل العامة"', "isGeneralIssuesOpen ? t('admin.operationalMonitoring.hideIssues') : t('admin.operationalMonitoring.showIssues')"],
      ['>المشاكل العامة والمتكررة<', ">{t('admin.operationalMonitoring.generalIssuesTitle')}<"],
      ['>خاص بالأدمن<', ">{t('admin.operationalMonitoring.adminOnly')}<"],
      ['>إنقاص<', ">{t('admin.operationalMonitoring.decrease')}<"],
      ['>زيادة<', ">{t('admin.operationalMonitoring.increase')}<"],
      ['>حفظ<', ">{t('admin.operationalMonitoring.save')}<"],
      ['>جاري الحفظ...<', ">{t('admin.operationalMonitoring.saving')}<"],
      ['>✓ تم الحفظ<', ">{t('admin.operationalMonitoring.saved')}<"],
      ['>الحد اليومي للمشكلة المتكررة<', ">{t('admin.operationalMonitoring.thresholdLabel')}<"],
      ['>متكرر اليوم<', ">{t('admin.operationalMonitoring.repeatedToday')}<"],
      ['>إجمالي<', ">{t('admin.operationalMonitoring.total')}<"],
      ['>المشاكل العامة<', ">{t('admin.operationalMonitoring.generalIssues')}<"],
      ['>لا توجد بيانات بعد.<', ">{t('admin.operationalMonitoring.noData')}<"],
    ];
    for (const [a, b] of reps) s = s.split(a).join(b);
    s = s.replace(
      'return (\n    <div className="space-y-6">',
      'return (\n    <div key={locale} dir={dir} className="space-y-6">'
    );
  }
  fs.writeFileSync('components/admin/AdminOperationalMonitoringSection.tsx', s);
}

// AddStepDialog
{
  let s = fs.readFileSync('components/admin/AddStepDialog.tsx', 'utf8');
  if (!s.includes('useI18nLayout')) {
    s = s.replace(
      "import { Plus, Check, X, Link2",
      "import { useI18nLayout } from '../../hooks/useI18nLayout';\nimport { Plus, Check, X, Link2"
    );
    s = s.replace(
      '}: AddStepDialogProps) {\n  const { getStepsBySubConditionName }',
      '}: AddStepDialogProps) {\n  const { locale, dir, t } = useI18nLayout();\n  const { getStepsBySubConditionName }'
    );
    s = s.replace('dir="rtl"', 'dir={dir} key={locale}');
    s = s.replace(
      "editingSubCondition ? 'تعديل الخطوة' : 'إضافة خطوة جديدة'",
      "editingSubCondition ? t('admin.addStep.editTitle') : t('admin.addStep.addTitle')"
    );
    s = s.replace('حدد الخطوة والإجراء المناسب', "{t('admin.addStep.desc')}");
    s = s.replace('>اسم الخطوة<', ">{t('admin.addStep.stepName')}<");
    s = s.replace('placeholder="مثال: دفع الفاتورة، تم الدفع..."', "placeholder={t('admin.addStep.stepNamePlaceholder')}");
    s = s.replace('>إلغاء<', ">{t('admin.addStep.cancel')}<");
    s = s.replace('>حفظ التعديلات<', ">{t('admin.addStep.saveEdits')}<");
    s = s.replace('>إضافة<', ">{t('admin.addStep.add')}<");
    fs.writeFileSync('components/admin/AddStepDialog.tsx', s);
  }
}

// LearnSettingsPage header
{
  let s = fs.readFileSync('components/admin/LearnSettingsPage.tsx', 'utf8');
  if (!s.includes('useI18nLayout')) {
    s = s.replace("import { useState } from 'react';", "import { useState } from 'react';\nimport { useI18nLayout } from '../../hooks/useI18nLayout';");
    s = s.replace('export function LearnSettingsPage() {', 'export function LearnSettingsPage() {\n  const { locale, dir, t } = useI18nLayout();');
    s = s.replace('return (\n    <div className="space-y-6">', 'return (\n    <div key={locale} dir={dir} className="space-y-6">');
    s = s.replace('>Learn from User Settings<', ">{t('admin.learn.title')}<");
    s = s.replace('إعدادات التعلم الآلي والذكاء الاصطناعي', "{t('admin.learn.subtitle')}");
    s = s.replace('هذه الصفحة لا تعمل حالياً', "{t('admin.learn.demoNote')}");
    s = s.replace('>إعادة تدريب النموذج<', ">{t('admin.learn.retrain')}<");
    s = s.replace('>حفظ الإعدادات<', ">{t('admin.learn.save')}<");
    s = s.replace('>تفاعلات المستخدمين<', ">{t('admin.learn.statInteractions')}<");
    s = s.replace('>دقة النموذج<', ">{t('admin.learn.statAccuracy')}<");
    s = s.replace('>أنماط محفوظة<', ">{t('admin.learn.statPatterns')}<");
    s = s.replace('>تحسينات تلقائية<', ">{t('admin.learn.statImprovements')}<");
    s = s.replace('>منطق التعلم من سجلات النظام<', ">{t('admin.learn.logicTitle')}<");
    s = s.replace("'إخفاء المصادر'", "t('admin.learn.hideSources')");
    s = s.replace("'عرض المصادر'", "t('admin.learn.showSources')");
    s = s.replace("'عالي'", "t('admin.learn.impactHigh')");
    s = s.replace("'متوسط'", "t('admin.learn.impactMedium')");
    fs.writeFileSync('components/admin/LearnSettingsPage.tsx', s);
  }
}

// DatabasePage toasts
{
  let s = fs.readFileSync('components/admin/DatabasePage.tsx', 'utf8');
  if (!s.includes('useI18nLayout')) {
    s = s.replace("import { toast } from 'sonner';", "import { toast } from 'sonner';\nimport { useI18nLayout } from '../../hooks/useI18nLayout';");
    s = s.replace('export function DatabasePage', 'export function DatabasePage');
    s = s.replace(/export function DatabasePage\(\) \{/, "export function DatabasePage() {\n  const { locale, dir, t } = useI18nLayout();");
    const reps = [
      ["toast.success(nextIsActive ? 'تم تفعيل الحالة' : 'تم تعطيل الحالة')", "toast.success(nextIsActive ? t('admin.database.caseActivated') : t('admin.database.caseDeactivated'))"],
      ["toast.error(error.message || 'فشل في تحديث حالة التفعيل')", "toast.error(error.message || t('admin.database.toggleFailed'))"],
      ["toast.error('فشل في تحميل الحالات')", "toast.error(t('admin.database.loadFailed'))"],
      ["toast.success('تم إضافة الحالة بنجاح')", "toast.success(t('admin.database.addSuccess'))"],
      ["toast.error(error.message || 'فشل في إضافة الحالة')", "toast.error(error.message || t('admin.database.addFailed'))"],
      ["toast.success('تم تحديث الحالة بنجاح')", "toast.success(t('admin.database.updateSuccess'))"],
      ["toast.error(error.message || 'فشل في تحديث الحالة')", "toast.error(error.message || t('admin.database.updateFailed'))"],
      ["toast.success('تم حذف الحالة بنجاح')", "toast.success(t('admin.database.deleteSuccess'))"],
      ["toast.error('فشل في حذف الحالة')", "toast.error(t('admin.database.deleteFailed'))"],
      ["toast.success('تمت أرشفة الحالة')", "toast.success(t('admin.database.archiveSuccess'))"],
      ["toast.error(error instanceof Error ? error.message : 'فشل في أرشفة الحالة')", "toast.error(error instanceof Error ? error.message : t('admin.database.archiveFailed'))"],
      ['placeholder="بحث في قاعدة البيانات (CaseID، كلمات، تصنيف…)"', "placeholder={t('admin.database.searchPlaceholder')}"],
      ['aria-label="بحث في الحالات"', "aria-label={t('admin.database.searchAria')}"],
      ['>تحديث البيانات<', ">{t('admin.database.refreshData')}<"],
    ];
    for (const [a, b] of reps) s = s.split(a).join(b);
    fs.writeFileSync('components/admin/DatabasePage.tsx', s);
  }
}

console.log('pass 3');
