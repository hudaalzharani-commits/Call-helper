/**
 * ====================================================================
 * Mock AI Response Generator
 * ====================================================================
 * 
 * يولد ردود ذكية بناءً على نتيجة Advanced Flow
 * actionDetails تُستخدم كـ context فقط - لا تُكتب مباشرة
 * 
 * TODO: Replace with actual AI API call
 * const response = await fetch('/api/ai/generate-response', {
 *   method: 'POST',
 *   body: JSON.stringify({ flowResult, clientData })
 * });
 * 
 * ====================================================================
 */

interface ClientData {
  clientName: string;
  issueType: string;
  problemDescription: string;
  branch?: string;
  serviceType?: string;
}

interface FlowResult {
  completedSteps: Array<{
    stepId: string;
    stepName: string;
    selectedSubCondition: {
      id: string;
      name: string;
      action: 'continue' | 'force_solution' | 'escalation';
      actionDetails?: string;
    };
  }>;
  finalAction: 'continue' | 'force_solution' | 'escalation';
  escalationDetails?: string;
  solutionDetails?: string;
}

/**
 * Generate AI-powered response based on flow result
 * 
 * @param flowResult - Result from Advanced Flow Panel
 * @param clientData - Client input data
 * @returns Generated response text
 */
export function generateAIResponse(flowResult: FlowResult, clientData: ClientData): string {
  const { finalAction, escalationDetails, solutionDetails, completedSteps } = flowResult;

  // Get the flow path (all selected conditions)
  const flowPath = completedSteps.map(step => step.selectedSubCondition.name).join(' → ');
  
  console.log('🤖 AI Response Generator:', {
    finalAction,
    flowPath,
    escalationDetails,
    solutionDetails,
  });

  // ====================================================================
  // Force Solution (إيقاف وحل)
  // ====================================================================
  
  if (finalAction === 'force_solution') {
    // Use actionDetails as context if provided (NOT written directly!)
    if (solutionDetails && solutionDetails.trim()) {
      return generateSolutionResponse(solutionDetails, flowPath, clientData);
    }

    // Fallback: Generic solution based on flow
    return generateGenericSolution(flowPath, clientData);
  }

  // ====================================================================
  // Escalation (تصعيد)
  // ====================================================================
  
  if (finalAction === 'escalation') {
    // Use actionDetails as context if provided (NOT written directly!)
    if (escalationDetails && escalationDetails.trim()) {
      return generateEscalationResponse(escalationDetails, flowPath, clientData);
    }

    // Fallback: Generic escalation
    return generateGenericEscalation(flowPath, clientData);
  }

  // ====================================================================
  // Continue (لم يتم الوصول لحل نهائي)
  // ====================================================================
  
  return 'تم إكمال جميع الخطوات، يرجى مراجعة البيانات والمتابعة حسب الإجراءات المعتادة.';
}

/**
 * Generate solution response using actionDetails as context
 * actionDetails NOT written directly - used to generate intelligent response
 */
function generateSolutionResponse(
  solutionDetails: string, 
  flowPath: string, 
  clientData: ClientData
): string {
  // Analyze context from actionDetails
  const isRegistrationIssue = solutionDetails.includes('تسجيل') || solutionDetails.includes('البوابة');
  const isPaymentIssue = solutionDetails.includes('دفع') || solutionDetails.includes('سداد');
  const isVisaIssue = solutionDetails.includes('تأشيرة') || solutionDetails.includes('فيزا');
  const isContractIssue = solutionDetails.includes('عقد') || solutionDetails.includes('اتفاقية');
  const isDocumentIssue = solutionDetails.includes('مستند') || solutionDetails.includes('وثيقة');
  
  // Generate intelligent responses based on context
  const templates = [];
  
  if (isRegistrationIssue) {
    templates.push(
      `تم استقبال بلاغ من العميل: ${clientData.clientName}.\n\n` +
      `بعد التحقق من حالة العميل في النظام (${flowPath})، تبين أن حسابه غير مكتمل التسجيل.\n\n` +
      `تم توجيه العميل لإكمال عملية التسجيل عبر البوابة الإلكترونية واتباع الخطوات الموضحة.\n\n` +
      `تمت الإفادة بالتفصيل وتم إرسال رابط البوابة للعميل.`,
      
      `العميل ${clientData.clientName} - ${clientData.issueType}.\n\n` +
      `بعد المراجعة (${flowPath}): تبين أن العميل يحتاج لإكمال إجراءات التسجيل الأولية.\n\n` +
      `تم شرح خطوات التسجيل عبر المنصة الرسمية للعميل، وتوضيح المتطلبات اللازمة.\n\n` +
      `تم تزويد العميل بمعلومات الدخول والتوجيه بشكل كامل.`
    );
  } else if (isPaymentIssue) {
    templates.push(
      `تم التواصل مع العميل: ${clientData.clientName}.\n\n` +
      `بعد فحص الحالة (${flowPath})، تبين وجود مشكلة في عملية السداد.\n\n` +
      `تم توجيه العميل للقنوات الرسمية لإتمام عملية الدفع وشرح الخطوات المطلوبة.\n\n` +
      `تمت الإفادة بطرق الدفع المتاحة وأوقات معالجة المدفوعات.`,
      
      `العميل ${clientData.clientName} قام بالاستفسار عن ${clientData.issueType}.\n\n` +
      `بناءً على المراجعة (${flowPath}): تم التأكد من حالة السداد.\n\n` +
      `تم شرح الإجراءات المالية المطلوبة للعميل وتوجيهه للمنصة الإلكترونية لإتمام العملية.\n\n` +
      `تمت الإفادة والتوجيه بشكل كامل.`
    );
  } else if (isVisaIssue) {
    templates.push(
      `تم استقبال بلاغ من ${clientData.clientName}.\n\n` +
      `بعد التحقق من حالة طلب التأشيرة (${flowPath})، تم الوقوف على آخر التحديثات.\n\n` +
      `تم إفادة العميل بحالة الطلب والخطوات القادمة والمدة الزمنية المتوقعة.\n\n` +
      `تمت الإفادة بكافة التفاصيل ذات الصلة.`,
      
      `العميل ${clientData.clientName} - استفسار عن ${clientData.issueType}.\n\n` +
      `بعد المراجعة عبر النظام (${flowPath}): تم التحقق من حالة التأشيرة الحالية.\n\n` +
      `تم توضيح الإجراءات المطلوبة من العميل وإرشاده للخطوات التالية.\n\n` +
      `تمت إفادة العميل بالكامل وتوثيق البلاغ.`
    );
  } else if (isContractIssue) {
    templates.push(
      `تم استقبال بلاغ من العميل: ${clientData.clientName}.\n\n` +
      `بعد مراجعة حالة العقد (${flowPath})، تم التحقق من التفاصيل والشروط.\n\n` +
      `تم شرح بنود العقد ذات الصلة للعميل وتوضيح الخطوات المطلوبة لإكمال الإجراءات.\n\n` +
      `تمت الإفادة الكاملة وتوثيق المحادثة.`,
      
      `العميل ${clientData.clientName} - ${clientData.issueType}.\n\n` +
      `بناءً على المراجعة (${flowPath}): تم الاطلاع على بيانات العقد.\n\n` +
      `تم توضيح الموضوع للعميل بالتفصيل وإرشاده للخطوات التالية والجهات المعنية إن لزم.\n\n` +
      `تم توثيق البلاغ بالكامل.`
    );
  } else {
    // Generic intelligent responses
    templates.push(
      `تم تسجيل بلاغ من العميل: ${clientData.clientName}.\n\n` +
      `بعد فحص الحالة عبر النظام الذكي (${flowPath})، تم تحديد الإجراء المناسب.\n\n` +
      `تم توجيه العميل بالخطوات اللازمة لحل الموضوع وإفادته بالتفاصيل الكاملة.\n\n` +
      `تمت الإفادة والتوجيه بشكل واضح ومفصّل.`,
      
      `العميل ${clientData.clientName} قام بالاستفسار عن: ${clientData.issueType}.\n\n` +
      `بناءً على التحقق من الحالة (${flowPath})، تم تحديد الحل المناسب.\n\n` +
      `تم شرح الإجراءات المطلوبة للعميل بالتفصيل وتوجيهه للخطوات القادمة.\n\n` +
      `تمت إفادة العميل بشكل كامل وتوثيق المحادثة.`,
      
      `تم استقبال بلاغ من ${clientData.clientName}.\n\n` +
      `الحالة: ${flowPath}\n\n` +
      `بعد المراجعة، تم تحديد الإجراءات المطلوبة وتوضيحها للعميل بالكامل.\n\n` +
      `تمت الإفادة والتوجيه بشكل مفصّل، وتم تسجيل البلاغ للمتابعة.`
    );
  }

  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Generate generic solution (when no actionDetails provided)
 */
function generateGenericSolution(flowPath: string, clientData: ClientData): string {
  const solutions: Record<string, string> = {
    'التسجيل': 'تم توضيح خطوات التسجيل للعميل وإرشاده للمنصة الإلكترونية لإكمال الإجراءات.',
    'الدفع': 'تم شرح طرق الدفع المتاحة وتوجيه العميل لإتمام عملية الدفع عبر القنوات الرسمية.',
    'التأشيرة': 'تم التحقق من حالة طلب التأشيرة وإفادة العميل بالمستجدات والإجراءات المطلوبة منه.',
    'العقد': 'تم مراجعة حالة العقد وتوضيح الخطوات التالية للعميل لإكمال الإجراءات.',
  };

  // Try to match issue type
  const matchedSolution = Object.keys(solutions).find(key => 
    clientData.issueType.includes(key) || clientData.problemDescription.includes(key)
  );

  const solution = matchedSolution 
    ? solutions[matchedSolution]
    : 'تم مراجعة الحالة وإفادة العميل بالإجراءات المطلوبة لحل المشكلة.';

  return `تم استقبال بلاغ من العميل: ${clientData.clientName}.\n\n` +
         `بعد التحقق من الحالة (${flowPath}):\n\n` +
         `${solution}\n\n` +
         `تمت إفادة العميل بالتفصيل.`;
}

/**
 * Generate escalation response using actionDetails as context
 * actionDetails NOT written directly - used to generate intelligent response
 */
function generateEscalationResponse(
  escalationDetails: string,
  flowPath: string,
  clientData: ClientData
): string {
  // Analyze context from escalationDetails
  const needsVisaInfo = escalationDetails.includes('تأشيرة') || escalationDetails.includes('رقم');
  const needsPaymentInfo = escalationDetails.includes('دفع') || escalationDetails.includes('فاتورة');
  const needsDocuments = escalationDetails.includes('مستند') || escalationDetails.includes('وثيقة');
  const needsTechnicalSupport = escalationDetails.includes('تقني') || escalationDetails.includes('نظام');
  
  const templates = [];
  
  if (needsVisaInfo) {
    templates.push(
      `تم استقبال بلاغ من العميل: ${clientData.clientName}.\n\n` +
      `بعد المراجعة الأولية (${flowPath})، تبين أن الموضوع يتطلب تدخل القسم المختص.\n\n` +
      `تم طلب بيانات التأشيرة الإضافية من العميل (رقم التأشيرة، المجموعة، التاريخ) لإكمال التصعيد.\n\n` +
      `سيتم المتابعة مع الجهة المعنية فور استكمال البيانات المطلوبة.`,
      
      `العميل ${clientData.clientName} - ${clientData.issueType}\n\n` +
      `الحالة: ${flowPath}\n\n` +
      `تم تحديد الحاجة لتصعيد الموضوع للقسم المختص بالتأشيرات.\n\n` +
      `تم إفادة العميل بالمعلومات المطلوبة (تفاصيل التأشيرة الكاملة) وسيتم التصعيد فور استكمالها.\n\n` +
      `تم تسجيل البلاغ وإعطاء العميل رقم مرجعي للمتابعة.`
    );
  } else if (needsPaymentInfo) {
    templates.push(
      `تم استقبال بلاغ من ${clientData.clientName}.\n\n` +
      `بعد التحليل الأولي (${flowPath})، يتطلب الموضوع مراجعة من القسم المالي.\n\n` +
      `تم طلب معلومات السداد الإضافية من العميل (رقم الفاتورة، تاريخ الدفع، المبلغ) لإكمال التصعيد.\n\n` +
      `تمت إفادة العميل بأنه سيتم التواصل معه من القسم المالي خلال 24 ساعة بعد استكمال البيانات.`,
      
      `العميل ${clientData.clientName} - استفسار عن ${clientData.issueType}.\n\n` +
      `بناءً على المراجعة (${flowPath}): تقرر تصعيد الموضوع للإدارة المالية.\n\n` +
      `تم إفادة العميل بالمستندات المطلوبة (إيصال الدفع، رقم العملية) وموعد المتابعة المتوقع.\n\n` +
      `تم توثيق البلاغ وتسجيل رقم مرجعي.`
    );
  } else if (needsDocuments) {
    templates.push(
      `بلاغ من العميل: ${clientData.clientName}.\n\n` +
      `بعد المراجعة (${flowPath})، تبين الحاجة لتصعيد الموضوع للجهة المختصة.\n\n` +
      `تم طلب المستندات الداعمة من العميل لإكمال إجراءات التصعيد.\n\n` +
      `تمت إفادة العميل بقنوات إرسال المستندات والمدة الزمنية المتوقعة للرد.`,
      
      `تم التواصل مع ${clientData.clientName} - ${clientData.issueType}.\n\n` +
      `الحالة: ${flowPath}\n\n` +
      `يتطلب الموضوع مراجعة متخصصة. تم إفادة العميل بالوثائق المطلوبة لإكمال التصعيد.\n\n` +
      `سيتم رفع البلاغ للجهة المعنية فور استكمال المرفقات المطلوبة.`
    );
  } else if (needsTechnicalSupport) {
    templates.push(
      `تم تسجيل بلاغ تقني من ${clientData.clientName}.\n\n` +
      `بعد التحليل الأولي (${flowPath})، تقرر تصعيد الموضوع للدعم التقني المتخصص.\n\n` +
      `تم إفادة العميل بأنه سيتم التواصل معه من الفريق التقني خلال فترة قصيرة.\n\n` +
      `تم تسجيل رقم البلاغ وتوثيق التفاصيل للمتابعة.`,
      
      `العميل ${clientData.clientName} - مشكلة تقنية: ${clientData.issueType}.\n\n` +
      `بناءً على المراجعة (${flowPath}): تم تصعيد الموضوع لفريق الدعم التقني.\n\n` +
      `تمت إفادة العميل بخطوات المتابعة والمدة المتوقعة للحل.\n\n` +
      `تم توثيق البلاغ وإعطاء رقم مرجعي للمتابعة.`
    );
  } else {
    // Generic escalation responses
    templates.push(
      `تم استقبال بلاغ من العميل: ${clientData.clientName}.\n\n` +
      `بعد المراجعة الأولية (${flowPath})، تبين أن الموضوع يتطلب تدخل جهة مختصة.\n\n` +
      `تم إفادة العميل بمتطلبات التصعيد، وسيتم رفع الموضوع للجهة المعنية بعد استكمالها.\n\n` +
      `تم تسجيل البلاغ وإعطاء رقم مرجعي للمتابعة.`,
      
      `العميل ${clientData.clientName} - ${clientData.issueType}\n\n` +
      `الحالة: ${flowPath}\n\n` +
      `تم تحديد الحاجة للتصعيد للإدارة المختصة.\n\n` +
      `تم إفادة العميل بالخطوات والمعلومات المطلوبة، وسيتم التواصل معه من الجهة المعنية قريباً.\n\n` +
      `تم توثيق البلاغ بالكامل.`,
      
      `بلاغ من ${clientData.clientName}.\n\n` +
      `بعد التحليل (${flowPath})، تقرر التصعيد للجهة المختصة.\n\n` +
      `تم شرح إجراءات التصعيد للعميل وإفادته بالمدة الزمنية المتوقعة والخطوات القادمة.\n\n` +
      `تم تسجيل رقم البلاغ للمتابعة وتوثيق جميع التفاصيل.`
    );
  }

  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Generate generic escalation (when no actionDetails provided)
 */
function generateGenericEscalation(flowPath: string, clientData: ClientData): string {
  const escalations: Record<string, string> = {
    'التسجيل': 'قسم شؤون الطلبة / إدارة القبول والتسجيل',
    'الدفع': 'القسم المالي / إدارة الشؤون المالية',
    'التأشيرة': 'قسم التأشيرات / الشؤون الدولية',
    'العقد': 'القسم القانوني / إدارة العقود',
  };

  // Try to match issue type
  const matchedDept = Object.keys(escalations).find(key =>
    clientData.issueType.includes(key) || clientData.problemDescription.includes(key)
  );

  const department = matchedDept ? escalations[matchedDept] : 'الإدارة المختصة';

  return `تم استقبال بلاغ من العميل: ${clientData.clientName}.\n\n` +
         `بعد المراجعة (${flowPath})، تبين أن الموضوع يحتاج لتدخل مختص.\n\n` +
         `تم تصعيد البلاغ إلى: ${department}\n\n` +
         `تم إفادة العميل بأنه سيتم التواصل معه من الجهة المختصة خلال فترة قصيرة.`;
}

/**
 * Simulate AI processing delay (for realistic UX)
 * 
 * TODO: Remove this when connecting to real AI API
 */
export function simulateAIProcessing(): Promise<void> {
  return new Promise(resolve => {
    // Random delay between 1-2 seconds to simulate AI thinking
    const delay = 1000 + Math.random() * 1000;
    setTimeout(resolve, delay);
  });
}
