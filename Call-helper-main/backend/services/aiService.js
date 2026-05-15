/**
 * AI Service for generating intelligent customer service responses
 * Based on BACKEND_INTEGRATION_GUIDE.md specifications
 */

/**
 * Generate AI response using OpenAI API
 * @param {Object} flowResult - The flow result from frontend
 * @param {Object} clientData - Customer information
 * @returns {Promise<Object>} Generated response with metadata
 */
export async function generateAIResponse(flowResult, clientData) {
  const apiKey = process.env.OPENAI_API_KEY;
  
  // If no API key, return mock response
  if (!apiKey) {
    console.warn('⚠️ No OPENAI_API_KEY found. Using mock response.');
    return generateMockResponse(flowResult, clientData);
  }
  
  try {
    // Extract context from flowResult
    const flowPath = flowResult.completedSteps?.map(step => step.stepName).join(' → ') || 'غير محدد';
    const solutionDetails = flowResult.solutionDetails || flowResult.escalationDetails || '';
    const finalAction = flowResult.finalAction || 'unknown';
    
    // Build the prompt - IMPORTANT: actionDetails is context, not to be copied directly
    const prompt = buildPrompt(flowResult, clientData, flowPath, solutionDetails, finalAction);
    
    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'أنت مساعد ذكي لخدمة العملاء في نظام رفيق. مهمتك توليد صيغة احترافية للموظف توضح ما تم فحصه والحل المقترح وكيف تمت إفادة العميل. يجب أن يكون الرد بصيغة رسمية ومهنية.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API Error: ${error.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    const generatedText = data.choices[0]?.message?.content || '';
    
    return {
      success: true,
      generatedText: generatedText.trim(),
      metadata: {
        flowPath,
        action: finalAction,
        timestamp: new Date().toISOString(),
        model: data.model,
        provider: 'openai'
      }
    };
    
  } catch (error) {
    console.error('❌ AI Service Error:', error.message);
    // Fallback to mock response
    console.log('📝 Falling back to mock response...');
    return generateMockResponse(flowResult, clientData);
  }
}

/**
 * Build the prompt for AI based on context
 * IMPORTANT: Don't ask AI to copy actionDetails directly - use it as context
 */
function buildPrompt(flowResult, clientData, flowPath, solutionDetails, finalAction) {
  const actionType = finalAction === 'force_solution' ? 'حل فوري' : 
                     finalAction === 'escalation' ? 'تصعيد' : 'إجراء';
  
  return `
أنت مساعد ذكي لخدمة العملاء. ولّد صيغة احترافية للموظف بناءً على المعلومات التالية:

**معلومات العميل:**
- الاسم: ${clientData.clientName || 'غير محدد'}
- نوع المشكلة: ${clientData.issueType || 'عام'}
- وصف المشكلة: ${clientData.problemDescription || 'غير متوفر'}
- الفرع: ${clientData.branch || 'غير محدد'}
- نوع الخدمة: ${clientData.serviceType || 'غير محدد'}

**مسار التدفق:**
${flowPath}

**نوع الإجراء:**
${actionType}

**توجيهات داخلية (للسياق فقط - لا تكتبها حرفياً):**
${solutionDetails || 'لا توجد توجيهات إضافية'}

**المطلوب:**
ولّد صيغة احترافية تتضمن:
1. ما تم فحصه واستعراضه
2. النتيجة التي توصلنا إليها
3. الإجراء المتخذ أو الحل المقترح
4. كيف تمت إفادة العميل

**ملاحظات مهمة:**
- لا تكتب "التوجيهات الداخلية" حرفياً في الرد
- استخدمها فقط لفهم السياق
- اكتب بصيغة رسمية ومهنية
- اجعل الرد واضحاً ومختصراً (3-4 جمل)
`.trim();
}

/**
 * Generate mock response when AI API is not available
 * Based on the existing mock pattern from the route
 */
function generateMockResponse(flowResult, clientData) {
  const flowPath = flowResult.completedSteps?.map(s => s.stepName).join(' → ') || 'غير محدد';
  const finalAction = flowResult.finalAction || 'unknown';
  const solutionDetails = flowResult.solutionDetails || flowResult.escalationDetails || '';
  
  // Build a smart mock response based on context
  let mockText = `تم استقبال بلاغ من العميل: ${clientData.clientName || 'العميل'}.\\n\\n`;
  
  if (flowPath && flowPath !== 'غير محدد') {
    mockText += `بعد المراجعة والتحقق من خلال (${flowPath})، `;
  } else {
    mockText += `بعد المراجعة والتحقق، `;
  }
  
  if (finalAction === 'force_solution' && solutionDetails) {
    mockText += `تم تحديد الحل المناسب واتخاذ الإجراءات اللازمة.\\n\\n`;
    mockText += `تمت إفادة العميل بالتفصيل وتوضيح الخطوات المطلوبة.`;
  } else if (finalAction === 'escalation') {
    mockText += `تم تصعيد الحالة للجهة المختصة للمتابعة.\\n\\n`;
    mockText += `تمت إفادة العميل بأنه سيتم التواصل معه خلال 24-48 ساعة.`;
  } else {
    mockText += `تم اتخاذ الإجراءات اللازمة.\\n\\n`;
    mockText += `تمت إفادة العميل بالتفصيل.`;
  }
  
  return {
    success: true,
    generatedText: mockText,
    metadata: {
      flowPath,
      action: finalAction,
      timestamp: new Date().toISOString(),
      provider: 'mock',
      note: 'Using mock response - configure OPENAI_API_KEY for real AI'
    }
  };
}

/**
 * Alternative: Generate response using Anthropic Claude
 * Uncomment and use this if you prefer Claude over OpenAI
 */
export async function generateAIResponseWithClaude(flowResult, clientData) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    console.warn('⚠️ No ANTHROPIC_API_KEY found. Using mock response.');
    return generateMockResponse(flowResult, clientData);
  }
  
  try {
    const flowPath = flowResult.completedSteps?.map(step => step.stepName).join(' → ') || 'غير محدد';
    const solutionDetails = flowResult.solutionDetails || flowResult.escalationDetails || '';
    const finalAction = flowResult.finalAction || 'unknown';
    
    const prompt = buildPrompt(flowResult, clientData, flowPath, solutionDetails, finalAction);
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });
    
    if (!response.ok) {
      throw new Error(`Anthropic API Error: ${response.statusText}`);
    }
    
    const data = await response.json();
    const generatedText = data.content[0]?.text || '';
    
    return {
      success: true,
      generatedText: generatedText.trim(),
      metadata: {
        flowPath,
        action: finalAction,
        timestamp: new Date().toISOString(),
        model: data.model,
        provider: 'anthropic'
      }
    };
    
  } catch (error) {
    console.error('❌ Claude API Error:', error.message);
    return generateMockResponse(flowResult, clientData);
  }
}

export default {
  generateAIResponse,
  generateAIResponseWithClaude
};
