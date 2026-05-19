/**
 * Operational Issue Tracker (admin-only)
 *
 * A self-contained card section (dashboard or Advanced Settings via
 * `embedMode`). Shows two tabs:
 *   - Active : currently tracked recurring issues with status badges and
 *              a "Mark as Resolved" action per row
 *   - Archive: previously resolved issues for historical operational memory
 *
 * Counting/lifecycle logic lives entirely on the backend; this component
 * only reads/writes via `services/operationalIssueService.ts`. We refresh
 * on mount + after a successful resolve so the UI stays in sync without
 * polling.
 *
 * Designed to be additive — it does not touch any existing dashboard logic,
 * styles, or data flow. It also expects to be wrapped in an `isAdmin` guard
 * by the parent.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Archive,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Flame,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import {
  fetchActiveOperationalIssues,
  fetchArchivedOperationalIssues,
  markOperationalIssueResolved,
  type OperationalIssue,
  type OperationalIssueCriterion,
  type OperationalIssueStatus,
  type OperationalIssueThresholds,
} from '../services/operationalIssueService';
import { formatAppDateTime } from '../utils/dateDisplay';

type ResolveState = {
  id: string;
  isSaving: boolean;
  error: string | null;
};

function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  try {
    return formatAppDateTime(value);
  } catch {
    return value;
  }
}

function statusLabel(status: OperationalIssueStatus): string {
  switch (status) {
    case 'general_repeated':
      return 'متكرر اليوم';
    case 'persistent_operational':
      return 'مشكلة تشغيلية مستمرة';
    case 'resolved':
      return 'تم الحل';
    default:
      return status;
  }
}

function statusBadgeClasses(status: OperationalIssueStatus): string {
  switch (status) {
    case 'persistent_operational':
      // Calmer, more "stable" tone — these are real operational patterns
      // that need ownership, not a transient spike.
      return 'bg-slate-600/15 text-slate-700 dark:text-slate-300 border border-slate-500/40';
    case 'general_repeated':
      // High-energy warning tone — these are spikes happening *right now*.
      return 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/30';
    case 'resolved':
      return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30';
    default:
      return 'bg-muted text-muted-foreground border';
  }
}

/**
 * Friendly Arabic explanation of each detection criterion. Used by the row
 * to surface *why* an issue ended up in its current lane, which is the
 * single most useful piece of debugging context for the operator.
 */
function criterionLabel(criterion: OperationalIssueCriterion): string {
  switch (criterion) {
    case 'rolling-24h':
      return '≥ 5 خلال 24س';
    case 'rolling-7d':
      return '≥ 10 خلال 7أ';
    case 'distinct-days-3+':
      return '≥ 3 أيام مختلفة';
    case 'spans-beyond-24h':
      return 'استمر بعد دورة اليوم';
    default:
      return criterion;
  }
}

interface OperationalIssueRowProps {
  issue: OperationalIssue;
  showResolveAction: boolean;
  resolveState: ResolveState | null;
  onResolve?: (issue: OperationalIssue) => void;
}

function OperationalIssueRow({
  issue,
  showResolveAction,
  resolveState,
  onResolve,
}: OperationalIssueRowProps) {
  const isSaving = resolveState?.id === issue._id && resolveState?.isSaving;
  const rowError =
    resolveState?.id === issue._id && !resolveState.isSaving
      ? resolveState.error
      : null;
  const resolvedBy =
    issue.resolvedBy && typeof issue.resolvedBy === 'object'
      ? issue.resolvedBy.name || issue.resolvedBy.username || '—'
      : null;

  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl border border-border bg-card/40 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <Badge className={`${statusBadgeClasses(issue.status)} text-[10px]`}>
            {statusLabel(issue.status)}
          </Badge>
          <Badge className="bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 text-[10px]">
            {issue.occurrenceCount} حالة
          </Badge>
        </div>
        <div className="text-right flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground truncate">
            {issue.category}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            {issue.entityType
              ? `مقدم الخدمة: ${issue.entityType}`
              : 'بدون مقدم خدمة محدد'}
          </p>
        </div>
      </div>

      {issue.sampleProblemSummary && (
        <p className="text-[11px] text-muted-foreground text-right line-clamp-2">
          {issue.sampleProblemSummary}
        </p>
      )}

      {/* Detection criteria chips — show only when the backend supplied
          them (older rows from before this field existed won't have it,
          so we degrade gracefully instead of rendering an empty strip). */}
      {Array.isArray(issue.detectionCriteria) && issue.detectionCriteria.length > 0 && (
        <div className="flex items-center justify-end gap-1.5 flex-wrap pt-1">
          {issue.detectionCriteria.map((c) => (
            <Badge
              key={c}
              className="bg-background border border-border text-[9px] font-normal text-muted-foreground"
            >
              {criterionLabel(c)}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/60 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-2 flex-wrap">
          <span>أول رصد: {formatDateTime(issue.firstDetectedAt)}</span>
          <span>·</span>
          <span>آخر رصد: {formatDateTime(issue.lastDetectedAt)}</span>
          {typeof issue.distinctDays7d === 'number' && issue.distinctDays7d > 1 && (
            <>
              <span>·</span>
              <span>أيام مختلفة (7أ): {issue.distinctDays7d}</span>
            </>
          )}
          {issue.status === 'resolved' && (
            <>
              <span>·</span>
              <span>أُرشفت: {formatDateTime(issue.resolvedAt)}</span>
              {resolvedBy && <span>· بواسطة: {resolvedBy}</span>}
            </>
          )}
        </div>
        {showResolveAction && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isSaving}
            onClick={() => onResolve?.(issue)}
            className="h-7 px-3 text-[11px] gap-1 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
          >
            <CheckCircle2 className="size-3" />
            {isSaving ? 'جاري الحفظ...' : 'تم الحل'}
          </Button>
        )}
      </div>

      {issue.resolutionNotes && (
        <p className="text-[10px] text-muted-foreground text-right italic">
          ملاحظة الحل: {issue.resolutionNotes}
        </p>
      )}

      {rowError && (
        <p className="text-[10px] text-red-600 dark:text-red-400 text-right">
          {rowError}
        </p>
      )}
    </div>
  );
}

interface OperationalIssueTrackerProps {
  /** للعرض داخل إعدادات متقدمة: رأس مع سهم طي/إظهار */
  embedMode?: boolean;
}

export function OperationalIssueTracker({
  embedMode = false,
}: OperationalIssueTrackerProps) {
  const [active, setActive] = useState<OperationalIssue[]>([]);
  const [archive, setArchive] = useState<OperationalIssue[]>([]);
  const [thresholds, setThresholds] = useState<OperationalIssueThresholds>({
    ROLLING_24H_THRESHOLD: 5,
    ROLLING_7D_THRESHOLD: 10,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolveState, setResolveState] = useState<ResolveState | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'archive'>('active');
  // Collapsible on dashboard; in embedMode a separate flag controls the body.
  const [isOpen, setIsOpen] = useState(false);
  const [isEmbedExpanded, setIsEmbedExpanded] = useState(false);

  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [activeRes, archiveRes] = await Promise.all([
        fetchActiveOperationalIssues(),
        fetchArchivedOperationalIssues(100),
      ]);
      setActive(activeRes.issues);
      setArchive(archiveRes.issues);
      setThresholds(activeRes.thresholds);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل التحميل');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const showBody = embedMode ? isEmbedExpanded : isOpen;

  // Defer the initial fetch until the card is actually opened so we don't
  // pay the network cost for admins who never expand the tracker.
  useEffect(() => {
    if (showBody) {
      void refreshAll();
    }
  }, [showBody, refreshAll]);

  const handleResolve = useCallback(
    async (issue: OperationalIssue) => {
      setResolveState({ id: issue._id, isSaving: true, error: null });
      try {
        const updated = await markOperationalIssueResolved(issue._id);
        // Move locally for instant feedback, then refresh in the background.
        setActive((prev) => prev.filter((it) => it._id !== issue._id));
        setArchive((prev) => [updated, ...prev]);
        setResolveState(null);
      } catch (err) {
        setResolveState({
          id: issue._id,
          isSaving: false,
          error: err instanceof Error ? err.message : 'فشل الحفظ',
        });
      }
    },
    [],
  );

  // Split the active list into the two operational lanes so we can render
  // them as clearly-distinct sections. Sorting inside each lane keeps the
  // most-recent activity on top.
  const dailyIssues = useMemo(
    () =>
      active
        .filter((it) => it.status === 'general_repeated')
        .slice()
        .sort(
          (a, b) =>
            new Date(b.lastDetectedAt).getTime() -
            new Date(a.lastDetectedAt).getTime(),
        ),
    [active],
  );
  const persistentIssues = useMemo(
    () =>
      active
        .filter((it) => it.status === 'persistent_operational')
        .slice()
        .sort(
          (a, b) =>
            new Date(b.lastDetectedAt).getTime() -
            new Date(a.lastDetectedAt).getTime(),
        ),
    [active],
  );
  const dailyCount = dailyIssues.length;
  const persistentCount = persistentIssues.length;

  return (
    <Card className="border-2 border-rose-300/60 dark:border-rose-500/40 shadow-lg overflow-hidden">
      {embedMode ? (
        <div className="w-full text-right">
          <CardHeader
            className={`bg-gradient-to-r from-rose-500/15 to-orange-500/15 dark:from-rose-500/10 dark:to-orange-500/10 rounded-t-2xl border-b border-border ${
              !isEmbedExpanded ? "rounded-b-2xl border-b-0" : ""
            }`}
          >
            <CardTitle className="text-foreground text-right font-bold flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEmbedExpanded((v) => !v)}
                  className="p-1.5 rounded-lg hover:bg-accent/50 border border-border/60 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  aria-expanded={isEmbedExpanded}
                  aria-label={
                    isEmbedExpanded
                      ? "إخفاء تفاصيل المشاكل التشغيلية"
                      : "إظهار تفاصيل المشاكل التشغيلية"
                  }
                >
                  {isEmbedExpanded ? (
                    <ChevronUp className="size-4" />
                  ) : (
                    <ChevronDown className="size-4" />
                  )}
                </button>
                <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 text-[10px]">
                  خاص بالأدمن
                </Badge>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void refreshAll()}
                  disabled={isLoading}
                  className="h-8 px-2 gap-1 text-[11px]"
                  aria-label="تحديث"
                >
                  <RefreshCw
                    className={`size-3 ${isLoading ? "animate-spin" : ""}`}
                  />
                  تحديث
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <span>تتبع المشاكل التشغيلية</span>
                <div className="w-1 h-6 bg-gradient-to-b from-rose-500 to-orange-600 rounded-full" />
              </div>
            </CardTitle>
          </CardHeader>
        </div>
      ) : (
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="w-full text-right"
        aria-expanded={isOpen}
      >
        <CardHeader className="bg-gradient-to-r from-rose-500/15 to-orange-500/15 dark:from-rose-500/10 dark:to-orange-500/10 rounded-t-2xl border-b border-border cursor-pointer hover:from-rose-500/20 hover:to-orange-500/20 transition-all">
          <CardTitle className="text-foreground text-right font-bold flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 text-[10px]">
                خاص بالأدمن
              </Badge>
              {isOpen && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    void refreshAll();
                  }}
                  disabled={isLoading}
                  className="h-8 px-2 gap-1 text-[11px]"
                  aria-label="تحديث"
                >
                  <RefreshCw
                    className={`size-3 ${isLoading ? 'animate-spin' : ''}`}
                  />
                  تحديث
                </Button>
              )}
              {isOpen ? (
                <ChevronUp className="size-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="size-4 text-muted-foreground" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <span>تتبع المشاكل التشغيلية</span>
              <div className="w-1 h-6 bg-gradient-to-b from-rose-500 to-orange-600 rounded-full" />
            </div>
          </CardTitle>
        </CardHeader>
      </button>
      )}

      {showBody && (
      <CardContent className="pt-5 space-y-4">
        {/* Counters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-right">
          <div className="glass-panel rounded-xl p-3 border border-orange-300/40 dark:border-orange-500/30">
            <div className="flex items-center gap-2 justify-end">
              <Flame className="size-4 text-orange-600 dark:text-orange-400" />
              <span className="text-[11px] text-muted-foreground">
                متكرر اليوم (≥ {thresholds.ROLLING_24H_THRESHOLD} / 24س)
              </span>
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">
              {dailyCount}
            </p>
          </div>
          <div className="glass-panel rounded-xl p-3 border border-slate-400/40 dark:border-slate-500/30">
            <div className="flex items-center gap-2 justify-end">
              <ShieldAlert className="size-4 text-slate-600 dark:text-slate-300" />
              <span className="text-[11px] text-muted-foreground">
                تشغيلية مستمرة (7أ / 3 أيام / استمرار)
              </span>
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">
              {persistentCount}
            </p>
          </div>
          <div className="glass-panel rounded-xl p-3 border border-emerald-300/40 dark:border-emerald-500/30">
            <div className="flex items-center gap-2 justify-end">
              <Archive className="size-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-[11px] text-muted-foreground">
                مؤرشفة (تم الحل)
              </span>
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">
              {archive.length}
            </p>
          </div>
        </div>

        {error && (
          <div className="text-xs text-red-600 dark:text-red-400 text-right">
            {error}
          </div>
        )}

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as 'active' | 'archive')}
          dir="rtl"
        >
          <TabsList className="grid grid-cols-2 w-full sm:w-auto sm:inline-flex">
            <TabsTrigger value="active" className="gap-2">
              <ClipboardList className="size-3.5" />
              نشط ({active.length})
            </TabsTrigger>
            <TabsTrigger value="archive" className="gap-2">
              <Archive className="size-3.5" />
              الأرشيف ({archive.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-3 space-y-4">
            {active.length === 0 ? (
              <p className="text-xs text-muted-foreground text-right p-4">
                لا توجد مشاكل تشغيلية نشطة. سيظهر هنا أي تصنيف يتكرر ≥{' '}
                {thresholds.ROLLING_24H_THRESHOLD} مرات خلال 24 ساعة، أو ينمو
                إلى نمط تشغيلي ثابت.
              </p>
            ) : (
              <>
                {/* ============ Lane 1: متكرر اليوم (spike detector) ============
                    Warm/alert palette + Flame icon to communicate the
                    "this is happening *right now*" feeling. The header
                    description explains the lifecycle in one short line so
                    operators don't have to memorize the rules. */}
                <section
                  className="rounded-xl border-2 border-orange-300/60 dark:border-orange-500/40 bg-orange-500/[0.04] overflow-hidden"
                  aria-label="المشاكل المتكررة اليومية"
                >
                  <header className="flex items-center justify-between gap-2 px-3 py-2 bg-gradient-to-l from-orange-500/15 to-amber-500/10 border-b border-orange-300/40 dark:border-orange-500/30">
                    <Badge className="bg-orange-500/20 text-orange-700 dark:text-orange-300 border border-orange-500/40 text-[10px] font-bold">
                      {dailyCount}
                    </Badge>
                    <div className="text-right flex-1">
                      <div className="flex items-center gap-2 justify-end">
                        <h4 className="text-sm font-bold text-foreground">
                          متكرر اليوم
                        </h4>
                        <Flame className="size-4 text-orange-600 dark:text-orange-400" />
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-tight">
                        ضغط لحظي — يظهر عند تكرار نفس النمط ≥{' '}
                        {thresholds.ROLLING_24H_THRESHOLD} مرات خلال 24 ساعة،
                        ويختفي تلقائياً بعد 24 ساعة من عدم النشاط.
                      </p>
                    </div>
                  </header>
                  <div className="p-2 space-y-2 max-h-[280px] overflow-y-auto">
                    {dailyIssues.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground text-right py-3 px-2">
                        لا توجد ارتفاعات يومية حالياً.
                      </p>
                    ) : (
                      dailyIssues.map((issue) => (
                        <OperationalIssueRow
                          key={issue._id}
                          issue={issue}
                          showResolveAction
                          resolveState={resolveState}
                          onResolve={handleResolve}
                        />
                      ))
                    )}
                  </div>
                </section>

                {/* ============ Lane 2: مشكلة تشغيلية مستمرة (root cause) ============
                    Cooler/calmer palette + Shield icon to communicate
                    "this is a real pattern that needs ownership". Lives
                    much longer than the daily lane. */}
                <section
                  className="rounded-xl border-2 border-slate-400/50 dark:border-slate-500/40 bg-slate-500/[0.04] overflow-hidden"
                  aria-label="المشاكل التشغيلية المستمرة"
                >
                  <header className="flex items-center justify-between gap-2 px-3 py-2 bg-gradient-to-l from-slate-500/15 to-slate-400/10 border-b border-slate-400/40 dark:border-slate-500/30">
                    <Badge className="bg-slate-600/20 text-slate-700 dark:text-slate-200 border border-slate-500/40 text-[10px] font-bold">
                      {persistentCount}
                    </Badge>
                    <div className="text-right flex-1">
                      <div className="flex items-center gap-2 justify-end">
                        <h4 className="text-sm font-bold text-foreground">
                          مشاكل تشغيلية مستمرة
                        </h4>
                        <ShieldAlert className="size-4 text-slate-600 dark:text-slate-300" />
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-tight">
                        نمط تشغيلي حقيقي — يظهر عند ≥{' '}
                        {thresholds.ROLLING_7D_THRESHOLD} حالة خلال 7 أيام،
                        أو ≥ {thresholds.DISTINCT_DAYS_THRESHOLD ?? 3} أيام
                        مختلفة، أو استمراره بعد دورة "متكرر اليوم". يبقى حتى
                        يُحلّ يدوياً أو بعد 7 أيام من عدم النشاط.
                      </p>
                    </div>
                  </header>
                  <div className="p-2 space-y-2 max-h-[280px] overflow-y-auto">
                    {persistentIssues.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground text-right py-3 px-2">
                        لا توجد أنماط تشغيلية مستمرة حالياً.
                      </p>
                    ) : (
                      persistentIssues.map((issue) => (
                        <OperationalIssueRow
                          key={issue._id}
                          issue={issue}
                          showResolveAction
                          resolveState={resolveState}
                          onResolve={handleResolve}
                        />
                      ))
                    )}
                  </div>
                </section>
              </>
            )}
          </TabsContent>

          <TabsContent value="archive" className="mt-3">
            {archive.length === 0 ? (
              <p className="text-xs text-muted-foreground text-right p-4">
                لا توجد مشاكل مؤرشفة بعد.
              </p>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto">
                {archive.map((issue) => (
                  <OperationalIssueRow
                    key={issue._id}
                    issue={issue}
                    showResolveAction={false}
                    resolveState={null}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      )}
    </Card>
  );
}

export default OperationalIssueTracker;
