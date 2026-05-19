import { useCallback, useEffect, useMemo, useState } from 'react';
import { Archive, RotateCcw, Trash2 } from 'lucide-react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { formatAppDateTime } from '../../utils/dateDisplay';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  fetchArchivedOperationalIssues,
  type OperationalIssue,
} from '../../services/operationalIssueService';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';

interface ArchivedCase {
  _id: string;
  caseId: string;
  userType: string;
  accountStatus: string;
  category: string;
  subCategory: string;
  archivedAt?: string | null;
}

type ArchiveRow =
  | { kind: 'case'; data: ArchivedCase }
  | { kind: 'operational'; data: OperationalIssue };

function archiveTimestamp(row: ArchiveRow): number {
  const raw =
    row.kind === 'case' ? row.data.archivedAt : row.data.resolvedAt;
  if (!raw) return 0;
  const ms = new Date(raw).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function truncateText(value: string, max = 80): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
}

export function ArchivePage() {
  const { t } = useLanguage();
  const { isAdmin } = useAuth();
  const [archiveRows, setArchiveRows] = useState<ArchiveRow[]>([]);
  const [loadingArchived, setLoadingArchived] = useState(true);
  const [busyCaseId, setBusyCaseId] = useState<string | null>(null);

  const fetchArchivedItems = useCallback(async () => {
    try {
      setLoadingArchived(true);
      const token = localStorage.getItem('token');
      const headers: HeadersInit = token
        ? { Authorization: `Bearer ${token}` }
        : {};

      const [casesRes, operational] = await Promise.all([
        fetch('/api/cases?archived=true&includeInactive=true', { headers }),
        fetchArchivedOperationalIssues(500).catch(() => ({
          issues: [] as OperationalIssue[],
          thresholds: {
            ROLLING_24H_THRESHOLD: 5,
            ROLLING_7D_THRESHOLD: 10,
          },
        })),
      ]);

      if (!casesRes.ok) {
        throw new Error('Failed to fetch archived cases');
      }

      const casesBody = await casesRes.json();
      const cases: ArchivedCase[] = Array.isArray(casesBody.data)
        ? casesBody.data
        : [];

      const rows: ArchiveRow[] = [
        ...cases.map((data) => ({ kind: 'case' as const, data })),
        ...operational.issues.map((data) => ({
          kind: 'operational' as const,
          data,
        })),
      ].sort((a, b) => archiveTimestamp(b) - archiveTimestamp(a));

      setArchiveRows(rows);
    } catch (error) {
      console.error('Error fetching archived items:', error);
      toast.error(t('admin.archive.loadFailed'));
    } finally {
      setLoadingArchived(false);
    }
  }, [t]);

  useEffect(() => {
    void fetchArchivedItems();
  }, [fetchArchivedItems]);

  const totalCount = archiveRows.length;

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '—';
    return formatAppDateTime(dateString);
  };

  const authHeaders = (): HeadersInit => {
    const token = localStorage.getItem('token');
    return {
      Authorization: `Bearer ${token}`,
    };
  };

  const handleRestore = async (id: string) => {
    setBusyCaseId(id);
    try {
      const res = await fetch(`/api/cases/${id}/unarchive`, {
        method: 'PATCH',
        headers: authHeaders(),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof body.message === 'string'
            ? body.message
            : t('admin.archive.restoreFailed'),
        );
      }
      toast.success(t('admin.archive.restoreSuccess'));
      await fetchArchivedItems();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : t('admin.archive.restoreFailed'),
      );
    } finally {
      setBusyCaseId(null);
    }
  };

  const handleDelete = async (id: string, caseId: string) => {
    if (!window.confirm(t('admin.archive.deleteConfirm', { caseId }))) {
      return;
    }
    setBusyCaseId(id);
    try {
      const res = await fetch(`/api/cases/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof body.message === 'string'
            ? body.message
            : t('admin.archive.deleteFailed'),
        );
      }
      toast.success(t('admin.archive.deleteSuccess'));
      await fetchArchivedItems();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : t('admin.archive.deleteFailed'),
      );
    } finally {
      setBusyCaseId(null);
    }
  };

  const colSpan = 8;

  const sourceLabels = useMemo(
    () => ({
      case: t('admin.archive.sourceCase'),
      operational: t('admin.archive.sourceOperational'),
    }),
    [t],
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
          <div className="p-2 bg-primary rounded-xl">
            <Archive className="size-6 text-white" />
          </div>
          {t('admin.archive.title')}
        </h2>
        <p className="text-muted-foreground">{t('admin.archive.subtitle')}</p>
      </div>

      <Card className="glass-panel border-2 border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-foreground">
            {t('admin.archive.cardTitle')}
          </h3>
          <Badge className="bg-primary/10 text-primary border-0">
            {t('admin.archive.caseCount', { count: totalCount })}
          </Badge>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableHead className="text-right text-foreground">
                  {t('admin.archive.colSource')}
                </TableHead>
                <TableHead className="text-right text-foreground">CaseID</TableHead>
                <TableHead className="text-right text-foreground">
                  Service Type
                </TableHead>
                <TableHead className="text-right text-foreground">UserType</TableHead>
                <TableHead className="text-right text-foreground">Category</TableHead>
                <TableHead className="text-right text-foreground">SubCategory</TableHead>
                <TableHead className="text-right text-foreground">
                  {t('admin.archive.colArchivedAt')}
                </TableHead>
                <TableHead className="text-right text-foreground w-[1%] whitespace-nowrap">
                  {t('admin.archive.colActions')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingArchived ? (
                <TableRow>
                  <TableCell
                    colSpan={colSpan}
                    className="text-center py-6 text-muted-foreground"
                  >
                    {t('admin.archive.loading')}
                  </TableCell>
                </TableRow>
              ) : archiveRows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={colSpan}
                    className="text-center py-6 text-muted-foreground"
                  >
                    {t('admin.archive.empty')}
                  </TableCell>
                </TableRow>
              ) : (
                archiveRows.map((row) => {
                  if (row.kind === 'case') {
                    const item = row.data;
                    return (
                      <TableRow
                        key={`case-${item._id}`}
                        className="border-b border-border hover:bg-accent/50"
                      >
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="text-[10px] border-primary/30 text-primary"
                          >
                            {sourceLabels.case}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {item.caseId}
                        </TableCell>
                        <TableCell className="text-foreground">{item.userType}</TableCell>
                        <TableCell className="text-foreground">
                          {item.accountStatus}
                        </TableCell>
                        <TableCell className="text-foreground">{item.category}</TableCell>
                        <TableCell className="text-foreground">
                          {item.subCategory}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(item.archivedAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-1"
                              disabled={busyCaseId === item._id}
                              title={t('admin.archive.restoreTitle')}
                              onClick={() => handleRestore(item._id)}
                            >
                              <RotateCcw className="size-3.5 shrink-0" />
                              {t('admin.archive.restore')}
                            </Button>
                            {isAdmin ? (
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="gap-1"
                                disabled={busyCaseId === item._id}
                                title={t('admin.archive.deleteTitle')}
                                onClick={() => handleDelete(item._id, item.caseId)}
                              >
                                <Trash2 className="size-3.5 shrink-0" />
                                {t('admin.archive.delete')}
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  }

                  const issue = row.data;
                  return (
                    <TableRow
                      key={`op-${issue._id}`}
                      className="border-b border-border hover:bg-accent/50"
                    >
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="text-[10px] border-emerald-500/35 text-emerald-800 dark:text-emerald-200"
                        >
                          {sourceLabels.operational}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-foreground font-mono text-xs">
                        {issue.issueKey}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {issue.entityType || '—'}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {issue.occurrenceCount} حالة
                      </TableCell>
                      <TableCell className="text-foreground">{issue.category}</TableCell>
                      <TableCell
                        className="text-foreground max-w-[200px] truncate"
                        title={issue.sampleProblemSummary || undefined}
                      >
                        {issue.sampleProblemSummary
                          ? truncateText(issue.sampleProblemSummary)
                          : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(issue.resolvedAt)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-xs">
                        —
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
