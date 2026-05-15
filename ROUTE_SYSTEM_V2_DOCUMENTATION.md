# 🎯 نظام المسارات V2 - توثيق كامل

**تاريخ التحديث**: 2026-01-07  
**الإصدار**: 2.0  
**المطور**: Advanced Flow System

---

## 📋 **ملخص التعديلات**

تم إنشاء نظام مسارات جديد تماماً يدعم نمطين مختلفين:

| النمط | النسبة | الوصف | السلوك |
|-------|--------|-------|--------|
| **Gray Area Mode** | < 50% | مطابقة keywords فقط | عرض المسارات المطابقة للكلمات المفتاحية |
| **Advanced Mode** | 50-79% | جميع المسارات | عرض جميع المسارات → اختيار → تنقل مرن |

---

## 🆕 **التغييرات الرئيسية**

### **1. إلغاء الترتيب الإلزامي**

**قبل:**
```typescript
// المسارات تظهر حسب orderIndex فقط
const relevantSteps = accessibleRoutes
  .map(route => steps.find(step => step.routeId === route.id))
  .filter((step): step is Step => step !== undefined);
```

**بعد:**
```typescript
// المسارات تعرض جميعها (Advanced Mode) أو المطابقة فقط (Gray Area)
// الترتيب (order) موجود للعرض فقط وليس إلزامي
const allActiveRoutes = routes.filter(route => route.isActive);
```

---

### **2. نظامين مختلفين للعرض**

#### **أ. Gray Area Mode (< 50%)**

```typescript
isGrayAreaMode = true

// السلوك:
1. تحليل الوصف → keyword matching
2. عرض المسارات المطابقة للكلمات المفتاحية فقط
3. التنقل التقليدي (خطوة بخطوة)
```

**مثال:**
```
الوصف: "تأشيرة" (35%)
↓
keyword matching: ["تأشيرات", "تسجيل"]
↓
عرض المسارات: فقط "تأشيرات" و "تسجيل"
```

---

#### **ب. Advanced Mode (50-79%)**

```typescript
isGrayAreaMode = false

// السلوك:
1. عرض جميع المسارات النشطة
2. المستخدم يختار مسار واحد
3. تختفي باقي المسارات → تظهر خطوات المسار المختار
4. عند اختيار خطوة بـ continue + linkedRouteIds:
   - تظهر المسارات المرتبطة
   - المستخدم يختار مسار مرتبط
   - العملية تستمر...
```

**مثال:**
```
النسبة: 65%
↓
عرض جميع المسارات: ["تأشيرات", "تسجيل", "دفع", "عقود", "حجوزات"]
↓
اختيار "تأشيرات"
↓
عرض خطوات "تأشيرات": [خطوة 1, خطوة 2, خطوة 3]
↓
اختيار خطوة 2 → continue + linkedRouteIds: ["دفع", "عقود"]
↓
عرض المسارات المرتبطة: ["دفع", "عقود"]
↓
اختيار "دفع"
↓
عرض خطوات "دفع"...
```

---

## 🔗 **الميزة الجديدة: Linked Routes**

### **التعريف:**

```typescript
interface SubCondition {
  id: string;
  name: string;
  action: 'continue' | 'force_solution' | 'escalation';
  linkedRouteIds?: string[]; // ← الميزة الجديدة!
  childConditions?: SubCondition[];
  actionDetails?: string;
}
```

### **الاستخدام:**

```typescript
// مثال: خطوة في مسار "تأشيرات"
{
  id: 'visa_step1_cond1',
  name: 'تحقق من نوع التأشيرة',
  action: 'continue',
  linkedRouteIds: ['route_payment', 'route_contracts'], // ← ربط مع مسارات أخرى
}
```

### **السلوك:**

1. **عند اختيار** condition مع `linkedRouteIds`
2. **يتم عرض** المسارات المرتبطة للاختيار
3. **المستخدم يختار** مسار واحد من المسارات المرتبطة
4. **يتم الانتقال** لخطوات المسار الجديد
5. **تستمر العملية** حتى `force_solution` أو `escalation`

---

## 📁 **الملفات الجديدة**

### **1. AdvancedFlowPanelV2.tsx**

```typescript
interface AdvancedFlowPanelV2Props {
  routes: Route[];
  steps: Step[];
  problemDescription: string;
  isGrayAreaMode: boolean; // ← الفرق الرئيسي!
  onFlowComplete: (result: {...}) => void;
  onDebugUpdate?: (data: {...}) => void;
}
```

**الميزات:**
- ✅ دعم Gray Area Mode
- ✅ دعم Advanced Mode
- ✅ نظام Linked Routes
- ✅ Breadcrumb navigation متقدم
- ✅ Route selector مرن

---

## 🔄 **المسار الكامل (Advanced Mode Example)**

### **السيناريو:**

```
المستخدم: "مشكلة في الدفع"
النسبة: 67%
النمط: Advanced Mode
```

### **الخطوات:**

```
┌──────────────────────────────────────────┐
│ 1️⃣ المستخدم يضغط "وضع متقدم"             │
│    isGrayAreaMode = false                │
│    isAdvancedModeEnabled = true          │
└──────────────────────────────────────────┘
              ↓
┌──────────────────────────────────────────┐
│ 2️⃣ عرض جميع المسارات النشطة              │
│    Routes: [                             │
│      "تأشيرات",                           │
│      "تسجيل",                             │
│      "دفع",                               │
│      "عقود",                              │
│      "حجوزات"                             │
│    ]                                     │
└──────────────────────────────────────────┘
              ↓
┌──────────────────────────────────────────┐
│ 3️⃣ المستخدم يختار "دفع"                  │
│    handleRouteSelect('route_payment')    │
│    selectedRouteIds = ['route_payment']  │
│    showRouteSelector = false             │
└──────────────────────────────────────────┘
              ↓
┌──────────────────────────────────────────┐
│ 4️⃣ عرض خطوات مسار "دفع"                  │
│    Steps: [                              │
│      "خطوة 1: التحقق من نوع الدفع",      │
│      "خطوة 2: التحقق من البطاقة",        │
│      "خطوة 3: معالجة الدفع"              │
│    ]                                     │
└──────────────────────────────────────────┘
              ↓
┌──────────────────────────────────────────┐
│ 5️⃣ المستخدم يختار خطوة 1                 │
│    SubConditions: [                      │
│      "بطاقة ائتمان",                      │
│      "تحويل بنكي" (linkedRouteIds: [...])│
│    ]                                     │
└──────────────────────────────────────────┘
              ↓
┌──────────────────────────────────────────┐
│ 6️⃣ المستخدم يختار "تحويل بنكي"           │
│    linkedRouteIds = ['route_bank']       │
│    showLinkedRoutes(['route_bank'])      │
└──────────────────────────────────────────┘
              ↓
┌──────────────────────────────────────────┐
│ 7️⃣ عرض المسارات المرتبطة                 │
│    Routes: ["البنوك المحلية"]            │
│    selectedRouteIds = [                  │
│      'route_payment',                    │
│      'route_bank'                        │
│    ]                                     │
└──────────────────────────────────────────┘
              ↓
┌──────────────────────────────────────────┐
│ 8️⃣ المستخدم يختار "البنوك المحلية"       │
│    عرض خطوات "البنوك المحلية"...         │
└──────────────────────────────────────────┘
              ↓
┌──────────────────────────────────────────┐
│ 9️⃣ حتى يصل إلى force_solution/escalation │
│    onFlowComplete() → تحديث النسبة 100%  │
└──────────────────────────────────────────┘
```

---

## 🎨 **UI/UX التحسينات**

### **1. Route Selector**

```tsx
<div className="grid grid-cols-1 gap-2">
  {availableRoutes.map((route) => (
    <button
      key={route.id}
      onClick={() => handleRouteSelect(route.id)}
      className="glass-panel border-2 border-border hover:border-primary/50"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h5>{route.name}</h5>
          <Badge>المرحلة {route.order}</Badge>
        </div>
        <ArrowRight className="size-5 text-primary" />
      </div>
    </button>
  ))}
</div>
```

---

### **2. Breadcrumb Navigation**

```tsx
interface BreadcrumbItem {
  name: string;
  level: number;
  type: 'route' | 'step' | 'condition'; // ← أنواع مختلفة!
}

// عرض Breadcrumb
{breadcrumbs.map((crumb, index) => (
  <button onClick={() => handleBreadcrumbClick(crumb.level, crumb.type)}>
    {crumb.name}
  </button>
))}

// مثال:
// "دفع" (route) > "خطوة 1" (step) > "بطاقة ائتمان" (condition)
```

---

### **3. Linked Routes Indicator**

```tsx
{hasLinkedRoutes && (
  <p className="text-[10px] text-emerald-600">
    🔗 {subCond.linkedRouteIds!.length} مسار مرتبط
  </p>
)}
```

---

## ⚙️ **التكامل مع CallHelper**

### **التغييرات في CallHelper.tsx:**

```typescript
// Old import
// import { AdvancedFlowPanel } from "./AdvancedFlowPanel";

// New import
import { AdvancedFlowPanelV2 } from "./AdvancedFlowPanelV2";

// Usage
<AdvancedFlowPanelV2
  routes={routes}
  steps={steps}
  problemDescription={problemSummary}
  isGrayAreaMode={wasGrayAreaResolved} // ← الفرق الرئيسي!
  onFlowComplete={...}
  onDebugUpdate={...}
/>
```

### **Logic الأنماط:**

```typescript
// Gray Area (< 50%): wasGrayAreaResolved = true بعد اختيار نوع المشكلة
// Advanced Mode (50-79%): wasGrayAreaResolved = false عند الضغط على "وضع متقدم"

const isGrayAreaMode = wasGrayAreaResolved; // true/false
```

---

## 📊 **مقارنة الأنماط**

| الميزة | Gray Area Mode | Advanced Mode |
|--------|----------------|---------------|
| **عرض المسارات** | المطابقة للـ keywords فقط | جميع المسارات النشطة |
| **الترتيب** | حسب match score | حسب order (للعرض فقط) |
| **التنقل** | خطوة بخطوة تقليدي | مرن مع linked routes |
| **Route Selection** | تلقائي (حسب keywords) | يدوي (المستخدم يختار) |
| **Linked Routes** | غير مدعوم | ✅ مدعوم بالكامل |
| **Breadcrumb** | عادي | متقدم (route + step + condition) |

---

## 🔧 **API الجديد**

### **showLinkedRoutes()**

```typescript
/**
 * Show linked routes when continue action has linkedRouteIds
 */
const showLinkedRoutes = (linkedRouteIds: string[]) => {
  const linkedRoutes = routes.filter(r => 
    linkedRouteIds.includes(r.id) && r.isActive
  );
  
  console.log('🔗 Showing Linked Routes:', {
    linkedIds: linkedRouteIds,
    foundRoutes: linkedRoutes.map(r => r.name),
  });

  setAvailableRoutes(linkedRoutes);
  setShowRouteSelector(true);
};
```

---

### **handleRouteSelect()**

```typescript
/**
 * Handle route selection
 */
const handleRouteSelect = (routeId: string) => {
  const route = routes.find(r => r.id === routeId);
  if (!route) return;

  console.log('🎯 Route Selected:', route.name);

  // Add to route stack
  setSelectedRouteIds(prev => [...prev, routeId]);
  
  // Hide route selector
  setShowRouteSelector(false);
  
  // Reset step navigation
  setCurrentStepIndex(0);
  setCompletedSteps([]);
};
```

---

## 🧪 **اختبار السيناريوهات**

### **سيناريو 1: Gray Area Mode**

```
Input: "تأشيرة" (35%)
↓
wasGrayAreaResolved = true (بعد اختيار نوع المشكلة)
isGrayAreaMode = true
↓
عرض المسارات المطابقة للـ keywords فقط:
- "تأشيرات" (keyword: تأشيرة)
- "تسجيل" (keyword: تسجيل تأشيرة)
↓
التنقل التقليدي
```

---

### **سيناريو 2: Advanced Mode - بسيط**

```
Input: "مشكلة في الدفع" (67%)
↓
wasGrayAreaResolved = false
isGrayAreaMode = false
↓
عرض جميع المسارات:
- تأشيرات
- تسجيل
- دفع
- عقود
- حجوزات
↓
اختيار "دفع"
↓
عرض خطوات "دفع"
↓
التنقل حتى النهاية
```

---

### **سيناريو 3: Advanced Mode - مع Linked Routes**

```
Input: "مشكلة في الدفع والعقد" (60%)
↓
عرض جميع المسارات
↓
اختيار "دفع"
↓
خطوة 1: نوع الدفع
  → "تحويل بنكي" (linkedRouteIds: ['contracts'])
↓
عرض المسارات المرتبطة: ["عقود"]
↓
اختيار "عقود"
↓
خطوات "عقود"...
```

---

## 📝 **التوثيق للمطورين**

### **إضافة Linked Route جديد:**

```typescript
// 1. في Advanced Settings Panel → Sub-Conditions
{
  id: 'new_condition',
  name: 'اسم الحالة',
  action: 'continue',
  linkedRouteIds: ['route_id_1', 'route_id_2'], // ← أضف هنا
  actionDetails: 'تفاصيل...'
}

// 2. تأكد أن المسارات المرتبطة موجودة و active
routes.find(r => r.id === 'route_id_1')?.isActive === true
```

---

## 🎯 **الخلاصة**

### **ما تم إضافته:**

1. ✅ نظام مسارات مرن (بدون ترتيب إلزامي)
2. ✅ نمطين مختلفين (Gray Area + Advanced)
3. ✅ ميزة Linked Routes
4. ✅ Breadcrumb navigation متقدم
5. ✅ Route selector ديناميكي
6. ✅ Stack-based navigation للمسارات المتعددة

### **ما لم يتغير:**

1. ✅ Gray Area Mode الأصلي (نفس السلوك)
2. ✅ Logic الأزرار
3. ✅ نظام الثقة والنسب
4. ✅ AI Response Generation

---

**الحالة**: ✅ جاهز للاستخدام  
**التوافق**: 100% مع النظام الحالي  
**Breaking Changes**: لا يوجد

**آخر تحديث**: 2026-01-07
