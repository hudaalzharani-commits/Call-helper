import fs from 'fs';
let s = fs.readFileSync('components/admin/ReviewCenterPage.tsx', 'utf8');
const reps = [
  ["return 'عالي'", "return t('admin.review.priorityHigh')"],
  ["return 'متوسط'", "return t('admin.review.priorityMedium')"],
  ["return 'منخفض'", "return t('admin.review.priorityLow')"],
  ["return 'حرج'", "return t('admin.review.riskCritical')"],
  ["return 'تصاعدي'", "return t('admin.review.trendRising')"],
  ["return 'مستقر'", "return t('admin.review.trendStable')"],
  ["return 'تنازلي'", "return t('admin.review.trendDeclining')"],
  ["toastMessage = 'تم قبول الاقتراح بنجاح'", "toastMessage = t('admin.review.toastApproved')"],
  ["toastMessage = 'تم قبول الاقتراح مع التعديلات'", "toastMessage = t('admin.review.toastModified')"],
  ["toastMessage = 'تم رفض الاقتراح'", "toastMessage = t('admin.review.toastRejected')"],
  ["description: actionComment || 'تم تنفيذ الإجراء'", "description: actionComment || t('admin.review.actionExecuted')"],
  ["toast.success('تم إرسال الاقتراح إلى الأرشيف'", "toast.success(t('admin.review.toastArchived')"],
  ["description: 'يمكنك الرجوع إليه لاحقاً'", "description: t('admin.review.toastArchivedDesc')"],
  ["toast.info('تم وضع علامة \"يحتاج بيانات أكثر\"'", "toast.info(t('admin.review.toastNeedData')"],
  ["description: 'سيستمر النظام في جمع البيانات'", "description: t('admin.review.toastNeedDataDesc')"],
  ['return (\n    <div className="space-y-4">', 'return (\n    <div key={locale} dir={dir} className="space-y-4">'],
  ['مراجعة ما تعلّمه النظام قبل التطبيق', "{t('admin.review.subtitleLearn')}"],
  ['هذه الصفحة لا تعمل حالياً', "{t('admin.review.demoNote')}"],
  ['Pending: {pendingCount}', "{t('admin.review.pendingBadge', { count: pendingCount })}".replace('pendingCount', 'pendingCount')],
  ["? '✓ مقبول'", "? t('admin.review.statusApproved')"],
  ["? '✓ معدّل'", "? t('admin.review.statusModified')"],
  ["? '✗ مرفوض'", "? t('admin.review.statusRejected')"],
  [": '⏸ يحتاج بيانات'", ": t('admin.review.statusNeedData')"],
  ['لا توجد مراجعات معلقة', "{t('admin.review.emptyQueue')}"],
  ['اختر عنصراً من القائمة للمراجعة', "{t('admin.review.selectItemHint')}"],
  ['<strong>ملاحظة:</strong> اقتراحات التعلم', '<strong>{t(\'admin.review.notificationHintLabel\')}</strong> {t(\'admin.review.notificationHint\')}'],
  ["{actionType === 'approve' && 'تأكيد القبول والتطبيق'}", "{actionType === 'approve' && t('admin.review.confirmApprove')}"],
  ["{actionType === 'modify' && 'تأكيد القبول مع التعديل'}", "{actionType === 'modify' && t('admin.review.confirmModify')}"],
  ["{actionType === 'reject' && 'تأكيد الرفض'}", "{actionType === 'reject' && t('admin.review.confirmReject')}"],
  ["'سيتم تطبيق هذا الاقتراح مباشرة على النظام. هل أنت متأكد؟'", "t('admin.review.confirmApproveDesc')"],
  ["'سيتم تطبيق التعديلات التي أدخلتها. يرجى المراجعة قبل التأكيد.'", "t('admin.review.confirmModifyDesc')"],
  ["{actionType === 'reject' && 'لن يتم تطبيق هذا الاقتراح. هل أنت متأكد؟'}", "{actionType === 'reject' && t('admin.review.confirmRejectDesc')}"],
  ['placeholder="أضف ملاحظاتك هنا..."', "placeholder={t('admin.review.commentPlaceholder')}"],
  ['>إلغاء<', ">{t('admin.review.cancel')}<"],
  ['\n              تأكيد\n', "\n              {t('admin.review.confirmBtn')}\n"],
  ['<DialogContent className="glass-card border-2 max-w-xl" dir="rtl">', '<DialogContent className="glass-card border-2 max-w-xl" dir={dir}>'],
  ['التأثير: {item.impact}', "{t('admin.review.impactLabel')} {item.impact === 'high' ? t('admin.review.impactHigh') : t('admin.review.impactMedium')}"],
];
for (const [a, b] of reps) s = s.split(a).join(b);
// fix impact line - might be wrong, use simpler
s = s.replace(
  "{t('admin.review.impactLabel')} {item.impact === 'high' ? t('admin.review.impactHigh') : t('admin.review.impactMedium')}",
  "{t('admin.review.impactLabel')} {getImpactName(item.impact as ImpactLevel)}"
);
fs.writeFileSync('components/admin/ReviewCenterPage.tsx', s);
console.log('review done');
