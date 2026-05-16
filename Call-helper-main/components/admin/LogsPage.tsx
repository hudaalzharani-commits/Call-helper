import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Filter,
  Download,
  Search,
  AlertCircle,
  CheckCircle,
  Info,
  XCircle,
  Loader2,
  RefreshCw,
  Phone,
} from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  fetchAllCallLogs,
  displayCallLogUser,
  type BackendCallLog,
} from "../../services/callLogsService";
import { useLanguage } from "../../contexts/LanguageContext";

const PAGE_SIZE = 20;

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return iso;
  }
}

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function inDateRange(createdAt: string, range: string): boolean {
  const t = new Date(createdAt).getTime();
  if (Number.isNaN(t)) return true;
  const now = Date.now();
  if (range === "all") return true;
  if (range === "today") {
    const start = startOfLocalDay(new Date()).getTime();
    return t >= start && t <= now;
  }
  if (range === "week") return t >= now - 7 * 24 * 60 * 60 * 1000;
  if (range === "month") return t >= now - 30 * 24 * 60 * 60 * 1000;
  return true;
}

export function LogsPage() {
  const { t, dir } = useLanguage();
  const [logs, setLogs] = useState<BackendCallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("all");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchAllCallLogs();
      setLogs(rows);
      setPage(1);
    } catch (e) {
      setLogs([]);
      setError(e instanceof Error ? e.message : t('admin.logs.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const total = logs.length;
    const pending = logs.filter((l) => l.status === "pending").length;
    const resolved = logs.filter((l) => l.status === "resolved").length;
    const escalated = logs.filter((l) => l.status === "escalated").length;
    return { total, pending, resolved, escalated };
  }, [logs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((log) => {
      if (statusFilter !== "all" && log.status !== statusFilter) return false;
      if (!inDateRange(log.createdAt, dateRange)) return false;
      if (!q) return true;
      const hay = [
        log.customerName,
        log.entityType,
        log.problemType,
        log.problemSummary,
        log.matchedCaseCode,
        log.category,
        displayCallLogUser(log.user),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [logs, search, statusFilter, dateRange]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageSlice = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePage]);

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `call-logs-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6" dir={dir}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
            <Phone className="size-7 text-primary" />
            {t('admin.logs.title')}
          </h2>
          <p className="text-muted-foreground">
            {t('admin.logs.subtitle')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => void load()}
            disabled={loading}
            className="border-2"
          >
            {loading ? (
              <Loader2 className="size-4 ml-2 animate-spin" />
            ) : (
              <RefreshCw className="size-4 ml-2" />
            )}
            {t('admin.logs.refresh')}
          </Button>
          <Button
            type="button"
            className="bg-primary text-primary-foreground hover:bg-primary-hover text-primary-foreground"
            onClick={exportJson}
            disabled={loading || filtered.length === 0}
          >
            <Download className="size-4 ml-2" />
            {t('admin.logs.exportJson')}
          </Button>
        </div>
      </div>

      {error && (
        <Card className="glass-panel border-2 border-destructive/40 bg-destructive/5 p-4">
          <p className="text-sm text-destructive flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </p>
        </Card>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-panel border-2 border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-950 rounded-lg">
              <Info className="size-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-xs text-muted-foreground">{t('admin.logs.totalRecords')}</p>
            </div>
          </div>
        </Card>
        <Card className="glass-panel border-2 border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-950 rounded-lg">
              <CheckCircle className="size-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.resolved}</p>
              <p className="text-xs text-muted-foreground">{t('admin.logs.resolved')}</p>
            </div>
          </div>
        </Card>
        <Card className="glass-panel border-2 border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-950 rounded-lg">
              <AlertCircle className="size-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">{t('admin.logs.pending')}</p>
            </div>
          </div>
        </Card>
        <Card className="glass-panel border-2 border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-950 rounded-lg">
              <XCircle className="size-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.escalated}</p>
              <p className="text-xs text-muted-foreground">{t('admin.logs.escalated')}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="glass-panel border-2 border-border p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder={t('admin.logs.searchPlaceholder')}
                className="glass-card border-2 border-border pr-10"
              />
            </div>
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="glass-card border-2 border-border w-full sm:w-[200px]">
              <Filter className="size-4 ml-2" />
              <SelectValue placeholder={t('admin.logs.filterStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('admin.logs.allStatuses')}</SelectItem>
              <SelectItem value="pending">{t('admin.logs.pending')}</SelectItem>
              <SelectItem value="resolved">{t('admin.logs.resolved')}</SelectItem>
              <SelectItem value="escalated">{t('admin.logs.escalated')}</SelectItem>
              <SelectItem value="closed">{t('admin.logs.statusClosed')}</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={dateRange}
            onValueChange={(v) => {
              setDateRange(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="glass-card border-2 border-border w-full sm:w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('admin.logs.allPeriods')}</SelectItem>
              <SelectItem value="today">{t('admin.logs.today')}</SelectItem>
              <SelectItem value="week">{t('admin.logs.last7Days')}</SelectItem>
              <SelectItem value="month">{t('admin.logs.last30Days')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Logs Table */}
      <Card className="glass-panel border-2 border-border p-6">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 className="size-8 animate-spin" />
            <span>{t('admin.logs.loading')}</span>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border hover:bg-transparent">
                    <TableHead className="text-right text-foreground whitespace-nowrap">
                      {t('admin.logs.colTime')}
                    </TableHead>
                    <TableHead className="text-right text-foreground whitespace-nowrap">
                      {t('admin.logs.colUser')}
                    </TableHead>
                    <TableHead className="text-right text-foreground whitespace-nowrap">
                      {t('admin.logs.colCustomer')}
                    </TableHead>
                    <TableHead className="text-right text-foreground whitespace-nowrap">
                      {t('admin.logs.colEntity')}
                    </TableHead>
                    <TableHead className="text-right text-foreground whitespace-nowrap">
                      {t('admin.logs.colProblemType')}
                    </TableHead>
                    <TableHead className="text-right text-foreground min-w-[200px]">
                      {t('admin.logs.colSummary')}
                    </TableHead>
                    <TableHead className="text-right text-foreground whitespace-nowrap">
                      {t('admin.logs.colMatch')}
                    </TableHead>
                    <TableHead className="text-right text-foreground whitespace-nowrap">
                      {t('admin.logs.colDuration')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageSlice.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center text-muted-foreground py-12"
                      >
                        {t('admin.logs.empty')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    pageSlice.map((log) => (
                      <TableRow
                        key={log._id}
                        className="border-b border-border hover:bg-accent/50"
                      >
                        <TableCell className="text-muted-foreground font-mono text-xs whitespace-nowrap">
                          {formatDateTime(log.createdAt)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                          {displayCallLogUser(log.user)}
                        </TableCell>
                        <TableCell className="text-foreground text-sm max-w-[120px] truncate">
                          {log.customerName}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm max-w-[100px] truncate">
                          {log.entityType}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm max-w-[120px] truncate">
                          {log.problemType}
                        </TableCell>
                        <TableCell className="text-foreground text-sm max-w-md">
                          <span className="line-clamp-2">{log.problemSummary}</span>
                        </TableCell>
                        <TableCell className="text-muted-foreground font-mono text-xs whitespace-nowrap">
                          {log.matchedCaseCode || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground font-mono text-xs whitespace-nowrap">
                          {log.duration != null ? String(log.duration) : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between mt-6 pt-6 border-t border-border flex-wrap gap-3">
              <p className="text-sm text-muted-foreground">
                {t('admin.logs.showing', {
                  from: (safePage - 1) * PAGE_SIZE + 1,
                  to: Math.min(safePage * PAGE_SIZE, filtered.length),
                  total: filtered.length,
                })}
                {filtered.length !== logs.length
                  ? t('admin.logs.showingOf', { total: logs.length })
                  : ''}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  {t('admin.logs.prev')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  {t('admin.logs.next')}
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
