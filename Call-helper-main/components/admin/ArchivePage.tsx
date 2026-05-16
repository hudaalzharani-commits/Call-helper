import { useEffect, useState } from 'react';
import { Archive, RotateCcw, Trash2 } from 'lucide-react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { formatAppDateTime } from '../../utils/dateDisplay';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
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

export function ArchivePage() {
  const { t } = useLanguage();
  const { isAdmin } = useAuth();
  const [archivedCases, setArchivedCases] = useState<ArchivedCase[]>([]);
  const [loadingArchivedCases, setLoadingArchivedCases] = useState(true);
  const [busyCaseId, setBusyCaseId] = useState<string | null>(null);

  const fetchArchivedCases = async () => {
    try {
      setLoadingArchivedCases(true);
      const token = localStorage.getItem('token');

      const response = await fetch('/api/cases?archived=true&includeInactive=true', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch archived cases');
      }

      const data = await response.json();
      setArchivedCases(data.data || []);
    } catch (error) {
      console.error('Error fetching archived cases:', error);
      toast.error(t('admin.archive.loadFailed'));
    } finally {
      setLoadingArchivedCases(false);
    }
  };

  useEffect(() => {
    fetchArchivedCases();
  }, []);

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
        throw new Error(typeof body.message === 'string' ? body.message : t('admin.archive.restoreFailed'));
      }
      toast.success(t('admin.archive.restoreSuccess'));
      await fetchArchivedCases();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('admin.archive.restoreFailed'));
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
        throw new Error(typeof body.message === 'string' ? body.message : t('admin.archive.deleteFailed'));
      }
      toast.success(t('admin.archive.deleteSuccess'));
      await fetchArchivedCases();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('admin.archive.deleteFailed'));
    } finally {
      setBusyCaseId(null);
    }
  };

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

      {/* Archived Cases */}
      <Card className="glass-panel border-2 border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-foreground">{t('admin.archive.cardTitle')}</h3>
          <Badge className="bg-primary/10 text-primary border-0">
            {t('admin.archive.caseCount', { count: archivedCases.length })}
          </Badge>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableHead className="text-right text-foreground">CaseID</TableHead>
                <TableHead className="text-right text-foreground">Service Type</TableHead>
                <TableHead className="text-right text-foreground">UserType</TableHead>
                <TableHead className="text-right text-foreground">Category</TableHead>
                <TableHead className="text-right text-foreground">SubCategory</TableHead>
                <TableHead className="text-right text-foreground">{t('admin.archive.colArchivedAt')}</TableHead>
                <TableHead className="text-right text-foreground w-[1%] whitespace-nowrap">{t('admin.archive.colActions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingArchivedCases ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                    {t('admin.archive.loading')}
                  </TableCell>
                </TableRow>
              ) : archivedCases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                    لا توجد حالات مؤرشفة حالياً
                  </TableCell>
                </TableRow>
              ) : (
                archivedCases.map((item) => (
                  <TableRow key={item._id} className="border-b border-border hover:bg-accent/50">
                    <TableCell className="font-medium text-foreground">{item.caseId}</TableCell>
                    <TableCell className="text-foreground">{item.userType}</TableCell>
                    <TableCell className="text-foreground">{item.accountStatus}</TableCell>
                    <TableCell className="text-foreground">{item.category}</TableCell>
                    <TableCell className="text-foreground">{item.subCategory}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(item.archivedAt)}</TableCell>
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
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
