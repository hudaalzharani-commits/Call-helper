import type {
  OperationalKnowledgeRow,
  OperationalSearchHistoryEntry,
  OperationalSourceId,
  OperationalSourceMeta,
} from '../types/operationalKnowledge';
import { isReadableOperationalText, sanitizeOperationalRow } from '../utils/operationalTextUtils';

const DATA_PREFIX = 'rafiq_op_kb_rows_';
const META_PREFIX = 'rafiq_op_kb_meta_';
const HISTORY_KEY = 'rafiq_op_kb_search_history';
const MAX_HISTORY = 40;

function dataKey(sourceId: OperationalSourceId) {
  return `${DATA_PREFIX}${sourceId}`;
}

function metaKey(sourceId: OperationalSourceId) {
  return `${META_PREFIX}${sourceId}`;
}

export function loadOperationalRows(sourceId: OperationalSourceId): OperationalKnowledgeRow[] {
  try {
    const raw = localStorage.getItem(dataKey(sourceId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OperationalKnowledgeRow[];
    return Array.isArray(parsed) ? parsed.map((row) => sanitizeOperationalRow(row)) : [];
  } catch {
    return [];
  }
}

export function saveOperationalRows(
  sourceId: OperationalSourceId,
  rows: OperationalKnowledgeRow[],
  meta: Omit<OperationalSourceMeta, 'sourceId' | 'rowCount'>,
): void {
  localStorage.setItem(dataKey(sourceId), JSON.stringify(rows));
  localStorage.setItem(
    metaKey(sourceId),
    JSON.stringify({
      sourceId,
      ...meta,
      rowCount: rows.length,
    } satisfies OperationalSourceMeta),
  );
}

export function loadOperationalMeta(sourceId: OperationalSourceId): OperationalSourceMeta | null {
  try {
    const raw = localStorage.getItem(metaKey(sourceId));
    if (!raw) return null;
    return JSON.parse(raw) as OperationalSourceMeta;
  } catch {
    return null;
  }
}

export function clearOperationalSource(sourceId: OperationalSourceId): void {
  localStorage.removeItem(dataKey(sourceId));
  localStorage.removeItem(metaKey(sourceId));
}

/** دمج كل المصادر في قاعدة معرفة واحدة */
export function loadMergedOperationalKnowledge(
  sourceIds: OperationalSourceId[],
): OperationalKnowledgeRow[] {
  return sourceIds.flatMap((id) => loadOperationalRows(id));
}

export function loadAllOperationalMeta(): Record<OperationalSourceId, OperationalSourceMeta | null> {
  return {
    hajj: loadOperationalMeta('hajj'),
    umrah: loadOperationalMeta('umrah'),
    operations: loadOperationalMeta('operations'),
  };
}

export function loadOperationalSearchHistory(): OperationalSearchHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OperationalSearchHistoryEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((entry) => ({
      ...entry,
      query: isReadableOperationalText(entry.query) ? entry.query : '',
      topService:
        entry.topService && isReadableOperationalText(entry.topService) ? entry.topService : null,
    }));
  } catch {
    return [];
  }
}

export function appendOperationalSearchHistory(
  entry: Omit<OperationalSearchHistoryEntry, 'id' | 'createdAt'>,
): OperationalSearchHistoryEntry {
  const full: OperationalSearchHistoryEntry = {
    ...entry,
    id: `op-search-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  const next = [full, ...loadOperationalSearchHistory()].slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  return full;
}

export function removeOperationalSearchHistoryEntry(id: string): void {
  const next = loadOperationalSearchHistory().filter((e) => e.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}

export function clearOperationalSearchHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
}
