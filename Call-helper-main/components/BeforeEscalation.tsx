import { useCallback, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  ArrowUpCircle,
  FileSpreadsheet,
  Search,
  Upload,
  Trash2,
  History,
  Sparkles,
  Route,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { formatAppDateTime } from '../utils/dateDisplay';
import { parseOperationalExcelRows } from '../utils/operationalKnowledgeParser';
import { runOperationalSearch } from '../utils/operationalSearchEngine';
import { rowHasReadableResult } from '../utils/operationalTextUtils';
import type {
  OperationalKnowledgeRow,
  OperationalSearchOutcome,
  OperationalSourceId,
  OperationalSourceMeta,
} from '../types/operationalKnowledge';
import {
  appendOperationalSearchHistory,
  clearOperationalSource,
  loadAllOperationalMeta,
  loadOperationalRows,
  loadOperationalSearchHistory,
  removeOperationalSearchHistoryEntry,
  clearOperationalSearchHistory,
  saveOperationalRows,
  type OperationalSearchHistoryEntry,
} from '../services/operationalKnowledgeStorage';
import { cn } from './ui/utils';
import { isModeratorOrAdmin } from '../utils/appRoles';

/** الحج والعمرة فقط — ملف Excel واحد لكل نوع */
const PILGRIMAGE_SCOPES = ['hajj', 'umrah'] as const;
type PilgrimageScope = (typeof PILGRIMAGE_SCOPES)[number];

const SCOPE_ICONS: Record<PilgrimageScope, typeof Route> = {
  hajj: Route,
  umrah: Sparkles,
};

function ServiceFieldsBlock({ row }: { row: OperationalKnowledgeRow }) {
  const { t } = useLanguage();
  const fields = [
    { label: t('beforeEscalation.fieldActualService'), value: row.actualService },
    { label: t('beforeEscalation.fieldServiceDefinition'), value: row.serviceDefinition },
    { label: t('beforeEscalation.fieldOffering'), value: row.offeringType },
  ];

  return (
    <dl className="space-y-4">
      {fields.map(({ label, value }) => (
        <div key={label}>
          <dt className="text-xs font-semibold text-muted-foreground mb-1">{label}</dt>
          <dd className="text-base text-foreground leading-relaxed">{value || '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

function initialScope(): PilgrimageScope {
  if (loadOperationalRows('hajj').length > 0) return 'hajj';
  if (loadOperationalRows('umrah').length > 0) return 'umrah';
  return 'hajj';
}

export function BeforeEscalation() {
  const { user } = useAuth();
  const { t, isRtl } = useLanguage();
  const canUploadFile = isModeratorOrAdmin(user?.role);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [scope, setScope] = useState<PilgrimageScope>(initialScope);
  const [meta, setMeta] = useState<Record<OperationalSourceId, OperationalSourceMeta | null>>(() =>
    loadAllOperationalMeta(),
  );
  const [rowCounts, setRowCounts] = useState(() => ({
    hajj: loadOperationalRows('hajj').length,
    umrah: loadOperationalRows('umrah').length,
  }));
  const [history, setHistory] = useState<OperationalSearchHistoryEntry[]>(() =>
    loadOperationalSearchHistory(),
  );

  const [query, setQuery] = useState('');
  const [outcome, setOutcome] = useState<OperationalSearchOutcome | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const scopeRows = useMemo(() => loadOperationalRows(scope), [scope, rowCounts, meta]);
  const scopeCount = rowCounts[scope];
  const scopeMeta = meta[scope];
  const ScopeIcon = SCOPE_ICONS[scope];

  const refreshCounts = useCallback(() => {
    setRowCounts({
      hajj: loadOperationalRows('hajj').length,
      umrah: loadOperationalRows('umrah').length,
    });
    setMeta(loadAllOperationalMeta());
  }, []);

  const handleScopeChange = (next: PilgrimageScope) => {
    setScope(next);
    setOutcome(null);
  };

  const handleUpload = async (file: File) => {
    if (!canUploadFile) {
      toast.error(t('beforeEscalation.uploadRestricted'));
      return;
    }
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error(t('beforeEscalation.invalidFile'));
      return;
    }

    setIsUploading(true);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const sheetName = wb.SheetNames[0];
      if (!sheetName) throw new Error('EMPTY');
      const sheet = wb.Sheets[sheetName];
      const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        defval: '',
        raw: false,
      });
      const parsed = parseOperationalExcelRows(raw as unknown[][], scope);

      if (parsed.length === 0) {
        toast.error(t('beforeEscalation.emptyFile'));
        return;
      }

      saveOperationalRows(scope, parsed, {
        fileName: file.name,
        uploadedAt: new Date().toISOString(),
        uploadedBy: user?.name,
      });

      refreshCounts();
      toast.success(t('beforeEscalation.uploadSuccess', { count: parsed.length }));
    } catch (e) {
      if (e instanceof Error && e.message === 'ENCRYPTED_EXCEL_FILE') {
        toast.error(t('beforeEscalation.encryptedExcelFile'), { duration: 14000 });
      } else if (
        e instanceof Error &&
        (e.message.startsWith('MISSING_REQUIRED_COLUMNS') || e.message.startsWith('MISSING_ANCHOR_COLUMNS'))
      ) {
        const parts = e.message.split('|');
        const detected = parts.length > 2 ? parts[2] : parts[1] || '';
        toast.error(t('beforeEscalation.missingRequiredColumns'), {
          description: detected
            ? t('beforeEscalation.missingAnchorColumnsDetected', { headers: detected })
            : t('beforeEscalation.requiredColumnsHint'),
          duration: 12000,
        });
      } else {
        toast.error(t('beforeEscalation.uploadFailed'));
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClearFile = () => {
    if (!canUploadFile) return;
    clearOperationalSource(scope);
    refreshCounts();
    setOutcome(null);
    toast.success(t('beforeEscalation.fileRemoved'));
  };

  const runAnalysis = useCallback(async () => {
    const q = query.trim();
    if (q.length < 2) {
      toast.error(t('beforeEscalation.enterQuery'));
      return;
    }
    if (scopeRows.length === 0) {
      toast.error(t('beforeEscalation.noKnowledgeBaseScope', { scope: t(`beforeEscalation.source.${scope}`) }));
      return;
    }

    setIsAnalyzing(true);
    setOutcome(null);

    const result = runOperationalSearch(q, scopeRows, [scope]);
    setOutcome(result);

    if (!result.topMatch) {
      toast.message(t('beforeEscalation.noMatches'));
    } else if (!rowHasReadableResult(result.topMatch.row)) {
      toast.error(t('beforeEscalation.corruptDataHint'));
    }

    if (user) {
      appendOperationalSearchHistory({
        userId: user.id,
        userName: user.name,
        query: q,
        confidence: 0,
        isGrayArea: false,
        topService: result.topMatch?.row.actualService || null,
        routingDecision: null,
        sourceIds: [scope],
      });
      setHistory(loadOperationalSearchHistory());
    }

    setIsAnalyzing(false);
  }, [query, scopeRows, scope, user, t]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isAnalyzing && scopeCount > 0) void runAnalysis();
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header — سويتش حج/عمرة أعلى اليسار */}
      <div className="relative space-y-4">
        <div className="absolute left-0 top-0 z-10">
          <div
            className="inline-flex rounded-lg border border-border p-0.5 bg-muted/50 shadow-sm"
            role="tablist"
            aria-label={t('beforeEscalation.scopeLabel')}
          >
            {PILGRIMAGE_SCOPES.map((s) => (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={scope === s}
                className={cn(
                  'px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all leading-tight',
                  scope === s
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/80',
                )}
                onClick={() => handleScopeChange(s)}
              >
                {t(`beforeEscalation.source.${s}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="text-center space-y-4 pt-9 sm:pt-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center justify-center gap-3">
            <ArrowUpCircle className="size-8" style={{ color: 'var(--primary)' }} />
            {t('beforeEscalation.title')}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
            {t('beforeEscalation.pageDesc')}
          </p>
        </div>
      </div>

      {/* رفع Excel — للمشرف ومسؤول النظام فقط */}
      {canUploadFile && (
        <Card className="glass-panel border-border max-w-xl mx-auto">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 justify-center">
              <ScopeIcon className="size-4" style={{ color: 'var(--primary)' }} />
              {t('beforeEscalation.uploadForScope', { scope: t(`beforeEscalation.source.${scope}`) })}
            </CardTitle>
            {scopeCount > 0 && (
              <CardDescription className="text-center text-xs">
                {t('beforeEscalation.rowsIndexed', { count: scopeCount })}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {scopeMeta && (
              <div className="text-xs text-muted-foreground truncate text-center" title={scopeMeta.fileName}>
                <FileSpreadsheet className="size-3 inline mr-1" />
                {scopeMeta.fileName}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleUpload(f);
              }}
            />
            <div className="flex flex-wrap gap-2 justify-center">
              <Button
                type="button"
                variant="outline"
                className="min-w-[160px] gap-2"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {isUploading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                {t('beforeEscalation.upload')}
              </Button>
              {scopeMeta && (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive hover:text-destructive gap-2"
                  onClick={handleClearFile}
                >
                  <Trash2 className="size-4" />
                  {t('beforeEscalation.removeFile')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <Card className="glass-panel border-border overflow-hidden">
        <CardHeader className="pb-2 pt-6">
          <CardTitle className="text-lg text-center">{t('beforeEscalation.searchCardTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="pt-2 pb-8 px-4 sm:px-8">
          <div className="max-w-3xl mx-auto space-y-4">
            <label htmlFor="op-search" className="sr-only">
              {t('beforeEscalation.searchPlaceholder')}
            </label>
            <Textarea
              id="op-search"
              rows={3}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder={t('beforeEscalation.searchPlaceholder')}
              className="text-base sm:text-lg min-h-[88px] resize-none text-center border-2 focus-visible:ring-2 rounded-2xl"
              style={{ borderColor: 'var(--border-accent)' }}
            />
            <div className="flex flex-col items-center gap-2">
              <Button
                type="button"
                size="lg"
                className="min-w-[200px] rounded-full gap-2"
                disabled={isAnalyzing || scopeCount === 0}
                onClick={() => void runAnalysis()}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {t('beforeEscalation.analyzing')}
                  </>
                ) : (
                  <>
                    <Search className="size-4" />
                    {t('beforeEscalation.searchBtn')}
                  </>
                )}
              </Button>
              {scopeCount === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 text-center max-w-md">
                  {t('beforeEscalation.noKnowledgeBaseScope', { scope: t(`beforeEscalation.source.${scope}`) })}
                </p>
              )}
            </div>
            <p className="text-center text-[11px] text-muted-foreground">
              {t('beforeEscalation.searchHint')}
            </p>
          </div>
        </CardContent>
      </Card>

      {outcome && (
        <Card className="glass-panel border-border max-w-2xl mx-auto">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-center">{t('beforeEscalation.resultTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            {outcome.topMatch && rowHasReadableResult(outcome.topMatch.row) ? (
              <ServiceFieldsBlock row={outcome.topMatch.row} />
            ) : outcome.topMatch ? (
              <p className="text-sm text-muted-foreground text-center py-4">{t('beforeEscalation.corruptDataHint')}</p>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">{t('beforeEscalation.noMatches')}</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="glass-panel border-border">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="size-5 text-muted-foreground" />
                {t('beforeEscalation.recentUsage')}
              </CardTitle>
              <CardDescription>{t('beforeEscalation.recentUsageDesc')}</CardDescription>
            </div>
            {history.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 text-destructive hover:text-destructive"
                onClick={() => {
                  clearOperationalSearchHistory();
                  setHistory([]);
                  toast.success(t('beforeEscalation.historyCleared'));
                }}
              >
                <Trash2 className="size-3.5" />
                {t('beforeEscalation.clearAllHistory')}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">{t('beforeEscalation.noUsageYet')}</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={isRtl ? 'text-right' : 'text-left'}>{t('beforeEscalation.colUser')}</TableHead>
                    <TableHead className={isRtl ? 'text-right' : 'text-left'}>{t('beforeEscalation.colQuery')}</TableHead>
                    <TableHead className={isRtl ? 'text-right' : 'text-left'}>{t('beforeEscalation.fieldActualService')}</TableHead>
                    <TableHead className={isRtl ? 'text-right' : 'text-left'}>{t('beforeEscalation.colWhen')}</TableHead>
                    <TableHead className={`w-12 ${isRtl ? 'text-left' : 'text-right'}`}>
                      <span className="sr-only">{t('beforeEscalation.colActions')}</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.slice(0, 4).map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium whitespace-nowrap">{entry.userName}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={entry.query}>
                        {entry.query}
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate" title={entry.topService ?? ''}>
                        {entry.topService || '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                        {formatAppDateTime(entry.createdAt)}
                      </TableCell>
                      <TableCell className={isRtl ? 'text-left' : 'text-right'}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="size-8 p-0 text-muted-foreground hover:text-destructive"
                          aria-label={t('beforeEscalation.deleteHistory')}
                          onClick={() => {
                            removeOperationalSearchHistoryEntry(entry.id);
                            setHistory(loadOperationalSearchHistory());
                            toast.success(t('beforeEscalation.historyDeleted'));
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
