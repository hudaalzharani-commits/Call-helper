import fs from 'fs';

function wireAdvanced() {
  const path = 'components/admin/AdvancedSettingsPage.tsx';
  let s = fs.readFileSync(path, 'utf8');
  const pairs = [
    ["toast.info('سيتم إعادة تعيين الإعدادات')", "toast.info(t('admin.advancedSettings.resetInfo'))"],
    ["toast.error('لم يتم العثور على الخطوات المستهدفة')", "toast.error(t('admin.advancedSettings.stepsNotFound'))"],
    ["toast.success('تم إضافة الخطوة بنجاح')", "toast.success(t('admin.advancedSettings.stepAdded'))"],
    ["toast.error('يرجى إدخال اسم الشرط')", "toast.error(t('admin.advancedSettings.enterConditionName'))"],
    ["toast.success('تم تحديث الشرط')", "toast.success(t('admin.advancedSettings.conditionUpdated'))"],
    ["toast.success('تم حذف الخطوة من المسار الحالي')", "toast.success(t('admin.advancedSettings.stepDeletedCurrent'))"],
    ["toast.success('تم حذف الشرط')", "toast.success(t('admin.advancedSettings.conditionDeleted'))"],
    ["toast.success('تم حفظ جميع الإعدادات بنجاح')", "toast.success(t('admin.advancedSettings.allSaved'))"],
    ["toast.error('تعذر حفظ الإعدادات، حاول مرة أخرى')", "toast.error(t('admin.toast.saveFailed'))"],
    ["toast.success('✅ تم تصدير الإعدادات بنجاح')", "toast.success(t('admin.advancedSettings.exportSuccess'))"],
    ["toast.error('❌ فشل تصدير الإعدادات')", "toast.error(t('admin.advancedSettings.exportFailed'))"],
    ["toast.success('✅ تم استيراد الإعدادات بنجاح')", "toast.success(t('admin.advancedSettings.importSuccess'))"],
    ["toast.error('❌ ملف الإعدادات غير صالح')", "toast.error(t('admin.advancedSettings.importInvalid'))"],
    ["toast.error('❌ فشل قراءة ملف الإعدادات')", "toast.error(t('admin.advancedSettings.importReadFailed'))"],
    ["label: 'متابعة'", "label: t('admin.advancedSettings.actionContinue')"],
    ["label: 'إيقاف وحل'", "label: t('admin.advancedSettings.actionForceSolution')"],
    ["label: 'إجابة مباشرة'", "label: t('admin.advancedSettings.actionDirectAnswer')"],
    ["label: 'تصعيد'", "label: t('admin.advancedSettings.actionEscalation')"],
    ['>إعادة تعيين<', ">{t('admin.advancedSettings.reset')}<"],
    ['>حفظ التغييرات<', ">{t('admin.advancedSettings.saveChanges')}<"],
    ['>إضافة مسار<', ">{t('admin.advancedSettings.addRoute')}<"],
    ['>لا توجد مسارات بعد<', ">{t('admin.advancedSettings.noRoutes')}<"],
    ['اضغط "إضافة مسار" للبدء', "{t('admin.advancedSettings.noRoutesHint')}"],
    ['>نشط<', ">{t('admin.advancedSettings.active')}<"],
    ['>معطل<', ">{t('admin.advancedSettings.disabled')}<"],
    ['>مسار مربوط<', ">{t('admin.advancedSettings.linkedRoute')}<"],
    ['>إضافة خطوة<', ">{t('admin.advancedSettings.addStep')}<"],
    ['>إعدادات Gray Area<', ">{t('admin.advancedSettings.grayAreaTitle')}<"],
    ['>أسئلة Gray Area<', ">{t('admin.advancedSettings.grayQuestions')}<"],
    ['>مفعّل<', ">{t('admin.advancedSettings.enabled')}<"],
    ['>معطّل<', ">{t('admin.advancedSettings.disabledSwitch')}<"],
    ['>قواعد التوجيه (Routes)<', ">{t('admin.advancedSettings.routesTitle')}<"],
    ['المسارات الرئيسية - ستظهر في زر الوضع المتقدم بالترتيب', "{t('admin.advancedSettings.routesDesc')}"],
    ['>الخطوات والإجراءات:<', ">{t('admin.advancedSettings.stepsAndActions')}<"],
    ['لا توجد خطوات - اضغط "إضافة خطوة" لتحديد الإجراءات', "{t('admin.advancedSettings.noSteps')}"],
    ['>إجبار التوجيه عند التعارض<', ">{t('admin.advancedSettings.forceRouting')}<"],
    ['توجيه تلقائي عند تعارض المسارات', "{t('admin.advancedSettings.forceRoutingDesc')}"],
    ['>عرض تلميح قبل القرار<', ">{t('admin.advancedSettings.showHint')}<"],
    ['رسالة توجيهية قبل اتخاذ القرار', "{t('admin.advancedSettings.showHintDesc')}"],
    ['>عرض TAG الإجراء<', ">{t('admin.advancedSettings.showActionTag')}<"],
    ['>عرض ملاحظات الإجراء<', ">{t('admin.advancedSettings.showActionNotes')}<"],
    ['>إعدادات النتائج والأوزان<', ">{t('admin.advancedSettings.scoringTitle')}<"],
    ['عتبات النتيجة وأوزان العوامل', "{t('admin.advancedSettings.scoringDesc')}"],
    ['>عتبات النتيجة النهائية<', ">{t('admin.advancedSettings.thresholdsTitle')}<"],
    ['>أوزان العوامل<', ">{t('admin.advancedSettings.weightsTitle')}<"],
    ['>إضافة وزن<', ">{t('admin.advancedSettings.addWeight')}<"],
    ['>لا توجد أوزان محددة<', ">{t('admin.advancedSettings.noWeights')}<"],
    ['>رد مباشر تلقائي<', ">{t('admin.advancedSettings.autoDirect')}<"],
    ['>وضع متقدم اختياري<', ">{t('admin.advancedSettings.optionalAdvanced')}<"],
    ['>منطقة رمادية (إجباري)<', ">{t('admin.advancedSettings.grayAreaThreshold')}<"],
    ['>📊 ملخص النطاقات:<', ">{t('admin.advancedSettings.rangeSummary')}<"],
    ['>معدل التدهور (Decay Rate)<', ">{t('admin.advancedSettings.decayRate')}<"],
    ['>يوم<', ">{t('admin.advancedSettings.dayUnit')}<"],
    ['>إلغاء<', ">{t('admin.advancedSettings.cancel')}<"],
    ['>حفظ<', ">{t('admin.advancedSettings.save')}<"],
    ['>إضافة<', ">{t('admin.advancedSettings.add')}<"],
    ['قواعد التوجيه - المسارات الرئيسية بدون keywords', "{t('admin.advancedSettings.routingHint')}"],
    ['(الـ AI يتعامل مع الـ keywords تلقائياً)', "{t('admin.advancedSettings.routingHintAi')}"],
    ['التحكم في خيارات Gray Area', "{t('admin.advancedSettings.grayAreaDesc')}"],
    ['💡 أسئلة ثابتة لتوجيه المستخدم في Gray Area - لا يمكن إضافة أو حذف، فقط تعديل وتفعيل', "{t('admin.advancedSettings.grayQuestionsHint')}"],
    ['تتحكم في سلوك مساعد المكالمات', "{t('admin.advancedSettings.thresholdsDesc')}"],
    ['عدد الأيام لتدهور النتيجة', "{t('admin.advancedSettings.decayRateDesc')}"],
  ];
  for (const [a, b] of pairs) s = s.split(a).join(b);
  s = s.replace(
    /if \(confirm\(`هل أنت متأكد من حذف المسار "\$\{routeName\}"\؟ سيتم حذف جميع الخطوات المرتبطة به\.`\)\)/,
    "if (confirm(t('admin.advancedSettings.deleteRouteConfirm', { name: routeName })))"
  );
  s = s.replace(
    /if \(confirm\(`هل أنت متأكد من حذف الشرط "\$\{name\}"\؟`\)\)/,
    "if (confirm(t('admin.advancedSettings.deleteConditionConfirm', { name })))"
  );
  s = s.replace(
    /toast\.success\(`✅ تم إضافة الخطوة في \$\{stepIds\.length\} مسار`\)/,
    "toast.success(t('admin.advancedSettings.stepAddedMulti', { count: stepIds.length }))"
  );
  s = s.replace(
    /toast\.success\(`✅ تم تحديث الخطوة في \$\{linkedCount \+ 1\} مسار`\)/,
    "toast.success(t('admin.advancedSettings.stepUpdatedMulti', { count: linkedCount + 1 }))"
  );
  fs.writeFileSync(path, s);
}

function wireUsers() {
  const path = 'components/admin/UsersRolesPage.tsx';
  let s = fs.readFileSync(path, 'utf8');
  const pairs = [
    ["label: 'أدمن'", "label: t('admin.users.roleAdmin')"],
    ["label: 'مشرف'", "label: t('admin.users.roleModerator')"],
    ["label: 'مستخدم'", "label: t('admin.users.roleUser')"],
    ["label: 'نشط'", "label: t('admin.users.statusActive')"],
    ["label: 'غير نشط'", "label: t('admin.users.statusInactive')"],
    ["label: 'موقوف'", "label: t('admin.users.statusSuspended')"],
    ['>إدارة المستخدمين والصلاحيات<', ">{t('admin.users.title')}<"],
    ['Users & Roles Management', "{t('admin.users.subtitle')}"],
    ['>إضافة مستخدم جديد<', ">{t('admin.users.addUser')}<"],
    ['>إجمالي المستخدمين<', ">{t('admin.users.totalUsers')}<"],
    ['>مستخدمين نشطين<', ">{t('admin.users.activeUsers')}<"],
    ['>أدمنز<', ">{t('admin.users.admins')}<"],
    ['>مشرفين<', ">{t('admin.users.moderators')}<"],
    ['placeholder="ابحث عن مستخدم..."', "placeholder={t('admin.users.searchPlaceholder')}"],
    ['value="all-roles">جميع الأدوار', 'value="all-roles">{t(\'admin.users.allRoles\')'],
    ['value="admin">أدمن', "value=\"admin\">{t('admin.users.roleAdmin')"],
    ['value="moderator">مشرف', "value=\"moderator\">{t('admin.users.roleModerator')"],
    ['value="user">مستخدم', "value=\"user\">{t('admin.users.roleUser')"],
    ['value="all-status">جميع الحالات', "value=\"all-status\">{t('admin.users.allStatus')"],
    ['value="active">نشط', "value=\"active\">{t('admin.users.statusActive')"],
    ['value="inactive">غير نشط', "value=\"inactive\">{t('admin.users.statusInactive')"],
    ['value="suspended">موقوف', "value=\"suspended\">{t('admin.users.statusSuspended')"],
    ['>المستخدم<', ">{t('admin.users.colUser')}<"],
    ['>اسم المستخدم<', ">{t('admin.users.colUsername')}<"],
    ['>البريد الإلكتروني<', ">{t('admin.users.colEmail')}<"],
    ['>الدور<', ">{t('admin.users.colRole')}<"],
    ['>الحالة<', ">{t('admin.users.colStatus')}<"],
    ['>آخر نشاط<', ">{t('admin.users.colLastActive')}<"],
    ['>الإجراءات<', ">{t('admin.users.colActions')}<"],
    ['لا توجد نتائج', "{t('admin.users.noResults')}"],
    ['title="تعديل"', "title={t('admin.users.editTitle')}"],
    ['title="تغيير كلمة المرور"', "title={t('admin.users.changePasswordTitle')}"],
    ['title="حذف"', "title={t('admin.users.deleteTitle')}"],
    ['>إلغاء<', ">{t('admin.users.cancel')}<"],
    ['>حفظ<', ">{t('admin.users.save')}<"],
    ['>حذف<', ">{t('admin.users.delete')}<"],
    ['>إضافة<', ">{t('admin.users.addUser')}<"],
    ['>حفظ التعديلات<', ">{t('admin.users.saveEdits')}<"],
    ['>تأكيد<', ">{t('admin.users.confirm')}<"],
    ['placeholder="أدخل الاسم الكامل"', "placeholder={t('admin.users.namePlaceholder')}"],
    ['>الاسم الكامل<', ">{t('admin.users.nameLabel')}<"],
    ['>اسم المستخدم<', ">{t('admin.users.usernameLabel')}"],
    ['>البريد الإلكتروني<', ">{t('admin.users.emailLabel')}<"],
    ['>الدور<', ">{t('admin.users.roleLabel')}<"],
    ['>الحالة<', ">{t('admin.users.statusLabel')}<"],
    ['>كلمة المرور الجديدة<', ">{t('admin.users.newPasswordLabel')}<"],
    ['>تأكيد كلمة المرور<', ">{t('admin.users.confirmPasswordLabel')}<"],
    ['placeholder="أدخل كلمة المرور الجديدة"', "placeholder={t('admin.users.newPasswordPlaceholder')}"],
    ['placeholder="أعد إدخال كلمة المرور"', "placeholder={t('admin.users.confirmPasswordPlaceholder')}"],
    ['>أدمن<', ">{t('admin.users.roleAdmin')}<"],
    ['>مشرف<', ">{t('admin.users.roleModerator')}<"],
    ['>مستخدم<', ">{t('admin.users.roleUser')}<"],
    ['صلاحيات كاملة لإدارة النظام والمستخدمين', "{t('admin.users.roleAdminDesc')}"],
    ['إدارة المستخدمين والصلاحيات', "{t('admin.users.roleAdminPerm1')}"],
    ['تغيير كلمات المرور', "{t('admin.users.roleAdminPerm2')}"],
    ['إعدادات النظام المتقدمة', "{t('admin.users.roleAdminPerm3')}"],
    ['جميع الصلاحيات الإدارية', "{t('admin.users.roleAdminPerm4')}"],
    ['صلاحيات محدودة للإشراف على المحتوى', "{t('admin.users.roleModeratorDesc')}"],
    ['إدارة المحتوى', "{t('admin.users.roleModeratorPerm1')}"],
    ['الرد على المشاكل والاستفسارات', "{t('admin.users.roleModeratorPerm2')}"],
    ['عرض التقارير والإحصائيات', "{t('admin.users.roleModeratorPerm3')}"],
    ['تعديل إعدادات المسارات', "{t('admin.users.roleModeratorPerm4')}"],
    ['صلاحيات أساسية للاستخدام العادي', "{t('admin.users.roleUserDesc')}"],
    ['عرض المحتوى المتاح', "{t('admin.users.roleUserPerm1')}"],
    ['استخدام مساعد المكالمات', "{t('admin.users.roleUserPerm2')}"],
    ['عرض وتحديث الملف الشخصي', "{t('admin.users.roleUserPerm3')}"],
    ['أدخل بيانات المستخدم الجديد', "{t('admin.users.addDialogDesc')}"],
    ['>إضافة مستخدم جديد<', ">{t('admin.users.addDialogTitle')}<"],
    ['>تعديل بيانات المستخدم<', ">{t('admin.users.editDialogTitleAlt')}<"],
    ['قم بتعديل بيانات المستخدم', "{t('admin.users.editDialogDesc')}"],
    ['>تغيير كلمة المرور<', ">{t('admin.users.changePasswordDialogTitle')}<"],
    ['قم بتعيين كلمة مرور جديدة للمستخدم', "{t('admin.users.changePasswordDesc')}"],
    ['>تأكيد الحذف<', ">{t('admin.users.deleteDialogTitle')}<"],
  ];
  for (const [a, b] of pairs) s = s.split(a).join(b);
  s = s.replace(
    /عرض \{filteredUsers\.length\} من \{users\.length\} مستخدم/,
    "{t('admin.users.showingUsers', { shown: filteredUsers.length, total: users.length })}"
  );
  fs.writeFileSync(path, s);
}

function wireFlowPanels() {
  let s = fs.readFileSync('components/GrayAreaWizard.tsx', 'utf8');
  s = s.replace(
    '💡 هذه الخطوة مربوطة بـ {childLinkedRoutes.length} مسار إضافي',
    "{t('grayArea.stepLinkedRoutes', { count: childLinkedRoutes.length })}"
  );
  fs.writeFileSync('components/GrayAreaWizard.tsx', s);

  s = fs.readFileSync('components/AdvancedFlowPanelV2Simple.tsx', 'utf8');
  const flowPairs = [
    ['💡 هذه الخطوة تحتوي على {totalLinkedRoutes > 0 && `${totalLinkedRoutes} مسار متصل`}{totalLinkedRoutes > 0 && totalChildConditions > 0 && \' و \'}{totalChildConditions > 0 && `${totalChildConditions} خطوة فرعية`}',
      "{t('advancedFlow.stepLinkedInfo', { routes: [totalLinkedRoutes > 0 ? t('advancedFlow.routesPart', { count: totalLinkedRoutes }) : '', totalChildConditions > 0 ? t('advancedFlow.childPart', { count: totalChildConditions }) : ''].filter(Boolean).join(totalLinkedRoutes > 0 && totalChildConditions > 0 ? t('advancedFlow.and') : '') })}".replace(/\n/g, '')],
  ];
  // simpler manual fix for advanced flow
  s = s.replace(
    /\{totalLinkedCount\} مسار متصل/g,
    "{t('advancedFlow.connectedRoutes', { count: totalLinkedCount })}"
  );
  s = s.replace(
    /\{subCond\.childConditions!\.length\} خطوة فرعية/g,
    "{t('advancedFlow.childPart', { count: subCond.childConditions!.length })}"
  );
  s = s.replace(
    "? '⚠️ ملاحظات قبل التصعيد:'",
    "? t('advancedFlow.escalationNotes')"
  );
  s = s.replace(
    "? '💡 توجيهات الحل:'",
    "? t('advancedFlow.solutionHints')"
  );
  s = s.replace(
    ": 'تفاصيل:'",
    ": t('advancedFlow.details')"
  );
  fs.writeFileSync('components/AdvancedFlowPanelV2Simple.tsx', s);
}

wireAdvanced();
wireUsers();
wireFlowPanels();
console.log('wired');
