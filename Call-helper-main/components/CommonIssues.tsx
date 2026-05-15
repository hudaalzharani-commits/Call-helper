import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AlertCircle,
  Search,
  BarChart3,
  RefreshCw,
  Download,
  Plus,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from './ui/utils';
import { formatAppDateShort } from '../utils/dateDisplay';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import type { Issue, IssueFormData } from '../types';
import {
  getDistributionStats,
  type CategoryStat,
  type WeekOverWeekCategoryRow,
} from '../services/analyticsService';
import {
  listKnowledgeArticles,
  mapCategoryToBackend,
  createKnowledgeArticle,
  type BackendKnowledgeArticle,
} from '../services/knowledgeBaseService';
import {
  fetchActiveOperationalIssues,
  fetchArchivedOperationalIssues,
  type OperationalIssue,
} from '../services/operationalIssueService';
import { useAuth } from '../contexts/AuthContext';
import { isGranularCreateEnabled } from '../utils/uiVisibility';
import {
  loadCategoryRedlines,
  relatedKnowledgeArticles,
  topKeywordsFromArticles,
  buildDistributionCsv,
} from '../utils/commonIssuesHelpers';

const KB_CATEGORY_LABEL_AR: Record<string, string> = {
  technical: 'تقني',
  billing: 'فواتير',
  general: 'عام',
  registration: 'تسجيل',
  umrah: 'عمرة',
  agent: 'وكيل',
};

const KB_CATEGORY_KEYS = Object.keys(KB_CATEGORY_LABEL_AR) as Array<keyof typeof KB_CATEGORY_LABEL_AR>;

/** خلفية ونص واضحان لحوار «إضافة مشكلة عامة» (نفس أسلوب التحديثات التشغيلية) */
const COMMON_ISSUES_DIALOG_PANEL =
  'max-h-[min(90vh,40rem)] overflow-y-auto shadow-2xl outline-none !border-2 !border-zinc-300 !bg-white !text-zinc-950 dark:!border-zinc-600 dark:!bg-zinc-950 dark:!text-zinc-50';

const DESC_SOLUTION_MARKER = '\n\n---\n\nالحل:\n';

function splitDescriptionSolution(combined: string): { description: string; solution: string } {
  const idx = combined.indexOf(DESC_SOLUTION_MARKER);
  if (idx === -1) {
    return { description: combined.trim(), solution: combined.trim() };
  }
  const description = combined.slice(0, idx).trim();
  const solution = combined.slice(idx + DESC_SOLUTION_MARKER.length).trim();
  return { description, solution: solution || description };
}

function kbCategoryLabel(cat: string) {
  return KB_CATEGORY_LABEL_AR[cat] || cat;
}

function formatPercentage(p: number | string | undefined): string {
  if (p === undefined || p === '') return '';
  const s = String(p).trim();
  if (s.includes('%')) return s;
  return `${s}%`;
}

function countToPriority(rankIndex: number, total: number): Issue['priority'] {
  if (total <= 1) return 'high';
  if (rankIndex === 0) return 'high';
  if (rankIndex < Math.ceil(total / 3)) return 'medium';
  return 'low';
}

function normCat(s: string) {
  return s.trim().toLowerCase();
}

function categoryStatToIssue(
  stat: CategoryStat,
  index: number,
  total: number,
  week?: WeekOverWeekCategoryRow,
): Issue {
  const pct = formatPercentage(stat.percentage);
  const descParts = [`عدد التكرارات في المكالمات (الإجمالي): ${stat.count}`];
  if (pct) descParts.push(`النسبة من إجمالي المكالمات: ${pct}`);
  if (week) {
    descParts.push(
      `آخر 7 أيام: ${week.last7Days} — الأسبوع الذي قبله: ${week.previous7Days} (${week.delta >= 0 ? '+' : ''}${week.delta})`,
    );
  }
  return {
    id: `distribution:${index}:${stat.category}`,
    title: stat.category,
    description: descParts.join(' — '),
    status: 'active',
    priority: countToPriority(index, total),
    category: stat.category,
    entityType: 'umrah',
    reportedBy: 'تحليلات المكالمات',
    reportedAt: new Date(),
    tags: [],
    metadata: {
      source: 'distribution',
      count: stat.count,
      percentage: stat.percentage,
      week,
    },
  };
}

function operationalBadgeForCategory(
  category: string,
  active: OperationalIssue[],
  archived: OperationalIssue[],
): { label: string; variant: 'active' | 'archived' | 'none' } {
  const n = normCat(category);
  const a = active.find(i => normCat(i.category) === n);
  if (a) {
    if (a.status === 'persistent_operational')
      return { label: 'مشكلة تشغيلية متتبعة', variant: 'active' };
    return { label: 'متكرر اليوم (متتبع)', variant: 'active' };
  }
  const r = archived.find(i => normCat(i.category) === n);
  if (r) return { label: 'سُجّل سابقاً وحُلّ في التتبع التشغيلي', variant: 'archived' };
  return { label: '', variant: 'none' };
}

type HubSectionKey = 'attention' | 'persistent' | 'solved' | 'learn' | 'other';

const HUB_SECTION_ORDER: HubSectionKey[] = ['attention', 'persistent', 'solved', 'learn', 'other'];

const HUB_SECTION_COPY: Record<
  HubSectionKey,
  { emoji: string; title: string; subtitle: string; cardRing: string }
> = {
  attention: {
    emoji: '🔥',
    title: 'تحتاج انتباه الآن',
    subtitle: 'متكررة اليوم، نشطة في التتبع، أو ارتفاع مفاجئ في الأسبوع',
    cardRing: 'border-red-500/15',
  },
  persistent: {
    emoji: '⚠️',
    title: 'مشاكل تشغيلية مستمرة',
    subtitle: 'أنماط متكررة أو إشارات استمرار من التتبع التشغيلي',
    cardRing: 'border-amber-500/20',
  },
  solved: {
    emoji: '🟢',
    title: 'تم حلها',
    subtitle: 'سجلات أُغلقت في التتبع التشغيلي مع وقت الحل عند توفره',
    cardRing: 'border-emerald-500/20',
  },
  learn: {
    emoji: '🧠',
    title: 'تعلّم منها رفيق',
    subtitle: 'مرتبطة بمقالات معرفة أو أنماط يمكن الاستفادة منها',
    cardRing: 'border-primary/15',
  },
  other: {
    emoji: '◽',
    title: 'باقي التصنيفات',
    subtitle: 'ضمن التوزيع الحالي دون إشارة تشغيلية بارزة',
    cardRing: 'border-border',
  },
};

function findActiveOp(category: string, ops: OperationalIssue[]): OperationalIssue | undefined {
  const n = normCat(category);
  return ops.find(i => normCat(i.category) === n);
}

function findLatestArchived(category: string, ops: OperationalIssue[]): OperationalIssue | undefined {
  const n = normCat(category);
  const list = ops.filter(i => normCat(i.category) === n && i.resolvedAt);
  if (!list.length) return undefined;
  return [...list].sort(
    (a, b) => new Date(b.resolvedAt!).getTime() - new Date(a.resolvedAt!).getTime(),
  )[0];
}

function isResolvedToday(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const t = new Date();
  return (
    d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate()
  );
}

function isSpikeWeek(w?: WeekOverWeekCategoryRow): boolean {
  if (!w) return false;
  if (w.previous7Days === 0 && w.last7Days >= 2) return true;
  if (w.delta >= 4) return true;
  if (w.previous7Days > 0 && w.last7Days / w.previous7Days >= 1.5 && w.last7Days >= 3) return true;
  return false;
}

function hasPersistentSignal(op: OperationalIssue | undefined): boolean {
  if (!op) return false;
  if (op.status === 'persistent_operational') return true;
  if ((op.distinctDays7d ?? 0) >= 3) return true;
  if (op.detectionCriteria?.includes('spans-beyond-24h')) return true;
  const first = new Date(op.firstDetectedAt).getTime();
  if (Number.isFinite(first) && Date.now() - first > 7 * 86400000) return true;
  return false;
}

function toPctNumber(raw: unknown): number | null {
  if (raw === undefined || raw === '') return null;
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw).replace('%', ''));
  return Number.isFinite(n) ? n : null;
}

/** مؤشر حصّة من إجمالي المكالمات + سياق أسبوعي — بديل عرض النسبة الخام */
function humanShareLabel(pctNum: number | null, w?: WeekOverWeekCategoryRow): string {
  if (w) {
    if (w.delta <= -3) return 'انخفض عن الأسبوع السابق';
    if (w.delta >= 4) return 'يرتفع عن الأسبوع السابق';
    if (w.previous7Days === 0 && w.last7Days > 0) return 'ارتفاع مفاجئ';
    if (w.delta === 0 && w.last7Days > 0) return 'مستقر أسبوعيًا';
  }
  if (pctNum == null) return 'تحت المراقبة';
  if (pctNum >= 35) return 'مرتفع جدًا';
  if (pctNum >= 18) return 'مرتفع';
  if (pctNum >= 10) return 'تحت المراقبة';
  if (pctNum >= 5) return 'مستقر نسبيًا';
  return 'منخفض في الحصة';
}

function entityTypeLabelAr(entity: string | undefined): string {
  if (entity === 'umrah') return 'شركة عمرة';
  if (entity === 'external') return 'جهة خارجية';
  if (entity === 'accommodation') return 'إقامة';
  return entity ? String(entity) : 'النطاق التشغيلي';
}

function renderPriorityBadge(priority: Issue['priority']) {
  const variants = {
    high: 'bg-red-500/10 text-red-800 dark:text-red-200 border border-red-500/25',
    medium: 'bg-amber-500/10 text-amber-900 dark:text-amber-100 border border-amber-500/25',
    low: 'bg-muted text-muted-foreground border border-border',
  };
  const labels = { high: 'أعلى تكراراً', medium: 'متوسط', low: 'أقل في القائمة' };
  return (
    <Badge variant="outline" className={cn('text-xs', variants[priority])}>
      {labels[priority]}
    </Badge>
  );
}

function partitionHubIssues(
  list: Issue[],
  operationalActive: OperationalIssue[],
  operationalArchived: OperationalIssue[],
  kbArticles: BackendKnowledgeArticle[],
): { buckets: Record<HubSectionKey, Issue[]>; issueSection: Map<string, HubSectionKey> } {
  const buckets: Record<HubSectionKey, Issue[]> = {
    attention: [],
    persistent: [],
    solved: [],
    learn: [],
    other: [],
  };
  const issueSection = new Map<string, HubSectionKey>();

  for (const issue of list) {
    const opA = findActiveOp(issue.category, operationalActive);
    const opArch = findLatestArchived(issue.category, operationalArchived);
    const w = issue.metadata?.week as WeekOverWeekCategoryRow | undefined;
    const rel = relatedKnowledgeArticles(kbArticles, issue.category);

    let key: HubSectionKey = 'other';
    if (!opA && opArch) {
      key = 'solved';
    } else if (opA && hasPersistentSignal(opA)) {
      key = 'persistent';
    } else if (
      (opA && opA.status === 'general_repeated') ||
      issue.priority === 'high' ||
      isSpikeWeek(w) ||
      (opA && !hasPersistentSignal(opA))
    ) {
      key = 'attention';
    } else if (rel.length > 0) {
      key = 'learn';
    }

    buckets[key].push(issue);
    issueSection.set(issue.id, key);
  }

  return { buckets, issueSection };
}

type RecurrenceHeat = 'low' | 'medium' | 'high' | 'anomaly';

function computeRecurrenceHeat(
  issue: Issue,
  count: number,
  overRed: boolean,
  w: WeekOverWeekCategoryRow | undefined,
  pctNum: number | null,
): RecurrenceHeat {
  if (isSpikeWeek(w)) return 'anomaly';
  if (w && w.previous7Days === 0 && w.last7Days >= 3) return 'anomaly';
  if (overRed || issue.priority === 'high' || (pctNum != null && pctNum >= 22)) return 'high';
  if (issue.priority === 'medium' || (pctNum != null && pctNum >= 10) || count >= 8) return 'medium';
  return 'low';
}

function heatAccent(heat: RecurrenceHeat): {
  bar: string;
  text: string;
} {
  switch (heat) {
    case 'anomaly':
      return {
        bar: 'bg-gradient-to-l from-violet-500 via-fuchsia-500 to-purple-600',
        text: 'text-violet-700 dark:text-violet-300',
      };
    case 'high':
      return {
        bar: 'bg-gradient-to-l from-red-500 to-orange-500',
        text: 'text-red-600 dark:text-red-400',
      };
    case 'medium':
      return {
        bar: 'bg-gradient-to-l from-amber-400 to-yellow-400',
        text: 'text-amber-700 dark:text-amber-300',
      };
    default:
      return {
        bar: 'bg-gradient-to-l from-emerald-500 to-teal-500',
        text: 'text-emerald-700 dark:text-emerald-300',
      };
  }
}

function TrendMiniSparkline({ a, b }: { a: number; b: number }) {
  const w = 40;
  const h = 16;
  const max = Math.max(a, b, 1);
  const y1 = h - 3 - (a / max) * (h - 6);
  const y2 = h - 3 - (b / max) * (h - 6);
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="shrink-0 text-primary/70 dark:text-primary/60"
      aria-hidden
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={`2,${y1} ${w / 2},${(y1 + y2) / 2} ${w - 2},${y2}`}
      />
    </svg>
  );
}

type HubIssueCardProps = {
  issue: Issue;
  sectionKey: HubSectionKey;
  rankDisplay: string;
  redlines: Record<string, number>;
  operationalActive: OperationalIssue[];
  operationalArchived: OperationalIssue[];
  kbArticles: BackendKnowledgeArticle[];
  openRowId: string | null;
  setOpenRowId: (id: string | null) => void;
};

function HubIssueCard({
  issue,
  sectionKey,
  rankDisplay,
  redlines,
  operationalActive,
  operationalArchived,
  kbArticles,
  openRowId,
  setOpenRowId,
}: HubIssueCardProps) {
  const [whyOpen, setWhyOpen] = useState(false);
  const count = Number((issue.metadata?.count as number) ?? 0);
  const pctRaw = issue.metadata?.percentage;
  const pctNum = toPctNumber(pctRaw);
  const pctFormatted =
    pctRaw !== undefined && pctRaw !== '' ? formatPercentage(pctRaw as number | string) : null;
  const w = issue.metadata?.week as WeekOverWeekCategoryRow | undefined;
  const red = redlines[issue.category];
  const overRed = red != null && count >= red;
  const opA = findActiveOp(issue.category, operationalActive);
  const opArch = findLatestArchived(issue.category, operationalArchived);
  const opBadge = operationalBadgeForCategory(issue.category, operationalActive, operationalArchived);
  const rel = relatedKnowledgeArticles(kbArticles, issue.category);
  const kw = topKeywordsFromArticles(rel);
  const isOpen = openRowId === issue.id;
  const humanLbl = humanShareLabel(pctNum, w);
  const ring = HUB_SECTION_COPY[sectionKey].cardRing;

  const localWeekPct =
    w == null
      ? null
      : w.previous7Days <= 0
        ? w.last7Days > 0
          ? 100
          : 0
        : Math.round(((w.last7Days - w.previous7Days) / w.previous7Days) * 100);

  const lastActivity = opA
    ? formatAppDateShort(opA.lastDetectedAt)
    : opArch?.resolvedAt
      ? formatAppDateShort(opArch.resolvedAt)
      : 'يُحدَّث مع آخر تحميل للبيانات';

  const distributionShort = opA
    ? 'تشغيلي: نشط'
    : opBadge.variant === 'archived'
      ? 'تشغيلي: مُغلق'
      : 'توزيع: ضمن الطبيعي';

  const affectedCount = 1 + 1 + (rel.length > 0 ? 1 : 0);
  const heat = computeRecurrenceHeat(issue, count, overRed, w, pctNum);
  const accent = heatAccent(heat);

  const rawDesc = (issue.description || '').trim();
  const bodyPreview =
    rawDesc.length > 0
      ? rawDesc.length > 130
        ? `${rawDesc.slice(0, 130)}…`
        : rawDesc
      : w != null
        ? `${w.last7Days} بلاغ في آخر 7 أيام · إجمالي التوزيع ${count}`
        : `إجمالي التوزيع الحالي: ${count}`;

  const contextChips: { k: string; label: string }[] = [
    { k: 'e', label: entityTypeLabelAr(issue.entityType) },
    { k: 'c', label: 'مساعد المكالمات' },
  ];
  if (rel.length > 0) contextChips.push({ k: 'k', label: `معرفة ×${rel.length}` });
  if (opA) contextChips.push({ k: 'a', label: 'نشط' });

  return (
    <Card
      className={cn(
        'group flex h-full flex-col overflow-hidden rounded-xl border border-border/70 bg-card/90 text-right shadow-sm transition-all duration-200',
        'hover:border-primary/20 hover:shadow-md',
        ring,
        overRed && 'border-red-500/50 ring-1 ring-red-500/20',
      )}
    >
      <CardContent className="flex h-full flex-col gap-0 p-0">
        {/* —— HEADER —— */}
        <div className="border-b border-border/60 bg-muted/25 px-3 py-2.5">
          <div className="flex items-start justify-between gap-3" dir="rtl">
            <div className="flex min-w-0 flex-1 flex-col items-end gap-1.5">
              <div className="flex flex-wrap items-center justify-end gap-1.5">
                <h3 className="text-sm font-semibold leading-snug text-foreground sm:text-[15px]">
                  {kbCategoryLabel(issue.title)}
                </h3>
                {issue.priority === 'high' && (
                  <Badge
                    variant="outline"
                    className="h-5 border-orange-500/35 bg-orange-500/10 px-1.5 text-[10px] font-semibold text-orange-900 dark:text-orange-100"
                  >
                    🔥 أعلى تكرار
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {w != null ? (
                  <>
                    <TrendMiniSparkline a={w.previous7Days} b={w.last7Days} />
                    <span className="text-muted-foreground" title="اتجاه أسبوعي">
                      {w.delta > 0 ? (
                        <TrendingUp className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                      ) : w.delta < 0 ? (
                        <TrendingDown className="size-3.5 text-amber-600 dark:text-amber-400" />
                      ) : (
                        <Minus className="size-3.5 opacity-50" />
                      )}
                    </span>
                  </>
                ) : (
                  <span className="text-muted-foreground opacity-60" title="لا بيانات أسبوعية">
                    <Minus className="size-3.5" />
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground tabular-nums">{rankDisplay}</span>
                <BarChart3 className="size-3.5 shrink-0 text-primary/60 opacity-80" aria-hidden />
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-center gap-1">
              <span
                className={cn(
                  'text-[2rem] font-bold leading-none tabular-nums tracking-tight sm:text-[2.25rem]',
                  accent.text,
                )}
              >
                {count}
              </span>
              <div className={cn('h-1 w-14 rounded-full', accent.bar)} title="شدة التكرار (مؤشر لوني)" />
            </div>
          </div>
        </div>

        {/* —— BODY —— */}
        <div className="space-y-1.5 px-3 py-2">
          <p className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">{bodyPreview}</p>
          <div className="flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground">
            <Clock className="size-3 shrink-0 opacity-70" aria-hidden />
            <span>
              آخر نشاط: <span className="font-medium text-foreground">{lastActivity}</span>
            </span>
          </div>
        </div>

        {/* —— COLLAPSIBLE: لماذا مهمة —— */}
        <Collapsible open={whyOpen} onOpenChange={setWhyOpen} className="border-t border-border/50">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted/40"
            >
              <ChevronDown
                className={cn('size-3.5 shrink-0 transition-transform duration-200', whyOpen && 'rotate-180')}
                aria-hidden
              />
              <span className="font-medium text-foreground/90">لماذا هذه المشكلة مهمة؟</span>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 border-t border-border/40 bg-muted/15 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
            <p>
              <span className="font-semibold text-primary">• </span>
              تكرار إجمالي{' '}
              <span className="font-mono font-semibold text-foreground tabular-nums">{count}</span>
              {w != null ? (
                <>
                  {' '}
                  — آخر أسبوع:{' '}
                  <span className="font-mono font-semibold text-foreground tabular-nums">{w.last7Days}</span>
                </>
              ) : null}
            </p>
            {localWeekPct != null && w != null ? (
              <p>
                <span className="font-semibold text-primary">• </span>
                تغيّر أسبوعي تقريبي:{' '}
                <span className="font-mono font-semibold text-foreground tabular-nums">
                  {localWeekPct >= 0 ? '+' : ''}
                  {localWeekPct}%
                </span>
                <span className="mt-0.5 block text-[10px] opacity-90">
                  (أسبوع حالي {w.last7Days} مقابل {w.previous7Days})
                </span>
              </p>
            ) : null}
            {pctFormatted ? (
              <p>
                <span className="font-semibold text-primary">• </span>
                حصّة من المكالمات (مرجع):{' '}
                <span className="font-mono font-semibold text-foreground tabular-nums">{pctFormatted}</span>
              </p>
            ) : null}
            <p>
              <span className="font-semibold text-primary">• </span>
              جهات مرتبطة في العرض:{' '}
              <span className="font-mono font-semibold text-foreground tabular-nums">{affectedCount}</span>
            </p>
            <p>
              <span className="font-semibold text-primary">• </span>
              {rel.length > 0 ? 'مرتبطة بمقالات معرفة.' : 'لا مقالات معرفة مطابقة حاليًا.'}
            </p>
            <p>
              <span className="font-semibold text-primary">• </span>
              {opA
                ? opA.status === 'persistent_operational'
                  ? 'تصنيف تشغيلي: متابعة مستمرة.'
                  : 'تصنيف تشغيلي: متكرر ويُراقب.'
                : opBadge.variant === 'archived'
                  ? 'سُجّل سابقًا في التتبع التشغيلي وأُغلق.'
                  : 'لم تُصنَّف بعد كمشكلة تشغيلية نشطة.'}
            </p>
          </CollapsibleContent>
        </Collapsible>

        {/* —— FOOTER —— */}
        <div className="mt-auto space-y-2 border-t border-border/60 bg-muted/10 px-3 py-2">
          <div className="flex flex-wrap justify-end gap-1">
            {contextChips.map(chip => (
              <span
                key={chip.k}
                className="inline-flex items-center rounded-md border border-border/80 bg-background/80 px-2 py-0.5 text-[10px] font-medium text-foreground/90 shadow-sm"
              >
                {chip.label}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-1">
            {kw.slice(0, 4).map(t => (
              <Badge key={t} variant="outline" className="h-5 border-border/70 px-1.5 text-[9px] font-normal">
                {t}
              </Badge>
            ))}
            {kw.length > 4 ? (
              <Badge variant="secondary" className="h-5 px-1.5 text-[9px]">
                +{kw.length - 4}
              </Badge>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-1">
            {renderPriorityBadge(issue.priority)}
            <Badge
              variant="outline"
              className="h-5 border-border/60 px-1.5 text-[9px] text-muted-foreground"
              title="ملخص اتجاه الحصة"
            >
              {humanLbl}
            </Badge>
            <Badge variant="outline" className="h-5 border-sky-500/25 px-1.5 text-[9px] text-sky-900 dark:text-sky-100">
              {distributionShort}
            </Badge>
            {opBadge.variant !== 'none' && (
              <Badge
                variant="outline"
                className={cn(
                  'h-5 gap-0.5 px-1.5 text-[9px]',
                  opBadge.variant === 'active'
                    ? 'border-amber-500/35 text-amber-900 dark:text-amber-100'
                    : 'border-emerald-500/35 text-emerald-900 dark:text-emerald-100',
                )}
              >
                {opBadge.variant === 'active' ? (
                  <ShieldAlert className="size-2.5" />
                ) : (
                  <CheckCircle2 className="size-2.5" />
                )}
                تشغيلي
              </Badge>
            )}
            {overRed && (
              <Badge className="h-5 bg-red-600/90 px-1.5 text-[9px] text-white">حد {red}</Badge>
            )}
          </div>
        </div>

        {/* —— مقالات المعرفة —— */}
        <Collapsible
          open={isOpen}
          onOpenChange={open => setOpenRowId(open ? issue.id : null)}
          className="border-t border-border/50"
        >
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-full justify-center rounded-none text-[11px] text-muted-foreground hover:bg-muted/30"
            >
              {isOpen ? (
                <>
                  إخفاء المقالات ({rel.length})
                  <ChevronUp className="mr-1 size-3" />
                </>
              ) : (
                <>
                  مقالات ذات صلة ({rel.length})
                  <ChevronDown className="mr-1 size-3" />
                </>
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1.5 border-t border-border/40 bg-muted/5 px-2 py-2">
            {rel.length === 0 ? (
              <p className="px-1 py-1 text-center text-[10px] text-muted-foreground">لا مقالات مطابقة.</p>
            ) : (
              rel.slice(0, 6).map(a => (
                <div
                  key={a._id}
                  className="rounded-lg border border-border/60 bg-card/60 p-2 text-right text-[10px] shadow-sm"
                >
                  <p className="font-semibold text-foreground">{a.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-muted-foreground">{a.description}</p>
                  <div className="mt-1 flex flex-wrap justify-end gap-0.5">
                    <Badge variant="outline" className="h-4 px-1 text-[9px]">
                      ثقة {a.confidence ?? '—'}
                    </Badge>
                    {(a.keywords ?? []).slice(0, 3).map(k => (
                      <Badge key={k} variant="secondary" className="h-4 px-1 text-[9px]">
                        {k}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

export function CommonIssues() {
  const { user } = useAuth();
  const canCreateIssue = isGranularCreateEnabled(user, 'action_common_issue_create');
  const [issues, setIssues] = useState<Issue[]>([]);
  const [filteredIssues, setFilteredIssues] = useState<Issue[]>([]);
  const [kbArticles, setKbArticles] = useState<BackendKnowledgeArticle[]>([]);
  const [operationalActive, setOperationalActive] = useState<OperationalIssue[]>([]);
  const [operationalArchived, setOperationalArchived] = useState<OperationalIssue[]>([]);
  const [redlines] = useState<Record<string, number>>(() => loadCategoryRedlines());
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [openRowId, setOpenRowId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState<IssueFormData>({
    title: '',
    description: '',
    category: 'general',
    entityType: 'umrah',
    priority: 'medium',
    reportedBy: '',
    tags: [],
  });

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const dist = await getDistributionStats();

      const top = dist.topCategories ?? [];
      const weekList = dist.weekOverWeekByCategory ?? [];
      const weekMap = new Map(weekList.map(w => [w.category, w]));

      setIssues(
        top.map((s, i) =>
          categoryStatToIssue(s, i, top.length, weekMap.get(s.category)),
        ),
      );

      const kbP = listKnowledgeArticles({}).then(rows => setKbArticles(rows)).catch(() => setKbArticles([]));
      const opP = Promise.all([
        fetchActiveOperationalIssues()
          .then(r => setOperationalActive(r.issues))
          .catch(() => setOperationalActive([])),
        fetchArchivedOperationalIssues(80)
          .then(r => setOperationalArchived(r.issues))
          .catch(() => setOperationalArchived([])),
      ]);
      await Promise.all([kbP, opP]);
    } catch (error) {
      console.error('Error loading common issues hub:', error);
      setIssues([]);
      const msg =
        error instanceof Error && error.message === 'No authentication token found'
          ? 'يجب تسجيل الدخول لعرض البيانات'
          : error instanceof Error
            ? error.message
            : 'تعذّر تحميل البيانات';
      setLoadError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const categoryFilterOptions = useMemo(() => {
    const set = new Set<string>();
    issues.forEach(i => {
      if (i.category) set.add(i.category);
    });
    return Array.from(set).sort((a, b) => kbCategoryLabel(a).localeCompare(kbCategoryLabel(b), 'ar'));
  }, [issues]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory]);

  useEffect(() => {
    let filtered = [...issues];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        issue =>
          issue.title.toLowerCase().includes(q) ||
          issue.description.toLowerCase().includes(q) ||
          issue.category.toLowerCase().includes(q),
      );
    }
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(issue => issue.category === selectedCategory);
    }
    setFilteredIssues(filtered);
  }, [issues, searchQuery, selectedCategory]);

  const resetCreateForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'general',
      entityType: 'umrah',
      priority: 'medium',
      reportedBy: '',
      tags: [],
    });
  };

  const handleCreateIssue = async () => {
    if (!formData.title.trim() || !formData.description.trim() || !formData.category.trim()) {
      toast.error('يرجى تعبئة العنوان والوصف والفئة');
      return;
    }
    try {
      const { description, solution } = splitDescriptionSolution(formData.description.trim());
      if (!description) {
        toast.error('يرجى إدخال وصف أو محتوى');
        return;
      }
      await createKnowledgeArticle({
        title: formData.title.trim(),
        description,
        solution: solution || description,
        category: formData.category.trim(),
        keywords: formData.tags?.length ? formData.tags : [],
        confidence: formData.priority === 'high' ? 82 : formData.priority === 'low' ? 40 : 60,
        isPublished: true,
      });
      toast.success('تمت الإضافة إلى سجل المعرفة');
      setIsCreateDialogOpen(false);
      resetCreateForm();
      await loadAll();
    } catch (error) {
      console.error('Error creating issue:', error);
      toast.error(error instanceof Error ? error.message : 'فشل الإضافة');
    }
  };

  const exportCsv = () => {
    const rows = filteredIssues.map((issue, i) => {
      const w = issue.metadata?.week as WeekOverWeekCategoryRow | undefined;
      const red = redlines[issue.category];
      const op = operationalBadgeForCategory(issue.category, operationalActive, operationalArchived);
      const rel = relatedKnowledgeArticles(kbArticles, issue.category);
      const kw = topKeywordsFromArticles(rel).join(' | ');
      return {
        الترتيب: i + 1,
        التصنيف: issue.title,
        التكرار_الإجمالي: issue.metadata?.count ?? '',
        آخر_7_أيام: w?.last7Days ?? '',
        الأسبوع_السابق: w?.previous7Days ?? '',
        الفرق: w?.delta ?? '',
        حد_التنبيه: red ?? '',
        التتبع_التشغيلي: op.variant === 'none' ? '' : op.label,
        وسوم_ملخصة: kw,
        مقالات_معرفة: rel.length,
      };
    });
    const csv = '\uFEFF' + buildDistributionCsv(rows as unknown as Array<Record<string, string | number>>);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `المشاكل_العامة_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('تم تصدير CSV');
  };

  const { buckets, issueSection } = useMemo(
    () => partitionHubIssues(filteredIssues, operationalActive, operationalArchived, kbArticles),
    [filteredIssues, operationalActive, operationalArchived, kbArticles],
  );

  const flatOrderedIssues = useMemo(() => HUB_SECTION_ORDER.flatMap(k => buckets[k]), [buckets]);

  const issueRankById = useMemo(() => {
    const m = new Map<string, number>();
    flatOrderedIssues.forEach((issue, i) => m.set(issue.id, i + 1));
    return m;
  }, [flatOrderedIssues]);

  const hubStrip = useMemo(() => {
    const top = filteredIssues[0];
    const topLine =
      top != null
        ? `${kbCategoryLabel(top.title)} (${Number((top.metadata?.count as number) ?? 0)})`
        : '—';
    const operationalCount = operationalActive.length;
    const solvedToday = operationalArchived.filter(o => isResolvedToday(o.resolvedAt)).length;
    return { topLine, operationalCount, solvedToday };
  }, [filteredIssues, operationalActive, operationalArchived]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = flatOrderedIssues.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(flatOrderedIssues.length / itemsPerPage);

  const groupedPageSections = useMemo(() => {
    const blocks: { key: HubSectionKey; items: Issue[] }[] = [];
    for (const key of HUB_SECTION_ORDER) {
      const row = currentItems.filter(i => issueSection.get(i.id) === key);
      if (row.length) blocks.push({ key, items: row });
    }
    return blocks;
  }, [currentItems, issueSection]);

  useEffect(() => {
    const tp = Math.ceil(flatOrderedIssues.length / itemsPerPage);
    if (tp > 0 && currentPage > tp) setCurrentPage(tp);
  }, [flatOrderedIssues.length, currentPage, itemsPerPage]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-xl">
            <AlertCircle className="size-8 text-primary" />
          </div>
          <div>
            <h1 className="text-foreground">المشاكل العامة</h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 justify-end">
          {canCreateIssue ? (
            <Button
              type="button"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <Plus className="size-4 ml-2" />
              إضافة مشكلة عامة
            </Button>
          ) : null}
          <Button type="button" variant="outline" size="sm" disabled={isLoading} onClick={exportCsv}>
            <Download className="size-4 ml-1" />
            CSV
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isLoading}
            onClick={() => loadAll()}
          >
            <RefreshCw className={`size-4 ml-1 ${isLoading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
        </div>
      </div>

      {loadError ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-4 text-right text-sm text-destructive">{loadError}</CardContent>
        </Card>
      ) : (
        <div className="rounded-xl border border-border/80 bg-muted/20 px-5 py-4 text-sm shadow-sm sm:px-7 sm:py-5">
          <div
            className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-center text-muted-foreground leading-relaxed sm:gap-x-14 lg:gap-x-20"
            dir="rtl"
          >
            <span className="inline-flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1">
              <span aria-hidden>🔥</span>
              <span className="font-medium text-foreground tabular-nums">{hubStrip.topLine}</span>
              <span className="text-[11px] opacity-75">أعلى تكرارًا في القائمة الحالية</span>
            </span>
            <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap">
              <span aria-hidden>⚠️</span>
              <span className="font-medium text-foreground tabular-nums">{hubStrip.operationalCount}</span>
              <span>مشاكل نشطة</span>
            </span>
            <span className="inline-flex max-w-full flex-wrap items-center justify-center gap-2">
              <span aria-hidden>🟢</span>
              <span className="font-medium text-foreground tabular-nums">{hubStrip.solvedToday}</span>
              <span>أُغلقت اليوم</span>
            </span>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 size-4 text-gray-400" />
              <Input
                placeholder="بحث في التصنيف أو الوصف..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pr-10 text-right"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="text-right">
                <SelectValue placeholder="التصنيف" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="all">جميع التصنيفات</SelectItem>
                {categoryFilterOptions.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {kbCategoryLabel(cat)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-10">
        {isLoading ? (
          <Card className="border-dashed">
            <CardContent className="p-10 text-center">
              <p className="text-muted-foreground">جاري التحميل...</p>
            </CardContent>
          </Card>
        ) : flatOrderedIssues.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-10 text-center">
              <AlertCircle className="size-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">لا توجد بيانات مطابقة</p>
            </CardContent>
          </Card>
        ) : (
          groupedPageSections.map(block => (
            <section key={block.key} className="space-y-3 scroll-mt-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {block.items.map(issue => (
                  <HubIssueCard
                    key={issue.id}
                    issue={issue}
                    sectionKey={block.key}
                    rankDisplay={`#${issueRankById.get(issue.id) ?? ''}`}
                    redlines={redlines}
                    operationalActive={operationalActive}
                    operationalArchived={operationalArchived}
                    kbArticles={kbArticles}
                    openRowId={openRowId}
                    setOpenRowId={setOpenRowId}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            السابق
          </Button>
          <span className="text-sm text-muted-foreground">
            صفحة {currentPage} من {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            التالي
          </Button>
        </div>
      )}

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className={cn('max-w-2xl', COMMON_ISSUES_DIALOG_PANEL)} dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right text-xl text-zinc-950 dark:text-zinc-50">إضافة مشكلة عامة</DialogTitle>
            <DialogDescription className="text-right text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
              يُحفظ السجل في <strong>سجل المعرفة</strong> ليُستَخدم في الإجابات والمسارات.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 text-base leading-relaxed [&_label]:font-medium [&_label]:text-zinc-800 dark:[&_label]:text-zinc-200">
            <div className="space-y-2">
              <Label htmlFor="ci-title" className="text-right block">
                العنوان
              </Label>
              <Input
                id="ci-title"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="text-right"
                placeholder="عنوان المشكلة أو المقال…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ci-desc" className="text-right block">
                الوصف والحل
              </Label>
              <Textarea
                id="ci-desc"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="text-right min-h-[120px]"
                placeholder={'وصف المشكلة…\n\n---\n\nالحل:\nخطوات الحل (اختياري)'}
              />
              <p className="text-xs text-muted-foreground text-right">
                لإضافة حل منفصل استخدم فاصل <code className="text-xs">---</code> ثم سطر &quot;الحل:&quot;.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-right block">الفئة</Label>
                <Select
                  value={formData.category}
                  onValueChange={value => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger className="text-right">
                    <SelectValue placeholder="الفئة" />
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
                <Label className="text-right block">الأولوية (ثقة تقريبية)</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: Issue['priority']) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger className="text-right">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="high">عالية</SelectItem>
                    <SelectItem value="medium">متوسطة</SelectItem>
                    <SelectItem value="low">منخفضة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ci-tags" className="text-right block">
                الوسوم (مفصولة بفواصل)
              </Label>
              <Input
                id="ci-tags"
                value={formData.tags.join(', ')}
                onChange={e =>
                  setFormData({
                    ...formData,
                    tags: e.target.value.split(/[،,]/).map(t => t.trim()).filter(Boolean),
                  })
                }
                className="text-right"
                placeholder="مثال: حجز، تأشيرة"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                resetCreateForm();
              }}
            >
              إلغاء
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleCreateIssue}>
              إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
