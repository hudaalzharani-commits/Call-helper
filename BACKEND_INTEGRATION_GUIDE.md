# 📘 دليل ربط الباك إند (Backend Integration Guide)

## 🎯 الغرض من هذا الملف
هذا الملف يوثق كيفية ربط النظام الحالي مع الباك إند (AI API) بدون أي تعارض.

---

## 📊 البيانات المرسلة من Frontend إلى Backend

### 🔹 1. واجهة FlowResult
```typescript
interface FlowResult {
  completedSteps: Array<{
    stepId: string;
    stepName: string;
    selectedSubCondition: {
      id: string;
      name: string;
      action: 'continue' | 'force_solution' | 'escalation';
      actionDetails?: string;  // ← التوجيهات الداخلية
    };
  }>;
  finalAction: 'continue' | 'force_solution' | 'escalation';
  escalationDetails?: string;  // ← نفس actionDetails للآخر خطوة (إذا escalation)
  solutionDetails?: string;    // ← نفس actionDetails للآخر خطوة (إذا force_solution)
}
```

### 🔹 2. واجهة ClientData
```typescript
interface ClientData {
  clientName: string;
  issueType: string;
  problemDescription: string;
  branch?: string;
  serviceType?: string;
}
```

---

## 🔄 عملية الربط (Integration Flow)

### الكود الحالي (Mock):
```typescript
// في /components/CallHelper.tsx (السطر 730-762)
onFlowComplete={async (result) => {
  if (result.finalAction === 'escalation' || result.finalAction === 'force_solution') {
    setIsGenerating(true);
    
    // ⏳ Mock: Simulate AI processing
    await simulateAIProcessing();
    
    // 🤖 Mock: Generate AI response locally
    const aiResponse = generateAIResponse(result, {
      clientName: customerName,
      issueType: selectedProblemType ? PROBLEM_TYPES.find(...).name : 'عام',
      problemDescription: problemSummary,
      branch: entityType === 'umrah' ? 'شركة عمرة' : 'وكيل خارجي',
      serviceType: entityType,
    });
    
    // ✍️ كتابة الرد في الصندوق
    setGeneratedText(headerLines.join('\n') + '\n\n' + aiResponse);
    setIsGenerating(false);
  }
}}
```

### الكود المطلوب (Real Backend):
```typescript
// في /components/CallHelper.tsx (استبدال السطور 738-750)
onFlowComplete={async (result) => {
  if (result.finalAction === 'escalation' || result.finalAction === 'force_solution') {
    setIsGenerating(true);
    
    try {
      // ✅ استدعاء الـ AI API الحقيقي
      const response = await fetch('/api/ai/generate-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          flowResult: result,
          clientData: {
            clientName: customerName,
            issueType: selectedProblemType 
              ? PROBLEM_TYPES.find(t => t.id === selectedProblemType)?.name 
              : 'عام',
            problemDescription: problemSummary,
            branch: entityType === 'umrah' ? 'شركة عمرة' : 'وكيل خارجي',
            serviceType: entityType,
          }
        })
      });
      
      if (!response.ok) {
        throw new Error('فشل في الحصول على رد من AI');
      }
      
      const data = await response.json();
      const aiResponse = data.generatedText; // أو حسب هيكل الرد من API
      
      // ✍️ كتابة الرد في الصندوق
      const existingLines = generatedText.split('\n');
      const headerLines = existingLines.slice(0, 4);
      const newGeneratedText = headerLines.join('\n') + '\n\n' + aiResponse;
      
      setGeneratedText(newGeneratedText);
      setIsGenerating(false);
      
    } catch (error) {
      console.error('❌ AI API Error:', error);
      setIsGenerating(false);
      
      // Fallback: استخدام Mock إذا فشل API
      const aiResponse = generateAIResponse(result, {...});
      setGeneratedText(...);
    }
  }
}}
```

---

## 🧠 كيف يجب أن يعمل الـ AI في الباك إند؟

### ❌ خطأ - لا تفعل هذا:
```python
# Backend (Python/FastAPI مثال)
def generate_ai_response(flow_result, client_data):
    # ❌ لا تكتب actionDetails مباشرة
    return flow_result['solutionDetails']  # خطأ!
```

### ✅ صحيح - افعل هذا:
```python
# Backend (Python/FastAPI مثال)
def generate_ai_response(flow_result, client_data):
    # ✅ استخدم actionDetails كـ context
    solution_details = flow_result.get('solutionDetails', '')
    flow_path = ' → '.join([
        step['selectedSubCondition']['name'] 
        for step in flow_result['completedSteps']
    ])
    
    # ✅ ولّد رد ذكي بناءً على السياق
    prompt = f"""
    أنت مساعد ذكي لخدمة العملاء.
    
    العميل: {client_data['clientName']}
    نوع المشكلة: {client_data['issueType']}
    مسار التدفق: {flow_path}
    توجيهات داخلية (لا تكتبها مباشرة): {solution_details}
    
    ولّد صيغة احترافية للموظف توضح:
    - ما تم فحصه
    - ما الحل المقترح
    - كيف تمت إفادة العميل
    
    مهم: لا تكتب "التوجيهات الداخلية" حرفياً، استخدمها فقط لفهم السياق.
    """
    
    # استدعاء AI (ChatGPT/Claude/etc)
    ai_response = call_openai_api(prompt)
    
    return {
        "generatedText": ai_response,
        "metadata": {
            "flowPath": flow_path,
            "action": flow_result['finalAction']
        }
    }
```

---

## 📦 هيكل طلب الـ API (Request Structure)

### POST `/api/ai/generate-response`

```json
{
  "flowResult": {
    "completedSteps": [
      {
        "stepId": "step-1",
        "stepName": "حالة التسجيل",
        "selectedSubCondition": {
          "id": "cond-1",
          "name": "غير مسجل",
          "action": "force_solution",
          "actionDetails": "يجب التسجيل أولاً عبر البوابة الإلكترونية"
        }
      }
    ],
    "finalAction": "force_solution",
    "solutionDetails": "يجب التسجيل أولاً عبر البوابة الإلكترونية"
  },
  "clientData": {
    "clientName": "أحمد محمد",
    "issueType": "مشاكل التسجيل",
    "problemDescription": "العميل لا يستطيع التسجيل",
    "branch": "شركة عمرة",
    "serviceType": "umrah"
  }
}
```

### Response من الـ API:

```json
{
  "success": true,
  "generatedText": "تم استقبال بلاغ من العميل: أحمد محمد.\n\nبعد التحقق من حالة العميل في النظام (غير مسجل)، تبين أن حسابه غير مكتمل التسجيل.\n\nتم توجيه العميل لإكمال عملية التسجيل عبر البوابة الإلكترونية واتباع الخطوات الموضحة.\n\nتمت الإفادة بالتفصيل وتم إرسال رابط البوابة للعميل.",
  "metadata": {
    "flowPath": "غير مسجل",
    "action": "force_solution",
    "timestamp": "2026-01-07T10:30:00Z"
  }
}
```

---

## ⚠️ نقاط مهمة لتجنب التعارض

### ✅ 1. actionDetails هي Context فقط
- **لا تُكتب مباشرة** في الرد
- **تُستخدم لفهم السياق** وتوليد رد ذكي
- **مثال**: 
  - ❌ الرد: "يجب التسجيل أولاً عبر البوابة"
  - ✅ الرد: "تبين أن العميل غير مسجل. تم توجيهه لإكمال التسجيل عبر البوابة..."

### ✅ 2. البيانات المُرسلة كاملة
- `flowResult` يحتوي على:
  - ✅ `completedSteps[]` - كل الخطوات المكتملة
  - ✅ `finalAction` - الإجراء النهائي
  - ✅ `solutionDetails` أو `escalationDetails` - التوجيهات
- `clientData` يحتوي على:
  - ✅ معلومات العميل
  - ✅ نوع المشكلة
  - ✅ الوصف

### ✅ 3. التعامل مع الأخطاء
```typescript
try {
  const response = await fetch('/api/ai/generate-response', ...);
  // معالجة الرد
} catch (error) {
  // Fallback إلى Mock
  const aiResponse = generateAIResponse(result, clientData);
}
```

### ✅ 4. حالة التحميل (Loading State)
```typescript
setIsGenerating(true);  // ← قبل الاستدعاء
// ... API call ...
setIsGenerating(false); // ← بعد الاستلام
```

---

## 🔧 ملفات يجب تعديلها عند الربط

### 1️⃣ `/components/CallHelper.tsx`
- **السطور**: 738-750
- **التعديل**: استبدال `generateAIResponse()` بـ `fetch('/api/ai/...')`

### 2️⃣ `/utils/mockAIResponses.ts`
- **الحالة**: يبقى كما هو (Fallback)
- **الاستخدام**: في حالة فشل API أو للتطوير المحلي

### 3️⃣ إنشاء ملف جديد (اختياري):
`/services/aiService.ts`
```typescript
export async function generateAIResponse(
  flowResult: FlowResult, 
  clientData: ClientData
): Promise<string> {
  const response = await fetch('/api/ai/generate-response', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ flowResult, clientData })
  });
  
  if (!response.ok) {
    throw new Error('AI API failed');
  }
  
  const data = await response.json();
  return data.generatedText;
}
```

---

## 📝 مثال كامل للتكامل

### Frontend (CallHelper.tsx):
```typescript
import { generateAIResponse as mockGenerateAIResponse } from '../utils/mockAIResponses';
import { generateAIResponse as realGenerateAIResponse } from '../services/aiService';

// ...

onFlowComplete={async (result) => {
  if (result.finalAction === 'escalation' || result.finalAction === 'force_solution') {
    setIsGenerating(true);
    
    let aiResponse: string;
    
    try {
      // ✅ Try real API first
      aiResponse = await realGenerateAIResponse(result, {
        clientName: customerName,
        issueType: selectedProblemType ? PROBLEM_TYPES.find(t => t.id === selectedProblemType)?.name : 'عام',
        problemDescription: problemSummary,
        branch: entityType === 'umrah' ? 'شركة عمرة' : 'وكيل خارجي',
        serviceType: entityType,
      });
    } catch (error) {
      // ⚠️ Fallback to mock
      console.warn('Using mock AI response:', error);
      aiResponse = mockGenerateAIResponse(result, {...});
    }
    
    // ✍️ Write to text box
    const existingLines = generatedText.split('\n');
    const headerLines = existingLines.slice(0, 4);
    const newGeneratedText = headerLines.join('\n') + '\n\n' + aiResponse;
    
    setGeneratedText(newGeneratedText);
    setIsGenerating(false);
  }
}}
```

---

## ✅ Checklist قبل الربط

- [ ] الباك إند جاهز ويستقبل POST requests على `/api/ai/generate-response`
- [ ] الباك إند يفهم structure الـ `FlowResult` و `ClientData`
- [ ] الباك إند **لا يكتب** `actionDetails` مباشرة (يستخدمها كـ context فقط)
- [ ] الباك إند يرجع `{ generatedText: string }`
- [ ] تم إنشاء `/services/aiService.ts` للاستدعاء
- [ ] تم تعديل `/components/CallHelper.tsx` لاستخدام الـ API
- [ ] تم الاحتفاظ بـ `mockAIResponses.ts` كـ fallback
- [ ] تم اختبار حالة النجاح والفشل

---

## 🎯 النتيجة المتوقعة

### في الواجهة (Frontend):
```
┌─────────────────────────────────────┐
│ ☑ غير مسجل                         │
│                                     │
│ 💡 توجيهات الحل:                   │ ← يظهر تحت الخطوة
│ يجب التسجيل أولاً عبر البوابة      │
│                                     │
│ [ ✓ تطبيق الحل ]                   │
└─────────────────────────────────────┘

↓ بعد الضغط

صندوق الصيغة المولدة:
┌─────────────────────────────────────┐
│ السلام عليكم...                    │
│                                     │
│ تم التحقق من حالة العميل في       │ ← AI Response من Backend
│ النظام، تبين أن حسابه غير مكتمل... │
└─────────────────────────────────────┘
```

---

## 📞 للدعم الفني
إذا واجهتك أي مشاكل في الربط، راجع:
1. ✅ الـ Console Logs في المتصفح
2. ✅ الـ Network Tab لرؤية الـ API requests
3. ✅ الـ Backend Logs لرؤية ما يُستقبل

---

**تاريخ الإنشاء**: 2026-01-07  
**الإصدار**: 1.0  
**الحالة**: ✅ جاهز للربط
