export interface BackendKnowledgeArticle {
  _id: string;
  title: string;
  description: string;
  category: string;
  solution: string;
  keywords?: string[];
  confidence?: number;
  viewCount?: number;
  helpfulCount?: number;
  notHelpfulCount?: number;
  isPublished?: boolean;
  /** مصدر السجل: قاعدة المعرفة، وش تعلم رفيق، تحديث تشغيلي */
  recordOrigin?: "database" | "rafeeq_training" | "operational_update";
  createdAt?: string;
  updatedAt?: string;
  createdBy?: { name?: string; username?: string };
}

function getToken(): string | null {
  try {
    return localStorage.getItem("token");
  } catch {
    return null;
  }
}

async function authedFetch<T>(input: string, init: RequestInit): Promise<T> {
  const token = getToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const res = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

  const json = await res.json();
  if (!json?.success) {
    throw new Error(json?.message || "Request failed");
  }

  return json.data as T;
}

export function mapCategoryToBackend(category: string): string {
  const normalized = category.trim().toLowerCase();

  const map: Record<string, string> = {
    technical: "technical",
    billing: "billing",
    general: "general",
    registration: "registration",
    umrah: "umrah",
    agent: "agent",

    // Common Arabic labels
    "تقني": "technical",
    "تقنية": "technical",
    "فواتير": "billing",
    "محاسبة": "billing",
    "عام": "general",
    "تسجيل": "registration",
    "عمرة": "umrah",
    "وكيل": "agent",
    "وكلاء": "agent",
  };

  return map[normalized] ?? "general";
}

export async function listKnowledgeArticles(params?: {
  search?: string;
  category?: string;
  minConfidence?: number;
  /** published: الافتراضي للاستعلامات العامة | draft: مسودات فقط | all: كل السجلات */
  scope?: 'published' | 'draft' | 'all';
}): Promise<BackendKnowledgeArticle[]> {
  const qp = new URLSearchParams();
  if (params?.search) qp.set("search", params.search);
  if (params?.category && params.category !== "all") qp.set("category", mapCategoryToBackend(params.category));
  if (typeof params?.minConfidence === "number") qp.set("minConfidence", String(params.minConfidence));
  if (params?.scope && params.scope !== "published") qp.set("scope", params.scope);

  const url = `/api/knowledge${qp.toString() ? `?${qp.toString()}` : ""}`;
  const rows = await authedFetch<BackendKnowledgeArticle[] | unknown>(url, { method: "GET" });
  return Array.isArray(rows) ? rows : [];
}

export async function createKnowledgeArticle(input: {
  title: string;
  description: string;
  solution: string;
  category: string;
  keywords: string[];
  confidence?: number;
  isPublished?: boolean;
  recordOrigin?: "database" | "rafeeq_training" | "operational_update";
}): Promise<BackendKnowledgeArticle> {
  return authedFetch<BackendKnowledgeArticle>("/api/knowledge", {
    method: "POST",
    body: JSON.stringify({
      ...input,
      category: mapCategoryToBackend(input.category),
    }),
  });
}

export async function updateKnowledgeArticle(id: string, input: Partial<{
  title: string;
  description: string;
  solution: string;
  category: string;
  keywords: string[];
  confidence: number;
  isPublished: boolean;
  recordOrigin: "database" | "rafeeq_training" | "operational_update";
}>): Promise<BackendKnowledgeArticle> {
  return authedFetch<BackendKnowledgeArticle>(`/api/knowledge/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      ...input,
      ...(input.category ? { category: mapCategoryToBackend(input.category) } : {}),
    }),
  });
}

export async function deleteKnowledgeArticle(id: string): Promise<void> {
  await authedFetch<void>(`/api/knowledge/${id}`, { method: "DELETE" });
}

export async function recordKnowledgeView(id: string): Promise<BackendKnowledgeArticle> {
  return authedFetch<BackendKnowledgeArticle>(`/api/knowledge/${id}/view`, { method: "POST" });
}

export async function recordReferenceCaseView(
  caseDbId: string,
): Promise<BackendReferenceCase> {
  return authedFetch<BackendReferenceCase>(
    `/api/cases/${encodeURIComponent(caseDbId)}/view`,
    { method: "POST" },
  );
}

export async function recordKnowledgeFeedback(id: string, helpful: boolean): Promise<BackendKnowledgeArticle> {
  return authedFetch<BackendKnowledgeArticle>(`/api/knowledge/${id}/feedback`, {
    method: "POST",
    body: JSON.stringify({ helpful }),
  });
}

/** حالة مرجعية من مجموعة Case (تطابق فضي) — يعرضها سجل المعرفة مع المقالات */
export interface BackendReferenceCase {
  _id: string;
  caseId: string;
  userType?: string;
  accountStatus?: string;
  category: string;
  subCategory?: string;
  mainKeywords: string;
  extraKeywords?: string;
  synonyms?: string;
  responseText: string;
  why?: string;
  priority?: string;
  matchCount?: number;
  viewCount?: number;
  isArchived?: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: { name?: string; username?: string };
}

export async function listReferenceCases(): Promise<BackendReferenceCase[]> {
  const url = `/api/cases?scope=all`;
  const rows = await authedFetch<BackendReferenceCase[] | unknown>(url, { method: "GET" });
  return Array.isArray(rows) ? rows : [];
}
