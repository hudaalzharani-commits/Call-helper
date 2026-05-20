import type {
  OperationalKnowledgeRow,
  OperationalMatchResult,
  OperationalSearchOutcome,
  OperationalSourceId,
} from '../types/operationalKnowledge';

/** مرادفات عربي ↔ إنجليزي للبحث في الحقول الثلاثة */
const OPERATIONAL_SYNONYMS: Record<string, string[]> = {
  ضيف: ['guest', 'زائر', 'زوار'],
  بلا: ['بدون', 'without', 'no'],
  حقيبه: ['حقيبة', 'baggage', 'luggage', 'امتعه', 'أمتعة'],
  بدون: ['بلا', 'without'],
};

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text: string): string[] {
  const n = normalizeText(text);
  if (!n) return [];
  return n.split(' ').filter((w) => w.length > 1);
}

export function expandQueryTokens(query: string): string[] {
  const base = tokenize(query);
  const expanded = new Set(base);

  for (const token of base) {
    expanded.add(token);
    const syns = OPERATIONAL_SYNONYMS[token];
    if (syns) syns.forEach((s) => tokenize(s).forEach((t) => expanded.add(t)));
  }

  return [...expanded];
}

function phraseInText(phrase: string, target: string): boolean {
  const p = normalizeText(phrase);
  const t = normalizeText(target);
  if (p.length < 2 || !t) return false;
  return t.includes(p);
}

function queryCoverageScore(queryTokens: string[], fieldValue: string): number {
  if (!fieldValue.trim() || queryTokens.length === 0) return 0;
  const text = normalizeText(fieldValue);
  const meaningful = [...new Set(queryTokens.filter((t) => t.length >= 2))];
  if (meaningful.length === 0) return 0;
  let hits = 0;
  for (const qt of meaningful) {
    if (text.includes(qt)) hits++;
  }
  return (hits / meaningful.length) * 35;
}

function rowSearchText(row: OperationalKnowledgeRow): string {
  return [row.actualService, row.serviceDefinition, row.offeringType].filter(Boolean).join(' ');
}

/** مطابقة على Actual Service · Service Definition · Offering فقط */
function scoreRow(row: OperationalKnowledgeRow, query: string, queryTokens: string[]): OperationalMatchResult {
  const qNorm = normalizeText(query);
  const combined = rowSearchText(row);
  let score = 0;
  const matchedSignals: string[] = [];

  if (qNorm.length >= 2 && combined && phraseInText(query, combined)) {
    score += 80;
    matchedSignals.push('phrase');
  }

  if (qNorm.length >= 2 && normalizeText(combined).includes(qNorm)) {
    score += 120;
    matchedSignals.push('substring');
  }

  const fields: { key: string; value: string; weight: number }[] = [
    { key: 'actualService', value: row.actualService, weight: 40 },
    { key: 'serviceDefinition', value: row.serviceDefinition, weight: 38 },
    { key: 'offeringType', value: row.offeringType, weight: 35 },
  ];

  for (const { key, value, weight } of fields) {
    if (!value.trim()) continue;
    const coverage = queryCoverageScore(queryTokens, value);
    if (coverage > 0) {
      score += coverage * (weight / 35);
      matchedSignals.push(key);
    }
    if (qNorm.length >= 2 && phraseInText(query, value)) {
      score += weight * 0.6;
      matchedSignals.push(`${key}_exact`);
    }
  }

  return {
    row,
    score,
    confidence: 0,
    matchedSignals: [...new Set(matchedSignals)],
    matchedKeywords: [],
  };
}

export function runOperationalSearch(
  query: string,
  rows: OperationalKnowledgeRow[],
  activeSources: OperationalSourceId[],
): OperationalSearchOutcome {
  const trimmed = query.trim();
  const queryTokens = expandQueryTokens(trimmed);

  const filtered =
    activeSources.length > 0 ? rows.filter((r) => activeSources.includes(r.sourceId)) : rows;

  const scored = filtered
    .map((row) => scoreRow(row, trimmed, queryTokens))
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const topMatch = scored[0] ?? null;

  return {
    query: trimmed,
    matches: scored,
    topMatch,
    confidence: 0,
    isGrayArea: false,
    grayAreaReasons: [],
    routingDecision: null,
    operationalGuidance: null,
    relatedScenarios: [],
    activeSources: activeSources.length > 0 ? activeSources : [...new Set(rows.map((r) => r.sourceId))],
  };
}
