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

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg =
      typeof json?.message === "string"
        ? json.message
        : `HTTP ${res.status}: ${res.statusText}`;
    throw new Error(msg);
  }

  if (!json?.success) {
    throw new Error(
      typeof json?.message === "string" ? json.message : "Request failed",
    );
  }

  return json.data as T;
}

/** Document shape from GET /api/calls/all (user populated). */
export interface BackendCallLog {
  _id: string;
  user: { _id?: string; name?: string; username?: string } | string;
  customerName: string;
  entityType: string;
  problemType: string;
  problemSummary: string;
  category?: string | null;
  bucketDate?: string | null;
  matchedCase?: string | null;
  matchedCaseCode?: string | null;
  matchedCaseCount?: number | null;
  matchedAt?: string | null;
  generatedResponse?: string | null;
  status: "pending" | "resolved" | "escalated" | "closed" | string;
  duration?: number | null;
  notes?: string | null;
  createdAt: string;
  updatedAt?: string;
  /** يُملأ من مساعد المكالمات عند الحفظ (0–100) */
  finalDisplayScore?: number | null;
}

export function displayCallLogUser(
  u: BackendCallLog["user"],
): string {
  if (!u) return "—";
  if (typeof u === "string") return u;
  return u.name || u.username || "—";
}

export async function fetchAllCallLogs(): Promise<BackendCallLog[]> {
  const data = await authedFetch<BackendCallLog[] | unknown>("/api/calls/all", {
    method: "GET",
  });
  return Array.isArray(data) ? data : [];
}

export async function deleteCallLog(id: string): Promise<void> {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(`/api/calls/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof json?.message === "string"
        ? json.message
        : `HTTP ${res.status}: ${res.statusText}`,
    );
  }
}
