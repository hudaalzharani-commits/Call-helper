import type { OperationalKnowledgeRow } from '../types/operationalKnowledge';

/** هل النص مناسب للعرض (وليس بيانات ثنائية/مشوّهة) */
export function isReadableOperationalText(value: string): boolean {
  const s = value.trim();
  if (!s) return true;

  if (s.length > 4000) return false;

  let readable = 0;
  let control = 0;

  for (const ch of s) {
    const code = ch.charCodeAt(0);
    if (code < 32 && ch !== '\n' && ch !== '\r' && ch !== '\t') {
      control++;
      continue;
    }
    if (
      (code >= 0x0600 && code <= 0x06ff) ||
      (code >= 0x0750 && code <= 0x077f) ||
      (code >= 0x08a0 && code <= 0x08ff) ||
      (code >= 0xfb50 && code <= 0xfdff) ||
      (code >= 0xfe70 && code <= 0xfeff) ||
      (code >= 0x0041 && code <= 0x005a) ||
      (code >= 0x0061 && code <= 0x007a) ||
      (code >= 0x0030 && code <= 0x0039) ||
      ' .,،؛:!?%/-()[]{}\'"+*&@#_\n\r\t'.includes(ch)
    ) {
      readable++;
    } else if (code >= 0x0100) {
      readable++;
    } else if (code >= 0x0080 && code <= 0x00ff) {
      control++;
    }
  }

  const total = s.length;
  if (control / total > 0.12) return false;
  if (readable / total < 0.55) return false;
  return true;
}

export function sanitizeOperationalText(value: string): string {
  const s = String(value ?? '').trim();
  if (!s) return '';
  return isReadableOperationalText(s) ? s : '';
}

export function sanitizeOperationalRow(row: OperationalKnowledgeRow): OperationalKnowledgeRow {
  const textFields: (keyof OperationalKnowledgeRow)[] = [
    'actualService',
    'serviceCategory',
    'serviceDefinition',
    'issueType',
    'issueCategory',
    'offeringType',
    'workflowStage',
    'resolutionPath',
    'routingDecision',
    'priorityLevel',
    'confidenceSignal',
    'casePattern',
    'clarificationRequired',
    'manualReviewFlag',
    'decisionReason',
    'linkedScenario',
    'searchBlob',
  ];

  const next = { ...row };
  for (const key of textFields) {
    const v = next[key];
    if (typeof v === 'string') {
      (next as Record<string, unknown>)[key] = sanitizeOperationalText(v);
    }
  }

  next.relatedKeywords = row.relatedKeywords
    .map((k) => sanitizeOperationalText(k))
    .filter(Boolean);
  next.operationalTags = row.operationalTags.map((k) => sanitizeOperationalText(k)).filter(Boolean);

  next.searchBlob = getOperationalSearchText(next).toLowerCase();

  return next;
}

/** قيمة عرض مع بدائل إذا كان الحقل الأساسي تالفاً */
export function pickDisplayField(primary: string, ...fallbacks: string[]): string {
  if (sanitizeOperationalText(primary)) return sanitizeOperationalText(primary);
  for (const f of fallbacks) {
    const clean = sanitizeOperationalText(f);
    if (clean) return clean;
  }
  return '';
}

export function getOperationalSearchText(row: OperationalKnowledgeRow): string {
  return [row.actualService, row.serviceDefinition, row.offeringType].filter(Boolean).join(' ');
}

export function rowHasReadableResult(row: OperationalKnowledgeRow): boolean {
  return Boolean(
    sanitizeOperationalText(row.actualService) ||
      sanitizeOperationalText(row.serviceDefinition) ||
      sanitizeOperationalText(row.offeringType),
  );
}
