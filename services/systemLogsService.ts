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

export type SystemLogType = "logic-bug" | "flow-bug" | "error" | "crash";
export type SystemLogSeverity = "low" | "medium" | "high" | "critical";
export type SystemLogStatus = "open" | "resolved" | "ignored";

/** Document from GET /api/admin/system-logs */
export interface BackendSystemLog {
  _id: string;
  systemType?: string;
  severity?: string;
  caseId?: string;
  message?: string;
  fullMessage?: string;
  impact?: number;
  status?: string;
  tags?: string[];
  triggeredFlow?: string;
  systemDecision?: string;
  confidence?: number;
  errorCode?: string;
  stackTrace?: string;
  source?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SystemLogRow {
  id: string;
  /** Display time (English locale, consistent with call logs admin) */
  time: string;
  createdAtIso: string;
  systemType: SystemLogType;
  severity: SystemLogSeverity;
  caseId: string;
  message: string;
  fullMessage: string;
  impact: number;
  status: SystemLogStatus;
  tags: string[];
  triggeredFlow?: string;
  systemDecision?: string;
  confidence?: number;
  errorCode?: string;
  stackTrace?: string;
  source?: string;
}

const TYPES: SystemLogType[] = ["logic-bug", "flow-bug", "error", "crash"];
const SEVERITIES: SystemLogSeverity[] = ["low", "medium", "high", "critical"];
const STATUSES: SystemLogStatus[] = ["open", "resolved", "ignored"];

function coerceType(raw: string | undefined): SystemLogType {
  const t = (raw || "error").toLowerCase();
  return TYPES.includes(t as SystemLogType) ? (t as SystemLogType) : "error";
}

function coerceSeverity(raw: string | undefined): SystemLogSeverity {
  const s = (raw || "medium").toLowerCase();
  return SEVERITIES.includes(s as SystemLogSeverity)
    ? (s as SystemLogSeverity)
    : "medium";
}

function coerceStatus(raw: string | undefined): SystemLogStatus {
  const st = (raw || "open").toLowerCase();
  return STATUSES.includes(st as SystemLogStatus)
    ? (st as SystemLogStatus)
    : "open";
}

export function mapBackendSystemLog(doc: BackendSystemLog): SystemLogRow {
  const created = new Date(doc.createdAt);
  const time = Number.isNaN(created.getTime())
    ? "—"
    : created.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });

  const confidence =
    typeof doc.confidence === "number" && !Number.isNaN(doc.confidence)
      ? doc.confidence
      : undefined;

  return {
    id: String(doc._id),
    time,
    createdAtIso: doc.createdAt,
    systemType: coerceType(doc.systemType),
    severity: coerceSeverity(doc.severity),
    caseId: (doc.caseId || "").trim(),
    message: (doc.message || "").trim() || "—",
    fullMessage: (doc.fullMessage || doc.message || "").trim() || "—",
    impact: typeof doc.impact === "number" ? doc.impact : 0,
    status: coerceStatus(doc.status),
    tags: Array.isArray(doc.tags) ? doc.tags.map(String) : [],
    triggeredFlow: doc.triggeredFlow || undefined,
    systemDecision: doc.systemDecision || undefined,
    confidence,
    errorCode: doc.errorCode || undefined,
    stackTrace: doc.stackTrace || undefined,
    source: doc.source || undefined,
  };
}

export async function fetchSystemLogs(options?: {
  limit?: number;
}): Promise<SystemLogRow[]> {
  const limit = options?.limit ?? 500;
  const data = await authedFetch<BackendSystemLog[] | unknown>(
    `/api/admin/system-logs?limit=${encodeURIComponent(String(limit))}`,
    { method: "GET" },
  );
  if (!Array.isArray(data)) return [];
  return data.map(mapBackendSystemLog);
}
