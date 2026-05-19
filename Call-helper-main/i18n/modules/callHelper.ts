export const callHelperAr = {
  callHelper: {
    title: 'مساعد المكالمات الذكي',
    form: {
      title: 'بيانات البلاغ',
      customerName: 'اسم العميل',
      customerNamePlaceholder: 'أدخل اسم العميل...',
      entityType: 'مقدم الخدمة',
      entityPlaceholder: 'اختر نوع المستخدم...',
      problemSummary: 'وصف المشكلة',
      problemPlaceholder: 'اكتب وصف تفصيلي للمشكلة...',
      generate: 'تحليل الحالة',
      generating: 'جاري تحليل الحالة...',
    },
    output: {
      title: 'الصيغة المولدة',
      placeholder: 'سيتم عرض الصيغة المولدة هنا...',
      alternativeBadge: 'صيغة بديلة',
      whyTitle: 'سبب اختيار هذه الصيغة',
      whyEmpty: 'لا يوجد نص في حقل «لماذا» لهذه الحالة في قاعدة البيانات. يمكن إضافته من لوحة إدارة الحالات.',
      moreDetails: 'المزيد من التفاصيل',
    },
    grayArea: {
      unclearTitle: 'الوصف غير واضح بما يكفي',
      unclearHint: 'ساعدنا بتحديد نوع المشكلة للحصول على نتائج أفضل وأكثر دقة',
      selectType: 'حدد نوع المشكلة',
      selectFirst: 'حدد نوع المشكلة أولاً',
    },
    match: {
      excellent: 'تطابق ممتاز',
      good: 'تطابق جيد',
      fair: 'تطابق متوسط',
      accuracyExcellent: 'دقة ممتازة',
      accuracyGood: 'دقة جيدة',
      accuracyFair: 'دقة متوسطة',
      readyResponse: 'رد جاهز',
      matchedWith: 'مطابق مع:',
      registeredProblem: 'المشكلة المسجلة:',
      maskedHint: 'آخر سكور معروض: {{score}}٪ — النص الكامل للصيغة يظهر فقط عند الوصول إلى 100٪ (مثلاً بعد إكمال المسار أو عند تطابق كامل).',
    },
    masked: {
      overlayTitle: 'الإفادة الكاملة عند سكور 100٪',
      overlayHint:
        'السكور الحالي {{score}}٪ — أكمل المسار أو حسّن الوصف حتى يصل إلى 100٪ لعرض النص كاملاً.',
    },
    buttons: {
      alternative: 'صيغة أخرى',
      advancedMode: 'وضع متقدم',
      copy: 'نسخ النص',
      copySuccess: 'تم النسخ بنجاح!',
      copyDisabled: 'النسخ متاح عند وصول السكور إلى 100٪',
    },
    feedback: {
      helped: 'أفدتك؟',
      helpedTooltip: 'ما كانت دقيقة؟ علّمني الصح.',
      yes: 'نعم',
      no: 'لا',
      teachRafeeq: 'علّم رفيق',
      teachTooltipFull:
        'يفتح صفحة «علّم رفيق من تجربتك» مع تعبئة تلقائية من هذه المكالمة',
      teachTooltipAuto:
        'يفتح صفحة «علّم رفيق من تجربتك» مع تعبئة تلقائية',
    },
    advancedMode: {
      title: 'الوضع المتقدم',
      enabledHint: 'يتم عرض خيارات متقدمة بناءً على نوع المشكلة المحدد',
      disabledHint:
        'سيتم تفعيله تلقائياً عند تحديد نوع المشكلة أو يمكنك تفعيله يدوياً',
      selectedType: 'نوع المشكلة المحدد:',
      general: 'عام',
    },
    advanced: {
      categoryScope: 'وضع متقدم مخصّص للفئة: {{category}}',
      sourceKb: 'المصدر: فئة من قاعدة المعرفة بعد المطابقة مع وصف المشكلة',
      sourceInferred:
        'المصدر: استنتاج من كلمات وصف المشكلة (يطابق أسماء فئات المسارات في الإعدادات المتقدمة)',
      noRouteKb:
        'لا يوجد مسار مفعّل مطابق لفئة «{{category}}» من المعرفة. في الإعدادات المتقدمة: فعّل المسار، وإمّا أضف نفس الفئة في «فئات المسار» أو سمّ المسار بما يطابقها (بما فيه المفرد/الجمع)، وتأكد أن «أنواع الجهات» على المسار إما فارغة أو تطابق «مقدم الخدمة».',
      noRouteInferred:
        'لا يوجد مسار مفعّل مرتبط بالفئة «{{category}}» المستنتجة من الوصف. عيّن «فئات المسار» أو اسماً للمسار يطابقها، وراعِ تطابق «أنواع الجهات» مع مقدم الخدمة إن وُجدت.',
    },
    actions: {
      immediate: 'إجراء فوري',
      escalate: 'تصعيد للإدارة',
      followUp: 'متابعة لاحقة',
    },
    why: {
      dialogTitle: 'سبب اختيار الصيغة',
      noReason: 'لا يوجد سبب محفوظ في حقل why لهذه الحالة.',
    },
    rafeeq: {
      chatTitle: 'محادثة رفيق',
      chatDescription: 'مساعدك الذكي للإجابة على استفساراتك',
      welcome: 'مرحباً بك!',
      welcomeHint: 'اضغط للبدء في المحادثة مع رفيق',
      start: 'تشغيل رفيق',
      placeholder: 'اكتب رسالتك هنا...',
      greeting: 'مرحباً! أنا رفيق، مساعدك الذكي. كيف يمكنني مساعدتك؟',
    },
    templates: {
      primary:
        'السلام عليكم ورحمة الله وبركاته،\n\nتم استقبال بلاغ من العميل: {{customerName}}\nنوع الجهة: {{entityType}}\n\nوصف المشكلة:\n{{problemSummary}}\n\nتم تسجيل البلاغ في النظام وسيتم المتابعة مع الفريق المختص.\n\nشكراً لتواصلكم معنا.',
      alternative:
        'مرحباً،\n\nنفيدكم باستلام بلاغكم بخصوص:\nاسم المبلغ: {{customerName}}\nطبيعة الجهة: {{entityType}}\n\nتفاصيل البلاغ:\n{{problemSummary}}\n\nسيتم دراسة الموضوع والرد عليكم في أقرب وقت.\n\nمع التقدير،',
      flowDirectAnswer:
        'السلام عليكم ورحمة الله وبركاته،\n\nتم استقبال بلاغ من العميل: {{customerName}}\nنوع الجهة: {{entityType}}\nنوع المشكلة: {{problemType}}\n\nالحالة: {{condition}}\n\n💡 توجيهات الحل:\n{{solution}}\n\nشكراً لتواصلكم معنا.',
      flowEscalation:
        'السلام عليكم ورحمة الله وبركاته،\n\nتم استقبال بلاغ من العميل: {{customerName}}\nنوع الجهة: {{entityType}}\nنوع المشكلة: {{problemType}}\n\nالحالة: {{condition}}\n\n⚠️ تصعيد:\n{{solution}}\n\nشكراً لتواصلكم معنا.',
      flowForceSolution:
        'السلام عليكم ورحمة الله وبركاته،\n\nتم استقبال بلاغ من العميل: {{customerName}}\nنوع الجهة: {{entityType}}\nنوع المشكلة: {{problemType}}\n\nالحالة: {{condition}}\n\n💡 الحل:\n{{solution}}\n\nشكراً لتواصلكم معنا.',
      flowContinue:
        'السلام عليكم ورحمة الله وبركاته،\n\nتم استقبال بلاغ من العميل: {{customerName}}\nنوع الجهة: {{entityType}}\nنوع المشكلة: {{problemType}}\n\nالحالة: {{condition}}\n\n✅ تمت معالجة جميع الخطوات بنجاح.\n\nشكراً لتواصلكم معنا.',
      grayDirectAnswer:
        'السلام عليكم ورحمة الله وبركاته،\n\nعزيزي/عزيزتي {{customerName}}،\n\nتم استلام بلاغكم بخصوص: {{problemType}}\nنوع الجهة: {{entityType}}\n\n💡 توجيهات الحل:\n{{solution}}\n\nتفاصيل المشكلة:\n{{problemSummary}}\n\nتمت المعالجة بنجاح.\n\nمع تحياتنا،',
      grayForceSolution:
        'السلام عليكم ورحمة الله وبركاته،\n\nعزيزي/عزيزتي {{customerName}}،\n\nتم استلام بلاغكم بخصوص: {{problemType}}\nنوع الجهة: {{entityType}}\n\n✅ {{solution}}\n\nتفاصيل المشكلة:\n{{problemSummary}}\n\nتم معالجة طلبكم بنجاح. في حال وجود أي استفسار، لا تترددوا بالتواصل معنا.\n\nمع تحياتنا،',
      grayEscalation:
        'السلام عليكم ورحمة الله وبركاته،\n\nعزيزي/عزيزتي {{customerName}}،\n\nتم استلام بلاغكم بخصوص: {{problemType}}\nنوع الجهة: {{entityType}}\n\n⚠️ {{solution}}\n\nتفاصيل المشكلة:\n{{problemSummary}}\n\nتم تصعيد طلبكم للإدارة المختصة وسيتم التواصل معكم في أقرب وقت ممكن.\n\nنعتذر عن أي إزعاج، ونقدر تفهمكم.\n\nمع تحياتنا،',
      grayContinue:
        'السلام عليكم ورحمة الله وبركاته،\n\nعزيزي/عزيزتي {{customerName}}،\n\nتم استلام بلاغكم بخصوص: {{problemType}}\nنوع الجهة: {{entityType}}\n\n{{solution}}\n\nتفاصيل المشكلة:\n{{problemSummary}}\n\nتمت المعالجة بنجاح.\n\nمع تحياتنا،',
      defaultDirectAnswer: 'تم تقديم الإجابة المباشرة',
      defaultEscalation: 'يرجى تصعيد المشكلة للقسم المختص',
      defaultSolution: 'الحل المقترح',
    },
  },
};

export const callHelperEn = {
  callHelper: {
    title: 'Smart Call Helper',
    form: {
      title: 'Report details',
      customerName: 'Customer name',
      customerNamePlaceholder: 'Enter customer name...',
      entityType: 'Service provider',
      entityPlaceholder: 'Select user type...',
      problemSummary: 'Problem description',
      problemPlaceholder: 'Describe the problem in detail...',
      generate: 'Case Analysis',
      generating: 'Generating...',
    },
    output: {
      title: 'Generated Response',
      placeholder: 'Generated response will appear here',
      alternativeBadge: 'Alternative wording',
      whyTitle: 'Why this wording was chosen',
      whyEmpty:
        'No "why" text exists for this case in the database. Add it from the cases admin panel.',
      moreDetails: 'More details',
    },
    grayArea: {
      unclearTitle: 'Description is not clear enough',
      unclearHint: 'Help us identify the problem type for better results',
      selectType: 'Select problem type',
      selectFirst: 'Select problem type first',
    },
    match: {
      excellent: 'Excellent match',
      good: 'Good match',
      fair: 'Fair match',
      accuracyExcellent: 'Excellent accuracy',
      accuracyGood: 'Good accuracy',
      accuracyFair: 'Fair accuracy',
      readyResponse: 'Ready response',
      matchedWith: 'Matched with:',
      registeredProblem: 'Registered problem:',
      maskedHint:
        'Last displayed score: {{score}}% — full wording appears only at 100% (e.g. after completing the flow or a full match).',
    },
    masked: {
      overlayTitle: 'Full response at 100% score',
      overlayHint:
        'Current score {{score}}% — complete the flow or improve the description to reach 100% to show the full text.',
    },
    buttons: {
      alternative: 'Alternative wording',
      advancedMode: 'Advanced mode',
      copy: 'Copy text',
      copySuccess: 'Copied successfully!',
      copyDisabled: 'Copy is available when the score reaches 100%',
    },
    feedback: {
      helped: 'Did this help?',
      helpedTooltip: 'Not accurate? Teach me the right answer.',
      yes: 'Yes',
      no: 'No',
      teachRafeeq: 'Teach Rafiq',
      teachTooltipFull:
        'Opens "Teach Rafiq from your experience" with fields prefilled from this call',
      teachTooltipAuto:
        'Opens "Teach Rafiq from your experience" with auto-filled fields',
    },
    advancedMode: {
      title: 'Advanced mode',
      enabledHint: 'Advanced options are shown based on the selected problem type',
      disabledHint:
        'Enabled automatically when you select a problem type, or you can enable it manually',
      selectedType: 'Selected problem type:',
      general: 'General',
    },
    advanced: {
      categoryScope: 'Advanced mode for category: {{category}}',
      sourceKb: 'Source: knowledge base category after problem match',
      sourceInferred:
        'Source: inferred from problem description (matches route category names in advanced settings)',
      noRouteKb:
        'No active route matches knowledge category «{{category}}». In advanced settings: enable the route, add the same category under route categories or name the route to match (including singular/plural), and ensure entity types on the route are empty or match the service provider.',
      noRouteInferred:
        'No active route is linked to inferred category «{{category}}». Assign route categories or a route name that matches, and align entity types with the service provider if set.',
    },
    actions: {
      immediate: 'Immediate action',
      escalate: 'Escalate to management',
      followUp: 'Follow up later',
    },
    why: {
      dialogTitle: 'Why this wording was chosen',
      noReason: 'No reason is saved in the why field for this case.',
    },
    rafeeq: {
      chatTitle: 'Chat with Rafiq',
      chatDescription: 'Your AI assistant for your questions',
      welcome: 'Welcome!',
      welcomeHint: 'Tap to start chatting with Rafiq',
      start: 'Start Rafiq',
      placeholder: 'Type your message...',
      greeting: 'Hello! I am Rafiq, your AI assistant. How can I help?',
    },
    templates: {
      primary:
        'Peace be upon you,\n\nWe received a report from the customer: {{customerName}}\nEntity type: {{entityType}}\n\nProblem description:\n{{problemSummary}}\n\nThe report has been logged and the relevant team will follow up.\n\nThank you for contacting us.',
      alternative:
        'Hello,\n\nWe acknowledge receipt of your report regarding:\nReporter name: {{customerName}}\nEntity type: {{entityType}}\n\nReport details:\n{{problemSummary}}\n\nWe will review the matter and respond as soon as possible.\n\nBest regards,',
      flowDirectAnswer:
        'Peace be upon you,\n\nWe received a report from the customer: {{customerName}}\nEntity type: {{entityType}}\nProblem type: {{problemType}}\n\nStatus: {{condition}}\n\n💡 Solution guidance:\n{{solution}}\n\nThank you for contacting us.',
      flowEscalation:
        'Peace be upon you,\n\nWe received a report from the customer: {{customerName}}\nEntity type: {{entityType}}\nProblem type: {{problemType}}\n\nStatus: {{condition}}\n\n⚠️ Escalation:\n{{solution}}\n\nThank you for contacting us.',
      flowForceSolution:
        'Peace be upon you,\n\nWe received a report from the customer: {{customerName}}\nEntity type: {{entityType}}\nProblem type: {{problemType}}\n\nStatus: {{condition}}\n\n💡 Solution:\n{{solution}}\n\nThank you for contacting us.',
      flowContinue:
        'Peace be upon you,\n\nWe received a report from the customer: {{customerName}}\nEntity type: {{entityType}}\nProblem type: {{problemType}}\n\nStatus: {{condition}}\n\n✅ All steps were completed successfully.\n\nThank you for contacting us.',
      grayDirectAnswer:
        'Peace be upon you,\n\nDear {{customerName}},\n\nWe received your report regarding: {{problemType}}\nEntity type: {{entityType}}\n\n💡 Solution guidance:\n{{solution}}\n\nProblem details:\n{{problemSummary}}\n\nProcessed successfully.\n\nRegards,',
      grayForceSolution:
        'Peace be upon you,\n\nDear {{customerName}},\n\nWe received your report regarding: {{problemType}}\nEntity type: {{entityType}}\n\n✅ {{solution}}\n\nProblem details:\n{{problemSummary}}\n\nYour request was processed successfully. Contact us if you have any questions.\n\nRegards,',
      grayEscalation:
        'Peace be upon you,\n\nDear {{customerName}},\n\nWe received your report regarding: {{problemType}}\nEntity type: {{entityType}}\n\n⚠️ {{solution}}\n\nProblem details:\n{{problemSummary}}\n\nYour request was escalated to the relevant department and we will contact you soon.\n\nWe apologize for any inconvenience.\n\nRegards,',
      grayContinue:
        'Peace be upon you,\n\nDear {{customerName}},\n\nWe received your report regarding: {{problemType}}\nEntity type: {{entityType}}\n\n{{solution}}\n\nProblem details:\n{{problemSummary}}\n\nProcessed successfully.\n\nRegards,',
      defaultDirectAnswer: 'Direct answer provided',
      defaultEscalation: 'Please escalate to the relevant department',
      defaultSolution: 'Suggested solution',
    },
  },
};
