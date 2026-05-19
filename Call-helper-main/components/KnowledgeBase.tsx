import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Archive,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useI18nLayout } from '../hooks/useI18nLayout';
import { tCategory } from '../i18n/translations';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import type { KnowledgeArticle, KnowledgeFormData } from '../types';
import {
  createKnowledgeArticle,
  deleteKnowledgeArticle,
  listKnowledgeArticles,
  listReferenceCases,
  mapCategoryToBackend,
  recordKnowledgeFeedback,
  recordKnowledgeView,
  recordReferenceCaseView,
  updateKnowledgeArticle,
  type BackendKnowledgeArticle,
  type BackendReferenceCase,
} from '../services/knowledgeBaseService';
import { useAuth } from '../contexts/AuthContext';
import { isPrivilegedStaff } from '../utils/appRoles';
import { isGranularCreateEnabled } from '../utils/uiVisibility';
import { formatAppDate } from '../utils/dateDisplay';
import { stripTrainingAttachmentFooter } from '../utils/trainingScenarioAttachment';
import { getDistributionStats, type DistributionStats } from '../services/analyticsService';
import { listOperationalUpdates } from '../services/operationalUpdatesService';
import { listTrainingEntries } from '../services/trainingEntriesService';
import type { OperationalUpdate, TrainingEntry } from '../types';

const KB_CATEGORY_KEYS = ['technical', 'billing', 'general', 'registration', 'umrah', 'agent'] as const;

function normCat(s: string) {
  return s.trim().toLowerCase();
}

function formatPercentage(p: number | string | undefined): string {
  if (p === undefined || p === '') return '';
  const s = String(p).trim();
  if (s.includes('%')) return s;
  return `${s}%`;
}

type VisibilityTab = 'all' | 'published' | 'draft';

export function KnowledgeBase({
  externalCategoryFocus,
  onConsumeExternalCategoryFocus,
}: {
  externalCategoryFocus?: string | null;
  onConsumeExternalCategoryFocus?: () => void;
} = {}) {
  const { user } = useAuth();
  const { t, dir, isRtl, textAlign, inputPad, iconSide, justifyEnd } = useI18nLayout();

  const kbCategoryLabel = useCallback((cat: string) => tCategory(t, cat), [t]);
  const canEditKnowledge = isPrivilegedStaff(user?.role);
  const canCreateKnowledgeArticle = isGranularCreateEnabled(user, 'action_knowledge_article_create');
  const canDeleteKnowledge = user?.role === 'admin';

  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<KnowledgeArticle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    try {
      if (typeof window === 'undefined') return 'all';
      const raw = sessionStorage.getItem('knowledge-base-focus');
      if (raw) {
        sessionStorage.removeItem('knowledge-base-focus');
        return raw;
      }
    } catch {
      /* ignore */
    }
    return 'all';
  });
  const [visibilityTab, setVisibilityTab] = useState<VisibilityTab>('all');
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const [formData, setFormData] = useState<KnowledgeFormData>({
    title: '',
    content: '',
    category: '',
    tags: [],
    relatedIssues: [],
  });

  const mapBackendRows = useCallback((backendArticles: BackendKnowledgeArticle[]) => {
    const mapped: KnowledgeArticle[] = backendArticles.map(a => {
      const createdAt = a.createdAt ? new Date(a.createdAt) : new Date();
      const updatedAt = a.updatedAt ? new Date(a.updatedAt) : createdAt;
      const content = `${a.description}\n\n---\n\nالحل:\n${a.solution}`;
      const ro = a.recordOrigin;
      const recordOrigin: KnowledgeArticle['recordOrigin'] =
        ro === 'rafeeq_training' || ro === 'operational_update' ? ro : 'database';

      return {
        id: String(a._id),
        source: 'knowledge' as const,
        title: a.title,
        content,
        category: a.category,
        tags: a.keywords ?? [],
        author: a.createdBy?.name || a.createdBy?.username || '—',
        createdAt,
        updatedAt,
        views: a.viewCount ?? 0,
        helpful: a.helpfulCount ?? 0,
        notHelpful: a.notHelpfulCount ?? 0,
        relatedIssues: [],
        status: a.isPublished === false ? 'draft' : 'published',
        confidence: typeof a.confidence === 'number' ? a.confidence : undefined,
        descriptionSnippet: a.description,
        recordOrigin,
      };
    });
    return mapped;
  }, []);

  const mapCaseRows = useCallback((rows: BackendReferenceCase[]): KnowledgeArticle[] => {
    const priorityMap: Record<string, number> = { Low: 25, Medium: 50, High: 75, Critical: 100 };
    return rows.map(c => {
      const createdAt = c.createdAt ? new Date(c.createdAt) : new Date();
      const updatedAt = c.updatedAt ? new Date(c.updatedAt) : createdAt;
      const tags = [
        ...String(c.extraKeywords || '')
          .split(/[،,]/)
          .map(s => s.trim())
          .filter(Boolean),
        ...String(c.synonyms || '')
          .split(/[،,]/)
          .map(s => s.trim())
          .filter(Boolean),
      ].slice(0, 24);

      let status: KnowledgeArticle['status'];
      if (c.isArchived) status = 'archived';
      else if (c.isActive === false) status = 'draft';
      else status = 'published';

      const conf =
        c.priority && priorityMap[c.priority] !== undefined ? priorityMap[c.priority] : undefined;
      const title = (c.caseId || '').trim() || 'حالة بدون رقم تعريف';
      const content = [
        `رموز رئيسية:\n${c.mainKeywords}`,
        c.responseText ? `\n\nالرد:\n${c.responseText}` : '',
        c.why ? `\n\nالسبب:\n${c.why}` : '',
        c.userType ? `\n\nنوع المستخدم: ${c.userType}` : '',
        c.accountStatus && c.accountStatus !== 'N/A' ? `\nحالة الحساب: ${c.accountStatus}` : '',
        c.subCategory && c.subCategory !== 'N/A' ? `\nالتصنيف الفرعي: ${c.subCategory}` : '',
      ].join('');

      return {
        id: `refcase:${String(c._id)}`,
        referenceCaseId: String(c._id),
        source: 'reference_case' as const,
        title,
        content: content.trim(),
        category: mapCategoryToBackend(c.category || 'general'),
        tags,
        author: c.createdBy?.name || c.createdBy?.username || '—',
        createdAt,
        updatedAt,
        views: c.viewCount ?? 0,
        helpful: 0,
        notHelpful: 0,
        relatedIssues: [],
        status,
        confidence: conf,
        descriptionSnippet: (c.mainKeywords || '').slice(0, 280),
      };
    });
  }, []);

  const mapDistributionRows = useCallback((dist: DistributionStats): KnowledgeArticle[] => {
    const stats = dist.topCategories || [];
    const weekRows = dist.weekOverWeekByCategory || [];
    const weekMap = new Map(weekRows.map(w => [normCat(w.category), w]));
    const total = stats.length || 1;
    return stats.map((stat, index) => {
      const week = weekMap.get(normCat(stat.category));
      const pct = formatPercentage(stat.percentage);
      const descParts = [`عدد التكرارات في المكالمات (الإجمالي): ${stat.count}`];
      if (pct) descParts.push(`النسبة من إجمالي المكالمات: ${pct}`);
      if (week) {
        descParts.push(
          `آخر 7 أيام: ${week.last7Days} — الأسبوع الذي قبله: ${week.previous7Days} (${week.delta >= 0 ? '+' : ''}${week.delta})`,
        );
      }
      const content = descParts.join(' — ');
      return {
        id: `common-issue:${normCat(stat.category)}:${index}`,
        source: 'common_issue' as const,
        title: stat.category,
        content,
        category: mapCategoryToBackend(stat.category),
        tags: [],
        author: 'تحليلات المكالمات',
        createdAt: new Date(),
        updatedAt: new Date(),
        views: 0,
        helpful: 0,
        notHelpful: 0,
        relatedIssues: [],
        status: 'published' as const,
        confidence: Math.min(100, Math.max(0, Math.round((100 * (total - index)) / total))),
        descriptionSnippet: content.slice(0, 280),
      };
    });
  }, []);

  const mapOperationalRows = useCallback((rows: OperationalUpdate[]): KnowledgeArticle[] => {
    return rows.map(op => {
      const content = [
        op.description.trim(),
        '',
        `النوع: ${op.type} — الحالة: ${op.status} — الأولوية: ${op.priority}`,
        op.affectedServices?.length ? `الخدمات المتأثرة: ${op.affectedServices.join('، ')}` : '',
      ]
        .filter(Boolean)
        .join('\n');
      return {
        id: `opupdate:${op.id}`,
        source: 'operational_update' as const,
        title: op.title,
        content,
        category: 'general',
        tags: op.affectedServices || [],
        author: op.createdBy,
        createdAt: op.createdAt,
        updatedAt: op.updatedAt,
        views: 0,
        helpful: 0,
        notHelpful: 0,
        relatedIssues: [],
        status: 'published' as const,
        descriptionSnippet: op.description.slice(0, 280),
      };
    });
  }, []);

  const mapTrainingRows = useCallback((rows: TrainingEntry[]): KnowledgeArticle[] => {
    return rows.map(t => {
      const scen = stripTrainingAttachmentFooter(t.scenario);
      const title = `[وش تعلم رفيق] ${(t.category || 'عام').trim() || 'عام'}`;
      const content = [
        `حالة المراجعة: ${t.status === 'approved' ? 'موافق' : t.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}`,
        '',
        'السيناريو:',
        scen,
        '',
        'الرد الصحيح:',
        t.correctResponse,
        t.notes ? `\n\nملاحظات المراجعة:\n${t.notes}` : '',
      ].join('\n');
      const status: KnowledgeArticle['status'] =
        t.status === 'approved' ? 'published' : t.status === 'rejected' ? 'archived' : 'draft';
      return {
        id: `training:${t.id}`,
        source: 'training_entry' as const,
        title,
        content,
        category: mapCategoryToBackend(t.category || 'general'),
        tags: (t.alternativeResponses || []).slice(0, 16),
        author: t.submittedBy,
        createdAt: t.submittedAt,
        updatedAt: t.reviewedAt || t.submittedAt,
        views: 0,
        helpful: 0,
        notHelpful: 0,
        relatedIssues: [],
        status,
        descriptionSnippet: scen.slice(0, 280),
      };
    });
  }, []);

  const loadArticles = useCallback(async () => {
    setIsLoading(true);
    try {
      const [kbSettled, casesSettled, distSettled, opSettled, trainSettled] = await Promise.allSettled([
        listKnowledgeArticles({
          scope: 'all',
          search: searchQuery.trim() || undefined,
          category: selectedCategory,
        }),
        listReferenceCases(),
        getDistributionStats(),
        listOperationalUpdates(),
        listTrainingEntries('all'),
      ]);

      const kbRows = kbSettled.status === 'fulfilled' ? kbSettled.value : [];
      const caseRows = casesSettled.status === 'fulfilled' ? casesSettled.value : [];
      const dist = distSettled.status === 'fulfilled' ? distSettled.value : null;
      const opRows = opSettled.status === 'fulfilled' ? opSettled.value : [];
      const trainRows = trainSettled.status === 'fulfilled' ? trainSettled.value : [];

      const failed: string[] = [];
      if (kbSettled.status === 'rejected') {
        console.error('Knowledge load failed:', kbSettled.reason);
        failed.push('مقالات المعرفة');
      }
      if (casesSettled.status === 'rejected') {
        console.warn('Cases load failed:', casesSettled.reason);
        failed.push('حالات المرجع');
      }
      if (distSettled.status === 'rejected') {
        console.warn('Distribution load failed:', distSettled.reason);
        failed.push('المشاكل العامة');
      }
      if (opSettled.status === 'rejected') {
        console.warn('Operational updates load failed:', opSettled.reason);
        failed.push('التحديثات التشغيلية');
      }
      if (trainSettled.status === 'rejected') {
        console.warn('Training load failed:', trainSettled.reason);
        failed.push('وش تعلم رفيق');
      }

      if (
        kbSettled.status === 'rejected' &&
        casesSettled.status === 'rejected' &&
        distSettled.status === 'rejected' &&
        opSettled.status === 'rejected' &&
        trainSettled.status === 'rejected'
      ) {
        setArticles([]);
        toast.error('تعذّر تحميل أي مصدر للسجل');
        return;
      }
      if (failed.length) {
        toast.warning(`تعذّر تحميل: ${failed.join('، ')} — يُعرض الباقي`);
      }

      let merged: KnowledgeArticle[] = [
        ...mapBackendRows(kbRows),
        ...mapCaseRows(caseRows),
        ...(dist ? mapDistributionRows(dist) : []),
        ...mapOperationalRows(opRows),
        ...mapTrainingRows(trainRows),
      ];

      if (selectedCategory !== 'all') {
        const bc = mapCategoryToBackend(selectedCategory);
        merged = merged.filter(a => mapCategoryToBackend(a.category) === bc);
      }

      const q = searchQuery.trim().toLowerCase();
      if (q) {
        merged = merged.filter(a => {
          const blob = [a.title, a.descriptionSnippet || '', a.content, ...a.tags, a.referenceCaseId || '']
            .join(' ')
            .toLowerCase();
          return blob.includes(q);
        });
      }

      merged.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      setArticles(merged);
    } catch (error) {
      console.error('Error loading registry:', error);
      setArticles([]);
      toast.error(error instanceof Error ? error.message : 'تعذّر تحميل سجل المعرفة');
    } finally {
      setIsLoading(false);
    }
  }, [
    mapBackendRows,
    mapCaseRows,
    mapDistributionRows,
    mapOperationalRows,
    mapTrainingRows,
    searchQuery,
    selectedCategory,
  ]);

  useEffect(() => {
    if (!externalCategoryFocus) return;
    setSelectedCategory(externalCategoryFocus);
    onConsumeExternalCategoryFocus?.();
  }, [externalCategoryFocus, onConsumeExternalCategoryFocus]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      loadArticles();
    }, 350);
    return () => window.clearTimeout(t);
  }, [loadArticles]);

  useEffect(() => {
    let rows = [...articles];
    if (visibilityTab === 'published') rows = rows.filter(a => a.status === 'published');
    else if (visibilityTab === 'draft')
      rows = rows.filter(a => a.status === 'draft' || a.status === 'archived');
    setFilteredArticles(rows);
  }, [articles, visibilityTab]);

  const counts = useMemo(() => {
    const pub = articles.filter(a => a.status === 'published').length;
    const dr = articles.filter(a => a.status === 'draft' || a.status === 'archived').length;
    return { all: articles.length, published: pub, draft: dr };
  }, [articles]);

  const handleCreateArticle = async () => {
    try {
      await createKnowledgeArticle({
        title: formData.title,
        description: formData.content,
        solution: formData.content,
        category: formData.category || 'general',
        keywords: formData.tags,
        confidence: 80,
        isPublished: true,
      });
      toast.success('تم إنشاء المقال');
      setIsCreateDialogOpen(false);
      resetForm();
      await loadArticles();
    } catch (error) {
      console.error('Error creating article:', error);
      toast.error(error instanceof Error ? error.message : 'فشل الإنشاء');
    }
  };

  const handleUpdateArticle = async () => {
    if (!selectedArticle) return;
    try {
      await updateKnowledgeArticle(selectedArticle.id, {
        title: formData.title,
        description: formData.content,
        solution: formData.content,
        category: formData.category || mapCategoryToBackend(selectedArticle.category),
        keywords: formData.tags,
      });
      toast.success('تم حفظ التعديلات');
      setIsEditDialogOpen(false);
      setSelectedArticle(null);
      resetForm();
      await loadArticles();
    } catch (error) {
      console.error('Error updating article:', error);
      toast.error(error instanceof Error ? error.message : 'فشل التحديث');
    }
  };

  const handleDeleteArticle = async (article: KnowledgeArticle) => {
    if (article.source !== 'knowledge') return;
    if (!confirm('هل أنت متأكد من حذف هذا المقال؟')) return;
    try {
      await deleteKnowledgeArticle(article.id);
      toast.success('تم الحذف');
      await loadArticles();
    } catch (error) {
      console.error('Error deleting article:', error);
      toast.error(error instanceof Error ? error.message : 'فشل الحذف');
    }
  };

  const setPublished = async (article: KnowledgeArticle, isPublished: boolean) => {
    if (article.source !== 'knowledge') return;
    try {
      await updateKnowledgeArticle(article.id, { isPublished });
      toast.success(isPublished ? 'تم النشر' : 'نُقل إلى الأرشيف (مسودة)');
      await loadArticles();
    } catch (error) {
      console.error('Error toggling publish:', error);
      toast.error(error instanceof Error ? error.message : 'فشل التحديث');
    }
  };

  const handleViewArticle = async (article: KnowledgeArticle) => {
    setSelectedArticle(article);
    setIsViewDialogOpen(true);
    try {
      if (article.source === 'knowledge') {
        const updated = await recordKnowledgeView(article.id);
        setArticles(prev =>
          prev.map(a =>
            a.id === article.id ? { ...a, views: updated.viewCount ?? a.views } : a,
          ),
        );
        setSelectedArticle(prev =>
          prev?.id === article.id
            ? { ...prev, views: updated.viewCount ?? prev.views }
            : prev,
        );
      } else if (article.source === 'reference_case' && article.referenceCaseId) {
        const updated = await recordReferenceCaseView(article.referenceCaseId);
        const nextViews = updated.viewCount ?? article.views;
        setArticles(prev =>
          prev.map(a => (a.id === article.id ? { ...a, views: nextViews } : a)),
        );
        setSelectedArticle(prev =>
          prev?.id === article.id ? { ...prev, views: nextViews } : prev,
        );
      }
    } catch (error) {
      console.warn('Failed to record view', error);
    }
  };

  const hasPageViews = (article: KnowledgeArticle) =>
    article.source === 'knowledge' || article.source === 'reference_case';

  const handleFeedback = async (articleId: string, helpful: boolean) => {
    const row = articles.find(a => a.id === articleId);
    if (row?.source !== 'knowledge') return;
    try {
      const updated = await recordKnowledgeFeedback(articleId, helpful);
      setArticles(prev =>
        prev.map(a => {
          if (a.id !== articleId) return a;
          return {
            ...a,
            helpful: updated.helpfulCount ?? a.helpful,
            notHelpful: updated.notHelpfulCount ?? a.notHelpful,
          };
        }),
      );
      if (selectedArticle?.id === articleId) {
        setSelectedArticle({
          ...selectedArticle,
          helpful: updated.helpfulCount ?? selectedArticle.helpful,
          notHelpful: updated.notHelpfulCount ?? selectedArticle.notHelpful,
        });
      }
    } catch (error) {
      console.error('Error recording feedback:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      category: '',
      tags: [],
      relatedIssues: [],
    });
  };

  const openEditDialog = (article: KnowledgeArticle) => {
    if (article.source !== 'knowledge') {
      toast.info('هذا السطر للعرض فقط — عدّل المحتوى من صفحته المخصصة في النظام.');
      return;
    }
    setSelectedArticle(article);
    setFormData({
      title: article.title,
      content: article.content,
      category: article.category,
      tags: article.tags,
      relatedIssues: article.relatedIssues,
    });
    setIsEditDialogOpen(true);
  };

  type RecordSourceKind =
    | 'database'
    | 'archive'
    | 'rafeeq_training'
    | 'operational_feed'
    | 'kb_operational_origin'
    | 'common_issues';

  const recordSourceKind = (article: KnowledgeArticle): RecordSourceKind => {
    if (article.source === 'common_issue') return 'common_issues';
    if (article.source === 'operational_update') return 'operational_feed';
    if (article.source === 'training_entry') return 'rafeeq_training';
    if (article.source === 'reference_case') {
      return article.status === 'archived' ? 'archive' : 'database';
    }
    if (article.recordOrigin === 'rafeeq_training') return 'rafeeq_training';
    if (article.recordOrigin === 'operational_update') return 'kb_operational_origin';
    return 'database';
  };

  const recordSourceBadge = (article: KnowledgeArticle) => {
    const k = recordSourceKind(article);
    const label = t(`knowledge.sources.${k}`);
    const cls =
      k === 'archive'
        ? 'bg-slate-500/15 text-slate-800 dark:text-slate-200 border-slate-500/30'
        : k === 'rafeeq_training'
          ? 'bg-violet-500/15 text-violet-900 dark:text-violet-100 border-violet-500/30'
          : k === 'operational_feed' || k === 'kb_operational_origin'
            ? 'bg-sky-500/15 text-sky-900 dark:text-sky-100 border-sky-500/30'
            : k === 'common_issues'
              ? 'bg-rose-500/15 text-rose-900 dark:text-rose-100 border-rose-500/30'
              : 'bg-emerald-500/15 text-emerald-900 dark:text-emerald-100 border-emerald-500/30';
    return (
      <Badge className={`text-xs border ${cls}`} title={label}>
        {label}
      </Badge>
    );
  };

  const statusBadge = (article: KnowledgeArticle) => {
    if (article.status === 'archived') {
      return (
        <Badge className="text-xs bg-slate-500/15 text-slate-800 dark:text-slate-200 border border-slate-500/30">
          <Archive className="size-3 inline ms-1" />
          {t('knowledge.status.archived')}
        </Badge>
      );
    }
    if (article.status === 'draft') {
      return (
        <Badge className="text-xs bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/30">
          <Archive className="size-3 inline ms-1" />
          {article.source === 'reference_case' ? t('knowledge.status.suspended') : t('knowledge.status.draft')}
        </Badge>
      );
    }
    return (
      <Badge className="text-xs bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30">
        <CheckCircle2 className="size-3 inline ms-1" />
        {article.source === 'reference_case' ? t('knowledge.status.active') : t('knowledge.status.published')}
      </Badge>
    );
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-xl">
            <BookOpen className="size-8 text-primary" />
          </div>
          <h1 className="text-foreground">{t('knowledge.title')}</h1>
        </div>
        {canCreateKnowledgeArticle && (
          <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700 shrink-0">
            <Plus className="size-4 ml-2" />
            {t('knowledge.newEntry')}
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <Tabs value={visibilityTab} onValueChange={v => setVisibilityTab(v as VisibilityTab)} dir="rtl">
            <TabsList className="w-full grid grid-cols-3 h-auto flex-wrap gap-1">
              <TabsTrigger value="all" className="text-xs sm:text-sm">
                {t('knowledge.tabs.all')} ({counts.all})
              </TabsTrigger>
              <TabsTrigger value="published" className="text-xs sm:text-sm">
                {t('knowledge.tabs.published')} ({counts.published})
              </TabsTrigger>
              <TabsTrigger value="draft" className="text-xs sm:text-sm">
                {t('knowledge.tabs.draft')} ({counts.draft})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className={`absolute ${iconSide} top-1/2 -translate-y-1/2 size-4 text-muted-foreground`} />
              <Input
                placeholder={t('knowledge.searchPlaceholder')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={`${inputPad} ${textAlign}`}
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className={textAlign}>
                <SelectValue placeholder={t('knowledge.category')} />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="all">{t('knowledge.allCategories')}</SelectItem>
                {KB_CATEGORY_KEYS.map(key => (
                  <SelectItem key={key} value={key}>
                    {kbCategoryLabel(key)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel border-2 border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" dir="rtl">
            <thead>
              <tr className="bg-primary text-primary-foreground">
                <th className={`px-4 py-3 ${textAlign} text-sm font-semibold`}>{t('knowledge.table.title')}</th>
                <th className={`px-4 py-3 ${textAlign} text-sm font-semibold whitespace-nowrap`}>{t('knowledge.table.type')}</th>
                <th className={`px-4 py-3 ${textAlign} text-sm font-semibold whitespace-nowrap`}>{t('knowledge.table.category')}</th>
                <th className={`px-4 py-3 ${textAlign} text-sm font-semibold whitespace-nowrap`}>{t('knowledge.table.source')}</th>
                <th className={`px-4 py-3 ${textAlign} text-sm font-semibold whitespace-nowrap`}>{t('knowledge.table.author')}</th>
                <th className={`px-4 py-3 ${textAlign} text-sm font-semibold whitespace-nowrap`}>{t('knowledge.table.updated')}</th>
                <th className={`px-4 py-3 ${textAlign} text-sm font-semibold whitespace-nowrap`}>{t('knowledge.table.views')}</th>
                <th className={`px-4 py-3 ${textAlign} text-sm font-semibold whitespace-nowrap`}>{t('knowledge.table.helpful')}</th>
                <th className={`px-4 py-3 ${textAlign} text-sm font-semibold whitespace-nowrap`}>{t('knowledge.table.actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-background">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <p className="text-muted-foreground">{t('knowledge.loading')}</p>
                  </td>
                </tr>
              ) : filteredArticles.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <BookOpen className="mx-auto mb-4 size-12 text-muted-foreground" />
                    <p className="text-muted-foreground">{t('knowledge.empty')}</p>
                  </td>
                </tr>
              ) : (
                filteredArticles.map((article, index) => (
                  <tr
                    key={article.id}
                    className={`border-b border-border ${index % 2 === 0 ? 'bg-muted/30' : 'bg-background'}`}
                  >
                    <td className={`max-w-[min(28rem,40vw)] px-4 py-3 align-top ${textAlign}`}>
                      <div className="line-clamp-2 font-medium text-foreground">{article.title}</div>
                      <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {article.descriptionSnippet || article.content}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-right whitespace-nowrap">
                      {article.source === 'reference_case' ? (
                        <Badge variant="secondary" className="text-xs border-primary/30">
                          {t('knowledge.types.referenceCase')}
                        </Badge>
                      ) : article.source === 'common_issue' ? (
                        <Badge variant="outline" className="text-xs border-rose-500/40 text-rose-900 dark:text-rose-100">
                          {t('knowledge.types.commonIssue')}
                        </Badge>
                      ) : article.source === 'operational_update' ? (
                        <Badge variant="outline" className="text-xs border-sky-500/40 text-sky-900 dark:text-sky-100">
                          {t('knowledge.types.operationalUpdate')}
                        </Badge>
                      ) : article.source === 'training_entry' ? (
                        <Badge variant="outline" className="text-xs border-violet-500/40 text-violet-900 dark:text-violet-100">
                          {t('knowledge.types.training')}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          {t('knowledge.types.article')}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-right">
                      <Badge variant="outline" className="text-xs">
                        {kbCategoryLabel(article.category)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 align-top text-right">{recordSourceBadge(article)}</td>
                    <td className="px-4 py-3 align-top text-right">
                      <span className="line-clamp-2 text-sm text-foreground">{article.author}</span>
                    </td>
                    <td className="px-4 py-3 align-top text-right whitespace-nowrap">
                      <span className="text-sm text-muted-foreground tabular-nums">
                        {formatAppDate(article.updatedAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top text-right">
                      {hasPageViews(article) ? (
                        <span
                          className="inline-flex items-center gap-1 text-sm tabular-nums text-foreground"
                          title={t('knowledge.tooltips.pageViews')}
                        >
                          <Eye className="size-3.5 shrink-0 opacity-70" />
                          {article.views}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-right">
                      {article.source === 'knowledge' ? (
                        <span className="inline-flex items-center gap-1 text-sm tabular-nums text-foreground">
                          <ThumbsUp className="size-3.5 shrink-0 opacity-70" />
                          {article.helpful}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-right">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleViewArticle(article)}>
                          {t('knowledge.actions.view')}
                        </Button>
                        {canEditKnowledge && article.source === 'knowledge' && (
                          <>
                            <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={() => openEditDialog(article)}>
                              <Edit className="size-3 ms-1" />
                              {t('knowledge.actions.edit')}
                            </Button>
                            {article.status !== 'published' && (
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                className="h-8 text-xs"
                                onClick={() => setPublished(article, true)}
                              >
                                <CheckCircle2 className="size-3 ms-1" />
                                {t('knowledge.actions.publish')}
                              </Button>
                            )}
                            {canDeleteKnowledge && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs text-destructive"
                              onClick={() => handleDeleteArticle(article)}
                            >
                              <Trash2 className="size-3 ms-1" />
                              {t('knowledge.actions.delete')}
                            </Button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" dir="rtl">
          {selectedArticle && (
            <>
              <DialogHeader>
                <DialogTitle className={`${textAlign} text-2xl mb-2`}>{selectedArticle.title}</DialogTitle>
                <div className={`flex flex-wrap items-center gap-2 text-sm text-muted-foreground ${justifyEnd}`}>
                  {recordSourceBadge(selectedArticle)}
                  {statusBadge(selectedArticle)}
                  {selectedArticle.source === 'reference_case' && (
                    <Badge variant="secondary">{t('knowledge.types.referenceCaseFull')}</Badge>
                  )}
                  <Badge variant="outline">{kbCategoryLabel(selectedArticle.category)}</Badge>
                  <span>•</span>
                  <span>{selectedArticle.author}</span>
                  <span>•</span>
                  <span>{formatAppDate(selectedArticle.createdAt)}</span>
                </div>
              </DialogHeader>
              <div className={`py-6 ${textAlign} prose prose-slate dark:prose-invert max-w-none`}>
                <div className="whitespace-pre-wrap">{selectedArticle.content}</div>
              </div>
              {selectedArticle.source === 'knowledge' && (
                <div className="border-t pt-4">
                  <p className={`text-sm text-muted-foreground mb-3 ${textAlign}`}>{t('knowledge.view.helpfulQuestion')}</p>
                  <div className={`flex items-center gap-3 ${justifyEnd}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFeedback(selectedArticle.id, true)}
                      className="flex items-center gap-2"
                    >
                      <ThumbsUp className="size-4" />
                      {t('knowledge.view.yes')} ({selectedArticle.helpful})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFeedback(selectedArticle.id, false)}
                      className="flex items-center gap-2"
                    >
                      <ThumbsDown className="size-4" />
                      {t('knowledge.view.no')} ({selectedArticle.notHelpful})
                    </Button>
                  </div>
                </div>
              )}
              {selectedArticle.tags.length > 0 && (
                <div className="border-t pt-4">
                  <p className={`text-sm text-muted-foreground mb-2 ${textAlign}`}>{t('knowledge.view.tags')}</p>
                  <div className={`flex flex-wrap gap-2 ${justifyEnd}`}>
                    {selectedArticle.tags.map((tag, idx) => (
                      <Badge key={idx} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className={textAlign}>{t('knowledge.newEntryDialog')}</DialogTitle>
            <DialogDescription className={textAlign}>{t('knowledge.newEntryDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title" className={`${textAlign} block`}>
                {t('knowledge.form.title')}
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className={textAlign}
                placeholder={t('knowledge.form.titlePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label className={`${textAlign} block`}>{t('knowledge.category')}</Label>
              <Select value={formData.category || 'general'} onValueChange={v => setFormData({ ...formData, category: v })}>
                <SelectTrigger className={textAlign}>
                  <SelectValue placeholder={t('knowledge.category')} />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  {KB_CATEGORY_KEYS.map(key => (
                    <SelectItem key={key} value={key}>
                      {kbCategoryLabel(key)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="content" className={`${textAlign} block`}>
                {t('knowledge.form.content')}
              </Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={e => setFormData({ ...formData, content: e.target.value })}
                className={`${textAlign} min-h-[280px]`}
                placeholder={t('knowledge.form.contentPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags" className={`${textAlign} block`}>
                {t('knowledge.form.tags')}
              </Label>
              <Input
                id="tags"
                value={formData.tags.join(', ')}
                onChange={e =>
                  setFormData({ ...formData, tags: e.target.value.split(/[،,]/).map(tag => tag.trim()).filter(Boolean) })
                }
                className={textAlign}
                placeholder={t('knowledge.form.tagsPlaceholder')}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              {t('knowledge.actions.cancel')}
            </Button>
            <Button onClick={handleCreateArticle} className="bg-blue-600 hover:bg-blue-700">
              {t('knowledge.actions.publishEntry')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className={textAlign}>{t('knowledge.editDialog')}</DialogTitle>
            <DialogDescription className={textAlign}>{t('knowledge.editDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title" className={`${textAlign} block`}>
                {t('knowledge.form.title')}
              </Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className={textAlign}
              />
            </div>
            <div className="space-y-2">
              <Label className={`${textAlign} block`}>{t('knowledge.category')}</Label>
              <Select
                value={formData.category ? mapCategoryToBackend(formData.category) : 'general'}
                onValueChange={v => setFormData({ ...formData, category: v })}
              >
                <SelectTrigger className={textAlign}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  {KB_CATEGORY_KEYS.map(key => (
                    <SelectItem key={key} value={key}>
                      {kbCategoryLabel(key)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-content" className={`${textAlign} block`}>
                {t('knowledge.form.content')}
              </Label>
              <Textarea
                id="edit-content"
                value={formData.content}
                onChange={e => setFormData({ ...formData, content: e.target.value })}
                className={`${textAlign} min-h-[280px]`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-tags" className={`${textAlign} block`}>
                {t('knowledge.form.tagsShort')}
              </Label>
              <Input
                id="edit-tags"
                value={formData.tags.join(', ')}
                onChange={e =>
                  setFormData({ ...formData, tags: e.target.value.split(/[،,]/).map(tag => tag.trim()).filter(Boolean) })
                }
                className={textAlign}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              {t('knowledge.actions.cancel')}
            </Button>
            <Button onClick={handleUpdateArticle} className="bg-blue-600 hover:bg-blue-700">
              {t('knowledge.actions.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
