import type { OperationalKnowledgeRow, OperationalSourceId } from '../types/operationalKnowledge';
import { sanitizeOperationalRow, sanitizeOperationalText } from './operationalTextUtils';

/** الأعمدة الثابتة الوحيدة — مطابقة وعرض وبحث */
export const REQUIRED_EXCEL_COLUMNS = [
  'actualService',
  'serviceDefinition',
  'offeringType',
] as const;

export type RequiredExcelColumn = (typeof REQUIRED_EXCEL_COLUMNS)[number];

const COLUMN_HEADERS: Record<RequiredExcelColumn, string[]> = {
  actualService: [
    'actualservice',
    'actual service',
    'actual servise',
    'الخدمة الفعلية',
    'الخدمه الفعليه',
  ],
  serviceDefinition: [
    'servicedefinition',
    'service definition',
    'servise definition',
    'تعريف الخدمة',
    'تعريف الخدمه',
  ],
  offeringType: [
    'offering',
    'offeringtype',
    'offering type',
    'offerings',
    'نوع الطلب',
    'العرض',
    'offering type',
  ],
};

const EMPTY_ROW_FIELDS = {
  serviceCategory: '',
  issueType: '',
  issueCategory: '',
  workflowStage: '',
  resolutionPath: '',
  routingDecision: '',
  priorityLevel: '',
  confidenceSignal: '',
  relatedKeywords: [] as string[],
  operationalTags: [] as string[],
  casePattern: '',
  clarificationRequired: '',
  manualReviewFlag: '',
  decisionReason: '',
  linkedScenario: '',
};

/** ملفات مشفّرة (مثل MSMAMARPCRYPT) — لا تُقرأ كـ Excel عادي */
export function isEncryptedOperationalWorkbook(rawRows: unknown[][]): boolean {
  for (let i = 0; i < Math.min(6, rawRows.length); i++) {
    for (const cell of rawRows[i] ?? []) {
      const s = String(cell ?? '');
      if (/MSMAMARPCRYPT|AES\/CBC\/NoPadding/i.test(s)) return true;
    }
  }
  return false;
}

function normalizeHeader(h: string): string {
  return h
    .trim()
    .replace(/^\uFEFF/, '')
    .replace(/[\u200e\u200f\u202a-\u202e]/g, '')
    .replace(/[_\-./]+/g, ' ')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim();
}

function scoreHeaderMatch(header: string, candidate: string): number {
  const h = normalizeHeader(header);
  const c = normalizeHeader(candidate);
  if (!h || !c) return 0;
  if (h === c) return 100;
  if (h.startsWith(c) && (h.length === c.length || h[c.length] === ' ')) return 92;
  if (h.includes(c) && c.length >= 8) return 78;
  if (c.includes(h) && h.length >= 8 && c.length >= h.length + 2) return 65;
  return 0;
}

function mapRequiredColumns(headerRow: string[]): Record<RequiredExcelColumn, number> {
  const normalized = headerRow.map(normalizeHeader);
  const result: Record<RequiredExcelColumn, number> = {
    actualService: -1,
    serviceDefinition: -1,
    offeringType: -1,
  };
  const used = new Set<number>();

  const ranked: { key: RequiredExcelColumn; idx: number; score: number }[] = [];
  for (const key of REQUIRED_EXCEL_COLUMNS) {
    for (const candidate of COLUMN_HEADERS[key]) {
      normalized.forEach((h, idx) => {
        const score = scoreHeaderMatch(h, candidate);
        if (score >= 65) ranked.push({ key, idx, score });
      });
    }
  }

  ranked.sort((a, b) => b.score - a.score);
  for (const { key, idx } of ranked) {
    if (result[key] >= 0 || used.has(idx)) continue;
    result[key] = idx;
    used.add(idx);
  }

  return result;
}

function detectHeaderRowIndex(rawRows: unknown[][]): number {
  let bestIdx = 0;
  let bestScore = -1;

  for (let i = 0; i < Math.min(8, rawRows.length); i++) {
    const row = (rawRows[i] ?? []).map((c) => String(c ?? '').trim());
    const mapped = Object.values(mapRequiredColumns(row)).filter((idx) => idx >= 0).length;
    if (mapped === 0) continue;
    const score = mapped * 20 + row.filter(Boolean).length;
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  return bestIdx;
}

function cellStr(row: unknown[], idx: number): string {
  if (idx < 0) return '';
  const cell = row[idx];
  if (cell == null || cell === '') return '';

  if (typeof cell === 'string') return sanitizeOperationalText(cell);
  if (typeof cell === 'number' && Number.isFinite(cell)) return String(cell);
  if (typeof cell === 'boolean') return cell ? 'true' : 'false';
  if (cell instanceof Date) return cell.toISOString();

  if (typeof cell === 'object') {
    const o = cell as Record<string, unknown>;
    if (typeof o.w === 'string') return sanitizeOperationalText(o.w);
    if (typeof o.v === 'string') return sanitizeOperationalText(o.v);
    if (typeof o.v === 'number' && Number.isFinite(o.v)) return String(o.v);
    return '';
  }

  return sanitizeOperationalText(String(cell));
}

function buildSearchBlob(
  actualService: string,
  serviceDefinition: string,
  offeringType: string,
): string {
  return [actualService, serviceDefinition, offeringType].filter(Boolean).join(' ').toLowerCase();
}

export function formatDetectedHeaders(headerRow: string[]): string {
  const cells = (headerRow ?? []).map((c) => String(c ?? '').trim()).filter(Boolean);
  return cells.length > 0 ? cells.join(' · ') : '—';
}

export function getMissingRequiredColumnLabels(
  colMap: Record<RequiredExcelColumn, number>,
): RequiredExcelColumn[] {
  return REQUIRED_EXCEL_COLUMNS.filter((key) => colMap[key] < 0);
}

/** ثلاثة أعمدة فقط بالترتيب — إن وُجدت 3 عناوين مقروءة دون تطابق الاسم */
function mapByThreeColumnOrder(headerRow: string[]): Record<RequiredExcelColumn, number> | null {
  const withIndex = headerRow
    .map((h, idx) => ({ text: sanitizeOperationalText(String(h)), idx }))
    .filter((x) => x.text.length > 0);

  if (withIndex.length !== 3) return null;

  return {
    actualService: withIndex[0].idx,
    serviceDefinition: withIndex[1].idx,
    offeringType: withIndex[2].idx,
  };
}

/**
 * Excel بثلاثة أعمدة فقط: Actual Service · Service Definition · Offering
 */
export function parseOperationalExcelRows(
  rawRows: unknown[][],
  sourceId: OperationalSourceId,
): OperationalKnowledgeRow[] {
  if (rawRows.length < 2) return [];

  if (isEncryptedOperationalWorkbook(rawRows)) {
    throw new Error('ENCRYPTED_EXCEL_FILE');
  }

  const headerIdx = detectHeaderRowIndex(rawRows);
  const headerRow = (rawRows[headerIdx] ?? []).map((c) => String(c ?? '').trim());
  const dataRows = rawRows.slice(headerIdx + 1);

  let colMap = mapRequiredColumns(headerRow);
  let missing = getMissingRequiredColumnLabels(colMap);

  if (missing.length > 0) {
    const byOrder = mapByThreeColumnOrder(headerRow);
    if (byOrder) {
      colMap = byOrder;
      missing = [];
    }
  }

  if (missing.length > 0) {
    const detected = formatDetectedHeaders(headerRow);
    const missingLabels = missing.join(',');
    if (isEncryptedOperationalWorkbook([headerRow, ...dataRows.slice(0, 2)])) {
      throw new Error('ENCRYPTED_EXCEL_FILE');
    }
    throw new Error(`MISSING_REQUIRED_COLUMNS|${missingLabels}|${detected}`);
  }

  const rows: OperationalKnowledgeRow[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const raw = dataRows[i] ?? [];
    const actualService = cellStr(raw, colMap.actualService);
    const serviceDefinition = cellStr(raw, colMap.serviceDefinition);
    const offeringType = cellStr(raw, colMap.offeringType);

    if (!actualService && !serviceDefinition && !offeringType) continue;

    rows.push(
      sanitizeOperationalRow({
        id: `${sourceId}-${headerIdx + 1 + i}`,
        sourceId,
        actualService,
        serviceDefinition,
        offeringType,
        ...EMPTY_ROW_FIELDS,
        searchBlob: buildSearchBlob(actualService, serviceDefinition, offeringType),
      }),
    );
  }

  return rows;
}
