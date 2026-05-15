import type { BackendKnowledgeArticle } from '../services/knowledgeBaseService';
import { mapCategoryToBackend } from '../services/knowledgeBaseService';

export const CATEGORY_REDLINE_STORAGE_KEY = 'commonIssues:categoryRedlines';

export function loadCategoryRedlines(): Record<string, number> {
  try {
    const raw = localStorage.getItem(CATEGORY_REDLINE_STORAGE_KEY);
    if (!raw) return {};
    const o = JSON.parse(raw) as Record<string, number>;
    return typeof o === 'object' && o ? o : {};
  } catch {
    return {};
  }
}

export function saveCategoryRedline(category: string, value: number | null) {
  const cur = loadCategoryRedlines();
  if (value === null || !Number.isFinite(value) || value <= 0) {
    delete cur[category];
  } else {
    cur[category] = Math.round(value);
  }
  try {
    localStorage.setItem(CATEGORY_REDLINE_STORAGE_KEY, JSON.stringify(cur));
  } catch {
    /* ignore */
  }
}

export function relatedKnowledgeArticles(
  articles: BackendKnowledgeArticle[],
  callCategory: string,
): BackendKnowledgeArticle[] {
  const key = mapCategoryToBackend(callCategory);
  return articles.filter(a => {
    if (a.category === callCategory) return true;
    if (mapCategoryToBackend(a.category) === key && key !== 'general') return true;
    if (callCategory && a.title.includes(callCategory)) return true;
    return false;
  });
}

export function topKeywordsFromArticles(articles: BackendKnowledgeArticle[], max = 3): string[] {
  const freq = new Map<string, number>();
  for (const a of articles) {
    for (const k of a.keywords ?? []) {
      const t = k.trim();
      if (t.length < 2) continue;
      freq.set(t, (freq.get(t) ?? 0) + 1);
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([w]) => w);
}

export function buildDistributionCsv(rows: Array<Record<string, string | number>>): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const esc = (v: string | number) => {
    const s = String(v ?? '');
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return [headers.join(','), ...rows.map(r => headers.map(h => esc(r[h] ?? '')).join(','))].join('\r\n');
}
