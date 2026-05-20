export type PilgrimageScope = 'umrah' | 'hajj';

/** صف واحد من ملف Excel للتصنيف قبل التصعيد */
export type BeforeEscalationRow = {
  id: string;
  keywords: string[];
  problemContent: string;
  problemType: string;
  classification: string;
};

export type ClassificationMatch = {
  row: BeforeEscalationRow;
  score: number;
  matchedKeywords: string[];
};

const KEYWORD_HEADERS = ['الكلمات المتاحة', 'كلمات', 'keywords', 'keyword', 'الكلمات'];
const CONTENT_HEADERS = ['محتوى المشكلة', 'المحتوى', 'content', 'description', 'الوصف', 'وصف المشكلة'];
const TYPE_HEADERS = ['نوع المشكلة', 'النوع', 'type', 'problem type', 'problem_type'];
const CLASS_HEADERS = ['التصنيف الصحيح', 'التصنيف', 'classification', 'category', 'category name', 'الفئة'];

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, ' ');
}

function findColumnIndex(headers: string[], candidates: string[]): number {
  const normalized = headers.map(normalizeHeader);
  for (const c of candidates) {
    const idx = normalized.findIndex((h) => h === normalizeHeader(c) || h.includes(normalizeHeader(c)));
    if (idx >= 0) return idx;
  }
  return -1;
}

function splitKeywords(raw: string): string[] {
  return raw
    .split(/[,،;؛|\n/]+/)
    .map((k) => k.trim())
    .filter(Boolean);
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

/** تحويل صفوف خام من Excel إلى بنية موحّدة */
export function parseExcelRows(rawRows: unknown[][]): BeforeEscalationRow[] {
  if (rawRows.length < 2) return [];

  const headerRow = (rawRows[0] ?? []).map((c) => String(c ?? '').trim());
  const kwIdx = findColumnIndex(headerRow, KEYWORD_HEADERS);
  const contentIdx = findColumnIndex(headerRow, CONTENT_HEADERS);
  const typeIdx = findColumnIndex(headerRow, TYPE_HEADERS);
  const classIdx = findColumnIndex(headerRow, CLASS_HEADERS);

  if (classIdx < 0) {
    throw new Error('MISSING_CLASSIFICATION_COLUMN');
  }

  const rows: BeforeEscalationRow[] = [];

  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i] ?? [];
    const classification = String(row[classIdx] ?? '').trim();
    if (!classification) continue;

    const keywords =
      kwIdx >= 0 ? splitKeywords(String(row[kwIdx] ?? '')) : [];
    const problemContent = contentIdx >= 0 ? String(row[contentIdx] ?? '').trim() : '';
    const problemType = typeIdx >= 0 ? String(row[typeIdx] ?? '').trim() : '';

    rows.push({
      id: `row-${i}`,
      keywords,
      problemContent,
      problemType,
      classification,
    });
  }

  return rows;
}

function keywordScore(queryTokens: string[], keywords: string[]): { score: number; matched: string[] } {
  const matched: string[] = [];
  let score = 0;

  for (const kw of keywords) {
    const kwNorm = kw.trim().toLowerCase();
    if (!kwNorm) continue;
    const kwTokens = tokenize(kwNorm);
    const inQuery =
      queryTokens.some((t) => t.includes(kwNorm) || kwNorm.includes(t)) ||
      kwTokens.every((kt) => queryTokens.some((t) => t.includes(kt) || kt.includes(t)));

    if (inQuery) {
      matched.push(kw);
      score += 12 + Math.min(kwNorm.length, 20);
    }
  }

  return { score, matched };
}

function overlapScore(queryTokens: string[], target: string): number {
  if (!target.trim()) return 0;
  const targetTokens = tokenize(target);
  if (targetTokens.length === 0) return 0;

  let hits = 0;
  for (const tt of targetTokens) {
    if (queryTokens.some((qt) => qt === tt || qt.includes(tt) || tt.includes(qt))) {
      hits++;
    }
  }

  return (hits / targetTokens.length) * 25;
}

/** البحث عن أفضل التصنيفات المطابقة */
export function classifyBeforeEscalation(
  rows: BeforeEscalationRow[],
  query: { problemContent: string; problemType: string },
  limit = 5,
): ClassificationMatch[] {
  const content = query.problemContent.trim();
  const type = query.problemType.trim();
  if (!content && !type) return [];

  const queryText = `${content} ${type}`.trim();
  const queryTokens = tokenize(queryText);

  const scored: ClassificationMatch[] = rows.map((row) => {
    const kw = keywordScore(queryTokens, row.keywords);
    let score = kw.score;
    score += overlapScore(queryTokens, row.problemContent);
    score += overlapScore(tokenize(type || content), row.problemType) * 1.2;

    if (type && row.problemType.trim()) {
      const typeNorm = type.toLowerCase();
      const rowTypeNorm = row.problemType.trim().toLowerCase();
      if (typeNorm === rowTypeNorm) score += 30;
      else if (typeNorm.includes(rowTypeNorm) || rowTypeNorm.includes(typeNorm)) score += 18;
    }

    if (content && row.problemContent.trim()) {
      const c = content.toLowerCase();
      const rc = row.problemContent.trim().toLowerCase();
      if (c.includes(rc) || rc.includes(c)) score += 20;
    }

    return { row, score, matchedKeywords: kw.matched };
  });

  return scored
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
