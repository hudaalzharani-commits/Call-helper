/**
 * Admin-only operational monitoring (moved from LiveIndicators).
 * Shown inside Advanced Settings: frequent-issue threshold, distribution
 * snapshot, and operational issue tracker — same order as before.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ShieldCheck, Flame, BarChart3, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import {
  getDistributionStats,
  type DistributionStats,
} from "../../services/analyticsService";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { OperationalIssueTracker } from "../OperationalIssueTracker";
import { useLanguage } from "../../contexts/LanguageContext";

export function AdminOperationalMonitoringSection() {
  const { t } = useLanguage();
  const { isAdmin } = useAuth();
  const [isGeneralIssuesOpen, setIsGeneralIssuesOpen] = useState(true);

  const [thresholdConfig, setThresholdConfig] = useState<{
    value: number;
    min: number;
    max: number;
    defaultValue: number;
  }>({ value: 10, min: 1, max: 1000, defaultValue: 10 });
  const [thresholdDraft, setThresholdDraft] = useState(10);
  const [isSavingThreshold, setIsSavingThreshold] = useState(false);
  const [thresholdError, setThresholdError] = useState<string | null>(null);
  const [thresholdSavedAt, setThresholdSavedAt] = useState<number | null>(null);
  const thresholdSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const [distributionStats, setDistributionStats] =
    useState<DistributionStats | null>(null);
  const [distributionLoadError, setDistributionLoadError] = useState<
    string | null
  >(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          if (!cancelled) setThresholdError(t('admin.operationalMonitoring.notLoggedIn'));
          return;
        }
        if (token === "local-auth-token") {
          if (!cancelled) {
            setThresholdError(
              t('admin.operationalMonitoring.localLogin'),
            );
          }
          return;
        }
        const [res, dist] = await Promise.all([
          fetch("/api/settings/frequent-issue-threshold", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          getDistributionStats().catch(() => null),
        ]);
        if (dist && !cancelled) {
          setDistributionStats(dist);
          setDistributionLoadError(null);
        } else if (!cancelled) {
          setDistributionLoadError(t('admin.operationalMonitoring.distributionLoadFailed'));
        }
        if (!res.ok) {
          if (!cancelled) {
            const body = await res.json().catch(() => null);
            setThresholdError(
              body?.message || t('admin.operationalMonitoring.thresholdLoadFailed', { status: res.status }),
            );
          }
          return;
        }
        const body = await res.json();
        if (cancelled || !body?.success || !body?.data) return;
        const cfg = {
          value: Number(body.data.threshold) || 10,
          min: Number(body.data.min) || 1,
          max: Number(body.data.max) || 1000,
          defaultValue: Number(body.data.defaultValue) || 10,
        };
        setThresholdConfig(cfg);
        setThresholdDraft(cfg.value);
        if (!cancelled) setThresholdError(null);
      } catch (err) {
        if (!cancelled) {
          setThresholdError(
            err instanceof Error ? err.message : t('admin.operationalMonitoring.connectionFailed'),
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveThreshold = useCallback(
    async (rawValue: number) => {
      if (thresholdSaveTimerRef.current) {
        clearTimeout(thresholdSaveTimerRef.current);
        thresholdSaveTimerRef.current = null;
      }
      const clamped = Math.max(
        thresholdConfig.min,
        Math.min(thresholdConfig.max, Math.round(rawValue)),
      );
      if (clamped === thresholdConfig.value) {
        setThresholdDraft(clamped);
        return;
      }
      setIsSavingThreshold(true);
      setThresholdError(null);
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setThresholdError(t('admin.operationalMonitoring.notLoggedIn'));
          return;
        }
        if (token === "local-auth-token") {
          setThresholdError(
            t('admin.operationalMonitoring.localLogin'),
          );
          return;
        }
        const res = await fetch("/api/settings/frequent-issue-threshold", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ threshold: clamped }),
        });
        const body = await res.json().catch(() => null);
        if (!res.ok || !body?.success || !body?.data) {
          if (res.status === 401) {
            throw new Error(t('admin.operationalMonitoring.sessionExpired'));
          }
          if (res.status === 403) {
            throw new Error(t('admin.operationalMonitoring.insufficientPermissions'));
          }
          throw new Error(body?.message || `HTTP ${res.status}`);
        }
        const newCfg = {
          value: Number(body.data.threshold) || clamped,
          min: Number(body.data.min) || thresholdConfig.min,
          max: Number(body.data.max) || thresholdConfig.max,
          defaultValue:
            Number(body.data.defaultValue) || thresholdConfig.defaultValue,
        };
        setThresholdConfig(newCfg);
        setThresholdDraft(newCfg.value);
        setThresholdSavedAt(Date.now());
        setDistributionStats((prev) =>
          prev ? { ...prev, frequentTodayThreshold: newCfg.value } : prev,
        );
        try {
          const dist = await getDistributionStats();
          setDistributionStats(dist);
          setDistributionLoadError(null);
        } catch {
          setDistributionLoadError(t('admin.operationalMonitoring.distributionUpdateFailed'));
        }
      } catch (err) {
        setThresholdError(err instanceof Error ? err.message : t('admin.operationalMonitoring.saveFailed'));
      } finally {
        setIsSavingThreshold(false);
      }
    },
    [thresholdConfig],
  );

  const scheduleThresholdSave = useCallback(
    (nextValue: number) => {
      if (thresholdSaveTimerRef.current) {
        clearTimeout(thresholdSaveTimerRef.current);
      }
      thresholdSaveTimerRef.current = setTimeout(() => {
        thresholdSaveTimerRef.current = null;
        void saveThreshold(nextValue);
      }, 350);
    },
    [saveThreshold],
  );

  useEffect(() => {
    return () => {
      if (thresholdSaveTimerRef.current) {
        clearTimeout(thresholdSaveTimerRef.current);
      }
    };
  }, []);

  const flushPendingThresholdSave = useCallback(() => {
    if (!thresholdSaveTimerRef.current) return;
    clearTimeout(thresholdSaveTimerRef.current);
    thresholdSaveTimerRef.current = null;
    const token = localStorage.getItem("token");
    if (!token || token === "local-auth-token") return;
    if (thresholdDraft === thresholdConfig.value) return;
    const clamped = Math.max(
      thresholdConfig.min,
      Math.min(thresholdConfig.max, Math.round(thresholdDraft)),
    );
    if (clamped === thresholdConfig.value) return;
    try {
      void fetch("/api/settings/frequent-issue-threshold", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ threshold: clamped }),
        keepalive: true,
      });
    } catch {
      /* ignore */
    }
  }, [thresholdDraft, thresholdConfig]);

  useEffect(() => {
    const onBeforeUnload = () => flushPendingThresholdSave();
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") flushPendingThresholdSave();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [flushPendingThresholdSave]);

  useEffect(() => {
    if (thresholdSavedAt === null) return;
    const t = setTimeout(() => setThresholdSavedAt(null), 2000);
    return () => clearTimeout(t);
  }, [thresholdSavedAt]);

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* 1) {t('admin.operationalMonitoring.generalIssuesTitle')} */}
      <Card className="border-2 border-amber-300/60 dark:border-amber-500/40 shadow-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setIsGeneralIssuesOpen((o) => !o)}
          className="w-full text-right"
          aria-expanded={isGeneralIssuesOpen}
          aria-label={
            isGeneralIssuesOpen ? t('admin.operationalMonitoring.hideIssues') : t('admin.operationalMonitoring.showIssues')
          }
        >
          <CardHeader
            className={`bg-gradient-to-r from-amber-500/15 to-orange-500/15 dark:from-amber-500/10 dark:to-orange-500/10 rounded-t-2xl border-b border-border cursor-pointer transition-all hover:from-amber-500/20 hover:to-orange-500/20 ${
              !isGeneralIssuesOpen ? "rounded-b-2xl border-b-0" : ""
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <ShieldCheck className="size-5 text-amber-600 dark:text-amber-400 shrink-0" />
                <div className="text-right min-w-0">
                  <CardTitle className="text-base sm:text-lg font-bold text-foreground">
                    {t('admin.operationalMonitoring.generalIssuesTitle')}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    الحد اليومي، {t('admin.operationalMonitoring.repeatedToday')}، وأكثر التصنيفات شيوعاً (من قاعدة
                    البيانات)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-start">
                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[10px]">
                  {t('admin.operationalMonitoring.adminOnly')}
                </Badge>
                {isGeneralIssuesOpen ? (
                  <ChevronUp className="size-5 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="size-5 text-muted-foreground shrink-0" />
                )}
              </div>
            </div>
          </CardHeader>
        </button>
        {isGeneralIssuesOpen && (
        <CardContent className="pt-6 space-y-4">
          {distributionLoadError && (
            <p className="text-xs text-amber-800 dark:text-amber-200 text-right">
              {distributionLoadError}
            </p>
          )}
          <div className="glass-panel rounded-xl p-4 border-2 border-amber-300/50 dark:border-amber-500/30 space-y-3">
            {thresholdError && !isSavingThreshold && (
              <div className="w-full rounded-lg border-2 border-red-300/60 dark:border-red-500/40 bg-red-50/80 dark:bg-red-950/40 px-3 py-2 text-right">
                <p className="text-xs font-bold text-red-700 dark:text-red-300">
                  {t('admin.operationalMonitoring.unsavedWarning')}
                  <span className="font-normal mr-1">{thresholdError}</span>
                </p>
              </div>
            )}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={
                    isSavingThreshold || thresholdDraft <= thresholdConfig.min
                  }
                  onClick={() => saveThreshold(thresholdDraft - 1)}
                  className="h-9 w-9 p-0 font-bold text-lg"
                  aria-label={t('admin.operationalMonitoring.decrease')}
                >
                  −
                </Button>
                <input
                  type="number"
                  min={thresholdConfig.min}
                  max={thresholdConfig.max}
                  value={thresholdDraft}
                  disabled={isSavingThreshold}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (!Number.isFinite(v)) return;
                    setThresholdDraft(v);
                    scheduleThresholdSave(v);
                  }}
                  onBlur={() => {
                    if (thresholdDraft !== thresholdConfig.value) {
                      void saveThreshold(thresholdDraft);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  className="w-20 h-9 text-center font-bold text-lg rounded-lg border-2 border-border bg-background text-foreground focus:border-amber-500 focus:outline-none transition-all"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={
                    isSavingThreshold || thresholdDraft >= thresholdConfig.max
                  }
                  onClick={() => saveThreshold(thresholdDraft + 1)}
                  className="h-9 w-9 p-0 font-bold text-lg"
                  aria-label={t('admin.operationalMonitoring.increase')}
                >
                  +
                </Button>
                {thresholdDraft !== thresholdConfig.value && (
                  <Button
                    type="button"
                    size="sm"
                    disabled={isSavingThreshold}
                    onClick={() => void saveThreshold(thresholdDraft)}
                    className="h-9 px-3 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold"
                  >
                    حفظ
                  </Button>
                )}
                {isSavingThreshold && (
                  <span className="text-[10px] text-muted-foreground">
                    {t('admin.operationalMonitoring.saving')}
                  </span>
                )}
                {!isSavingThreshold &&
                  thresholdSavedAt &&
                  !thresholdError && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                      {t('admin.operationalMonitoring.saved')}
                    </span>
                  )}
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-foreground">
                  {t('admin.operationalMonitoring.thresholdLabel')}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  كم مرة لازم تتكرر نفس (التصنيف + مقدم الخدمة) في اليوم لتُعدّ
                  متكررة. النطاق: {thresholdConfig.min}–{thresholdConfig.max}
                </p>
              </div>
            </div>
          </div>

          {(() => {
            const topCategoriesAll = distributionStats?.topCategories ?? [];
            const frequentTodayThreshold =
              thresholdConfig.value ||
              distributionStats?.frequentTodayThreshold ||
              10;
            const rawGroups = distributionStats?.frequentTodayGroups ?? [];
            const frequentTodayGroups = rawGroups.filter(
              (g) => Number(g.count) >= frequentTodayThreshold,
            );
            const bucketDate =
              distributionStats?.frequentTodayBucketDate ?? null;

            return (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="glass-panel rounded-xl p-4 border-2 border-orange-300/50 dark:border-orange-500/30 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {bucketDate && (
                        <span className="text-[10px] text-muted-foreground">
                          {bucketDate}
                        </span>
                      )}
                      <Badge className="bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/30 text-[10px]">
                        ≥ {frequentTodayThreshold}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-foreground">
                        {t('admin.operationalMonitoring.repeatedToday')}
                      </h4>
                      <Flame className="size-4 text-orange-600 dark:text-orange-400" />
                    </div>
                  </div>
                  {frequentTodayGroups.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-right">
                      {t('admin.operationalMonitoring.noRepeatedToday')}
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {frequentTodayGroups.map((group, idx) => (
                        <div
                          key={`${group.category}__${group.entityType}__${idx}`}
                          className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-orange-500/5 border border-orange-500/20 hover:shadow-sm transition-all"
                        >
                          <Badge className="bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/30 text-xs shrink-0 font-bold">
                            {group.count}
                          </Badge>
                          <div className="text-right flex-1 min-w-0">
                            <p className="text-xs font-bold text-foreground truncate">
                              {group.category}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {t('admin.operationalMonitoring.serviceProvider', { type: group.entityType })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="glass-panel rounded-xl p-4 border-2 border-cyan-300/50 dark:border-primary/30 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge className="bg-primary/15 text-primary border border-primary/30 text-[10px]">
                      إجمالي
                    </Badge>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-foreground">
                        {t('admin.operationalMonitoring.generalIssues')}
                      </h4>
                      <BarChart3 className="size-4 text-primary" />
                    </div>
                  </div>
                  {topCategoriesAll.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-right">
                      {t('admin.operationalMonitoring.noData')}
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {topCategoriesAll.slice(0, 10).map((cat, idx) => (
                        <div
                          key={`${cat.category}__${idx}`}
                          className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-primary/5 border border-primary/20 hover:shadow-sm transition-all"
                        >
                          <Badge className="bg-primary/15 text-primary border border-primary/30 text-xs shrink-0 font-bold">
                            {cat.count}
                          </Badge>
                          <div className="text-right flex-1 min-w-0">
                            <p className="text-xs font-bold text-foreground truncate">
                              {cat.category}
                            </p>
                            {cat.percentage !== undefined && (
                              <p className="text-[10px] text-muted-foreground truncate">
                                {cat.percentage}%
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </CardContent>
        )}
      </Card>

      {/* 2) تتبع المشاكل التشغيلية */}
      <OperationalIssueTracker embedMode />
    </div>
  );
}
