import { useState } from 'react';
import { 
  Brain,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  Edit3,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  FileText,
  MessageSquare,
  AlertCircle,
  Archive,
  Pause,
  ChevronRight,
  Calendar,
  User,
  Target,
  Zap,
  Eye,
  GitBranch,
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Progress } from '../ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { toast } from 'sonner';
import { formatAppDateTime } from '../../utils/dateDisplay';

// ====================================================================
// Types
// ====================================================================

type LearningType = 'interaction' | 'feedback' | 'error' | 'pattern';
type ReviewStatus = 'pending' | 'approved' | 'modified' | 'rejected' | 'needs_data';
type FrequencyLevel = 'low' | 'medium' | 'high';
type ImpactLevel = 'low' | 'medium' | 'high' | 'critical';
type TrendDirection = 'increasing' | 'stable' | 'decreasing';

interface SourceLog {
  type: 'interaction' | 'feedback' | 'error';
  count: number;
  lastSeen: string;
}

interface DetectedPattern {
  description: string;
  keywords: string[];
  scenarios: string[];
  trend: TrendDirection;
  confidenceScore: number;
}

interface SystemSuggestion {
  action: string;
  type: 'route' | 'response' | 'rule' | 'archive_reference';
  confidenceThreshold: number;
  source: 'new' | 'archive' | 'hybrid';
  details: string;
}

interface RiskImpact {
  level: ImpactLevel;
  affectedFlows: string[];
  criticalPathWarning: boolean;
  description: string;
}

interface ReviewItem {
  id: string;
  type: LearningType;
  title: string;
  summary: string;
  category: string;
  detectedAt: string;
  sourceLogs: SourceLog[];
  frequency: FrequencyLevel;
  pattern: DetectedPattern;
  suggestion: SystemSuggestion;
  riskImpact: RiskImpact;
  status: ReviewStatus;
}

interface HistoryItem {
  id: string;
  reviewId: string;
  action: 'approved' | 'modified' | 'rejected' | 'archived';
  title: string;
  approver: string;
  comment?: string;
  date: string;
  version: string;
}

// ====================================================================
// Mock Data
// ====================================================================

const MOCK_REVIEW_ITEMS: ReviewItem[] = [
  {
    id: 'rev-1',
    type: 'pattern',
    title: 'نمط متكرر: "مشكلة في التوطين"',
    summary: 'النظام لاحظ تكرار مشكلة التوطين في 23 مكالمة واقترح إضافة مسار جديد',
    category: 'مسارات جديدة',
    detectedAt: '2024-01-16T09:30:00',
    sourceLogs: [
      { type: 'interaction', count: 23, lastSeen: '2024-01-16T08:15:00' },
      { type: 'feedback', count: 8, lastSeen: '2024-01-15T14:20:00' },
      { type: 'error', count: 5, lastSeen: '2024-01-15T11:30:00' },
    ],
    frequency: 'high',
    pattern: {
      description: 'تم رصد نمط متكرر حول مشاكل نسبة التوطين، احتساب النطاقات، والتحديثات على البيانات',
      keywords: ['توطين', 'نسبة التوطين', 'النطاق الأخضر', 'احتساب النسبة', 'تحديث البيانات'],
      scenarios: [
        'استفسار حول احتساب نسبة التوطين بعد تعيين موظفين جدد',
        'مشكلة في ظهور نسبة خاطئة في النظام',
        'طلب تحديث البيانات لتحسين النطاق',
      ],
      trend: 'increasing',
      confidenceScore: 87,
    },
    suggestion: {
      action: 'إضافة مسار جديد: "التوطين" مع 4 خطوات فرعية',
      type: 'route',
      confidenceThreshold: 85,
      source: 'new',
      details: 'مسار مقترح يحتوي على: احتساب النسبة، تحديث البيانات، استعلام عن النطاق، رفع شكوى',
    },
    riskImpact: {
      level: 'low',
      affectedFlows: ['استعلامات عامة', 'مشاكل تقنية'],
      criticalPathWarning: false,
      description: 'إضافة مسار جديد لا تؤثر على المسارات الحالية. مخاطر منخفضة.',
    },
    status: 'pending',
  },
  {
    id: 'rev-2',
    type: 'feedback',
    title: 'اقتراح تحسين: إضافة خيار "فحص بيانات البنك"',
    summary: 'النظام لاحظ أن 51% من حالات "دفع معلق" سببها بيانات بنكية خاطئة',
    category: 'تحديثات على المسارات',
    detectedAt: '2024-01-16T08:45:00',
    sourceLogs: [
      { type: 'interaction', count: 45, lastSeen: '2024-01-16T07:30:00' },
      { type: 'feedback', count: 12, lastSeen: '2024-01-15T16:10:00' },
    ],
    frequency: 'high',
    pattern: {
      description: 'من أصل 45 حالة "دفع معلق"، 23 حالة كانت بسبب خطأ في الآيبان أو رقم الحساب',
      keywords: ['آيبان', 'رقم الحساب', 'بيانات البنك', 'معلومات بنكية', 'خطأ في الحساب'],
      scenarios: [
        'الدفع معلق بسبب خطأ في رقم الآيبان',
        'مشكلة في بيانات البنك تمنع استكمال الدفع',
        'طلب التحقق من معلومات الحساب البنكي',
      ],
      trend: 'stable',
      confidenceScore: 92,
    },
    suggestion: {
      action: 'إضافة خيار فرعي تحت "دفع معلق": "فحص صحة بيانات البنك"',
      type: 'route',
      confidenceThreshold: 90,
      source: 'archive',
      details: 'توجد حلول مشابهة في الأرشيف تم استخدامها بنجاح في 18 حالة سابقة',
    },
    riskImpact: {
      level: 'medium',
      affectedFlows: ['الدفع والفواتير'],
      criticalPathWarning: true,
      description: 'يؤثر على مسار الدفع وهو مسار حساس. يُنصح بمراجعة دقيقة قبل التطبيق.',
    },
    status: 'pending',
  },
  {
    id: 'rev-3',
    type: 'error',
    title: 'نمط Gray Area: "مشكلة تقنية غامضة"',
    summary: 'النظام رصد 18 حالة دخلت Gray Area بسبب عدم وضوح المشكلة التقنية',
    category: 'تحسين Gray Area',
    detectedAt: '2024-01-16T07:20:00',
    sourceLogs: [
      { type: 'interaction', count: 18, lastSeen: '2024-01-16T06:00:00' },
      { type: 'error', count: 18, lastSeen: '2024-01-16T06:00:00' },
    ],
    frequency: 'medium',
    pattern: {
      description: 'عند ذكر "مشكلة تقنية" بدون تفاصيل، يدخل النظام في Gray Area مباشرة',
      keywords: ['مشكلة', 'ما يشتغل', 'خطأ', 'عطل', 'تقنية'],
      scenarios: [
        'فيه مشكلة تقنية بس ما عندي تفاصيل',
        'النظام ما يشتغل عندي',
        'فيه خطأ ما أعرف إيش هو',
      ],
      trend: 'increasing',
      confidenceScore: 78,
    },
    suggestion: {
      action: 'إضافة سؤال توجيهي محدد في Gray Area',
      type: 'response',
      confidenceThreshold: 75,
      source: 'hybrid',
      details: 'اقتراح: "هل يمكنك وصف ما يحدث بالضبط؟ (رسالة خطأ، صفحة بيضاء، بطء...)"',
    },
    riskImpact: {
      level: 'low',
      affectedFlows: ['Gray Area'],
      criticalPathWarning: false,
      description: 'تحسين في تجربة المستخدم بدون مخاطر على المسارات الحالية',
    },
    status: 'pending',
  },
  {
    id: 'rev-4',
    type: 'interaction',
    title: 'عبارة شائعة: "امسح الكاش وسجل دخول مرة ثانية"',
    summary: 'النظام لاحظ أن هذه العبارة استُخدمت بنجاح في 30 حالة (نسبة نجاح 90%)',
    category: 'ردود سريعة',
    detectedAt: '2024-01-15T16:00:00',
    sourceLogs: [
      { type: 'interaction', count: 30, lastSeen: '2024-01-15T15:30:00' },
      { type: 'feedback', count: 27, lastSeen: '2024-01-15T14:00:00' },
    ],
    frequency: 'high',
    pattern: {
      description: 'عبارة تتكرر من موظفين مختلفين لحل مشاكل تسجيل الدخول وعرض البيانات',
      keywords: ['تسجيل الدخول', 'البيانات لا تظهر', 'صفحة بيضاء', 'بطء'],
      scenarios: [
        'مشكلة في تسجيل الدخول',
        'البيانات لا تظهر بشكل صحيح',
        'الصفحة تظهر فارغة',
      ],
      trend: 'stable',
      confidenceScore: 95,
    },
    suggestion: {
      action: 'إضافة رد سريع (Quick Response Template)',
      type: 'response',
      confidenceThreshold: 95,
      source: 'new',
      details: 'النص المقترح: "يرجى مسح ذاكرة التخزين المؤقت (Cache) من متصفحك، ثم تسجيل الدخول مرة أخرى."',
    },
    riskImpact: {
      level: 'low',
      affectedFlows: ['الدعم التقني'],
      criticalPathWarning: false,
      description: 'إضافة رد سريع لا تؤثر على أي مسار. آمن للتطبيق.',
    },
    status: 'pending',
  },
  {
    id: 'rev-5',
    type: 'pattern',
    title: 'محفز تصعيد: كلمات قانونية',
    summary: 'النظام رصد 8 حالات تحتوي على كلمات قانونية تطلبت تدخل الإدارة القانونية',
    category: 'قواعد تصعيد',
    detectedAt: '2024-01-15T14:30:00',
    sourceLogs: [
      { type: 'interaction', count: 8, lastSeen: '2024-01-15T13:00:00' },
      { type: 'error', count: 8, lastSeen: '2024-01-15T13:00:00' },
    ],
    frequency: 'low',
    pattern: {
      description: 'رصد كلمات حساسة تتطلب تصعيداً فورياً للإدارة القانونية',
      keywords: ['قضية', 'محكمة', 'محامي', 'دعوى', 'حقوقي'],
      scenarios: [
        'راح أرفع قضية في المحكمة العمالية',
        'محاميي قال لازم أشتكي',
        'بقدم دعوى على الوزارة',
      ],
      trend: 'decreasing',
      confidenceScore: 88,
    },
    suggestion: {
      action: 'إضافة قاعدة تصعيد تلقائي عند رصد كلمات قانونية',
      type: 'rule',
      confidenceThreshold: 85,
      source: 'new',
      details: 'تصعيد فوري للإدارة القانونية عند رصد: قضية، محكمة، محامي، دعوى',
    },
    riskImpact: {
      level: 'critical',
      affectedFlows: ['جميع المسارات'],
      criticalPathWarning: true,
      description: 'قاعدة تؤثر على جميع المسارات. يتطلب مراجعة دقيقة جداً من الإدارة القانونية.',
    },
    status: 'pending',
  },
];

const MOCK_HISTORY: HistoryItem[] = [
  {
    id: 'hist-1',
    reviewId: 'rev-100',
    action: 'approved',
    title: 'إضافة مسار "التأشيرات"',
    approver: 'أحمد محمد',
    comment: 'مسار ضروري ومتكرر',
    date: '2024-01-16T10:00:00',
    version: 'v2.3.1',
  },
  {
    id: 'hist-2',
    reviewId: 'rev-101',
    action: 'modified',
    title: 'تحديث رد "مشكلة في الدخول"',
    approver: 'سارة خالد',
    comment: 'تم تعديل النص ليكون أوضح',
    date: '2024-01-16T09:30:00',
    version: 'v2.3.1',
  },
  {
    id: 'hist-3',
    reviewId: 'rev-102',
    action: 'rejected',
    title: 'اقتراح قاعدة تصعيد لكلمات عامة',
    approver: 'محمد علي',
    comment: 'القاعدة عامة جداً وتسبب تصعيدات غير ضرورية',
    date: '2024-01-16T08:15:00',
    version: 'v2.3.0',
  },
  {
    id: 'hist-4',
    reviewId: 'rev-103',
    action: 'archived',
    title: 'نمط قديم: "مشكلة في الطباعة"',
    approver: 'فاطمة أحمد',
    comment: 'تم حفظه في الأرشيف للرجوع إليه لاحقاً',
    date: '2024-01-15T16:45:00',
    version: 'v2.3.0',
  },
];

// ====================================================================
// Component
// ====================================================================

export function ReviewCenterPage() {
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>(MOCK_REVIEW_ITEMS);
  const [history] = useState<HistoryItem[]>(MOCK_HISTORY);
  const [selectedItem, setSelectedItem] = useState<ReviewItem | null>(null);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'modify' | 'reject' | null>(null);
  const [actionComment, setActionComment] = useState('');
  const [modifiedValue, setModifiedValue] = useState('');

  // ====================================================================
  // Helper Functions
  // ====================================================================

  const getTypeIcon = (type: LearningType) => {
    switch (type) {
      case 'interaction':
        return <MessageSquare className="size-4" />;
      case 'feedback':
        return <TrendingUp className="size-4" />;
      case 'error':
        return <AlertCircle className="size-4" />;
      case 'pattern':
        return <Brain className="size-4" />;
    }
  };

  const getTypeColor = (type: LearningType) => {
    switch (type) {
      case 'interaction':
        return 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30';
      case 'feedback':
        return 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
      case 'error':
        return 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30';
      case 'pattern':
        return 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30';
    }
  };

  const getTypeName = (type: LearningType) => {
    switch (type) {
      case 'interaction':
        return 'Interaction';
      case 'feedback':
        return 'Feedback';
      case 'error':
        return 'Error';
      case 'pattern':
        return 'Pattern';
    }
  };

  const getFrequencyColor = (freq: FrequencyLevel) => {
    switch (freq) {
      case 'high':
        return 'text-red-600 dark:text-red-400';
      case 'medium':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'low':
        return 'text-emerald-600 dark:text-emerald-400';
    }
  };

  const getFrequencyName = (freq: FrequencyLevel) => {
    switch (freq) {
      case 'high':
        return 'عالي';
      case 'medium':
        return 'متوسط';
      case 'low':
        return 'منخفض';
    }
  };

  const getImpactColor = (impact: ImpactLevel) => {
    switch (impact) {
      case 'critical':
        return 'text-red-600 dark:text-red-400';
      case 'high':
        return 'text-orange-600 dark:text-orange-400';
      case 'medium':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'low':
        return 'text-emerald-600 dark:text-emerald-400';
    }
  };

  const getImpactName = (impact: ImpactLevel) => {
    switch (impact) {
      case 'critical':
        return 'حرج';
      case 'high':
        return 'عالي';
      case 'medium':
        return 'متوسط';
      case 'low':
        return 'منخفض';
    }
  };

  const getTrendIcon = (trend: TrendDirection) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="size-4 text-red-500" />;
      case 'stable':
        return <Minus className="size-4 text-yellow-500" />;
      case 'decreasing':
        return <TrendingDown className="size-4 text-emerald-500" />;
    }
  };

  const getTrendName = (trend: TrendDirection) => {
    switch (trend) {
      case 'increasing':
        return 'تصاعدي';
      case 'stable':
        return 'مستقر';
      case 'decreasing':
        return 'تنازلي';
    }
  };

  const formatDate = (dateStr: string) => formatAppDateTime(dateStr);

  // ====================================================================
  // Action Handlers
  // ====================================================================

  const handleOpenAction = (type: 'approve' | 'modify' | 'reject') => {
    setActionType(type);
    setActionComment('');
    if (type === 'modify' && selectedItem) {
      setModifiedValue(selectedItem.suggestion.details);
    }
    setShowActionDialog(true);
  };

  const handleConfirmAction = () => {
    if (!selectedItem || !actionType) return;

    let statusUpdate: ReviewStatus = 'pending';
    let toastMessage = '';

    switch (actionType) {
      case 'approve':
        statusUpdate = 'approved';
        toastMessage = 'تم قبول الاقتراح بنجاح';
        break;
      case 'modify':
        statusUpdate = 'modified';
        toastMessage = 'تم قبول الاقتراح مع التعديلات';
        break;
      case 'reject':
        statusUpdate = 'rejected';
        toastMessage = 'تم رفض الاقتراح';
        break;
    }

    setReviewItems(prev =>
      prev.map(item =>
        item.id === selectedItem.id ? { ...item, status: statusUpdate } : item
      )
    );

    toast.success(toastMessage, {
      description: actionComment || 'تم تنفيذ الإجراء',
    });

    setShowActionDialog(false);
    setSelectedItem(null);
  };

  const handleArchive = () => {
    if (!selectedItem) return;

    setReviewItems(prev =>
      prev.map(item =>
        item.id === selectedItem.id ? { ...item, status: 'pending' } : item
      )
    );

    toast.success('تم إرسال الاقتراح إلى الأرشيف', {
      description: 'يمكنك الرجوع إليه لاحقاً',
    });
  };

  const handleNeedsData = () => {
    if (!selectedItem) return;

    setReviewItems(prev =>
      prev.map(item =>
        item.id === selectedItem.id ? { ...item, status: 'needs_data' } : item
      )
    );

    toast.info('تم وضع علامة "يحتاج بيانات أكثر"', {
      description: 'سيستمر النظام في جمع البيانات',
    });
  };

  // ====================================================================
  // Stats
  // ====================================================================

  const pendingCount = reviewItems.filter(i => i.status === 'pending').length;
  const approvedToday = reviewItems.filter(i => i.status === 'approved').length;
  const rejectedCount = reviewItems.filter(i => i.status === 'rejected').length;

  // ====================================================================
  // Render
  // ====================================================================

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl">
              <Shield className="size-6 text-white" />
            </div>
            Review Center
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            مراجعة ما تعلّمه النظام قبل التطبيق
          </p>
          <p className="mt-3 text-sm font-medium text-amber-800 dark:text-amber-300 bg-amber-500/15 border border-amber-500/35 rounded-lg px-3 py-2 max-w-2xl">
            هذه الصفحة لا تعمل حالياً — الواجهة للعرض فقط ولم يُربَط المحتوى أو الإجراءات بالخادم بعد.
          </p>
        </div>

        {/* Status Badges */}
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30 px-4 py-2">
            <Clock className="size-3 ml-1" />
            Pending: {pendingCount}
          </Badge>
          <Badge variant="outline" className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 px-4 py-2">
            <CheckCircle className="size-3 ml-1" />
            Approved Today: {approvedToday}
          </Badge>
          <Badge variant="outline" className="bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30 px-4 py-2">
            <XCircle className="size-3 ml-1" />
            Rejected: {rejectedCount}
          </Badge>
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Review Queue - Left/Center */}
        <div className="lg:col-span-2 space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pl-2">
          {reviewItems.map((item) => (
            <Card
              key={item.id}
              className={`glass-panel border-2 p-4 cursor-pointer transition-all hover:scale-[1.01] ${
                selectedItem?.id === item.id
                  ? 'border-primary shadow-lg'
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => setSelectedItem(item)}
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`${getTypeColor(item.type)} text-xs`}>
                      <span className="ml-1">{getTypeIcon(item.type)}</span>
                      {getTypeName(item.type)}
                    </Badge>
                    {item.status !== 'pending' && (
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          item.status === 'approved' || item.status === 'modified'
                            ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                            : item.status === 'rejected'
                            ? 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30'
                            : 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30'
                        }`}
                      >
                        {item.status === 'approved'
                          ? '✓ مقبول'
                          : item.status === 'modified'
                          ? '✓ معدّل'
                          : item.status === 'rejected'
                          ? '✗ مرفوض'
                          : '⏸ يحتاج بيانات'}
                      </Badge>
                    )}
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground flex-shrink-0" />
                </div>

                {/* Title & Category */}
                <div>
                  <h3 className="font-bold text-foreground text-sm mb-1">{item.title}</h3>
                  <p className="text-xs text-muted-foreground">{item.category}</p>
                </div>

                {/* Summary */}
                <p className="text-sm text-foreground leading-relaxed bg-accent/30 p-3 rounded-lg border border-border">
                  <Brain className="size-3 inline ml-1 text-primary" />
                  {item.summary}
                </p>

                {/* Meta Info */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="size-3" />
                      {formatDate(item.detectedAt)}
                    </div>
                    <div className={`flex items-center gap-1 font-medium ${getFrequencyColor(item.frequency)}`}>
                      <Zap className="size-3" />
                      {getFrequencyName(item.frequency)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.sourceLogs.map((log) => (
                      <Badge key={log.type} variant="outline" className="text-[10px] px-2 py-0.5">
                        {log.type === 'interaction' ? '💬' : log.type === 'feedback' ? '📊' : '⚠️'} {log.count}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Confidence Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Confidence Score</span>
                    <span className="font-bold text-primary">{item.pattern.confidenceScore}%</span>
                  </div>
                  <Progress value={item.pattern.confidenceScore} className="h-1.5" />
                </div>
              </div>
            </Card>
          ))}

          {reviewItems.length === 0 && (
            <Card className="glass-panel border-2 border-border p-12 text-center">
              <Eye className="size-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">لا توجد مراجعات معلقة</p>
            </Card>
          )}
        </div>

        {/* Review Details Panel - Right */}
        <div className="space-y-3">
          {selectedItem ? (
            <>
              <Card className="glass-panel border-2 border-border p-4 space-y-4">
                {/* Section A: Detected Pattern */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 pb-2 border-b border-border">
                    <Brain className="size-4 text-primary" />
                    <h3 className="font-bold text-foreground text-sm">Detected Pattern</h3>
                  </div>
                  
                  <div className="space-y-3">
                    <p className="text-sm text-foreground leading-relaxed">
                      {selectedItem.pattern.description}
                    </p>

                    <div>
                      <Label className="text-xs text-muted-foreground">Related Keywords</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedItem.pattern.keywords.map((kw, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs bg-primary/10">
                            {kw}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Repeated Scenarios</Label>
                      <div className="space-y-1 mt-1">
                        {selectedItem.pattern.scenarios.map((sc, idx) => (
                          <div key={idx} className="text-xs text-foreground glass-card p-2 rounded-md border border-border">
                            • {sc}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between glass-card p-2 rounded-md border border-border">
                      <Label className="text-xs text-muted-foreground">Trend Indicator</Label>
                      <div className="flex items-center gap-1">
                        {getTrendIcon(selectedItem.pattern.trend)}
                        <span className="text-xs font-medium text-foreground">
                          {getTrendName(selectedItem.pattern.trend)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section B: System Suggestion */}
                <div className="space-y-2 pt-3 border-t border-border">
                  <div className="flex items-center gap-2 pb-2 border-b border-border">
                    <Target className="size-4 text-cyan-500" />
                    <h3 className="font-bold text-foreground text-sm">System Suggestion</h3>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Suggested Action</Label>
                      <p className="text-sm font-medium text-cyan-600 dark:text-cyan-400 mt-1">
                        {selectedItem.suggestion.action}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="glass-card p-2 rounded-md border border-border">
                        <Label className="text-[10px] text-muted-foreground">Type</Label>
                        <p className="text-xs font-medium text-foreground capitalize">
                          {selectedItem.suggestion.type.replace('_', ' ')}
                        </p>
                      </div>
                      <div className="glass-card p-2 rounded-md border border-border">
                        <Label className="text-[10px] text-muted-foreground">Source</Label>
                        <p className="text-xs font-medium text-foreground capitalize">
                          {selectedItem.suggestion.source}
                        </p>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Details</Label>
                      <p className="text-xs text-foreground glass-card p-2 rounded-md border border-border mt-1">
                        {selectedItem.suggestion.details}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <Label className="text-muted-foreground">Confidence Threshold</Label>
                        <span className="font-bold text-primary">{selectedItem.suggestion.confidenceThreshold}%</span>
                      </div>
                      <Progress value={selectedItem.suggestion.confidenceThreshold} className="h-1.5" />
                    </div>
                  </div>
                </div>

                {/* Section C: Risk & Impact */}
                <div className="space-y-2 pt-3 border-t border-border">
                  <div className="flex items-center gap-2 pb-2 border-b border-border">
                    <AlertTriangle className="size-4 text-orange-500" />
                    <h3 className="font-bold text-foreground text-sm">Risk & Impact</h3>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between glass-card p-2 rounded-md border border-border">
                      <Label className="text-xs text-muted-foreground">Impact Level</Label>
                      <Badge
                        variant="outline"
                        className={`text-xs font-bold ${
                          selectedItem.riskImpact.level === 'critical'
                            ? 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30'
                            : selectedItem.riskImpact.level === 'high'
                            ? 'bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30'
                            : selectedItem.riskImpact.level === 'medium'
                            ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30'
                            : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                        }`}
                      >
                        {getImpactName(selectedItem.riskImpact.level)}
                      </Badge>
                    </div>

                    {selectedItem.riskImpact.criticalPathWarning && (
                      <div className="glass-card p-2 rounded-md border border-red-500/50 bg-red-500/10">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="size-4 text-red-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-medium text-red-600 dark:text-red-400">
                              ⚠️ Critical Path Warning
                            </p>
                            <p className="text-[10px] text-red-600/80 dark:text-red-400/80 mt-0.5">
                              This affects critical user flows
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <Label className="text-xs text-muted-foreground">Affected Flows</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedItem.riskImpact.affectedFlows.map((flow, idx) => (
                          <Badge key={idx} variant="outline" className="text-[10px]">
                            <GitBranch className="size-2 ml-1" />
                            {flow}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Risk Description</Label>
                      <p className="text-xs text-foreground glass-card p-2 rounded-md border border-border mt-1">
                        {selectedItem.riskImpact.description}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Action Panel - Sticky Bottom */}
              {selectedItem.status === 'pending' && (
                <Card className="glass-panel border-2 border-primary/50 p-4 sticky bottom-4 shadow-lg">
                  <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border">
                    <Shield className="size-4 text-primary" />
                    <h3 className="font-bold text-foreground text-sm">Human Decision</h3>
                  </div>

                  <div className="space-y-2">
                    {/* Primary Actions */}
                    <div className="space-y-2">
                      <Button
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                        onClick={() => handleOpenAction('approve')}
                      >
                        <CheckCircle className="size-4 ml-2" />
                        Approve & Apply
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => handleOpenAction('modify')}
                      >
                        <Edit3 className="size-4 ml-2" />
                        Approve with Modification
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full hover:bg-red-500/10 hover:text-red-600 hover:border-red-500"
                        onClick={() => handleOpenAction('reject')}
                      >
                        <XCircle className="size-4 ml-2" />
                        Reject
                      </Button>
                    </div>

                    {/* Secondary Actions */}
                    <div className="pt-2 border-t border-border space-y-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs justify-start"
                        onClick={handleArchive}
                      >
                        <Archive className="size-3 ml-2" />
                        Send to Archive Only
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs justify-start"
                        onClick={handleNeedsData}
                      >
                        <FileText className="size-3 ml-2" />
                        Mark as Needs More Data
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs justify-start"
                      >
                        <Pause className="size-3 ml-2" />
                        Pause Similar Learnings
                      </Button>
                    </div>
                  </div>
                </Card>
              )}
            </>
          ) : (
            <Card className="glass-panel border-2 border-border p-12 text-center">
              <Eye className="size-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-sm text-muted-foreground">
                اختر عنصراً من القائمة للمراجعة
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Learning History - Bottom Section */}
      <Card className="glass-panel border-2 border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="size-4 text-primary" />
          <h3 className="font-bold text-foreground text-sm">Learning History</h3>
        </div>

        <div className="space-y-2 max-h-48 overflow-y-auto">
          {history.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 p-3 glass-card rounded-lg border border-border hover:bg-accent/30 transition-colors"
            >
              <div className="p-2 glass-panel rounded-md border border-border flex-shrink-0">
                {item.action === 'approved' || item.action === 'modified' ? (
                  <CheckCircle className="size-4 text-emerald-500" />
                ) : item.action === 'rejected' ? (
                  <XCircle className="size-4 text-red-500" />
                ) : (
                  <Archive className="size-4 text-gray-500" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="size-3" />
                        {item.approver}
                      </div>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        {formatDate(item.date)}
                      </div>
                      <span>•</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {item.version}
                      </Badge>
                    </div>
                    {item.comment && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        "{item.comment}"
                      </p>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] flex-shrink-0 ${
                      item.action === 'approved'
                        ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                        : item.action === 'modified'
                        ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30'
                        : item.action === 'rejected'
                        ? 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30'
                        : 'bg-gray-500/20 text-gray-700 dark:text-gray-300 border-gray-500/30'
                    }`}
                  >
                    {item.action === 'approved'
                      ? 'Approved'
                      : item.action === 'modified'
                      ? 'Modified'
                      : item.action === 'rejected'
                      ? 'Rejected'
                      : 'Archived'}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Notification Hint */}
      <Card className="glass-panel border-2 border-blue-500/30 bg-blue-500/10 p-3">
        <div className="flex items-start gap-2">
          <FileText className="size-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-foreground">
            <strong>ملاحظة:</strong> اقتراحات التعلم الجديدة تظهر أولاً كإشعارات، ثم تنتقل إلى مركز المراجعة
          </p>
        </div>
      </Card>

      {/* Action Confirmation Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent className="glass-card border-2 max-w-xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right flex items-center gap-2">
              {actionType === 'approve' && <CheckCircle className="size-5 text-emerald-500" />}
              {actionType === 'modify' && <Edit3 className="size-5 text-blue-500" />}
              {actionType === 'reject' && <XCircle className="size-5 text-red-500" />}
              {actionType === 'approve' && 'تأكيد القبول والتطبيق'}
              {actionType === 'modify' && 'تأكيد القبول مع التعديل'}
              {actionType === 'reject' && 'تأكيد الرفض'}
            </DialogTitle>
            <DialogDescription className="text-right">
              {actionType === 'approve' &&
                'سيتم تطبيق هذا الاقتراح مباشرة على النظام. هل أنت متأكد؟'}
              {actionType === 'modify' &&
                'سيتم تطبيق التعديلات التي أدخلتها. يرجى المراجعة قبل التأكيد.'}
              {actionType === 'reject' && 'لن يتم تطبيق هذا الاقتراح. هل أنت متأكد؟'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {actionType === 'modify' && selectedItem && (
              <div className="space-y-2">
                <Label>القيمة المعدلة</Label>
                <Textarea
                  value={modifiedValue}
                  onChange={(e) => setModifiedValue(e.target.value)}
                  className="glass-card border-2 border-border text-right min-h-24"
                  dir="rtl"
                />
                <div className="glass-card p-2 rounded-md border border-border">
                  <p className="text-xs text-muted-foreground mb-1">القيمة الأصلية:</p>
                  <p className="text-xs text-foreground">{selectedItem.suggestion.details}</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>تعليق (اختياري)</Label>
              <Textarea
                value={actionComment}
                onChange={(e) => setActionComment(e.target.value)}
                placeholder="أضف ملاحظاتك هنا..."
                className="glass-card border-2 border-border text-right"
                dir="rtl"
              />
            </div>

            {selectedItem?.riskImpact.criticalPathWarning && actionType === 'approve' && (
              <div className="glass-card p-3 rounded-md border border-red-500/50 bg-red-500/10">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="size-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-600 dark:text-red-400">
                      ⚠️ تحذير: يؤثر على مسارات حرجة
                    </p>
                    <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-1">
                      يرجى التأكد من المراجعة الدقيقة قبل التطبيق
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowActionDialog(false)}>
              إلغاء
            </Button>
            <Button
              onClick={handleConfirmAction}
              className={
                actionType === 'approve'
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  : actionType === 'modify'
                  ? 'bg-blue-500 hover:bg-blue-600 text-white'
                  : 'bg-red-500 hover:bg-red-600 text-white'
              }
            >
              {actionType === 'approve' && <CheckCircle className="size-4 ml-2" />}
              {actionType === 'modify' && <Edit3 className="size-4 ml-2" />}
              {actionType === 'reject' && <XCircle className="size-4 ml-2" />}
              تأكيد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
