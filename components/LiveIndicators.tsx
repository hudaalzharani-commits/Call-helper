import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Clock,
  CalendarIcon,
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
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Area,
  AreaChart,
} from "recharts";
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
  toLocalCalendarDateKey,
} from "../utils/dateDisplay";
import { useI18nLayout } from "../hooks/useI18nLayout";
import { tCategory, tEntity } from "../i18n/translations";
import { cn } from "./ui/utils";

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
  const { locale, dir, t, textAlign, textAlignBlock, isRtl, marginEnd } = useI18nLayout();
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
          from: toLocalCalendarDateKey(start),
          to: toLocalCalendarDateKey(end),
        };
        const [summary, series, hourly, distribution] = await Promise.all([
          getSummaryStats(),
          getTimeSeriesData(rangeKeys),
          getHourlyActivity(rangeKeys),
          getDistributionStats(),
        ]);

        if (cancelled) return;
        setSummaryStats(summary);
        setTimeSeries(series);
        setHourlyActivity(hourly);
        setDistributionStats(distribution);
      } catch (err) {
        if (cancelled) return;
        setAnalyticsError(
          err instanceof Error ? err.message : t("liveIndicators.loadStatsFailed"),
        );
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
      return t("liveIndicators.todayPrefix", { date: formatAppDate(start) });
    }

    return t("liveIndicators.rangeTo", {
      start: formatAppDate(start),
      end: formatAppDate(end),
    });
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

  const periodCasesTotal = useMemo(
    () => timeSeries.reduce((sum, p) => sum + (Number(p.count) || 0), 0),
    [timeSeries],
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
    const activeCalls = summaryStats?.activeCalls ?? 0;

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
        activeColor: "from-cyan-500 to-blue-600",
      },
      {
        id: "confirmedReports" as const,
        title: t("liveIndicators.confirmedReports"),
        value: `${briefingRate}%`,
        change: "",
        trend: "neutral",
        color: "from-slate-300 to-slate-200",
        activeColor: "from-cyan-500 to-blue-600",
      },
      {
        id: "topProblems" as const,
        title: t("liveIndicators.topProblems"),
        value: String(topIssueCount),
        change: "",
        trend: "neutral",
        color: "from-slate-300 to-slate-200",
        activeColor: "from-cyan-500 to-blue-600",
      },
      {
        id: "publicIssues" as const,
        title: t("liveIndicators.publicIssues"),
        value: String(activeCalls),
        change: "",
        trend: "neutral",
        color: "from-slate-300 to-slate-200",
        activeColor: "from-cyan-500 to-blue-600",
      },
    ];
  }, [summaryStats, distributionStats, selectedPeriod, periodCasesTotal, t]);

  const dailyCasesData = useMemo(() => {
    return timeSeries.map((p) => ({
      name: formatAppMonthDay(new Date(`${p.date}T12:00:00`)),
      value: p.count,
    }));
  }, [timeSeries]);

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
    return top.slice(0, 5).map((c) => ({
      name: tCategory(t, c.category),
      value: Number(c.count),
    }));
  }, [distributionStats, t]);

  const topIssuesColors = [
    "#0891b2", // Cyan
    "#06b6d4", // Bright Cyan
    "#22d3ee", // Light Cyan
    "#67e8f9", // Very Light Cyan
    "#a5f3fc", // Pale Cyan
  ];

  const barChartData = useMemo(() => {
    const priorities = distributionStats?.issuesByPriority ?? [];
    return priorities.map((p) => ({ name: p.priority, value: Number(p.count) }));
  }, [distributionStats]);

  const barColors = [
    "#0891b2",
    "#06b6d4",
    "#22d3ee",
    "#67e8f9",
  ];

  const platformsData = useMemo(() => {
    const entities = distributionStats?.issuesByEntity ?? [];
    const colors = ["#0891b2", "#06b6d4", "#22d3ee", "#67e8f9"];
    return entities.map((e, idx) => ({
      name: tEntity(t, e.entityType),
      value: Number(e.count),
      color: colors[idx % colors.length],
    }));
  }, [distributionStats, t]);

  const hourlyActivityData = useMemo(() => {
    // Backend already provides { hour, name, value }
    return hourlyActivity;
  }, [hourlyActivity]);

  const confirmedLabel = t("liveIndicators.confirmed");

  return (
    <div dir="rtl" className="space-y-6">
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
          <DialogHeader className={cn("shrink-0 border-b border-border bg-zinc-100 px-6 pb-3 pt-6 dark:bg-zinc-900", textAlign)}>
            <DialogTitle className={textAlign}>
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
              <p className={cn("text-sm text-destructive", textAlign)}>
                {confirmedBriefingsError}
              </p>
            )}
            {!confirmedBriefingsLoading &&
              !confirmedBriefingsError &&
              confirmedBriefingsItems.length === 0 && (
                <p className={cn("text-sm text-muted-foreground py-4", textAlign)}>
                  {t("liveIndicators.briefingsEmpty")}
                </p>
              )}
            {!confirmedBriefingsLoading &&
              confirmedBriefingsItems.map((row) => (
                <div
                  key={row.id}
                  className={cn("space-y-3 rounded-xl border border-border bg-zinc-50 p-4 dark:bg-zinc-900", textAlign)}
                >
                  <div className={cn("flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground", isRtl ? "justify-end" : "justify-start")}>
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
                          {tEntity(t, row.entityType)}
                        </span>
                      </span>
                    ) : null}
                    {row.category ? (
                      <span>
                        {t("liveIndicators.category")}{" "}
                        <span className="text-foreground font-medium">
                          {tCategory(t, row.category)}
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
          <h1 className={cn("text-[rgb(0,0,0)] dark:text-white mb-1 font-bold", textAlign)}>
            {t("liveIndicators.title")}
          </h1>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
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
            <TabsList className="glass-card shadow-sm border-2 border-border w-full sm:w-auto grid grid-cols-4 sm:inline-flex">
              <TabsTrigger
                value="year"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-cyan-300 dark:data-[state=active]:border-cyan-400 transition-all"
              >
                {t("liveIndicators.thisYear")}
              </TabsTrigger>
              <TabsTrigger
                value="month"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-cyan-300 dark:data-[state=active]:border-cyan-400 transition-all"
              >
                {t("liveIndicators.thisMonth")}
              </TabsTrigger>
              <TabsTrigger
                value="week"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-cyan-300 dark:data-[state=active]:border-cyan-400 transition-all"
              >
                {t("liveIndicators.thisWeek")}
              </TabsTrigger>
              <TabsTrigger
                value="today"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-cyan-300 dark:data-[state=active]:border-cyan-400 transition-all"
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
                    ? "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-cyan-400 dark:border-cyan-300"
                    : "glass-card border-2 border-border hover:border-cyan-300 dark:hover:border-cyan-500"
                }`}
              >
                <CalendarIcon className={cn("size-4", marginEnd)} />
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
                    <label className={cn("block text-sm font-medium text-gray-700 dark:text-gray-300", textAlignBlock)}>
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
                    <label className={cn("block text-sm font-medium text-gray-700 dark:text-gray-300", textAlignBlock)}>
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
                  <div className={cn("bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3", textAlign)}>
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {dateRangeError}
                    </p>
                  </div>
                )}

                {/* Selected Range Preview */}
                {startDate && endDate && !dateRangeError && (
                  <div className={cn("bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-700 rounded-lg p-3 space-y-1", textAlign)}>
                    <p className="text-xs text-cyan-600 dark:text-cyan-400 mb-1">
                      {t("liveIndicators.selectedRange")}
                    </p>
                    <p className="text-sm font-medium text-cyan-900 dark:text-cyan-200">
                      {t("liveIndicators.rangeTo", {
                        start: formatAppDate(startDate),
                        end: formatAppDate(endDate),
                      })}
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
                    className="flex-1 glass-card border-2 border-border hover:border-cyan-300 dark:hover:border-cyan-500 transition-all"
                  >
                    {t("common.actions.cancel")}
                  </Button>
                  <Button
                    onClick={handleApplyCustomRange}
                    disabled={!startDate || !endDate}
                    className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed shadow-lg disabled:shadow-none transition-all"
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
          <CardContent className={cn("pt-6", textAlign)}>
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
          <button
            key={index}
            onClick={() => setSelectedCategory(stat.id)}
            className={cn(textAlign, "focus:outline-none group")}
          >
            <Card
              className={`transition-all duration-300 overflow-hidden ${
                selectedCategory === stat.id
                  ? "shadow-xl -translate-y-1 scale-[1.02] bg-gradient-to-br from-cyan-50/50 to-blue-50/50 dark:from-cyan-950/30 dark:to-blue-950/30"
                  : "shadow-md hover:shadow-lg hover:-translate-y-0.5"
              }`}
            >
              <div
                className={`h-2 bg-gradient-to-r transition-all duration-300 ${
                  selectedCategory === stat.id 
                    ? stat.activeColor 
                    : stat.color + ' group-hover:from-cyan-400 group-hover:to-blue-500'
                }`}
              />
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground font-bold">
                    {stat.title}
                  </p>
                  <div className="flex items-center justify-center w-5 h-5">
                    {stat.trend === "up" && (
                      <TrendingUp className="size-5 text-emerald-500 dark:text-emerald-400" />
                    )}
                    {stat.trend === "down" && (
                      <TrendingDown className="size-5 text-orange-500 dark:text-orange-400" />
                    )}
                    {stat.trend === "neutral" && (
                      <Clock className="size-5 text-cyan-500 dark:text-cyan-400" />
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-3xl text-foreground">
                    {stat.value}
                  </h3>
                  {stat.change && (
                    <p
                      className={`text-xs font-semibold ${
                        stat.trend === "up"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : stat.trend === "down"
                            ? "text-orange-600 dark:text-orange-400"
                            : "text-muted-foreground"
                      }`}
                    >
                      {stat.change}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      {/* Charts for "سجل الحالات اليومية" */}
      {selectedCategory === "dailyCases" && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-2 border-border shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-cyan-500/15 to-blue-500/15 dark:from-cyan-500/10 dark:to-blue-500/10 rounded-t-2xl border-b border-border">
                <CardTitle className="text-foreground font-bold flex items-center gap-2">
                  <div className="w-1 h-6 bg-gradient-to-b from-cyan-500 to-blue-600 rounded-full" />
                  {dailyCasesChartTitle}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart
                    data={dailyCasesData}
                    margin={{
                      top: 30,
                      right: 30,
                      left: 20,
                      bottom: 20,
                    }}
                  >
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#0891b2" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "var(--muted-foreground)", fontSize: 13 }}
                      tickLine={{ stroke: "var(--border)" }}
                    />
                    <YAxis 
                      tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                      tickLine={{ stroke: "var(--border)" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        border: "2px solid var(--border)",
                        borderRadius: "0.75rem",
                        color: "var(--foreground)"
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#06b6d4"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorValue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-2 border-border shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-violet-500/15 to-purple-500/15 dark:from-violet-500/10 dark:to-purple-500/10 rounded-t-2xl border-b border-border">
                <CardTitle className="text-foreground font-bold flex items-center gap-2">
                  <div className="w-1 h-6 bg-gradient-to-b from-violet-500 to-purple-600 rounded-full" />
                  {t("liveIndicators.hourlyActivity")}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {hourlyActivityData.length === 0 ? (
                  <div className={cn("text-sm text-muted-foreground", textAlign)}>
                    {t("liveIndicators.noHourlyData")}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart
                      data={hourlyActivityData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <XAxis
                        dataKey="name"
                        tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                        tickLine={{ stroke: "var(--border)" }}
                      />
                      <YAxis
                        tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                        tickLine={{ stroke: "var(--border)" }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--card)",
                          border: "2px solid var(--border)",
                          borderRadius: "0.75rem",
                          color: "var(--foreground)",
                        }}
                        formatter={(value: any) => [`${value}`, t("liveIndicators.casesTooltip")]}
                      />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#8b5cf6" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Summary Stats */}
          <Card className="border-2 border-border shadow-lg bg-gradient-to-br from-cyan-50/80 to-blue-50/80 dark:from-cyan-950/30 dark:to-blue-950/30 overflow-hidden">
            <CardHeader className="rounded-t-2xl border-b border-border bg-gradient-to-r from-cyan-500/10 to-blue-500/10 dark:from-cyan-500/5 dark:to-blue-500/5">
              <CardTitle className="text-foreground font-bold flex items-center gap-2">
                <div className="w-1 h-6 bg-gradient-to-b from-cyan-500 to-blue-600 rounded-full" />
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
                      <span className="text-lg text-foreground font-bold">{total}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 glass-panel rounded-xl border border-border">
                      <span className="text-sm text-foreground font-medium">{t("liveIndicators.dailyAverage")}</span>
                      <span className="text-lg text-foreground font-bold">{avg}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 glass-panel rounded-xl border border-border">
                      <span className="text-sm text-foreground font-medium">{t("liveIndicators.peakDay")}</span>
                      <span className="text-lg text-foreground font-bold">{maxLabel} ({max?.count ?? 0})</span>
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
            <Card className="border-2 border-border shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-cyan-500/15 to-teal-500/15 dark:from-cyan-500/10 dark:to-teal-500/10 rounded-t-2xl border-b border-border">
                <CardTitle className="text-foreground font-bold flex items-center gap-2">
                  <div className="w-1 h-6 bg-gradient-to-b from-cyan-500 to-teal-600 rounded-full" />
                  {t("liveIndicators.confirmedRatio")}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={confirmedReportsData}
                      cx="50%"
                      cy="45%"
                      innerRadius={65}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="value"
                      label={false}
                      style={{ cursor: "pointer" }}
                      onClick={(entry) => {
                        if (!entry || entry.name !== confirmedLabel) return;
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
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-2 border-border shadow-lg bg-gradient-to-br from-cyan-50/80 to-teal-50/80 dark:from-cyan-950/30 dark:to-teal-950/30 overflow-hidden">
              <CardHeader className="rounded-t-2xl border-b border-border bg-gradient-to-r from-cyan-500/10 to-teal-500/10 dark:from-cyan-500/5 dark:to-teal-500/5">
                <CardTitle className="text-foreground font-bold flex items-center gap-2">
                  <div className="w-1 h-6 bg-gradient-to-b from-cyan-500 to-teal-600 rounded-full" />
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
                        <span className="text-lg text-foreground font-bold">{total}</span>
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
                        <span className="text-lg text-foreground font-bold">{rate}%</span>
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
            <Card className="border-2 border-border shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-cyan-500/15 to-blue-500/15 dark:from-cyan-500/10 dark:to-blue-500/10 rounded-t-2xl border-b border-border">
                <CardTitle className="text-foreground font-bold flex items-center gap-2">
                  <div className="w-1 h-6 bg-gradient-to-b from-cyan-500 to-blue-600 rounded-full" />
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
                          style={{ backgroundColor: topIssuesColors[index] }}
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
                  <div className="order-1 lg:order-2">
                    <ResponsiveContainer width="100%" height={420}>
                      <BarChart
                        data={topIssuesData}
                        layout="vertical"
                        margin={{
                          top: 20,
                          right: 30,
                          left: 20,
                          bottom: 20,
                        }}
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
                          contentStyle={{
                            backgroundColor: "var(--card)",
                            border: "2px solid var(--border)",
                            borderRadius: "0.75rem",
                            color: "var(--foreground)"
                          }}
                          formatter={(value: any) => [`${value}`, t("liveIndicators.casesTooltip")]}
                          cursor={false}
                        />
                        <Bar
                          dataKey="value"
                          radius={[0, 8, 8, 0]}
                          label={{
                            position: "right",
                            fill: "var(--foreground)",
                            fontSize: 12,
                            fontWeight: 700,
                            offset: 10,
                          }}
                          activeBar={false}
                        >
                          {topIssuesData.map((_row, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={topIssuesColors[index]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary Stats */}
          <Card className="border-2 border-border shadow-lg bg-gradient-to-br from-cyan-50/80 to-blue-50/80 dark:from-cyan-950/30 dark:to-blue-950/30 overflow-hidden">
            <CardHeader className="rounded-t-2xl border-b border-border bg-gradient-to-r from-cyan-500/10 to-blue-500/10 dark:from-cyan-500/5 dark:to-blue-500/5">
              <CardTitle className="text-foreground font-bold flex items-center gap-2">
                <div className="w-1 h-6 bg-gradient-to-b from-cyan-500 to-blue-600 rounded-full" />
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
                      <span className="text-lg text-foreground font-bold">{totalTypes}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 glass-panel rounded-xl border border-border">
                      <span className="text-sm text-foreground font-medium">{t("liveIndicators.topRepeated")}</span>
                      <span className="text-lg text-foreground font-bold">{top ? `${tCategory(t, top.category)} (${top.count})` : '—'}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 glass-panel rounded-xl border border-border">
                      <span className="text-sm text-foreground font-medium">{t("liveIndicators.totalRepeats")}</span>
                      <span className="text-lg text-foreground font-bold">{totalRepeats}</span>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Platforms Distribution */}
            <Card className="border-2 border-border shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-cyan-500/15 to-blue-500/15 dark:from-cyan-500/10 dark:to-blue-500/10 rounded-t-2xl border-b border-border">
                <CardTitle className="text-foreground font-bold flex items-center gap-2">
                  <div className="w-1 h-6 bg-gradient-to-b from-cyan-500 to-blue-600 rounded-full" />
                  {t("liveIndicators.affectedEntities")}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <ResponsiveContainer
                  width="100%"
                  height={320}
                >
                  <PieChart>
                    <Pie
                      data={platformsData}
                      cx="50%"
                      cy="45%"
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
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Bar Chart */}
            <Card className="border-2 border-border shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-cyan-500/15 to-indigo-500/15 dark:from-cyan-500/10 dark:to-indigo-500/10 rounded-t-2xl border-b border-border">
                <CardTitle className="text-foreground font-bold flex items-center gap-2">
                  <div className="w-1 h-6 bg-gradient-to-b from-cyan-500 to-indigo-600 rounded-full" />
                  {t("liveIndicators.mainStats")}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 m-[0px]">
                <ResponsiveContainer width="100%" height={420}>
                  <BarChart
                    data={barChartData}
                    margin={{
                      top: 40,
                      right: 30,
                      left: 30,
                      bottom: 120,
                    }}
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
                    <YAxis 
                      tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                      tickLine={{ stroke: "var(--border)" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        border: "2px solid var(--border)",
                        borderRadius: "0.75rem",
                        color: "var(--foreground)"
                      }}
                    />
                    <Bar
                      dataKey="value"
                      radius={[8, 8, 0, 0]}
                      label={{
                        position: "top",
                        fill: "var(--foreground)",
                        fontSize: 11,
                        fontWeight: 600,
                        offset: 15,
                      }}
                    >
                      {barChartData.map((_row, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={barColors[index]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Active vs Resolved Issues */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active Issues */}
            <Card className="border-2 border-border shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-amber-500/15 to-orange-500/15 dark:from-amber-500/10 dark:to-orange-500/10 rounded-t-2xl border-b border-border">
                <CardTitle className="text-foreground font-bold flex items-center gap-2">
                  <div className="w-1 h-6 bg-gradient-to-b from-amber-500 to-orange-600 rounded-full" />
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
                      <ResponsiveContainer width="100%" height={300}>
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
                      </ResponsiveContainer>
                      <div className="text-center mt-4">
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
            <Card className="border-2 border-border shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-emerald-500/15 to-green-500/15 dark:from-emerald-500/10 dark:to-green-500/10 rounded-t-2xl border-b border-border">
                <CardTitle className="text-foreground font-bold flex items-center gap-2">
                  <div className="w-1 h-6 bg-gradient-to-b from-emerald-500 to-green-600 rounded-full" />
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
                      <ResponsiveContainer width="100%" height={300}>
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
                      </ResponsiveContainer>
                      <div className="text-center mt-4">
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
          <Card className="border-2 border-border shadow-lg bg-gradient-to-br from-cyan-50/80 to-blue-50/80 dark:from-cyan-950/30 dark:to-blue-950/30 overflow-hidden">
            <CardHeader className="rounded-t-2xl border-b border-border bg-gradient-to-r from-cyan-500/10 to-blue-500/10 dark:from-cyan-500/5 dark:to-blue-500/5">
              <CardTitle className="text-foreground font-bold flex items-center gap-2">
                <div className="w-1 h-6 bg-gradient-to-b from-cyan-500 to-blue-600 rounded-full" />
                {t("liveIndicators.generalSummary")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center justify-between p-3 glass-panel rounded-xl border border-border">
                <span className="text-sm text-foreground font-medium">{t("liveIndicators.totalReports")}</span>
                <span className="text-lg text-foreground font-bold">{summaryStats?.totalCalls ?? 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 glass-panel rounded-xl border border-border">
                <span className="text-sm text-foreground font-medium">{t("liveIndicators.resolutionRate")}</span>
                <span className="text-lg text-foreground font-bold">{summaryStats?.resolutionRate ?? 0}%</span>
              </div>
              <div className="flex items-center justify-between p-3 glass-panel rounded-xl border border-border">
                <span className="text-sm text-foreground font-medium">{t("liveIndicators.avgResolutionHours")}</span>
                <span className="text-lg text-foreground font-bold">{summaryStats?.avgResolutionTime ?? 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 glass-panel rounded-xl border border-border">
                <span className="text-sm text-foreground font-medium">{t("liveIndicators.activeUsers")}</span>
                <span className="text-lg text-foreground font-bold">{summaryStats?.activeUsers ?? 0} / {summaryStats?.totalUsers ?? 0}</span>
              </div>
            </CardContent>
          </Card>

          {/* Last Update Bar */}
          <div className="glass-card rounded-2xl shadow-lg p-5 border-2 border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-foreground">
                <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl border-2 border-cyan-300 dark:border-cyan-400">
                  <Clock className="size-5 text-white" />
                </div>
                <span className="font-bold">{t("liveIndicators.lastUpdate")}</span>
              </div>
              <div className={cn(textAlign, "text-muted-foreground")}>
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