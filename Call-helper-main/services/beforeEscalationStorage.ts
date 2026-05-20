import type { BeforeEscalationRow, PilgrimageScope } from '../utils/beforeEscalationClassifier';

const DATA_PREFIX = 'rafiq_before_escalation_data_';
const META_PREFIX = 'rafiq_before_escalation_meta_';
const USAGE_KEY = 'rafiq_before_escalation_usage';
const MAX_USAGE = 30;

export type BeforeEscalationMeta = {
  fileName: string;
  uploadedAt: string;
  rowCount: number;
  uploadedBy?: string;
};

export type BeforeEscalationUsageEntry = {
  id: string;
  userId: string;
  userName: string;
  pilgrimageScope: PilgrimageScope;
  problemContent: string;
  problemType: string;
  topClassification: string | null;
  matchCount: number;
  createdAt: string;
};

function dataKey(scope: PilgrimageScope) {
  return `${DATA_PREFIX}${scope}`;
}

function metaKey(scope: PilgrimageScope) {
  return `${META_PREFIX}${scope}`;
}

export function loadBeforeEscalationRows(scope: PilgrimageScope): BeforeEscalationRow[] {
  try {
    const raw = localStorage.getItem(dataKey(scope));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BeforeEscalationRow[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveBeforeEscalationRows(
  scope: PilgrimageScope,
  rows: BeforeEscalationRow[],
  meta: Omit<BeforeEscalationMeta, 'rowCount'>,
): void {
  localStorage.setItem(dataKey(scope), JSON.stringify(rows));
  localStorage.setItem(
    metaKey(scope),
    JSON.stringify({
      ...meta,
      rowCount: rows.length,
    } satisfies BeforeEscalationMeta),
  );
}

export function loadBeforeEscalationMeta(scope: PilgrimageScope): BeforeEscalationMeta | null {
  try {
    const raw = localStorage.getItem(metaKey(scope));
    if (!raw) return null;
    return JSON.parse(raw) as BeforeEscalationMeta;
  } catch {
    return null;
  }
}

export function clearBeforeEscalationData(scope: PilgrimageScope): void {
  localStorage.removeItem(dataKey(scope));
  localStorage.removeItem(metaKey(scope));
}

export function loadBeforeEscalationUsage(): BeforeEscalationUsageEntry[] {
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BeforeEscalationUsageEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function appendBeforeEscalationUsage(entry: Omit<BeforeEscalationUsageEntry, 'id' | 'createdAt'>): BeforeEscalationUsageEntry {
  const full: BeforeEscalationUsageEntry = {
    ...entry,
    id: `usage-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  const prev = loadBeforeEscalationUsage();
  const next = [full, ...prev].slice(0, MAX_USAGE);
  localStorage.setItem(USAGE_KEY, JSON.stringify(next));
  return full;
}
