# دليل الوضع المتقدم و Gray Area - Smart Call Helper

## 📋 نظرة عامة

هذا الدليل يوضح كيفية عمل ميزتي **الوضع المتقدم** و **Gray Area** في صفحة Call Helper، وكيف سيتم ربطها بالـ Backend مستقبلاً.

---

## 🎯 الميزات المنفذة

### 1️⃣ حساب نسبة الثقة (Confidence Score)

**الوضع الحالي (Frontend Only):**
- يتم حساب النسبة محلياً في الـ Frontend بناءً على:
  - الكلمات المفتاحية الإيجابية (Positive Keywords)
  - الكلمات السلبية التي تدل على عدم الوضوح (Negative Keywords)
  - طول الوصف وعدد الكلمات
- الكود موجود في: `/utils/mockConfidenceData.ts`
- الدالة: `calculateConfidence(description: string): number`

**كيفية الربط بالـ Backend:**

```typescript
// استبدل هذا في CallHelper.tsx:
const score = calculateConfidence(problemSummary);

// بهذا:
const response = await fetch('/api/analyze-confidence', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    description: problemSummary,
    entityType: entityType,
    customerName: customerName
  })
});
const data = await response.json();
const score = data.confidenceScore; // 0-100
```

**Backend API المتوقع:**
```typescript
POST /api/analyze-confidence
Request Body:
{
  "description": "وصف المشكلة",
  "entityType": "umrah" | "external",
  "customerName": "اسم العميل"
}

Response:
{
  "confidenceScore": 65, // 0-100
  "suggestedProblemType": "technical" | null,
  "matchedKeywords": ["تعطل", "نظام"],
  "analysisDetails": { ... }
}
```

---

### 2️⃣ Gray Area - اختيار نوع المشكلة

**الوضع الحالي:**
- يظهر زر "حدد نوع المشكلة" عندما تكون نسبة الثقة أقل من 40%
- عند الضغط، يظهر Dialog يحتوي على 5 أنواع من المشاكل:
  - مشكلة تقنية (technical)
  - مشكلة تشغيلية (operational)
  - مشكلة مالية (financial)
  - شكوى (complaint)
  - استفسار عام (general_inquiry)
- عند الاختيار:
  - يتم تفعيل الوضع المتقدم تلقائياً
  - يتم إعادة توليد النص بناءً على النوع المختار
  - يتم إزالة الـ Blur عن مربع النص

**كيفية الربط بالـ Backend:**

```typescript
// في دالة handleProblemTypeSelect:
const handleProblemTypeSelect = async (typeId: string) => {
  setSelectedProblemType(typeId);
  setIsAdvancedModeEnabled(true);
  
  // TODO: استبدل هذا بـ API Call
  const response = await fetch('/api/get-advanced-options', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      problemType: typeId,
      description: problemSummary,
      entityType: entityType
    })
  });
  
  const data = await response.json();
  setAdvancedOptions(data.options);
  
  // إعادة توليد النص مع السياق الجديد
  generateTextWithContext(data);
};
```

**Backend API المتوقع:**
```typescript
POST /api/get-advanced-options
Request Body:
{
  "problemType": "technical",
  "description": "وصف المشكلة",
  "entityType": "umrah"
}

Response:
{
  "options": {
    "decisionTreeNodes": [
      {
        "id": "node1",
        "question": "هل المشكلة في النظام الرئيسي؟",
        "options": ["نعم", "لا"]
      }
    ],
    "suggestedActions": ["إجراء فوري", "تصعيد"],
    "priority": "عالية",
    "estimatedResolutionTime": "2 hours"
  },
  "enhancedText": "نص محسّن بناءً على نوع المشكلة"
}
```

---

## 🎯 وضعان مفهوميان للـ Advanced (مرجع اللوجيك الحالي في الكود)

> **ملاحظة:** هذا القسم يصف **ما ينفّذه المشروع فعلياً** في `CallHelper.tsx` و`AdvancedFlowPanelV2Simple.tsx` و`AdvancedSettingsContext.tsx` (دالة `getRoutesForContext`).  
> لا يغيّر سلوك الـ scoring أو Gray Area أو التوجيه؛ يوضّح فقط للفريق والمراجعين.

### المصطلحات

| المصطلح | المعنى في المنتج |
|--------|------------------|
| **Targeted Advanced** | لوحة Advanced تعرض **فقط** مسارات ممرّرة صراحةً (`initialFilteredRouteIds` مصفوفة غير فارغة)، عادةً بعد تطابق **سياق** (فئة + نوع جهة حيث ينطبق الشرط). |
| **عرض كل المسارات النشطة** | `initialFilteredRouteIds === undefined` فيستدعي المعالج منطق «لا فلترة» في الفرع غير Gray (انظر أسفل). |

### 1) Advanced مخصّص بالسياق (Targeted Advanced)

**متى يُحسب `targetedRouteIds` كمصفوفة مفلترة (وليس `undefined`)؟**

- لا يوجد مسار من **Gray مربوط بالسؤال** (`selectedQuestionLinkedRoutes` فارغ)، **و**
- يتحقق **`applyContextFilter`**:
  - **بدون** أن يكون المستخدم قد أنهى Gray بهذه الجلسة (`!wasGrayAreaResolved`):  
    `فئة معروفة` + **`entityType` مملوء** + `نص مُولَّد` + **جاهزية السكور**:  
    `displayedScore >= showAdvancedThreshold` **أو** `descriptionMatchPercentage >= 40`.
  - **بعد** Gray (`wasGrayAreaResolved`): نفس **الفئة** + **النص المُولَّد** + جاهزية السكور (وتُعتبر محققة لأن Gray محلول ضمن الشرط)، **دون** اشتراط `entityType` في هذا الفرع.

**مصدر الفئة:** `matchedProblem.category` (قاعدة المعرفة) أو استنتاج من وصف المشكلة (`inferredCategoryFromDescription` + `categoryContextMatch`).

**التصفية:** تمرير النتيجة إلى `getRoutesForContext({ entityType, category })` (مع قواعد الفئات/الجهات المعرفة في الـ Context).

**مثال منتجي:** `category = التأشيرة` و`entityType = شركة عمرة` وشروط التفعيل أعلاه → مسارات تحمل فئة التأشيرة ومطابقة قيود `entityTypes` على المسار إن وُجدت.

---

### 2) مسارات مربوطة بسؤال Gray Area

إذا كان لسؤال Gray Area في الإعدادات **`linkedRouteIds`** غير فارغة:

- تُستخدم **هذه المعرفات فقط** كـ `targetedRouteIds` (أولوية على فلترة السياق العامة).

---

### 3) عرض المسارات في `AdvancedFlowPanelV2Simple` (جدول سلوكي)

| `initialFilteredRouteIds` | `isGrayAreaMode` (`wasGrayAreaResolved`) | النتيجة في اللوحة |
|---------------------------|------------------------------------------|---------------------|
| `undefined` | `false` | **كل المسارات النشطة** (لا فلترة). |
| `undefined` | `true` | قائمة اختيار المسارات **فارغة** (السلوك البرمجي الحالي في `useEffect`). |
| `[]` (مصفوفة فارغة صريحة) | أي قيمة | **لا مسارات** (سياق مفلتر لكن لا تطابق). |
| مصفوفة معرفات غير فارغة | أي قيمة | **فقط** المسارات التي `id` لها ضمن القائمة. |

**ملاحظة تصميمية:** إن كان المقصود المنتجي بعد Gray أن يستكشف المستخدم **كل** المسارات عندما لا يوجد ربط ولا فلترة سياق، فالفرق عن التنفيذ الحالي يظهر في الصف الأوسط (Gray + `undefined` → قائمة فارغة). توثيق ذلك هنا يجنب اعتباره bug غير مُدرَك.

**مقارنة بنموذج العمل الذي وصفته:**

| الفكرة المنتجية | أقرب انطباق في الكود الحالي |
|-----------------|------------------------------|
| **Targeted Advanced** عندما يكون التصنيف واضحاً والسكور في نطاق يسمح باستكشاف متقدم دون Gray | القسم (1): `!wasGrayAreaResolved` + فئة + `entityType` + توليد + شرط السكور → `getRoutesForContext`. |
| **Advanced بعد Gray بدون تصفية** (استكشاف يدوي لكل المسارات) | يحدث في الكود فقط عندما تكون النتيجة **`initialFilteredRouteIds === undefined`** **و** `isGrayAreaMode === false` (مسار Advanced العادي). أما **Gray محلول** مع `undefined` فيُعرض **قائمة مسارات فارغة** في اللوحة حسب الجدول أعلاه — وليس «كل المسارات». |
| **Advanced بعد Gray مع تصفية بالسياق** | إذا توفرت فئة + نص مُولَّد بعد Gray **ولم** يكن هناك `linkedRouteIds`، قد يُفعَّل فرع `wasGrayAreaResolved` في `applyContextFilter` فيُمرَّر مصفوفة مفلترة كما في (1). |

---

### 4) ما لم يُغيّر في هذا القسم

- عتبات الـ **scoring** (`directAnswer` / `showAdvanced` / `grayArea`) ومنطق ظهور **Gray Area** و**الأزرار** يبقى كما في بقية الدليل والكود.
- **`getRoutesForContext`** وقواعد `categories` / `entityTypes` على المسار كما في `AdvancedSettingsContext`.

---

### 3️⃣ الوضع المتقدم (Advanced Mode)

**الوضع الحالي:**
- للتفصيل الدقيق لمسارات الـ Advanced والفلترة راجع القسم **«وضعان مفهوميان للـ Advanced (مرجع اللوجيك الحالي في الكود)»** أعلاه.
- زر "وضع متقدم" موجود ويعمل
- يتم تفعيله تلقائياً عند اختيار نوع المشكلة في Gray Area
- يمكن تفعيله يدوياً أيضاً

**كيفية الربط بالـ Backend (Decision Tree):**

سيتم ربط الوضع المتقدم بـ **Decision Tree** بناءً على:
1. نوع المشكلة المختار
2. نوع الجهة (شركة عمرة / وكيل خارجي)
3. تفاصيل إضافية من الوصف

**مثال على Decision Tree:**

```typescript
// مثال: نوع المشكلة = تقنية
{
  "rootNode": {
    "id": "tech_root",
    "question": "أين تحدث المشكلة؟",
    "options": [
      {
        "value": "portal",
        "label": "البوابة الإلكترونية",
        "nextNode": "portal_issue"
      },
      {
        "value": "mobile",
        "label": "تطبيق الجوال",
        "nextNode": "mobile_issue"
      },
      {
        "value": "system",
        "label": "النظام الداخلي",
        "nextNode": "system_issue"
      }
    ]
  },
  "nodes": {
    "portal_issue": {
      "question": "ما نوع المشكلة في البوابة؟",
      "options": [...]
    },
    // ... المزيد من العقد
  }
}
```

**كيفية العرض في UI:**

```typescript
// في Advanced Mode Panel:
{activeButton === "advanced" && advancedOptions && (
  <div className="space-y-3">
    {/* عرض Decision Tree */}
    {advancedOptions.decisionTree.map((node, index) => (
      <div key={node.id}>
        <Label className="text-right">{node.question}</Label>
        <Select 
          value={selectedAnswers[node.id]} 
          onValueChange={(value) => handleNodeSelection(node.id, value)}
        >
          <SelectTrigger className="text-right">
            <SelectValue placeholder="اختر..." />
          </SelectTrigger>
          <SelectContent>
            {node.options.map(option => (
              <SelectItem value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    ))}
    
    {/* عرض الإجراءات المقترحة */}
    <div className="glass-panel p-3">
      <h4 className="text-sm font-bold">الإجراءات المقترحة:</h4>
      <ul className="text-xs space-y-1">
        {advancedOptions.suggestedActions.map(action => (
          <li key={action}>• {action}</li>
        ))}
      </ul>
    </div>
  </div>
)}
```

---

## 📊 ملف Mock Data

الملف: `/utils/mockConfidenceData.ts`

يحتوي على:
- `POSITIVE_KEYWORDS`: الكلمات المفتاحية الإيجابية مع أوزانها
- `NEGATIVE_KEYWORDS`: الكلمات السلبية التي تقلل الثقة
- `PROBLEM_TYPES`: أنواع المشاكل الخمسة مع كلماتها المفتاحية
- `calculateConfidence()`: دالة حساب النسبة
- `suggestProblemType()`: دالة اقتراح نوع المشكلة

**استبدال Mock Data:**
عند الربط بالـ Backend، يمكنك:
1. حذف الدوال من الملف
2. إنشاء API Service بدلاً منها
3. الإبقاء على الملف للـ Fallback في حال فشل الـ API

---

## 🔄 تدفق البيانات (Data Flow)

### السيناريو 1: نسبة ثقة عالية (≥ 40%)

```
1. المستخدم يدخل البيانات
2. يتم حساب النسبة → عالية
3. يظهر النص المولد بشكل طبيعي
4. يمكن تفعيل الوضع المتقدم يدوياً (اختياري)
```

### السيناريو 2: نسبة ثقة منخفضة (< 40%) - Gray Area

```
1. المستخدم يدخل البيانات
2. يتم حساب النسبة → منخفضة (< 40%)
3. يظهر النص المولد مع Blur
4. تظهر رسالة تحذيرية + زر "حدد نوع المشكلة"
5. المستخدم يضغط على الزر
6. يظهر Dialog لاختيار نوع المشكلة
7. المستخدم يختار نوع
8. يتم:
   - تفعيل الوضع المتقدم تلقائياً
   - إزالة الـ Blur
   - إعادة توليد النص مع السياق الجديد
   - جلب خيارات Decision Tree من Backend (TODO)
9. يعرض الوضع المتقدم خيارات Decision Tree
10. المستخدم يجيب على الأسئلة
11. يتم تحديث النص بناءً على الإجابات
```

---

## 🛠️ التعديلات المطلوبة للربط الكامل

### 1. إنشاء API Service

أنشئ ملف: `/services/callHelperApi.ts`

```typescript
export const callHelperApi = {
  // تحليل نسبة الثقة
  analyzeConfidence: async (data: {
    description: string;
    entityType: string;
    customerName: string;
  }) => {
    const response = await fetch('/api/analyze-confidence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  },

  // جلب خيارات الوضع المتقدم
  getAdvancedOptions: async (data: {
    problemType: string;
    description: string;
    entityType: string;
  }) => {
    const response = await fetch('/api/get-advanced-options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  },

  // جلب عقدة Decision Tree التالية
  getNextDecisionNode: async (data: {
    problemType: string;
    currentNodeId: string;
    selectedAnswer: string;
  }) => {
    const response = await fetch('/api/decision-tree/next', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  },

  // توليد نص محسّن بناءً على Decision Tree
  generateEnhancedText: async (data: {
    customerName: string;
    entityType: string;
    description: string;
    problemType: string;
    decisionTreeAnswers: Record<string, string>;
  }) => {
    const response = await fetch('/api/generate-enhanced', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  }
};
```

### 2. تحديث CallHelper Component

استبدل الدوال المحلية باستدعاءات API:

```typescript
// في useEffect لحساب النسبة:
useEffect(() => {
  if (problemSummary.trim() && customerName && entityType) {
    // Debounce لتجنب الطلبات الكثيرة
    const timer = setTimeout(async () => {
      try {
        const data = await callHelperApi.analyzeConfidence({
          description: problemSummary,
          entityType,
          customerName
        });
        setConfidenceScore(data.confidenceScore);
      } catch (error) {
        // Fallback للحساب المحلي
        const score = calculateConfidence(problemSummary);
        setConfidenceScore(score);
      }
    }, 500);

    return () => clearTimeout(timer);
  }
}, [problemSummary, customerName, entityType]);
```

### 3. ربط Decision Tree

```typescript
const [decisionTreeState, setDecisionTreeState] = useState({
  currentNode: null,
  answers: {},
  history: []
});

const handleDecisionTreeAnswer = async (nodeId: string, answer: string) => {
  try {
    const nextNode = await callHelperApi.getNextDecisionNode({
      problemType: selectedProblemType,
      currentNodeId: nodeId,
      selectedAnswer: answer
    });

    setDecisionTreeState({
      currentNode: nextNode,
      answers: { ...decisionTreeState.answers, [nodeId]: answer },
      history: [...decisionTreeState.history, { nodeId, answer }]
    });

    // إذا وصلنا لنهاية الشجرة، توليد النص النهائي
    if (nextNode.isFinal) {
      const enhancedText = await callHelperApi.generateEnhancedText({
        customerName,
        entityType,
        description: problemSummary,
        problemType: selectedProblemType,
        decisionTreeAnswers: decisionTreeState.answers
      });
      setGeneratedText(enhancedText.text);
    }
  } catch (error) {
    console.error('Failed to process decision tree:', error);
  }
};
```

---

## 📝 نقاط مهمة

### عند التطوير:
- ✅ الكود الحالي جاهز للربط فوراً
- ✅ جميع TODO واضحة ومكتوبة في الكود
- ✅ Mock Data موجود ويعمل بشكل كامل
- ✅ UI مكتمل ويحاكي السلوك الحقيقي
- ✅ لا حاجة لإعادة تصميم المنطق

### التحديات المحتملة:
- ⚠️ تأخر الـ API: أضف Loading States
- ⚠️ فشل الـ API: استخدم Fallback للـ Mock Data
- ⚠️ Decision Tree معقد: اجعل الـ UI مرن وقابل للتوسع

### الأمان:
- 🔒 لا تخزن بيانات حساسة في Frontend
- 🔒 استخدم HTTPS فقط للـ API Calls
- 🔒 validate جميع المدخلات في Backend
- 🔒 أضف Rate Limiting للـ APIs

---

## 🎨 تخصيص إضافي (اختياري)

### إضافة Animations للـ Gray Area:
```typescript
// في Textarea مع Blur:
className={`... ${isLowConfidence ? 'blur-sm select-none animate-pulse' : ''}`}
```

### إضافة Sound Effects:
```typescript
// عند اختيار نوع المشكلة:
const successSound = new Audio('/sounds/success.mp3');
successSound.play();
```

### إضافة Analytics:
```typescript
// تتبع استخدام Gray Area:
useEffect(() => {
  if (isLowConfidence) {
    analytics.track('gray_area_triggered', {
      confidenceScore,
      description: problemSummary
    });
  }
}, [isLowConfidence]);
```

---

## 📞 الخطوات التالية

1. ✅ **Frontend جاهز تماماً** - لا حاجة لتعديلات
2. ⏳ **Backend Development:**
   - تطوير API لحساب النسبة
   - بناء Decision Tree Engine
   - تطوير ML Model لاقتراح نوع المشكلة (اختياري)
3. ⏳ **Integration:**
   - استبدال Mock Data بـ API Calls
   - اختبار التكامل
   - إضافة Error Handling
4. ⏳ **Testing:**
   - اختبار جميع السيناريوهات
   - اختبار الأداء
   - اختبار الأمان

---

## 📧 تواصل

لأي استفسارات حول التطبيق أو الربط بالـ Backend، راجع:
- الكود المصدري: `/components/CallHelper.tsx`
- ملف Mock Data: `/utils/mockConfidenceData.ts`
- هذا الدليل: `/docs/ADVANCED_MODE_GUIDE.md`

**تم التطوير بواسطة Figma Make AI** 🚀
