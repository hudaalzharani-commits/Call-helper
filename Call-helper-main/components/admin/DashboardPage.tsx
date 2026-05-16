import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
  Database,
  Plus,
  FileText,
  Settings,
  Download,
  Upload,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import {
  getDistributionStats,
  getHourlyActivity,
  getSummaryStats,
  getTimeSeriesData,
  getUserStats,
  type DistributionStats,
  type HourlyDataPoint,
  type SummaryStats,
  type TimeSeriesDataPoint,
  type UserStats,
} from '../../services/analyticsService';
import { formatAppWeekdayShort } from '../../utils/dateDisplay';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { DashboardChartDefs, dashAreaAccentFillId } from '../dashboard/DashboardChartDefs';
import { DashboardChartFrame } from '../dashboard/DashboardChartFrame';
import { DashboardKpiCard } from '../dashboard/DashboardKpiCard';
import { useDashboardChartColors } from '../../hooks/useDashboardChartColors';
import {
  DASH_CARTESIAN_MARGIN,
  DASH_CHART,
  DASH_Y_AXIS_RTL,
  DASH_Y_AXIS_SPACER,
  DASH_Y_AXIS_WIDTH,
  dashAxisTick,
  dashAxisLine,
  dashBarFill,
  dashTooltipStyle,
} from '../../utils/dashboardChartTheme';

const ADMIN_ACTIVITY_CHART_ID = 'admin-activity';

export function DashboardPage() {
  const chartColors = useDashboardChartColors();
  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [users, setUsers] = useState<UserStats | null>(null);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesDataPoint[]>([]);
  const [hourly, setHourly] = useState<HourlyDataPoint[]>([]);
  const [distribution, setDistribution] = useState<DistributionStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const [s, u, ts, h, d] = await Promise.all([
          getSummaryStats(),
          getUserStats(),
          getTimeSeriesData('7d'),
          getHourlyActivity(),
          getDistributionStats(),
        ]);

        if (cancelled) return;
        setSummary(s);
        setUsers(u);
        setTimeSeries(ts);
        setHourly(h);
        setDistribution(d);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load dashboard analytics');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const performanceData = useMemo(() => {
    const fmt = { format: (d: Date) => formatAppWeekdayShort(d) };
    return timeSeries.map((p) => ({
      name: fmt.format(new Date(p.date)),
      users: users?.activeUsers ?? 0,
      calls: p.count,
      issues: p.pending,
    }));
  }, [timeSeries, users]);

  const activityData = useMemo(() => hourly.map((h) => ({ name: h.name, value: h.value })), [hourly]);

  const issueDistributionData = useMemo(() => {
    const top = distribution?.topCategories ?? [];
    return top.slice(0, 5).map((c) => ({ name: c.category, value: Number(c.count) }));
  }, [distribution]);

  return (
    <div className="dashboard-cosmos dashboard-cosmos--admin space-y-5">
      <div>
        <h2 className="dash-page-title mb-2">لوحة التحكم</h2>
        <p className="text-muted-foreground">نظرة شاملة على أداء النظام</p>
      </div>

      {(isLoading || error) && (
        <Card className="glass-panel border-2 border-border p-4">
          <div className="text-right text-sm">
            {isLoading && <p className="text-muted-foreground">جاري تحميل بيانات لوحة التحكم...</p>}
            {error && <p className="text-red-600 dark:text-red-400">تعذر تحميل البيانات: {error}</p>}
          </div>
        </Card>
      )}

      {/* Summary Cards */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">ملخص سريع</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <DashboardKpiCard
            label="إجمالي المستخدمين"
            value={String(users?.totalUsers ?? 0)}
            change={users ? `${users.activeUsers} نشط` : undefined}
            trend="neutral"
          />

          <DashboardKpiCard
            label="المكالمات اليوم"
            value={String(summary?.callsToday ?? 0)}
            change={
              typeof summary?.trends?.calls === 'number'
                ? `${summary.trends.calls >= 0 ? '+' : ''}${summary.trends.calls}%`
                : undefined
            }
            trend={
              typeof summary?.trends?.calls === 'number'
                ? summary.trends.calls >= 0
                  ? 'up'
                  : 'down'
                : 'neutral'
            }
          />

          <DashboardKpiCard
            label="المشاكل المفتوحة"
            value={String(summary?.pendingCalls ?? 0)}
            change={summary ? `${summary.activeCalls} نشط` : undefined}
            trend="neutral"
          />

          <DashboardKpiCard
            label="معدل الحل"
            value={`${summary?.resolutionRate ?? 0}%`}
            change={summary ? `${summary.resolvedCalls} محلولة` : undefined}
            trend="up"
          />
        </div>
      </div>

      {/* Graphs */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">المخططات</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Performance Over Time */}
          <Card className="dash-chart-card p-0 overflow-hidden border-0">
            <div className="dash-chart-card__header">
            <h4 className="dash-chart-card__title mb-0">
              <BarChart3 className="size-5 text-primary" />
              الأداء خلال الأسبوع
            </h4>
            </div>
            <div className="dash-chart-canvas">
            <DashboardChartFrame height={300}>
              <LineChart data={performanceData} margin={DASH_CARTESIAN_MARGIN}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                <XAxis 
                  dataKey="name" 
                  stroke="rgba(148, 163, 184, 0.5)"
                  style={{ fontSize: '12px' }}
                />
                <YAxis width={DASH_Y_AXIS_WIDTH} {...DASH_Y_AXIS_SPACER} />
                <YAxis tick={dashAxisTick} tickLine={dashAxisLine} {...DASH_Y_AXIS_RTL} />
                <Tooltip contentStyle={dashTooltipStyle} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="users"
                  stroke={DASH_CHART.primary}
                  strokeWidth={2}
                  name="المستخدمين"
                  dot={{ fill: DASH_CHART.primary, r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="calls"
                  stroke={DASH_CHART.accent}
                  strokeWidth={2}
                  name="المكالمات"
                  dot={{ fill: DASH_CHART.accent, r: 4 }}
                />
              </LineChart>
            </DashboardChartFrame>
            </div>
          </Card>

          {/* Activity Throughout Day */}
          <Card className="dash-chart-card p-0 overflow-hidden border-0">
            <div className="dash-chart-card__header">
            <h4 className="dash-chart-card__title mb-0">
              <Activity className="size-5 text-primary" />
              النشاط على مدار اليوم
            </h4>
            </div>
            <div className="dash-chart-canvas">
            <DashboardChartFrame height={300}>
              <AreaChart data={activityData} margin={DASH_CARTESIAN_MARGIN}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                <XAxis 
                  dataKey="name" 
                  stroke="rgba(148, 163, 184, 0.5)"
                  style={{ fontSize: '12px' }}
                />
                <YAxis width={DASH_Y_AXIS_WIDTH} {...DASH_Y_AXIS_SPACER} />
                <YAxis tick={dashAxisTick} tickLine={dashAxisLine} {...DASH_Y_AXIS_RTL} />
                <Tooltip contentStyle={dashTooltipStyle} />
                <DashboardChartDefs
                  idPrefix={ADMIN_ACTIVITY_CHART_ID}
                  primary={chartColors.primary}
                  accent={chartColors.accent}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={chartColors.accent}
                  fill={`url(#${dashAreaAccentFillId(ADMIN_ACTIVITY_CHART_ID)})`}
                  strokeWidth={2}
                  name="النشاط"
                />
              </AreaChart>
            </DashboardChartFrame>
            </div>
          </Card>

          {/* Issue Distribution */}
          <Card className="dash-chart-card p-0 overflow-hidden border-0">
            <div className="dash-chart-card__header">
            <h4 className="dash-chart-card__title mb-0">
              <AlertCircle className="size-5 text-primary" />
              توزيع المشاكل
            </h4>
            </div>
            <div className="dash-chart-canvas">
            <DashboardChartFrame height={300}>
              <BarChart data={issueDistributionData} margin={DASH_CARTESIAN_MARGIN}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                <XAxis
                  dataKey="name"
                  stroke="rgba(148, 163, 184, 0.5)"
                  style={{ fontSize: '12px' }}
                />
                <YAxis width={DASH_Y_AXIS_WIDTH} {...DASH_Y_AXIS_SPACER} />
                <YAxis tick={dashAxisTick} tickLine={dashAxisLine} {...DASH_Y_AXIS_RTL} />
                <Tooltip contentStyle={dashTooltipStyle} />
                <Bar dataKey="value" radius={DASH_CHART.barRadius} name="عدد المشاكل">
                  {issueDistributionData.map((_, index) => (
                    <Cell key={`issue-bar-${index}`} fill={dashBarFill(index, chartColors)} />
                  ))}
                </Bar>
              </BarChart>
            </DashboardChartFrame>
            </div>
          </Card>

          {/* System Status */}
          <Card className="dash-chart-card p-0 overflow-hidden border-0">
            <div className="dash-chart-card__header">
              <h4 className="dash-chart-card__title mb-0">
                <Database className="size-5 text-primary" />
                حالة النظام
              </h4>
            </div>
            <div className="dash-chart-canvas">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="size-4 text-green-500" />
                    <span className="text-muted-foreground">استخدام المعالج</span>
                  </div>
                  <span className="text-foreground font-semibold">42%</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full w-[42%] bg-gradient-to-r from-green-500 to-emerald-500 rounded-full" />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="size-4 text-primary" />
                    <span className="text-muted-foreground">استخدام الذاكرة</span>
                  </div>
                  <span className="text-foreground font-semibold">68%</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full w-[68%] bg-primary text-primary-foreground rounded-full" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="size-4 text-amber-500" />
                    <span className="text-muted-foreground">استخدام المساحة</span>
                  </div>
                  <span className="text-foreground font-semibold">85%</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full w-[85%] bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="size-4 text-purple-500" />
                    <span className="text-muted-foreground">الأداء العام</span>
                  </div>
                  <span className="text-foreground font-semibold">92%</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full w-[92%] bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
                </div>
              </div>
            </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button 
            className="glass-panel border-2 border-border h-auto py-6 flex-col gap-3 hover:scale-[1.02] transition-all hover:bg-accent/50 text-foreground"
            variant="ghost"
          >
            <div className="p-3 bg-primary rounded-xl">
              <Plus className="size-6 text-white" />
            </div>
            <div className="text-center">
              <p className="font-semibold">إضافة مستخدم</p>
              <p className="text-xs text-muted-foreground">إنشاء حساب جديد</p>
            </div>
          </Button>

          <Button 
            className="glass-panel border-2 border-border h-auto py-6 flex-col gap-3 hover:scale-[1.02] transition-all hover:bg-accent/50 text-foreground"
            variant="ghost"
          >
            <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl">
              <FileText className="size-6 text-white" />
            </div>
            <div className="text-center">
              <p className="font-semibold">إنشاء تقرير</p>
              <p className="text-xs text-muted-foreground">توليد تقرير جديد</p>
            </div>
          </Button>

          <Button 
            className="glass-panel border-2 border-border h-auto py-6 flex-col gap-3 hover:scale-[1.02] transition-all hover:bg-accent/50 text-foreground"
            variant="ghost"
          >
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
              <Download className="size-6 text-white" />
            </div>
            <div className="text-center">
              <p className="font-semibold">تصدير البيانات</p>
              <p className="text-xs text-muted-foreground">تحميل ملف Excel</p>
            </div>
          </Button>

          <Button 
            className="glass-panel border-2 border-border h-auto py-6 flex-col gap-3 hover:scale-[1.02] transition-all hover:bg-accent/50 text-foreground"
            variant="ghost"
          >
            <div className="p-3 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl">
              <Settings className="size-6 text-white" />
            </div>
            <div className="text-center">
              <p className="font-semibold">الإعدادات</p>
              <p className="text-xs text-muted-foreground">تخصيص النظام</p>
            </div>
          </Button>

          <Button 
            className="glass-panel border-2 border-border h-auto py-6 flex-col gap-3 hover:scale-[1.02] transition-all hover:bg-accent/50 text-foreground"
            variant="ghost"
          >
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl">
              <Upload className="size-6 text-white" />
            </div>
            <div className="text-center">
              <p className="font-semibold">استيراد بيانات</p>
              <p className="text-xs text-muted-foreground">رفع ملف CSV</p>
            </div>
          </Button>

          <Button 
            className="glass-panel border-2 border-border h-auto py-6 flex-col gap-3 hover:scale-[1.02] transition-all hover:bg-accent/50 text-foreground"
            variant="ghost"
          >
            <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl">
              <Database className="size-6 text-white" />
            </div>
            <div className="text-center">
              <p className="font-semibold">نسخ احتياطي</p>
              <p className="text-xs text-muted-foreground">إنشاء نسخة جديدة</p>
            </div>
          </Button>

          <Button 
            className="glass-panel border-2 border-border h-auto py-6 flex-col gap-3 hover:scale-[1.02] transition-all hover:bg-accent/50 text-foreground"
            variant="ghost"
          >
            <div className="p-3 bg-gradient-to-br from-red-500 to-rose-500 rounded-xl">
              <Trash2 className="size-6 text-white" />
            </div>
            <div className="text-center">
              <p className="font-semibold">حذف البيانات</p>
              <p className="text-xs text-muted-foreground">تنظيف قديمة</p>
            </div>
          </Button>

          <Button 
            className="glass-panel border-2 border-border h-auto py-6 flex-col gap-3 hover:scale-[1.02] transition-all hover:bg-accent/50 text-foreground"
            variant="ghost"
          >
            <div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl">
              <RefreshCw className="size-6 text-white" />
            </div>
            <div className="text-center">
              <p className="font-semibold">إعادة التشغيل</p>
              <p className="text-xs text-muted-foreground">تحديث الخدمات</p>
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
}