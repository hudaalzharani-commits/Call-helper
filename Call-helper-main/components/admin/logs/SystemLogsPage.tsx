import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Filter,
  X,
  XCircle,
  AlertTriangle,
  Clock,
  Server,
  MousePointer,
  GraduationCap,
  AlertCircle,
  EyeOff,
  Activity,
  Users,
  Code,
  FileWarning,
  Network,
  Database,
  TrendingUp,
  Sparkles,
  Wrench,
  ArrowUpCircle,
} from "lucide-react";
import { Card } from "../../ui/card";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import {
  fetchSystemLogs,
  type SystemLogRow,
} from "../../../services/systemLogsService";
import { useLanguage } from "../../../contexts/LanguageContext";

type DateRangeFilter = "today" | "7d" | "30d" | "all" | "custom";

function inDateRange(iso: string, range: DateRangeFilter): boolean {
  if (range === "all" || range === "custom") return true;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return true;
  const now = Date.now();
  if (range === "today") {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return t >= start.getTime();
  }
  if (range === "7d") return t >= now - 7 * 24 * 60 * 60 * 1000;
  if (range === "30d") return t >= now - 30 * 24 * 60 * 60 * 1000;
  return true;
}

const DEFAULT_FILTERS = {
  systemType: "all" as const,
  severity: "all" as const,
  dateRange: "all" as DateRangeFilter,
  caseId: "",
};

export function SystemLogsPage() {
  const { t, dir } = useLanguage();
  const [logs, setLogs] = useState<SystemLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<SystemLogRow | null>(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const rows = await fetchSystemLogs({ limit: 500 });
      setLogs(rows);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : t('admin.systemLogs.loadFailed'));
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const filteredLogs = useMemo(() => {
    const q = filters.caseId.trim().toLowerCase();
    return logs.filter((log) => {
      if (filters.systemType !== "all" && log.systemType !== filters.systemType)
        return false;
      if (filters.severity !== "all" && log.severity !== filters.severity)
        return false;
      if (q && !log.caseId.toLowerCase().includes(q)) return false;
      if (!inDateRange(log.createdAtIso, filters.dateRange)) return false;
      return true;
    });
  }, [logs, filters]);

  // Calculate system health from full dataset (not only filtered rows)
  const openCritical = logs.filter(
    (l) => l.status === "open" && l.severity === "critical",
  ).length;
  const openHigh = logs.filter(
    (l) => l.status === "open" && l.severity === "high",
  ).length;
  
  const systemHealth: 'stable' | 'warning' | 'critical' = 
    openCritical > 0 ? 'critical' : 
    openHigh > 2 ? 'warning' : 
    'stable';

  const getSystemTypeIcon = (type: string) => {
    switch (type) {
      case 'logic-bug': return AlertTriangle;
      case 'flow-bug': return MousePointer;
      case 'error': return AlertCircle;
      case 'crash': return XCircle;
      default: return AlertTriangle;
    }
  };

  const getSystemTypeLabel = (type: string) => {
    switch (type) {
      case 'logic-bug': return t('admin.systemLogs.typeLogicBug');
      case 'flow-bug': return t('admin.systemLogs.typeFlowBug');
      case 'error': return t('admin.systemLogs.typeError');
      case 'crash': return t('admin.systemLogs.typeCrash');
      default: return type;
    }
  };

  const getSystemTypeColor = (type: string) => {
    switch (type) {
      case 'logic-bug': return 'from-purple-500 to-violet-500';
      case 'flow-bug': return 'from-yellow-500 to-amber-500';
      case 'error': return 'from-orange-500 to-red-500';
      case 'crash': return 'from-red-600 to-rose-700';
      default: return 'from-gray-500 to-slate-500';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge className="bg-red-600 text-white border-0 font-bold animate-pulse">{t('admin.systemLogs.severityCritical')}</Badge>;
      case 'high':
        return <Badge className="bg-orange-500 text-white border-0 font-semibold">{t('admin.systemLogs.severityHigh')}</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500 text-white border-0">{t('admin.systemLogs.severityMedium')}</Badge>;
      case 'low':
        return <Badge className="bg-blue-500 text-white border-0">{t('admin.systemLogs.severityLow')}</Badge>;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">{t('admin.systemLogs.statusOpen')}</Badge>;
      case 'resolved':
        return <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">{t('admin.systemLogs.statusResolved')}</Badge>;
      case 'ignored':
        return <Badge className="bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20">{t('admin.systemLogs.statusIgnored')}</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with System Health */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl">
            <Server className="size-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">{t('admin.systemLogs.title')}</h2>
            <p className="text-muted-foreground">{t('admin.systemLogs.subtitle')}</p>
          </div>
        </div>

        {/* System Health Indicator */}
        <Card className={`glass-panel border-2 p-4 ${
          systemHealth === 'critical' ? 'border-red-500 bg-red-500/5' :
          systemHealth === 'warning' ? 'border-yellow-500 bg-yellow-500/5' :
          'border-green-500 bg-green-500/5'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              systemHealth === 'critical' ? 'bg-red-500' :
              systemHealth === 'warning' ? 'bg-yellow-500' :
              'bg-green-500'
            }`}>
              <Activity className="size-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('admin.systemLogs.systemHealth')}</p>
              <p className={`text-lg font-bold ${
                systemHealth === 'critical' ? 'text-red-600 dark:text-red-400' :
                systemHealth === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
                'text-green-600 dark:text-green-400'
              }`}>
                {systemHealth === 'critical' ? t('admin.systemLogs.healthCritical') : systemHealth === 'warning' ? t('admin.systemLogs.healthWarning') : t('admin.systemLogs.healthStable')}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Diagnostic Filters */}
      <Card className="glass-panel border-2 border-border p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{t('admin.systemLogs.diagnosis')}</span>
          </div>

          <select 
            value={filters.systemType}
            onChange={(e) => setFilters({ ...filters, systemType: e.target.value as typeof filters.systemType })}
            className="px-3 py-1.5 text-sm glass-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono"
          >
            <option value="all">{t('admin.systemLogs.filterAll')}</option>
            <option value="logic-bug">{t('admin.systemLogs.typeLogicBug')}</option>
            <option value="flow-bug">{t('admin.systemLogs.typeFlowBug')}</option>
            <option value="error">{t('admin.systemLogs.typeError')}</option>
            <option value="crash">{t('admin.systemLogs.typeCrash')}</option>
          </select>

          <select 
            value={filters.severity}
            onChange={(e) => setFilters({ ...filters, severity: e.target.value as typeof filters.severity })}
            className="px-3 py-1.5 text-sm glass-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono"
          >
            <option value="all">{t('admin.systemLogs.filterAll')}</option>
            <option value="critical">{t('admin.systemLogs.severityCritical')}</option>
            <option value="high">{t('admin.systemLogs.severityHigh')}</option>
            <option value="medium">{t('admin.systemLogs.severityMedium')}</option>
            <option value="low">{t('admin.systemLogs.severityLow')}</option>
          </select>

          <select 
            value={filters.dateRange}
            onChange={(e) => setFilters({ ...filters, dateRange: e.target.value as DateRangeFilter })}
            className="px-3 py-1.5 text-sm glass-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="all">{t('admin.systemLogs.periodAll')}</option>
            <option value="today">اليوم</option>
            <option value="7d">{t('admin.systemLogs.period7d')}</option>
            <option value="30d">{t('admin.systemLogs.period30d')}</option>
            <option value="custom">مخصص ({t('admin.systemLogs.periodAll')})</option>
          </select>

          <input 
            type="text"
            placeholder={t('admin.systemLogs.searchPlaceholder')}
            value={filters.caseId}
            onChange={(e) => setFilters({ ...filters, caseId: e.target.value })}
            className="px-3 py-1.5 text-sm glass-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono"
          />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mr-auto"
            onClick={() => {
              setFilters(DEFAULT_FILTERS);
              void loadLogs();
            }}
          >
            <X className="size-4 ml-1" />
            {t('admin.systemLogs.resetFilters')}
          </Button>
        </div>
      </Card>

      {loadError && (
        <Card className="glass-panel border-2 border-destructive/40 p-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-destructive">{loadError}</p>
          <Button type="button" size="sm" variant="outline" onClick={() => void loadLogs()}>
            {t('admin.systemLogs.retry')}
          </Button>
        </Card>
      )}

      {/* System Logs Table */}
      <Card className="glass-panel border-2 border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">{t('admin.systemLogs.colTime')}</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">{t('admin.systemLogs.colSystemType')}</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">{t('admin.systemLogs.colSeverity')}</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">{t('admin.systemLogs.colCaseId')}</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">{t('admin.systemLogs.colMessage')}</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">{t('admin.systemLogs.colImpact')}</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">{t('admin.systemLogs.colStatus')}</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">{t('admin.systemLogs.colTags')}</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground text-sm">
                    {t('admin.systemLogs.loading')}
                  </td>
                </tr>
              )}
              {!loading && filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground text-sm">
                    {t('admin.systemLogs.empty')}
                  </td>
                </tr>
              )}
              {!loading &&
                filteredLogs.map((log) => {
                const Icon = getSystemTypeIcon(log.systemType);
                const isHighPriority = log.severity === 'critical' || log.systemType === 'crash';
                
                return (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className={`border-b border-border hover:bg-primary/5 transition-colors cursor-pointer group ${
                      isHighPriority ? 'bg-red-500/5' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-foreground font-mono">
                        <Clock className="size-3.5 text-muted-foreground" />
                        {log.time}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg bg-gradient-to-r ${getSystemTypeColor(log.systemType)}`}>
                          <Icon className="size-3.5 text-white" />
                        </div>
                        <span className="text-sm text-foreground">{getSystemTypeLabel(log.systemType)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {getSeverityBadge(log.severity)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono text-muted-foreground">{log.caseId}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-foreground line-clamp-1 max-w-md">{log.message}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Users className="size-3.5 text-muted-foreground" />
                        <span className={`text-sm font-mono font-semibold ${
                          log.impact > 20 ? 'text-red-500' :
                          log.impact > 10 ? 'text-orange-500' :
                          log.impact > 0 ? 'text-yellow-500' :
                          'text-green-500'
                        }`}>
                          {log.impact === 0 ? '-' : `${log.impact} مستخدم`}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(log.status)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap max-w-xs">
                        {log.tags.slice(0, 2).map((tag, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs font-mono">
                            {tag}
                          </Badge>
                        ))}
                        {log.tags.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{log.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Side Panel */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-end" onClick={() => setSelectedLog(null)}>
          <div 
            className="w-full max-w-3xl h-full bg-background border-r-2 border-border shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-background/95 backdrop-blur-md border-b border-border p-6 z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-foreground">{t('admin.systemLogs.detailTitle')}</h3>
                <button 
                  onClick={() => setSelectedLog(null)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="size-5 text-muted-foreground" />
                </button>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {(() => {
                  const Icon = getSystemTypeIcon(selectedLog.systemType);
                  return (
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg bg-gradient-to-r ${getSystemTypeColor(selectedLog.systemType)}`}>
                        <Icon className="size-4 text-white" />
                      </div>
                      <span className="text-sm font-medium">{getSystemTypeLabel(selectedLog.systemType)}</span>
                    </div>
                  );
                })()}
                {getSeverityBadge(selectedLog.severity)}
                <span className="text-sm font-mono text-muted-foreground">{selectedLog.caseId}</span>
                <span className="text-sm text-muted-foreground">{selectedLog.time}</span>
                {getStatusBadge(selectedLog.status)}
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Error Code */}
              {selectedLog.errorCode && (
                <div className="glass-card p-4 rounded-xl border-2 border-red-500/20 bg-red-500/5">
                  <div className="flex items-center gap-3">
                    <Code className="size-5 text-red-500" />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t('admin.systemLogs.errorCode')}</p>
                      <p className="text-lg font-mono font-bold text-red-600 dark:text-red-400">{selectedLog.errorCode}</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedLog.source && (
                <div className="glass-card p-4 rounded-xl border border-border">
                  <h4 className="font-medium text-foreground mb-2 text-sm">{t('admin.systemLogs.path')}</h4>
                  <p className="text-xs font-mono text-muted-foreground break-all">
                    {selectedLog.source}
                  </p>
                </div>
              )}

              {/* Full Error Message */}
              <div className="glass-card p-4 rounded-xl border border-border">
                <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                  <FileWarning className="size-4 text-primary" />
                  {t('admin.systemLogs.fullErrorMessage')}
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed bg-muted/30 p-3 rounded-lg font-mono">
                  {selectedLog.fullMessage}
                </p>
              </div>

              {/* Triggered Flow */}
              {selectedLog.triggeredFlow && (
                <div className="glass-card p-4 rounded-xl border border-border">
                  <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                    <Network className="size-4 text-primary" />
                    {t('admin.systemLogs.triggeredFlow')}
                  </h4>
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground font-mono leading-relaxed">
                      {selectedLog.triggeredFlow}
                    </p>
                  </div>
                </div>
              )}

              {/* Stack Trace */}
              {selectedLog.stackTrace && (
                <div className="glass-card p-4 rounded-xl border border-border">
                  <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                    <Database className="size-4 text-primary" />
                    Stack Trace
                  </h4>
                  <div className="bg-black/80 p-3 rounded-lg overflow-x-auto">
                    <pre className="text-xs text-green-400 font-mono leading-relaxed">
                      {selectedLog.stackTrace}
                    </pre>
                  </div>
                </div>
              )}

              {/* System Decision */}
              {selectedLog.systemDecision && (
                <div className="glass-card p-4 rounded-xl border border-border">
                  <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                    <Server className="size-4 text-primary" />
                    {t('admin.systemLogs.systemDecision')}
                  </h4>
                  <p className="text-sm text-muted-foreground">{selectedLog.systemDecision}</p>
                </div>
              )}

              {/* Impact & Confidence */}
              <div className="grid grid-cols-2 gap-4">
                <div className="glass-card p-4 rounded-xl border border-border">
                  <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                    <Users className="size-4 text-primary" />
                    التأثير
                  </h4>
                  <p className={`text-3xl font-bold ${
                    selectedLog.impact > 20 ? 'text-red-500' :
                    selectedLog.impact > 10 ? 'text-orange-500' :
                    selectedLog.impact > 0 ? 'text-yellow-500' :
                    'text-green-500'
                  }`}>
                    {selectedLog.impact === 0 ? 'لا يوجد' : `${selectedLog.impact} مستخدم`}
                  </p>
                </div>

                {selectedLog.confidence != null && (
                  <div className="glass-card p-4 rounded-xl border border-border">
                    <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                      <TrendingUp className="size-4 text-primary" />
                      {t('admin.systemLogs.confidenceLevel')}
                    </h4>
                    <p className={`text-3xl font-bold ${
                      selectedLog.confidence > 70 ? 'text-green-500' :
                      selectedLog.confidence > 40 ? 'text-yellow-500' :
                      'text-red-500'
                    }`}>
                      {selectedLog.confidence}%
                    </p>
                  </div>
                )}
              </div>

              {/* Tags */}
              <div className="glass-card p-4 rounded-xl border border-border">
                <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                  <AlertTriangle className="size-4 text-primary" />
                  {t('admin.systemLogs.technicalTags')}
                </h4>
                <div className="flex gap-2 flex-wrap">
                  {selectedLog.tags.map((tag, idx) => (
                    <Badge key={idx} variant="outline" className="font-mono">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* AI Suggested Actions */}
              <div className="glass-card p-4 rounded-xl border-2 border-primary/20 bg-primary/5">
                <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                  <Sparkles className="size-4 text-primary" />
                  {t('admin.systemLogs.suggestedActions')}
                </h4>
                <div className="space-y-2">
                  <Button className="w-full justify-start bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white">
                    <GraduationCap className="size-4 ml-2" />
                    {t('admin.systemLogs.addToLearningReview')}
                  </Button>
                  <Button variant="outline" className="w-full justify-start border-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10">
                    <Wrench className="size-4 ml-2" />
                    {t('admin.systemLogs.fixLogic')}
                  </Button>
                  <Button variant="outline" className="w-full justify-start border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/10">
                    <ArrowUpCircle className="size-4 ml-2" />
                    {t('admin.systemLogs.escalateTech')}
                  </Button>
                  <Button variant="ghost" className="w-full justify-start">
                    <EyeOff className="size-4 ml-2" />
                    {t('admin.systemLogs.ignore')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}