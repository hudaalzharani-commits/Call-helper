import { useCallback, useEffect, useId, useMemo, useState } from "react";
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Clock,
  CalendarIcon,
  Flame,
  BarChart3,
  Trash2,
  Search,
} from "lucide-react";

import {
  getDistributionStats,
  getHourlyActivity,
  getSummaryStats,
  getTimeSeriesData,
  getConfirmedBriefings,
  type ConfirmedBriefingRow,
  type DistributionStats,
  type HourlyDataPoint,
  type SummaryStats,
  type TimeSeriesDataPoint,
} from "../services/analyticsService";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  Area,
  AreaChart,
  CartesianGrid,
} from "recharts";
import { DashboardChartDefs, dashAreaFillId } from "./dashboard/DashboardChartDefs";
import { DashboardChartFrame } from "./dashboard/DashboardChartFrame";
import { DashboardKpiCard } from "./dashboard/DashboardKpiCard";
import { useDashboardChartColors } from "../hooks/useDashboardChartColors";
import {
  DASH_CARTESIAN_MARGIN,
  DASH_CARTESIAN_MARGIN_COMPACT,
  DASH_CATEGORY_BAR_MARGIN,
  DASH_HORIZONTAL_BAR_MARGIN,
  DASH_CHART,
  DASH_CHART_HEIGHT_TALL,
  DASH_Y_AXIS_RTL,
  DASH_Y_AXIS_SPACER,
  DASH_Y_AXIS_WIDTH,
  chartPalette,
  dashAxisLineFrom,
  dashAxisTickFrom,
  dashBarFill,
  dashTooltipStyle,
} from "../utils/dashboardChartTheme";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Calendar as CalendarComponent } from "./ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  formatAppDate,
  formatAppDateWithWeekday,
  type AppDateLocale,
  formatAnalyticsChartDay,
  formatAppWeekdayFullDate,
  formatAppTime,
  formatChartHourLabel,
  computeAnalyticsPeriodRange,
  fillDailyTimeSeriesForRange,
} from "../utils/dateDisplay";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { tCategory, tEntity } from "../i18n/translations";
import { canDeleteConfirmedBriefing } from "../utils/uiVisibility";
import { deleteCallLog } from "../services/callLogsService";
import { toast } from "sonner";
import type { AdvancedFlowSummary } from "../utils/advancedFlowSummary";
import {
  buildConfirmedBriefingView,
  formatConfirmedBriefingBody,
} from "../utils/briefingDisplay";
import { ConfirmedBriefingDisplay } from "./ConfirmedBriefingDisplay";
import type { DateRange as DayPickerDateRange } from "react-day-picker";
import { arSA, enUS } from "react-day-picker/locale";

type IndicatorCardId = "dailyCases" | "confirmedReports" | "topProblems" | "publicIssues";

/** Ø¹Ø¯Ø¯ Ø§Ù„Ø¥ÙØ§Ø¯Ø§Øª Ø§Ù„Ù…Ø¤ÙƒØ¯Ø© + Ø§Ù„Ù†Ø³Ø¨Ø© â€” Ù…Ø¹ ØªÙ‚Ø¯ÙŠØ± Ø§Ù„Ø¹Ø¯Ø¯ Ø¥Ù† Ù„Ù… ÙŠÙØ±Ø¬ÙØ¹Ù‡Ø§ Ø§Ù„Ø®Ø§Ø¯Ù… Ø§Ù„Ù‚Ø¯ÙŠÙ… */
function resolveBriefingKpi(stats: SummaryStats | null) {
  const rate = Number(stats?.briefingConfirmationRate ?? 0);
  const withGenerated = Number(stats?.briefingsWithGeneratedCount ?? 0);
  let count = stats?.confirmedBriefingCount;
  if (typeof count !== "number" || !Number.isFinite(count)) {
    count =
      withGenerated > 0 && rate > 0
        ? Math.round((withGenerated * rate) / 100)
        : 0;
  }
  return { count, rate, withGenerated };
}


function confirmedBriefingMatchesQuery(
  row: ConfirmedBriefingRow,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const flow = row.advancedFlowSummary;
  const view = buildConfirmedBriefingView(row);
  const haystack = [
    row.customerName,
    row.entityType,
    row.category,
    row.problemSummary,
    row.solution,
    formatConfirmedBriefingBody(row),
    view.solution,
    view.routes.map((s) => `${s.routeName ?? ""} ${s.stepName ?? ""} ${s.choiceName}`).join(" "),
    flow?.pathLabel,
    flow?.routeNames?.join(" "),
    flow?.questionTitle,
    flow?.selections?.map((s) => `${s.routeName} ${s.stepName} ${s.choiceName}`).join(" "),
    row.createdAt ? formatAppDate(new Date(row.createdAt)) : "",
  ]
    .filter((part) => part != null && String(part).trim() !== "")
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export function LiveIndicators() {
  const { t, dir, locale } = useLanguage();
  const dateLocale = locale as AppDateLocale;
  const dayPickerLocale = locale === "en" ? enUS : arSA;
  const { user } = useAuth();
  const mayDeleteBriefing = canDeleteConfirmedBriefing(user);
  const chartColors = useDashboardChartColors();
  const dailyAreaGradId = useId();
  const axisTick = useMemo(() => dashAxisTickFrom(chartColors), [chartColors]);
  const axisLine = useMemo(() => dashAxisLineFrom(chartColors), [chartColors]);
  const palette = useMemo(() => chartPalette(chartColors), [chartColors]);

  const [selectedPeriod, setSelectedPeriod] = useState("today");
  const [selectedCategory, setSelectedCategory] = useState<IndicatorCardId>("dailyCases");

  // =========================
  // Real analytics state (API-backed)
  // =========================
  const [summaryStats, setSummaryStats] = useState<SummaryStats | null>(null);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesDataPoint[]>([]);
  const [hourlyActivity, setHourlyActivity] = useState<HourlyDataPoint[]>([]);
  const [distributionStats, setDistributionStats] = useState<DistributionStats | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [confirmedBriefingsOpen, setConfirmedBriefingsOpen] = useState(false);
  const [confirmedBriefingsItems, setConfirmedBriefingsItems] = useState<
    ConfirmedBriefingRow[]
  >([]);
  const [confirmedBriefingsLoading, setConfirmedBriefingsLoading] =
    useState(false);
  const [confirmedBriefingsError, setConfirmedBriefingsError] = useState<
    string | null
  >(null);
  const [briefingsSearchQuery, setBriefingsSearchQuery] = useState("");
  const [deletingBriefingId, setDeletingBriefingId] = useState<string | null>(
    null,
  );
  const [date, setDate] = useState<Date | undefined>(
    new Date(),
  );
  const [hour, setHour] = useState("12");
  const [minute, setMinute] = useState("00");

  // Date Range Filter States
  const [customPickerRange, setCustomPickerRange] = useState<
    DayPickerDateRange | undefined
  >(undefined);
  const [isCustomRangeOpen, setIsCustomRangeOpen] =
    useState(false);
  const [dateRangeError, setDateRangeError] = useState("");
  const [appliedDateRange, setAppliedDateRange] = useState<{
    start: Date;
    end: Date;
  } | null>(null);

  // Get date range based on selected period
  const getDateRange = () =>
    computeAnalyticsPeriodRange(selectedPeriod, appliedDateRange);

  // Fetch analytics when period / custom range changes
  useEffect(() => {
    let cancelled = false;

    async function loadAnalytics() {
      setIsLoadingAnalytics(true);
      setAnalyticsError(null);
      try {
        const periodRange = computeAnalyticsPeriodRange(
          selectedPeriod,
          appliedDateRange,
        );
        const rangeKeys = {
          from: periodRange.fromYmd,
          to: periodRange.toYmd,
        };
        const [summary, series, hourly, distribution] = await Promise.all([
          getSummaryStats(rangeKeys),
          getTimeSeriesData(rangeKeys),
          getHourlyActivity(rangeKeys),
          getDistributionStats(rangeKeys),
        ]);

        if (cancelled) return;
        setSummaryStats(summary);
        setTimeSeries(Array.isArray(series) ? series : []);
        setHourlyActivity(Array.isArray(hourly) ? hourly : []);
        setDistributionStats(distribution);
      } catch (err) {
        if (cancelled) return;
        setAnalyticsError(err instanceof Error ? err.message : "Failed to load analytics");
      } finally {
        if (!cancelled) setIsLoadingAnalytics(false);
      }
    }

    loadAnalytics();
    return () => {
      cancelled = true;
    };
  }, [selectedPeriod, appliedDateRange]);

  const loadConfirmedBriefings = useCallback(async () => {
    setConfirmedBriefingsLoading(true);
    setConfirmedBriefingsError(null);
    try {
      const periodRange = computeAnalyticsPeriodRange(
        selectedPeriod,
        appliedDateRange,
      );
      const res = await getConfirmedBriefings({
        from: periodRange.fromYmd,
        to: periodRange.toYmd,
        limit: 100,
      });
      setConfirmedBriefingsItems(res.items ?? []);
    } catch (err) {
      setConfirmedBriefingsItems([]);
      setConfirmedBriefingsError(
        err instanceof Error
          ? err.message
          : t("liveIndicators.briefingsLoadFailed"),
      );
    } finally {
      setConfirmedBriefingsLoading(false);
    }
  }, [selectedPeriod, appliedDateRange, t]);

  const handleDeleteBriefing = useCallback(
    async (row: ConfirmedBriefingRow) => {
      if (!mayDeleteBriefing || !row.id) return;
      if (!window.confirm(t("liveIndicators.briefingDeleteConfirm"))) return;
      setDeletingBriefingId(row.id);
      try {
        await deleteCallLog(row.id);
        toast.success(t("liveIndicators.briefingDeleteSuccess"));
        setConfirmedBriefingsItems((prev) =>
          prev.filter((item) => item.id !== row.id),
        );
        const periodRange = computeAnalyticsPeriodRange(
          selectedPeriod,
          appliedDateRange,
        );
        const summary = await getSummaryStats({
          from: periodRange.fromYmd,
          to: periodRange.toYmd,
        });
        setSummaryStats(summary);
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : t("liveIndicators.briefingDeleteFailed"),
        );
      } finally {
        setDeletingBriefingId(null);
      }
    },
    [mayDeleteBriefing, selectedPeriod, appliedDateRange, t],
  );

  useEffect(() => {
    if (selectedCategory !== "confirmedReports") return;
    void loadConfirmedBriefings();
  }, [selectedCategory, loadConfirmedBriefings]);

  useEffect(() => {
    const onCallLogSaved = () => {
      void loadConfirmedBriefings();
    };
    window.addEventListener("rafeeq:call-log-saved", onCallLogSaved);
    return () => window.removeEventListener("rafeeq:call-log-saved", onCallLogSaved);
  }, [loadConfirmedBriefings]);

  // Format date for display (Ù…ÙŠÙ„Ø§Ø¯ÙŠ ÙÙ‚Ø·)
  const formatDateForDisplay = () => {
    const { start, end } = getDateRange();

    if (selectedPeriod === "today") {
      const gregorianDate = formatAppDate(start, dateLocale);
      return t("liveIndicators.todayPrefix", { date: gregorianDate });
    }

    const startGregorian = formatAppDate(start, dateLocale);
    const endGregorian = formatAppDate(end, dateLocale);

    return t("liveIndicators.rangeTo", { start: startGregorian, end: endGregorian });
  };

  // Handle custom range application
  const handleApplyCustomRange = () => {
    setDateRangeError("");

    const from = customPickerRange?.from;
    const to = customPickerRange?.to;

    if (!from || !to) {
      setDateRangeError(t("liveIndicators.pickBothDates"));
      return;
    }

    if (from > to) {
      setDateRangeError(t("liveIndicators.startBeforeEnd"));
      return;
    }

    const start = new Date(from);
    start.setHours(0, 0, 0, 0);
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);

    setAppliedDateRange({ start, end });
    setSelectedPeriod("custom");
    setIsCustomRangeOpen(false);
  };

  // Handle preset period selection
  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    if (period !== "custom") {
      setAppliedDateRange(null);
    }
  };

  /** Ù†ÙØ³ Ù…Ù†Ø·Ù‚ ØµÙØ­Ø© Â«Ø§Ù„Ù…Ø´Ø§ÙƒÙ„ Ø§Ù„Ø¹Ø§Ù…Ø©Â»: topCategories Ù…Ù† Ø§Ù„ØªÙˆØ²ÙŠØ¹ØŒ Ù…Ø¹ Ø¯Ù…Ø¬ Ø£Ø³Ù…Ø§Ø¡ Ù…ØªØ´Ø§Ø¨Ù‡Ø© Ù„Ù„Ø¹Ø±Ø¶ */
  const uniqueCommonIssuesChartData = useMemo(() => {
    const byKey = new Map<string, { name: string; value: number }>();
    for (const c of distributionStats?.topCategories ?? []) {
      const raw = (c.category || "ØºÙŠØ± Ù…Ø­Ø¯Ø¯").trim();
      const key = raw.toLowerCase();
      const count = Number(c.count);
      const prev = byKey.get(key);
      if (!prev) byKey.set(key, { name: raw || "ØºÙŠØ± Ù…Ø­Ø¯Ø¯", value: count });
      else prev.value += count;
    }
    return [...byKey.values()]
      .map((row) => ({ name: tCategory(t, row.name), value: row.value }))
      .sort((a, b) => b.value - a.value);
  }, [distributionStats, t]);

  const periodCasesTotal = useMemo(
    () => timeSeries.reduce((sum, p) => sum + (Number(p.count) || 0), 0),
    [timeSeries],
  );

  const isTodayPeriod = selectedPeriod === "today";

  const periodRange = useMemo(
    () => computeAnalyticsPeriodRange(selectedPeriod, appliedDateRange),
    [selectedPeriod, appliedDateRange],
  );

  const dailyCasesChartTitle = useMemo(() => {
    switch (selectedPeriod) {
      case "today":
        return t("liveIndicators.dailyCasesToday");
      case "week":
        return t("liveIndicators.dailyCasesWeek");
      case "month":
        return t("liveIndicators.dailyCasesMonth");
      case "year":
        return t("liveIndicators.dailyCasesYear");
      case "custom":
        return t("liveIndicators.dailyCasesCustom");
      default:
        return t("liveIndicators.dailyCases");
    }
  }, [selectedPeriod, t]);

  const statsCards = useMemo(() => {
    const callsInPeriod =
      selectedPeriod === "today"
        ? (summaryStats?.callsToday ?? periodCasesTotal)
        : periodCasesTotal;
    const topIssueCount = distributionStats?.topCategories?.[0]?.count ?? 0;
    /** ÙŠØ·Ø§Ø¨Ù‚ Ø¹Ø¯Ø¯ Ø§Ù„Ø£Ø¹Ù…Ø¯Ø©/Ø§Ù„ÙØ¦Ø§Øª Ø§Ù„Ù…Ø¹Ø±ÙˆØ¶Ø© ÙÙŠ Ù…Ø®Ø·Ø· Â«Ø§Ù„Ù…Ø´Ø§ÙƒÙ„ Ø§Ù„Ø¹Ø§Ù…Ø©Â» (Ø¨Ø¹Ø¯ Ø§Ù„Ø¯Ù…Ø¬)ØŒ ÙˆÙ„ÙŠØ³ ÙƒÙ„ Ø§Ù„ØªØµÙ†ÙŠÙØ§Øª ÙÙŠ Ø§Ù„ÙØªØ±Ø© */
    const uniqueGeneralTypes = uniqueCommonIssuesChartData.length;

    const callsTrend = summaryStats?.trends?.calls;
    const callsChange = typeof callsTrend === "number" ? `${callsTrend >= 0 ? "+" : ""}${callsTrend}%` : "";

    const briefingKpi = resolveBriefingKpi(summaryStats);
    return [
      {
        id: "dailyCases" as const,
        title: t("liveIndicators.dailyCases"),
        value: String(callsInPeriod),
        change: callsChange,
        trend: typeof callsTrend === "number" ? (callsTrend >= 0 ? "up" : "down") : "neutral",
        color: "from-slate-300 to-slate-200",
        activeColor: "from-primary to-primary",
      },
      {
        id: "confirmedReports" as const,
        title: t("liveIndicators.confirmedReports"),
        value:
          briefingKpi.count > 0
            ? String(briefingKpi.count)
            : briefingKpi.rate > 0
              ? `${briefingKpi.rate}%`
              : "0",
        change:
          briefingKpi.count > 0 && briefingKpi.rate > 0
            ? t("liveIndicators.confirmedBriefingRateDelta", {
                rate: briefingKpi.rate,
              })
            : briefingKpi.count === 0 && briefingKpi.withGenerated > 0
              ? t("liveIndicators.briefingsWithGeneratedInPeriod", {
                  count: briefingKpi.withGenerated,
                })
              : "",
        trend: "neutral",
        color: "from-slate-300 to-slate-200",
        activeColor: "from-primary to-primary",
      },
      {
        id: "topProblems" as const,
        title: t("liveIndicators.topProblems"),
        value: String(topIssueCount),
        change: "",
        trend: "neutral",
        color: "from-slate-300 to-slate-200",
        activeColor: "from-primary to-primary",
      },
      {
        id: "publicIssues" as const,
        title: t("liveIndicators.publicIssues"),
        value: String(uniqueGeneralTypes),
        change: "",
        trend: "neutral",
        color: "from-slate-300 to-slate-200",
        activeColor: "from-primary to-primary",
      },
    ];
  }, [
    summaryStats,
    distributionStats,
    selectedPeriod,
    periodCasesTotal,
    uniqueCommonIssuesChartData.length,
    t,
  ]);

  const dailyCasesChartData = useMemo(() => {
    if (selectedPeriod === "today") {
      return hourlyActivity.map((h) => ({
        date: String(h.hour),
        name: formatChartHourLabel(h.hour, h.name),
        value: Number(h.value) || 0,
      }));
    }
    const filled = fillDailyTimeSeriesForRange(
      timeSeries,
      periodRange.fromYmd,
      periodRange.toYmd,
    );
    return filled.map((p) => ({
      date: p.date,
      name: formatAnalyticsChartDay(p.date),
      value: p.count,
    }));
  }, [selectedPeriod, timeSeries, hourlyActivity, periodRange]);

  const hourlyChartTitle = isTodayPeriod
    ? t("liveIndicators.hourlyActivity")
    : t("liveIndicators.hourlyActivityPeriod");

  const confirmedReportsData = useMemo(() => {
    const { rate: briefingRate } = resolveBriefingKpi(summaryStats);
    const confirmed = Math.max(0, Math.min(100, Number(briefingRate)));
    const notConfirmed = Math.max(0, 100 - confirmed);

    return [
      { name: t("liveIndicators.confirmed"), value: confirmed, color: "#10b981" },
      { name: t("liveIndicators.notConfirmed"), value: notConfirmed, color: "#ef4444" },
    ];
  }, [summaryStats, t]);

  const topIssuesData = useMemo(() => {
    const top = distributionStats?.topCategories ?? [];
    return top.slice(0, 5).map((c) => ({ name: c.category, value: Number(c.count) }));
  }, [distributionStats]);

  const platformsData = useMemo(() => {
    const entities = distributionStats?.issuesByEntity ?? [];
    return entities.map((e, idx) => ({
      name: tEntity(t, e.entityType),
      value: Number(e.count),
      color: palette[idx % palette.length],
    }));
  }, [distributionStats, palette, t]);

  const hourlyActivityData = useMemo(() => {
    return hourlyActivity.map((h) => ({
      ...h,
      name: formatChartHourLabel(h.hour, h.name),
      value: Number(h.value) || 0,
    }));
  }, [hourlyActivity]);

  const filteredConfirmedBriefings = useMemo(() => {
    if (!briefingsSearchQuery.trim()) return confirmedBriefingsItems;
    return confirmedBriefingsItems.filter((row) =>
      confirmedBriefingMatchesQuery(row, briefingsSearchQuery),
    );
  }, [confirmedBriefingsItems, briefingsSearchQuery]);

  return (
    <div className="dashboard-cosmos space-y-6">
      <Dialog
        open={confirmedBriefingsOpen}
        onOpenChange={(open) => {
          setConfirmedBriefingsOpen(open);
          if (open) {
            void loadConfirmedBriefings();
          } else {
            setConfirmedBriefingsError(null);
            setBriefingsSearchQuery("");
          }
        }}
      >
        <DialogContent
          dir="rtl"
          className="max-w-2xl w-[min(100vw-2rem,42rem)] max-h-[85vh] flex flex-col gap-0 overflow-hidden border-2 border-border bg-white p-0 text-foreground shadow-2xl sm:max-w-2xl dark:bg-zinc-950"
        >
          <DialogHeader className="shrink-0 border-b border-border bg-zinc-100 px-6 pb-3 pt-6 text-right dark:bg-zinc-900">
            <DialogTitle className="text-right">
              {t("liveIndicators.briefingsDialogTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="shrink-0 border-b border-border bg-white px-6 py-3 dark:bg-zinc-950">
            <div className="relative" dir={dir}>
              <Search
                className="pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground start-3"
                aria-hidden
              />
              <Input
                type="search"
                value={briefingsSearchQuery}
                onChange={(e) => setBriefingsSearchQuery(e.target.value)}
                placeholder={t("liveIndicators.briefingsSearchPlaceholder")}
                className="h-10 ps-9 text-sm"
                aria-label={t("liveIndicators.briefingsSearchPlaceholder")}
              />
            </div>
          </div>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-white px-6 py-4 dark:bg-zinc-950">
            {confirmedBriefingsLoading && (
              <p className="text-sm text-muted-foreground text-center py-10">
                {t("liveIndicators.briefingsLoading")}
              </p>
            )}
            {confirmedBriefingsError && (
              <p className="text-sm text-destructive text-right">
                {confirmedBriefingsError}
              </p>
            )}
            {!confirmedBriefingsLoading &&
              !confirmedBriefingsError &&
              confirmedBriefingsItems.length === 0 && (
                <p className="text-sm text-muted-foreground text-right py-4">
                  {t("liveIndicators.briefingsEmpty")}
                </p>
              )}
            {!confirmedBriefingsLoading &&
              !confirmedBriefingsError &&
              confirmedBriefingsItems.length > 0 &&
              filteredConfirmedBriefings.length === 0 && (
                <p className="text-sm text-muted-foreground text-right py-4">
                  {t("liveIndicators.briefingsSearchEmpty")}
                </p>
              )}
            {!confirmedBriefingsLoading &&
              filteredConfirmedBriefings.map((row) => (
                <article
                  key={row.id}
                  className="overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-b from-zinc-50/90 to-white shadow-sm ring-1 ring-black/[0.03] dark:from-zinc-900 dark:to-zinc-950 dark:ring-white/[0.04]"
                >
                  <header className="flex flex-wrap items-center justify-end gap-2 border-b border-border/60 bg-muted/40 px-4 py-2.5">
                    {row.createdAt ? (
                      <span className="inline-flex items-center rounded-full bg-background/80 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground border border-border/60">
                        {formatAppDate(new Date(row.createdAt))}
                      </span>
                    ) : null}
                    {row.category ? (
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary border border-primary/20">
                        {row.category}
                      </span>
                    ) : null}
                  </header>
                  <div className="max-h-[min(52vh,420px)] overflow-y-auto px-4 py-3.5">
                    <ConfirmedBriefingDisplay row={row} />
                  </div>
                  {mayDeleteBriefing ? (
                    <div className="flex justify-start border-t border-border/60 bg-muted/20 px-4 py-2">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="gap-1.5 h-8"
                        disabled={deletingBriefingId === row.id}
                        title={t("liveIndicators.briefingDeleteTitle")}
                        onClick={() => void handleDeleteBriefing(row)}
                      >
                        <Trash2 className="size-3.5 shrink-0" />
                        {deletingBriefingId === row.id
                          ? t("liveIndicators.briefingsLoading")
                          : t("liveIndicators.briefingDelete")}
                      </Button>
                    </div>
                  ) : null}
                </article>
              ))}
          </div>
        </DialogContent>
      </Dialog>
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="dash-page-title mb-1 text-right">
            {t("liveIndicators.title")}
          </h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="size-4" />
            <span>{formatDateForDisplay()}</span>
          </div>
        </div>

        {/* Date Filter Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          {/* Preset Period Tabs */}
          <Tabs
            value={selectedPeriod}
            onValueChange={handlePeriodChange}
            dir="rtl"
            className="w-full sm:w-auto"
          >
            <TabsList className="dash-period-rail w-full sm:w-auto grid grid-cols-4 sm:inline-flex h-auto p-1 bg-transparent border-0 shadow-none">
              <TabsTrigger
                value="year"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
              >
                {t("liveIndicators.thisYear")}
              </TabsTrigger>
              <TabsTrigger
                value="month"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
              >
                {t("liveIndicators.thisMonth")}
              </TabsTrigger>
              <TabsTrigger
                value="week"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
              >
                {t("liveIndicators.thisWeek")}
              </TabsTrigger>
              <TabsTrigger
                value="today"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
              >
                {t("liveIndicators.today")}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Custom Date Range Picker */}
          <Popover
            open={isCustomRangeOpen}
            onOpenChange={(open) => {
              setIsCustomRangeOpen(open);
              if (open) {
                if (appliedDateRange) {
                  setCustomPickerRange({
                    from: new Date(appliedDateRange.start),
                    to: new Date(appliedDateRange.end),
                  });
                }
              } else {
                setDateRangeError("");
              }
            }}
          >
            <PopoverTrigger asChild>
              <Button
                variant={
                  selectedPeriod === "custom"
                    ? "default"
                    : "outline"
                }
                className={`shadow-sm transition-all ${
                  selectedPeriod === "custom"
                    ? "bg-primary text-primary-foreground hover:bg-primary-hover border-primary/30"
                    : "glass-card border-2 border-border hover:border-primary/40"
                }`}
              >
                <CalendarIcon className="size-4 ml-2" />
                <span>{t("liveIndicators.dateRange")}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto p-0"
              align="end"
              dir={dir}
            >
              <div className="p-3 space-y-3 bg-white dark:bg-gray-800">
                <div className="mx-auto w-fit rounded-lg border border-border bg-card px-2 py-2 shadow-sm">
                  <CalendarComponent
                    mode="range"
                    numberOfMonths={1}
                    selected={customPickerRange}
                    onSelect={setCustomPickerRange}
                    dir={dir}
                    locale={dayPickerLocale}
                    defaultMonth={customPickerRange?.from ?? new Date()}
                    className="p-0 bg-transparent"
                    classNames={{
                      month: "gap-2",
                      caption: "mb-0.5",
                      caption_label: "text-xs font-semibold",
                      nav_button:
                        "size-6 p-0 opacity-70 hover:opacity-100 border bg-background",
                      table: "mx-auto",
                      head_row: "flex w-full justify-center",
                      head_cell:
                        "w-8 text-[0.65rem] font-semibold text-muted-foreground flex items-center justify-center text-center",
                      row: "flex w-full mt-0.5 justify-center",
                      cell: "p-0",
                      day: "size-8 rounded-md border border-transparent text-xs font-medium hover:border-primary/30 hover:bg-primary/5",
                      day_range_start:
                        "!rounded-md !border-primary !bg-primary !text-primary-foreground !text-xs shadow-sm",
                      day_range_end:
                        "!rounded-md !border-primary !bg-primary !text-primary-foreground !text-xs shadow-sm",
                      day_range_middle: "!rounded-none !bg-primary/15 !text-xs",
                      day_today: "border-primary/35 bg-primary/10 text-xs",
                    }}
                  />
                </div>

                {/* Error Message */}
                {dateRangeError && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-2 text-right">
                    <p className="text-xs text-red-600 dark:text-red-400">
                      {dateRangeError}
                    </p>
                  </div>
                )}

                {/* Selected Range Preview */}
                {customPickerRange?.from &&
                  customPickerRange?.to &&
                  !dateRangeError && (
                  <div className="rounded-lg border border-primary/25 bg-primary/5 p-2 space-y-2">
                    <div className="grid grid-cols-[1fr_auto_1fr] gap-1.5 items-center" dir={dir}>
                      <div className="rounded-md border border-primary bg-background px-2 py-1.5 text-center">
                        <p className="text-[9px] font-medium text-muted-foreground mb-0.5">
                          {t("liveIndicators.startDate")}
                        </p>
                        <p className="text-[11px] font-semibold text-foreground leading-tight">
                          {formatAppDateWithWeekday(
                            customPickerRange.from,
                            dateLocale,
                          )}
                        </p>
                      </div>
                      <span
                        className="flex items-center justify-center text-primary text-sm font-bold"
                        aria-hidden
                      >
                        â†’
                      </span>
                      <div className="rounded-md border border-primary bg-background px-2 py-1.5 text-center">
                        <p className="text-[9px] font-medium text-muted-foreground mb-0.5">
                          {t("liveIndicators.endDate")}
                        </p>
                        <p className="text-[11px] font-semibold text-foreground leading-tight">
                          {formatAppDateWithWeekday(
                            customPickerRange.to,
                            dateLocale,
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                  <Button
                    size="sm"
                    onClick={() => {
                      setIsCustomRangeOpen(false);
                      setDateRangeError("");
                    }}
                    variant="outline"
                    className="flex-1 h-8 text-xs"
                  >
                    {t("actions.cancel")}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleApplyCustomRange}
                    disabled={
                      !customPickerRange?.from || !customPickerRange?.to
                    }
                    className="flex-1 h-8 text-xs bg-primary text-primary-foreground hover:opacity-95 disabled:opacity-50"
                  >
                    {t("liveIndicators.applyFilter")}
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Analytics Loading / Error */}
      {(isLoadingAnalytics || analyticsError) && (
        <Card className="border-2 border-border shadow-lg">
          <CardContent className="pt-6 text-right">
            {isLoadingAnalytics && (
              <p className="text-sm text-muted-foreground">{t("liveIndicators.loadingStats")}</p>
            )}
            {analyticsError && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {t("liveIndicators.loadStatsFailed")} {analyticsError}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat, index) => (
          <DashboardKpiCard
            key={index}
            label={stat.title}
            value={stat.value}
            change={stat.change}
            trend={stat.trend}
            active={selectedCategory === stat.id}
            onClick={() => setSelectedCategory(stat.id)}
          />
        ))}
      </div>

      {/* Charts for "Ø³Ø¬Ù„ Ø§Ù„Ø­Ø§Ù„Ø§Øª Ø§Ù„ÙŠÙˆÙ…ÙŠØ©" */}
      {selectedCategory === "dailyCases" && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="dash-chart-card gap-0 p-0 min-w-0">
              <CardHeader className="dash-chart-card__header border-0 rounded-none shadow-none">
                <CardTitle className="dash-chart-card__title">
                  {dailyCasesChartTitle}
                </CardTitle>
              </CardHeader>
              <CardContent className="dash-chart-canvas !p-0 !px-0">
                {dailyCasesChartData.length === 0 ? (
                  <div className="flex h-[340px] items-center justify-center text-sm text-muted-foreground">
                    {t("liveIndicators.noPeriodData")}
                  </div>
                ) : (
                <DashboardChartFrame>
                  <AreaChart
                    data={dailyCasesChartData}
                    margin={DASH_CARTESIAN_MARGIN}
                  >
                    <DashboardChartDefs
                      idPrefix={dailyAreaGradId}
                      primary={chartColors.primary}
                      accent={chartColors.accent}
                    />
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={chartColors.grid}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tick={axisTick}
                      tickLine={axisLine}
                      interval={
                        isTodayPeriod
                          ? 2
                          : selectedPeriod === "week"
                            ? 0
                            : "preserveStartEnd"
                      }
                      minTickGap={isTodayPeriod ? 12 : 8}
                      tickFormatter={(key) =>
                        isTodayPeriod
                          ? formatChartHourLabel(Number(key))
                          : formatAnalyticsChartDay(String(key))
                      }
                    />
                    <YAxis width={DASH_Y_AXIS_WIDTH} {...DASH_Y_AXIS_SPACER} />
                    <YAxis tick={axisTick} tickLine={axisLine} {...DASH_Y_AXIS_RTL} />
                    <Tooltip contentStyle={dashTooltipStyle} />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={chartColors.primary}
                      strokeWidth={2.5}
                      fill={`url(#${dashAreaFillId(dailyAreaGradId)})`}
                      fillOpacity={1}
                      isAnimationActive={false}
                      dot={{ r: 3, fill: chartColors.primary, strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: chartColors.primary }}
                    />
                  </AreaChart>
                </DashboardChartFrame>
                )}
              </CardContent>
            </Card>

            <Card className="dash-chart-card gap-0 p-0 min-w-0">
              <CardHeader className="dash-chart-card__header border-0 rounded-none shadow-none">
                <CardTitle className="dash-chart-card__title">
                  {hourlyChartTitle}
                </CardTitle>
              </CardHeader>
              <CardContent className="dash-chart-canvas !p-0 !px-0">
                {hourlyActivityData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-right text-sm text-muted-foreground">
                    {t("liveIndicators.noHourlyData")}
                  </div>
                ) : (
                  <DashboardChartFrame>
                    <BarChart
                      data={hourlyActivityData}
                      margin={DASH_CARTESIAN_MARGIN_COMPACT}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={chartColors.grid}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="name"
                        tick={axisTick}
                        tickLine={axisLine}
                        interval={isTodayPeriod ? 2 : "preserveStartEnd"}
                        minTickGap={12}
                      />
                      <YAxis width={36} {...DASH_Y_AXIS_SPACER} />
                      <YAxis tick={axisTick} tickLine={axisLine} {...DASH_Y_AXIS_RTL} width={36} />
                      <Tooltip
                        contentStyle={dashTooltipStyle}
                        formatter={(value: number) => [`${value}`, t("liveIndicators.casesTooltip")]}
                      />
                      <Bar
                        dataKey="value"
                        radius={DASH_CHART.barRadius}
                        fill={chartColors.accent}
                        isAnimationActive={false}
                      />
                    </BarChart>
                  </DashboardChartFrame>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Summary Stats */}
          <Card className="dash-chart-card gap-0 p-0 min-w-0">
            <CardHeader className="dash-chart-card__header border-0 rounded-none">
              <CardTitle className="dash-chart-card__title">
                {t("liveIndicators.dailySummary")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {(() => {
                const total = timeSeries.reduce((sum, p) => sum + p.count, 0);
                const avg = timeSeries.length ? Math.round(total / timeSeries.length) : 0;
                const max = timeSeries.reduce<{ date: string; count: number } | null>(
                  (best, p) => (!best || p.count > best.count ? { date: p.date, count: p.count } : best),
                  null,
                );
                const maxLabel = max ? formatAnalyticsChartDay(max.date) : "â€”";

                return (
                  <>
                    <div className="flex items-center justify-between p-3 glass-panel rounded-xl border border-border">
                      <span className="text-sm text-foreground font-medium">{t("liveIndicators.totalInPeriod")}</span>
                      <span className="dash-inline-stat">{total}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 glass-panel rounded-xl border border-border">
                      <span className="text-sm text-foreground font-medium">{t("liveIndicators.dailyAverage")}</span>
                      <span className="dash-inline-stat">{avg}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 glass-panel rounded-xl border border-border">
                      <span className="text-sm text-foreground font-medium">{t("liveIndicators.peakDay")}</span>
                      <span className="dash-inline-stat">{maxLabel} ({max?.count ?? 0})</span>
                    </div>
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </>
      )}

      {/* Charts for "Ø§Ù„Ø¥ÙØ§Ø¯Ø§Øª Ø§Ù„Ù…Ø¤ÙƒØ¯Ø©" */}
      {selectedCategory === "confirmedReports" && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="dash-chart-card gap-0 p-0 min-w-0">
              <CardHeader className="dash-chart-card__header border-0 rounded-none">
                <CardTitle className="dash-chart-card__title">
                  {t("liveIndicators.confirmedRatio")}
                </CardTitle>
              </CardHeader>
              <CardContent className="dash-chart-canvas !p-0 !px-0">
                <DashboardChartFrame>
                  <PieChart>
                    <Pie
                      data={confirmedReportsData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="value"
                      label={false}
                      style={{ cursor: "pointer" }}
                      onClick={(entry) => {
                        if (!entry || entry.name !== confirmedReportsData[0]?.name) return;
                        setConfirmedBriefingsOpen(true);
                        void loadConfirmedBriefings();
                      }}
                    >
                      {confirmedReportsData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'var(--card)',
                        border: '2px solid var(--border)',
                        borderRadius: '0.75rem',
                        color: 'var(--foreground)'
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={60}
                      wrapperStyle={{ paddingTop: "25px" }}
                      formatter={(value, entry: any) => (
                        <span className="text-foreground text-sm">
                          {value} ({entry.payload.value}%)
                        </span>
                      )}
                    />
                  </PieChart>
                </DashboardChartFrame>
              </CardContent>
            </Card>

            <Card className="dash-chart-card gap-0 p-0 min-w-0">
              <CardHeader className="dash-chart-card__header border-0 rounded-none">
                <CardTitle className="dash-chart-card__title">
                  {t("liveIndicators.briefingDetails")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6 max-h-[420px] overflow-y-auto">
                <div className="flex items-center justify-between p-3 glass-panel rounded-xl border border-border">
                  <span className="text-sm text-foreground font-medium">{t("liveIndicators.confirmed")}</span>
                  <span className="dash-inline-stat text-emerald-600 dark:text-emerald-400">
                    {resolveBriefingKpi(summaryStats).count}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 glass-panel rounded-xl border border-border">
                  <span className="text-sm text-foreground font-medium">{t("liveIndicators.confirmedRatio")}</span>
                  <span className="dash-inline-stat">
                    {summaryStats?.briefingConfirmationRate ?? 0}%
                  </span>
                </div>
                {confirmedBriefingsLoading && (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    {t("liveIndicators.briefingsLoading")}
                  </p>
                )}
                {confirmedBriefingsError && (
                  <p className="text-sm text-destructive text-right">
                    {confirmedBriefingsError}
                  </p>
                )}
                {!confirmedBriefingsLoading &&
                  !confirmedBriefingsError &&
                  confirmedBriefingsItems.length === 0 && (
                    <p className="text-sm text-muted-foreground text-right py-2">
                      {t("liveIndicators.briefingsEmpty")}
                    </p>
                  )}
                {!confirmedBriefingsLoading &&
                  confirmedBriefingsItems.slice(0, 8).map((row) => {
                    const preview = buildConfirmedBriefingView(row);
                    return (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => setConfirmedBriefingsOpen(true)}
                        className="w-full space-y-1.5 rounded-xl border border-border bg-zinc-50 p-3 text-right transition-colors hover:border-primary/30 hover:bg-primary/[0.04] dark:bg-zinc-900 dark:hover:bg-primary/10"
                      >
                        <p className="text-xs font-semibold text-foreground line-clamp-2">
                          {preview.problemSummary || row.problemSummary || "—"}
                        </p>
                        {preview.routes.length > 0 ? (
                          <p className="text-[10px] font-medium text-primary line-clamp-1">
                            {preview.routes[0].routeName
                              ? `${preview.routes[0].routeName} → ${preview.routes[0].choiceName}`
                              : preview.routes[0].choiceName}
                            {preview.routes.length > 1
                              ? ` (+${preview.routes.length - 1})`
                              : ""}
                          </p>
                        ) : null}
                        {preview.solution ? (
                          <p className="text-[11px] text-muted-foreground line-clamp-2">
                            {preview.solution}
                          </p>
                        ) : null}
                      </button>
                    );
                  })}
                {!confirmedBriefingsLoading &&
                  confirmedBriefingsItems.length > 8 && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => setConfirmedBriefingsOpen(true)}
                    >
                      {t("liveIndicators.briefingsDialogTitle")}
                    </Button>
                  )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Charts for "Ø£ÙƒØ«Ø± Ø§Ù„Ù…Ø´Ø§ÙƒÙ„ ØªÙƒØ±Ø§Ø±Ù‹Ø§" */}
      {selectedCategory === "topProblems" && (
        <>
          <div className="grid grid-cols-1 gap-6">
            <Card className="dash-chart-card gap-0 p-0 min-w-0">
              <CardHeader className="dash-chart-card__header border-0 rounded-none">
                <CardTitle className="dash-chart-card__title">
                  {t("liveIndicators.top5Problems")}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
                  {/* Legend List on the Right */}
                  <div className="space-y-3 order-2 lg:order-1">
                    <h4 className="font-bold text-foreground text-sm mb-4">{t("liveIndicators.problemTypes")}</h4>
                    {topIssuesData.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 glass-panel rounded-xl border border-border hover:shadow-md transition-all"
                      >
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: palette[index % palette.length] }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">
                            {item.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t("liveIndicators.casesCount", { count: item.value })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Chart on the Left */}
                  <div className="order-1 lg:order-2 w-full dash-chart-canvas !p-0 !px-0">
                    <DashboardChartFrame height={DASH_CHART_HEIGHT_TALL}>
                      <BarChart
                        data={topIssuesData}
                        layout="vertical"
                        margin={DASH_HORIZONTAL_BAR_MARGIN}
                      >
                        <XAxis 
                          type="number" 
                          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                          tickLine={{ stroke: "var(--border)" }}
                        />
                        <YAxis
                          dataKey="name"
                          type="category"
                          tick={false}
                          width={0}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          contentStyle={dashTooltipStyle}
                          formatter={(value: any) => [`${value}`, t("liveIndicators.casesTooltip")]}
                          cursor={false}
                        />
                        <Bar
                          dataKey="value"
                          radius={[0, 14, 14, 0]}
                          label={{
                            position: "right",
                            fill: "var(--foreground)",
                            fontSize: 12,
                            fontWeight: 700,
                            offset: 10,
                          }}
                          activeBar={false}
                        >
                          {topIssuesData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={dashBarFill(index, chartColors)}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </DashboardChartFrame>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary Stats */}
          <Card className="dash-chart-card gap-0 p-0 min-w-0">
            <CardHeader className="dash-chart-card__header border-0 rounded-none">
              <CardTitle className="dash-chart-card__title">
                {t("liveIndicators.repeatedSummary")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {(() => {
                const totalTypes = distributionStats?.topCategories?.length ?? 0;
                const top = distributionStats?.topCategories?.[0];
                const totalRepeats = (distributionStats?.topCategories ?? []).reduce((sum, c) => sum + Number(c.count), 0);

                return (
                  <>
                    <div className="flex items-center justify-between p-3 glass-panel rounded-xl border border-border">
                      <span className="text-sm text-foreground font-medium">{t("liveIndicators.typeCount")}</span>
                      <span className="dash-inline-stat">{totalTypes}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 glass-panel rounded-xl border border-border">
                      <span className="text-sm text-foreground font-medium">{t("liveIndicators.topRepeated")}</span>
                      <span className="dash-inline-stat">{top ? `${top.category} (${top.count})` : 'â€”'}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 glass-panel rounded-xl border border-border">
                      <span className="text-sm text-foreground font-medium">{t("liveIndicators.totalRepeats")}</span>
                      <span className="dash-inline-stat">{totalRepeats}</span>
                    </div>
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </>
      )}

      {/* Charts for "Ø§Ù„Ù…Ø´Ø§ÙƒÙ„ Ø§Ù„Ø¹Ø§Ù…Ø©" */}
      {selectedCategory === "publicIssues" && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 dash-charts-grid--general">
            {/* Platforms Distribution */}
            <Card className="dash-chart-card gap-0 p-0 min-w-0">
              <CardHeader className="dash-chart-card__header border-0 rounded-none">
                <CardTitle className="dash-chart-card__title">
                  {t("liveIndicators.affectedEntities")}
                </CardTitle>
              </CardHeader>
              <CardContent className="dash-chart-canvas !p-0 !px-0">
                {platformsData.length === 0 ? (
                  <div className="flex h-[340px] items-center justify-center px-6 text-right text-sm text-muted-foreground">
                    {t("liveIndicators.noPeriodData")}
                  </div>
                ) : (
                  <DashboardChartFrame>
                    <PieChart>
                      <Pie
                        data={platformsData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={100}
                        paddingAngle={4}
                        dataKey="value"
                        label={false}
                      >
                        {platformsData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--card)",
                          border: "2px solid var(--border)",
                          borderRadius: "0.75rem",
                          color: "var(--foreground)",
                        }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={60}
                        wrapperStyle={{ paddingTop: "25px" }}
                        formatter={(value, entry: any) => (
                          <span className="text-foreground text-sm">
                            {value} ({entry.payload.value})
                          </span>
                        )}
                      />
                    </PieChart>
                  </DashboardChartFrame>
                )}
              </CardContent>
            </Card>

            {/* Bar Chart */}
            <Card className="dash-chart-card gap-0 p-0 min-w-0">
              <CardHeader className="dash-chart-card__header border-0 rounded-none">
                <CardTitle className="dash-chart-card__title">
                  {t("liveIndicators.publicIssuesByCategory")}
                </CardTitle>
              </CardHeader>
              <CardContent className="dash-chart-canvas dash-chart-canvas--tall !p-0 !px-0">
                {uniqueCommonIssuesChartData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-right text-sm text-muted-foreground">
                    {t("liveIndicators.noCategoriesYet")}
                  </div>
                ) : (
                  <DashboardChartFrame height={DASH_CHART_HEIGHT_TALL}>
                    <BarChart
                      data={uniqueCommonIssuesChartData}
                      margin={DASH_CATEGORY_BAR_MARGIN}
                      barCategoryGap="18%"
                    >
                      <XAxis
                        dataKey="name"
                        angle={0}
                        textAnchor="middle"
                        height={110}
                        interval={0}
                        tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                        tickLine={{ stroke: "var(--border)" }}
                      />
                      <YAxis width={DASH_Y_AXIS_WIDTH} {...DASH_Y_AXIS_SPACER} />
                      <YAxis
                        tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                        tickLine={{ stroke: "var(--border)" }}
                        {...DASH_Y_AXIS_RTL}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--card)",
                          border: "2px solid var(--border)",
                          borderRadius: "0.75rem",
                          color: "var(--foreground)"
                        }}
                        formatter={(value: number) => [`${value}`, t("liveIndicators.reportsCount")]}
                      />
                      <Bar
                        dataKey="value"
                        radius={DASH_CHART.barRadius}
                        label={{
                          position: "top",
                          fill: "var(--foreground)",
                          fontSize: 11,
                          fontWeight: 600,
                          offset: 15,
                        }}
                      >
                        {uniqueCommonIssuesChartData.map((entry, index) => (
                          <Cell
                            key={`cell-${entry.name}-${index}`}
                            fill={dashBarFill(index, chartColors)}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </DashboardChartFrame>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Active vs Resolved Issues */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active Issues */}
            <Card className="dash-chart-card gap-0 p-0 min-w-0">
              <CardHeader className="dash-chart-card__header border-0 rounded-none">
                <CardTitle className="dash-chart-card__title">
                  {t("liveIndicators.activeNow")}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {(() => {
                  const total = summaryStats?.totalCalls ?? 0;
                  const active = summaryStats?.activeCalls ?? 0;
                  const inactive = Math.max(0, total - active);
                  const percent = total > 0 ? Math.round((active / total) * 100) : 0;

                  const data = [
                    { name: t("liveIndicators.active"), value: active, color: "#d97706" },
                    { name: t("liveIndicators.inactive"), value: inactive, color: "#cbd5e1" },
                  ];

                  return (
                    <>
                      <div className="dash-chart-canvas !p-0 !px-0">
                        <DashboardChartFrame height={300}>
                          <PieChart>
                            <Pie
                              data={data}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={90}
                              paddingAngle={4}
                              dataKey="value"
                              label={false}
                            >
                              {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'var(--card)',
                                border: '2px solid var(--border)',
                                borderRadius: '0.75rem',
                                color: 'var(--foreground)'
                              }}
                            />
                            <Legend
                              verticalAlign="bottom"
                              height={50}
                              wrapperStyle={{ paddingTop: "20px" }}
                              formatter={(value, entry: any) => (
                                <span className="text-foreground text-sm">
                                  {value} ({entry.payload.value})
                                </span>
                              )}
                            />
                          </PieChart>
                        </DashboardChartFrame>
                      </div>
                      <div className="text-center mt-4 px-6 pb-6">
                        <p className="text-sm text-muted-foreground">{t("liveIndicators.activeShare")}</p>
                        <p className="text-2xl text-amber-600 dark:text-amber-400 font-bold">
                          {percent}%
                        </p>
                      </div>
                    </>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Resolved Issues */}
            <Card className="dash-chart-card gap-0 p-0 min-w-0">
              <CardHeader className="dash-chart-card__header border-0 rounded-none">
                <CardTitle className="dash-chart-card__title">
                  {t("liveIndicators.resolvedConfirmed")}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {(() => {
                  const total = summaryStats?.totalCalls ?? 0;
                  const resolved = summaryStats?.resolvedCalls ?? 0;
                  const notResolved = Math.max(0, total - resolved);
                  const percent = summaryStats?.resolutionRate ?? (total > 0 ? Math.round((resolved / total) * 100) : 0);

                  const data = [
                    { name: t("liveIndicators.resolvedLabel"), value: resolved, color: "#10b981" },
                    { name: t("liveIndicators.unresolvedLabel"), value: notResolved, color: "#cbd5e1" },
                  ];

                  return (
                    <>
                      <div className="dash-chart-canvas !p-0 !px-0">
                        <DashboardChartFrame height={300}>
                          <PieChart>
                            <Pie
                              data={data}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={90}
                              paddingAngle={4}
                              dataKey="value"
                              label={false}
                            >
                              {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'var(--card)',
                                border: '2px solid var(--border)',
                                borderRadius: '0.75rem',
                                color: 'var(--foreground)'
                              }}
                            />
                            <Legend
                              verticalAlign="bottom"
                              height={50}
                              wrapperStyle={{ paddingTop: "20px" }}
                              formatter={(value, entry: any) => (
                                <span className="text-foreground text-sm">
                                  {value} ({entry.payload.value})
                                </span>
                              )}
                            />
                          </PieChart>
                        </DashboardChartFrame>
                      </div>
                      <div className="text-center mt-4 px-6 pb-6">
                        <p className="text-sm text-muted-foreground">{t("liveIndicators.resolvedShare")}</p>
                        <p className="text-2xl text-emerald-600 dark:text-emerald-400 font-bold">{percent}%</p>
                      </div>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </div>

          {/* Summary Stats Card */}
          <Card className="dash-chart-card gap-0 p-0 min-w-0">
            <CardHeader className="dash-chart-card__header border-0 rounded-none">
              <CardTitle className="dash-chart-card__title">
                {t("liveIndicators.generalSummary")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center justify-between p-3 glass-panel rounded-xl border border-border">
                <span className="text-sm text-foreground font-medium">{t("liveIndicators.uniqueGeneralTypesLabel")}</span>
                <span className="dash-inline-stat">
                  {uniqueCommonIssuesChartData.length}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 glass-panel rounded-xl border border-border">
                <span className="text-sm text-foreground font-medium">{t("liveIndicators.totalReports")}</span>
                <span className="dash-inline-stat">{summaryStats?.totalCalls ?? 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 glass-panel rounded-xl border border-border">
                <span className="text-sm text-foreground font-medium">{t("liveIndicators.resolutionRate")}</span>
                <span className="dash-inline-stat">{summaryStats?.resolutionRate ?? 0}%</span>
              </div>
              <div className="flex items-center justify-between p-3 glass-panel rounded-xl border border-border">
                <span className="text-sm text-foreground font-medium">{t("liveIndicators.avgResolutionHours")}</span>
                <span className="dash-inline-stat">{summaryStats?.avgResolutionTime ?? 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 glass-panel rounded-xl border border-border">
                <span className="text-sm text-foreground font-medium">{t("liveIndicators.activeUsers")}</span>
                <span className="dash-inline-stat">{summaryStats?.activeUsers ?? 0} / {summaryStats?.totalUsers ?? 0}</span>
              </div>
            </CardContent>
          </Card>

          {/* Last Update Bar */}
          <div className="glass-card rounded-2xl shadow-lg p-5 border-2 border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-foreground">
                <div className="p-2 bg-primary rounded-xl border-2 border-primary/30">
                  <Clock className="size-5 text-white" />
                </div>
                <span className="font-bold">{t("liveIndicators.lastUpdate")}</span>
              </div>
              <div className="text-right text-muted-foreground">
                {(() => {
                  const d = new Date();
                  return (
                    <>
                      <p className="text-sm font-medium">{formatAppWeekdayFullDate(d)}</p>
                      <p className="text-xs">{formatAppTime(d)}</p>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
