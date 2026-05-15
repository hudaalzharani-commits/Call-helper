import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
  Users,
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
import { Badge } from '../ui/badge';
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
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export function DashboardPage() {
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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Dashboard (Home)</h2>
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
        <h3 className="text-lg font-semibold text-foreground mb-4">Summary Cards</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-panel border-2 border-border p-6 hover:scale-[1.02] transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500">
                <Users className="size-5 text-white" />
              </div>
              <Badge className="bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-900 border">
                {users ? `${users.activeUsers} نشط` : '—'}
              </Badge>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground mb-1">{users?.totalUsers ?? 0}</p>
              <p className="text-sm text-muted-foreground">إجمالي المستخدمين</p>
            </div>
          </Card>

          <Card className="glass-panel border-2 border-border p-6 hover:scale-[1.02] transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500">
                <Activity className="size-5 text-white" />
              </div>
              <Badge className="bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900 border">
                {typeof summary?.trends?.calls === 'number' ? `${summary.trends.calls >= 0 ? '+' : ''}${summary.trends.calls}%` : '—'}
              </Badge>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground mb-1">{summary?.callsToday ?? 0}</p>
              <p className="text-sm text-muted-foreground">المكالمات اليوم</p>
            </div>
          </Card>

          <Card className="glass-panel border-2 border-border p-6 hover:scale-[1.02] transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-red-500">
                <AlertCircle className="size-5 text-white" />
              </div>
              <Badge className="bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-900 border">
                {summary ? `${summary.activeCalls} نشط` : '—'}
              </Badge>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground mb-1">{summary?.pendingCalls ?? 0}</p>
              <p className="text-sm text-muted-foreground">المشاكل المفتوحة</p>
            </div>
          </Card>

          <Card className="glass-panel border-2 border-border p-6 hover:scale-[1.02] transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
                <TrendingUp className="size-5 text-white" />
              </div>
              <Badge className="bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900 border">
                {summary ? `${summary.resolvedCalls} محلولة` : '—'}
              </Badge>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground mb-1">{summary?.resolutionRate ?? 0}%</p>
              <p className="text-sm text-muted-foreground">معدل الحل</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Graphs */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Graphs</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Performance Over Time */}
          <Card className="glass-panel border-2 border-border p-6">
            <h4 className="text-foreground font-bold mb-4 flex items-center gap-2">
              <BarChart3 className="size-5 text-primary" />
              الأداء خلال الأسبوع
            </h4>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                <XAxis 
                  dataKey="name" 
                  stroke="rgba(148, 163, 184, 0.5)"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="rgba(148, 163, 184, 0.5)"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="users" 
                  stroke="#06b6d4" 
                  strokeWidth={2}
                  name="المستخدمين"
                  dot={{ fill: '#06b6d4', r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="calls" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="المكالمات"
                  dot={{ fill: '#10b981', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Activity Throughout Day */}
          <Card className="glass-panel border-2 border-border p-6">
            <h4 className="text-foreground font-bold mb-4 flex items-center gap-2">
              <Activity className="size-5 text-primary" />
              النشاط على مدار اليوم
            </h4>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                <XAxis 
                  dataKey="name" 
                  stroke="rgba(148, 163, 184, 0.5)"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="rgba(148, 163, 184, 0.5)"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#8b5cf6" 
                  fill="url(#colorActivity)"
                  strokeWidth={2}
                  name="النشاط"
                />
                <defs>
                  <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* Issue Distribution */}
          <Card className="glass-panel border-2 border-border p-6">
            <h4 className="text-foreground font-bold mb-4 flex items-center gap-2">
              <AlertCircle className="size-5 text-primary" />
              توزيع المشاكل
            </h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={issueDistributionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                <XAxis 
                  dataKey="name" 
                  stroke="rgba(148, 163, 184, 0.5)"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="rgba(148, 163, 184, 0.5)"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Bar 
                  dataKey="value" 
                  fill="url(#colorBar)"
                  radius={[8, 8, 0, 0]}
                  name="عدد المشاكل"
                />
                <defs>
                  <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={1}/>
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* System Status */}
          <Card className="glass-panel border-2 border-border p-6">
            <h4 className="text-foreground font-bold mb-4 flex items-center gap-2">
              <Database className="size-5 text-primary" />
              حالة النظام
            </h4>
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
                    <CheckCircle className="size-4 text-cyan-500" />
                    <span className="text-muted-foreground">استخدام الذاكرة</span>
                  </div>
                  <span className="text-foreground font-semibold">68%</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full w-[68%] bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full" />
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
            <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl">
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