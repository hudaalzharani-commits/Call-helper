import fs from 'fs';

// AdvancedSettings remaining JSX text
{
  let s = fs.readFileSync('components/admin/AdvancedSettingsPage.tsx', 'utf8');
  const pairs = [
    ['\n            إعادة تعيين\n', "\n            {t('admin.advancedSettings.reset')}\n"],
    ['\n            حفظ التغييرات\n', "\n            {t('admin.advancedSettings.saveChanges')}\n"],
    ['\n            إضافة مسار\n', "\n            {t('admin.advancedSettings.addRoute')}\n"],
    ['\n                          نشط\n', "\n                          {t('admin.advancedSettings.active')}\n"],
    ['\n                          معطل\n', "\n                          {t('admin.advancedSettings.disabled')}\n"],
    ['\n                          مسار مربوط\n', "\n                          {t('admin.advancedSettings.linkedRoute')}\n"],
    ['\n                          إضافة خطوة\n', "\n                          {t('admin.advancedSettings.addStep')}\n"],
    ['متداخلة {level}', "{t('admin.advancedSettings.nestedLevel', { level })}"],
    ['مرتبطة ({linkedStepsCount + 1})', "{t('admin.advancedSettings.linkedBadge', { count: linkedStepsCount + 1 })}"],
    ['{totalLinkedRoutesCount} مسار متصل', "{t('admin.advancedSettings.connectedRoutes', { count: totalLinkedRoutesCount })}"],
    ['{subCond.childConditions!.length} خطوة فرعية', "{t('admin.advancedSettings.childSteps', { count: subCond.childConditions!.length })}"],
    ['ربط ({question.linkedRouteIds.length})', "{t('admin.advancedSettings.linkRoutes', { count: question.linkedRouteIds.length })}"],
    ["const message = `الخطوة \"${name}\" موجودة في ${linkedCount + 1} مسار.\\n\\nاختر الإجراء:\\n- إلغاء: لا تحذف\\n- OK: حذف من المسار الحالي فقط\\n\\n(لحذف من جميع المسارات، استخدم زر الحذف في Dialog التعديل)`", "const message = t('admin.advancedSettings.deleteStepLinked', { name, count: linkedCount + 1 })"],
    ['title={`مرتبطة مع ${linkedStepsCount} ${linkedStepsCount === 1 ? \'مسار آخر\' : \'مسارات أخرى\'}`}', "title={t('admin.advancedSettings.linkedWith', { count: linkedStepsCount, label: linkedStepsCount === 1 ? t('admin.advancedSettings.linkedRouteOther') : t('admin.advancedSettings.linkedRoutesOther') })}"],
    ['title={`فئات مرتبطة: ${route.categories.join(\'، \')}`}', "title={t('admin.advancedSettings.categoriesTitle', { list: route.categories.join(', ') })}"],
    [': `${route.categories.length} فئات`', ": t('admin.advancedSettings.categoriesCount', { count: route.categories.length })"],
    ['title={`جهات مرتبطة: ${route.entityTypes.join(\'، \')}`}', "title={t('admin.advancedSettings.entitiesTitle', { list: route.entityTypes.join(', ') })}"],
    [': `${route.entityTypes.length} جهات`', ": t('admin.advancedSettings.entitiesCount', { count: route.entityTypes.length })"],
    ['{step?.subConditions.length || 0} {step?.subConditions.length === 1 ? \'خطوة\' : \'خطوات\'}', "{step?.subConditions.length || 0} {step?.subConditions.length === 1 ? t('admin.advancedSettings.stepOne') : t('admin.advancedSettings.stepsMany')}"],
  ];
  for (const [a, b] of pairs) s = s.split(a).join(b);
  fs.writeFileSync('components/admin/AdvancedSettingsPage.tsx', s);
}

// UsersRoles remaining
{
  let s = fs.readFileSync('components/admin/UsersRolesPage.tsx', 'utf8');
  const pairs = [
    ['\n          إضافة مستخدم جديد\n', "\n          {t('admin.users.addUser')}\n"],
    ['\n              إلغاء\n', "\n              {t('admin.users.cancel')}\n"],
    ['\n              إضافة\n', "\n              {t('admin.users.addUser')}\n"],
    ['\n              حفظ التعديلات\n', "\n              {t('admin.users.saveEdits')}\n"],
    ['\n              تغيير كلمة المرور\n', "\n              {t('admin.users.changePasswordDialogTitle')}\n"],
    ['سيتم تغيير كلمة المرور دون علم المستخدم', "{t('admin.users.changePasswordDesc')}"],
    ['\n              تأكيد الحذف\n', "\n              {t('admin.users.deleteDialogTitle')}\n"],
    ['هل أنت متأكد من حذف المستخدم؟', "{t('admin.users.deleteConfirm', { name: selectedUser?.name ?? '' })}".replace("''", "''")],
    ['لا يمكن حذف الحسابات الرئيسية', "{t('admin.toast.cannotDeletePrimary')}"],
    ['\n              حذف\n', "\n              {t('admin.users.delete')}\n"],
  ];
  for (const [a, b] of pairs) s = s.split(a).join(b);
  fs.writeFileSync('components/admin/UsersRolesPage.tsx', s);
}

console.log('pass 2 done');
