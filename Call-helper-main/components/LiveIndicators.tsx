import { useEffect, useId, useMemo, useState } from "react";
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Clock,
  CalendarIcon,
  Flame,
  BarChart3,
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
import { Calendar as CalendarComponent } from "./ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  formatAppDate,
  formatAppMonthDay,
  formatAppWeekdayFullDate,
  formatAppTime,
  formatChartHourLabel,
  toAnalyticsDateKey,
  toLocalCalendarDateKey,
} from "../utils/dateDisplay";
import { useLanguage } from "../contexts/LanguageContext";

type IndicatorCardId = "dailyCases" | "confirmedReports" | "topProblems" | "publicIssues";

/** نطاق التقويم المعروض في المؤشرات (يُستخدم للسلاسل الزمنية وقائمة الإفادات المؤكدة) */
function computeIndicatorDateRange(
  selectedPeriod: string,
  appliedDateRange: { start: Date; end: Date } | null,
): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  switch (selectedPeriod) {
    case "today":
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    case "week": {
      const dayOfWeek = now.getDay();
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      start.setDate(now.getDate() - diff);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    case "month":
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    case "year":
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    case "custom":
      if (appliedDateRange) {
        return {
          start: new Date(appliedDateRange.start),
          end: new Date(appliedDateRange.end),
        };
      }
      break;
    default:
      break;
  }
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function LiveIndicators() {
  const { t } = useLanguage();
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
  const [date, setDate] = useState<Date | undefined>(
    new Date(),
  );
  const [hour, setHour] = useState("12");
  const [minute, setMinute] = useState("00");

  // Date Range Filter States
  const [startDate, setStartDate] = useState<Date | undefined>(
    undefined,
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    undefined,
  );
  const [isCustomRangeOpen, setIsCustomRangeOpen] =
    useState(false);
  const [dateRangeError, setDateRangeError] = useState("");
  const [appliedDateRange, setAppliedDateRange] = useState<{
    start: Date;
    end: Date;
  } | null>(null);

  // Get date range based on selected period
  const getDateRange = () =>
    computeIndicatorDateRange(selectedPeriod, appliedDateRange);

  // Fetch analytics when period / custom range changes
  useEffect(() => {
    let cancelled = false;

    async function loadAnalytics() {
      setIsLoadingAnalytics(true);
      setAnalyticsError(null);
      try {
        const { start, end } = computeIndicatorDateRange(
          selectedPeriod,
          appliedDateRange,
        );
        const rangeKeys = {
          from: toAnalyticsDateKey(start),
          to: toAnalyticsDateKey(end),
        };
        const [summary, series, hourly, distribution] = await Promise.all([
          getSummaryStats(),
          getTimeSeriesData(rangeKeys),
          getHourlyActivity(rangeKeys),
          getDistributionStats(),
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

  // Format date for display (ميلادي فقط)
  const formatDateForDisplay = () => {
    const { start, end } = getDateRange();

    if (selectedPeriod === "today") {
      const gregorianDate = formatAppDate(start);
      return t("liveIndicators.todayPrefix", { date: gregorianDate });
    }

    const startGregorian = formatAppDate(start);
    const endGregorian = formatAppDate(end);

    return t("liveIndicators.rangeTo", { start: startGregorian, end: endGregorian });
  };

  // Handle custom range application
  const handleApplyCustomRange = () => {
    setDateRangeError("");

    if (!startDate || !endDate) {
      setDateRangeError(t("liveIndicators.pickBothDates"));
      return;
    }

    if (startDate > endDate) {
      setDateRangeError(t("liveIndicators.startBeforeEnd"));
      return;
    }

    // Apply the custom range
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
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

  /** دمج تصنيفات متشابهة (نفس النص باختلاف حالة/مسافات) لعرض المشاكل العامة دون تكرار */
  const uniqueCommonIssuesChartData = useMemo(() => {
    const byKey = new Map<string, { name: string; value: number }>();
    for (const c of distributionStats?.topCategories ?? []) {
      const raw = (c.category || "غير محدد").trim();
      const key = raw.toLowerCase();
      const count = Number(c.count);
      const prev = byKey.get(key);
      if (!prev) byKey.set(key, { name: raw || "غير محدد", value: count });
      else prev.value += count;
    }
    return [...byKey.values()].sort((a, b) => b.value - a.value);
  }, [distributionStats]);

  const periodCasesTotal = useMemo(
    () => timeSeries.reduce((sum, p) => sum + (Number(p.count) || 0), 0),
    [timeSeries],
  );

  const isTodayPeriod = selectedPeriod === "today";

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
    const uniqueGeneralTypes =
      distributionStats?.uniqueCategoryCount ?? uniqueCommonIssuesChartData.length;

    const callsTrend = summaryStats?.trends?.calls;
    const callsChange = typeof callsTrend === "number" ? `${callsTrend >= 0 ? "+" : ""}${callsTrend}%` : "";

    const briefingRate = summaryStats?.briefingConfirmationRate ?? summaryStats?.resolutionRate ?? 0;
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
        value: `${briefingRate}%`,
        change: "",
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
  }, [summaryStats, distributionStats, selectedPeriod, periodCasesTotal, t]);

  const dailyCasesChartData = useMemo(() => {
    if (selectedPeriod === "today") {
      return hourlyActivity.map((h) => ({
        name: formatChartHourLabel(h.hour, h.name),
        value: Number(h.value) || 0,
      }));
    }
    return timeSeries.map((p) => ({
      name: formatAppMonthDay(new Date(`${p.date}T12:00:00`)),
      value: Number(p.count) || 0,
    }));
  }, [selectedPeriod, timeSeries, hourlyActivity]);

  const confirmedReportsData = useMemo(() => {
    const briefingRate =
      summaryStats?.briefingConfirmationRate ?? summaryStats?.resolutionRate ?? 0;
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
      name: e.entityType,
      value: Number(e.count),
      color: palette[idx % palette.length],
    }));
  }, [distributionStats, palette]);

  const hourlyActivityData = useMemo(() => {
    return hourlyActivity.map((h) => ({
      ...h,
      name: formatChartHourLabel(h.hour, h.name),
      value: Number(h.value) || 0,
    }));
  }, [hourlyActivity]);

  return (
    <div className="dashboard-cosmos space-y-6">
      <Dialog
        open={confirmedBriefingsOpen}
        onOpenChange={(open) => {
          setConfirmedBriefingsOpen(open);
          if (!open) setConfirmedBriefingsError(null);
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
              confirmedBriefingsItems.map((row) => (
                <div
                  key={row.id}
                  className="space-y-3 rounded-xl border border-border bg-zinc-50 p-4 text-right dark:bg-zinc-900"
                >
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground justify-end">
                    {row.createdAt && (
                      <span>{formatAppDate(new Date(row.createdAt))}</span>
                    )}
                    {row.customerName ? (
                      <span>
                        {t("liveIndicators.customer")}{" "}
                        <span className="text-foreground font-medium">
                          {row.customerName}
                        </span>
                      </span>
                    ) : null}
                    {row.entityType ? (
                      <span>
                        {t("liveIndicators.entity")}{" "}
                        <span className="text-foreground font-medium">
                          {row.entityType}
                        </span>
                      </span>
                    ) : null}
                    {row.category ? (
                      <span>
                        {t("liveIndicators.category")}{" "}
                        <span className="text-foreground font-medium">
                          {row.category}
                        </span>
                      </span>
                    ) : null}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground mb-1">
                      {t("liveIndicators.problem")}
                    </p>
                    <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                      {row.problemSummary?.trim() ? row.problemSummary : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground mb-1">
                      {t("liveIndicators.solution")}
                    </p>
                    <pre className="m-0 max-h-[220px] overflow-y-auto rounded-lg border border-border bg-zinc-100 p-3 font-sans text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words dark:bg-zinc-950">
                      {row.solution?.trim() ? row.solution : "—"}
                    </pre>
                  </div>
                </div>
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
            onOpenChange={setIsCustomRangeOpen}
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
              dir="rtl"
            >
              <div className="p-6 space-y-6 bg-white dark:bg-gray-800">
                {/* Header */}
                <div className="text-center pb-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-bold text-gray-900 dark:text-white mb-1">
                    {t("liveIndicators.customRangeTitle")}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t("liveIndicators.customRangeHint")}
                  </p>
                </div>

                {/* Date Pickers */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Start Date */}
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 text-right">
                      {t("liveIndicators.startDate")}
                    </label>
                    <CalendarComponent
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      dir="rtl"
                      className="rounded-lg border border-gray-200 dark:border-gray-700"
                    />
                  </div>

                  {/* End Date */}
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 text-right">
                      {t("liveIndicators.endDate")}
                    </label>
                    <CalendarComponent
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      dir="rtl"
                      className="rounded-lg border border-gray-200 dark:border-gray-700"
                    />
                  </div>
                </div>

                {/* Error Message */}
                {dateRangeError && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-right">
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {dateRangeError}
                    </p>
                  </div>
                )}

                {/* Selected Range Preview */}
                {startDate && endDate && !dateRangeError && (
                  <div className="bg-primary-soft border border-primary/20 rounded-lg p-3 text-right space-y-1">
                    <p className="text-xs text-primary mb-1">
                      {t("liveIndicators.selectedRange")}
                    </p>
                    <p className="text-sm font-medium text-foreground">
                      {formatAppDate(startDate)}
                      <br />
                      إلى {formatAppDate(endDate)}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    onClick={() => {
                      setIsCustomRangeOpen(false);
                      setDateRangeError("");
                    }}
                    variant="outline"
                    className="flex-1 glass-card border-2 border-border hover:border-primary/40 transition-all"
                  >
                    {t("actions.cancel")}
                  </Button>
                  <Button
                    onClick={handleApplyCustomRange}
                    disabled={!startDate || !endDate}
                    className="flex-1 bg-primary text-primary-foreground hover:opacity-95 text-white border-0 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed shadow-lg disabled:shadow-none transition-all"
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

      {/* Charts for "سجل الحالات اليومية" */}
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
                      dataKey="name"
                      tick={axisTick}
                      tickLine={axisLine}
                      interval={isTodayPeriod ? 2 : "preserveStartEnd"}
                      minTickGap={12}
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
                  {t("liveIndicators.hourlyActivity")}
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
                const maxLabel = max ? formatAppMonthDay(new Date(max.date)) : "—";

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

      {/* Charts for "الإفادات المؤكدة" */}
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
                        setConfirmedBriefingsItems([]);
                        setConfirmedBriefingsError(null);
                        setConfirmedBriefingsLoading(true);
                        const { start, end } = getDateRange();
                        getConfirmedBriefings({
                          from: toLocalCalendarDateKey(start),
                          to: toLocalCalendarDateKey(end),
                          limit: 100,
                        })
                          .then((res) =>
                            setConfirmedBriefingsItems(res.items ?? []),
                          )
                          .catch((err) =>
                            setConfirmedBriefingsError(
                              err instanceof Error
                                ? err.message
                                : t("liveIndicators.briefingsLoadFailed"),
                            ),
                          )
                          .finally(() =>
                            setConfirmedBriefingsLoading(false),
                          );
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
              <CardContent className="space-y-4 pt-6">
                {(() => {
                  const total = summaryStats?.totalCalls ?? 0;
                  const resolved = summaryStats?.resolvedCalls ?? 0;
                  const rate = summaryStats?.resolutionRate ?? 0;
                  const notResolved = Math.max(0, total - resolved);

                  return (
                    <>
                      <div className="flex items-center justify-between p-3 glass-panel rounded-xl border border-border">
                        <span className="text-sm text-foreground font-medium">{t("liveIndicators.totalReports")}</span>
                        <span className="dash-inline-stat">{total}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 glass-panel rounded-xl border border-border">
                        <span className="text-sm text-foreground font-medium">{t("liveIndicators.resolved")}</span>
                        <span className="text-lg text-emerald-600 dark:text-emerald-400 font-bold">{resolved} ({rate}%)</span>
                      </div>
                      <div className="flex items-center justify-between p-3 glass-panel rounded-xl border border-border">
                        <span className="text-sm text-foreground font-medium">{t("liveIndicators.unresolved")}</span>
                        <span className="text-lg text-red-600 dark:text-red-400 font-bold">{notResolved} ({Math.max(0, 100 - Number(rate))}%)</span>
                      </div>
                      <div className="flex items-center justify-between p-3 glass-panel rounded-xl border border-border">
                        <span className="text-sm text-foreground font-medium">{t("liveIndicators.resolutionRate")}</span>
                        <span className="dash-inline-stat">{rate}%</span>
                      </div>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Charts for "أكثر المشاكل تكرارًا" */}
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
                      <span className="dash-inline-stat">{top ? `${top.category} (${top.count})` : '—'}</span>
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

      {/* Charts for "المشاكل العامة" */}
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
                          {value} ({entry.payload.value})
                        </span>
                      )}
                    />
                  </PieChart>
                </DashboardChartFrame>
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
                  {distributionStats?.uniqueCategoryCount ?? uniqueCommonIssuesChartData.length}
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