/**
 * Frontend service for the Operational Issue tracking layer.
 *
 * Only the dashboard uses these endpoints, but we expose the helpers as a
 * standalone module so future surfaces (modals, sidebars, exports) can pull
 * the same data without duplicating fetch logic.
 *
 * Endpoints used:
 *   GET  /api/operational-issues                  → active list
 *   GET  /api/operational-issues/archive          → archived list
 *   POST /api/operational-issues/:id/resolve      → admin-only resolve action
 *
 * All requests are authenticated with the JWT stored in localStorage. We
 * mirror the patterns used in `services/analyticsService.ts` to keep the
 * codebase consistent.
 */

export type OperationalIssueStatus =
  | 'general_repeated'
  | 'persistent_operational'
  | 'resolved';

/**
 * Why the backend classified an issue the way it did. Multiple values are
 * possible — e.g. a hot issue can hit both `rolling-24h` and `rolling-7d`
 * simultaneously. The frontend uses this to explain the row to the operator.
 */
export type OperationalIssueCriterion =
  | 'rolling-24h'
  | 'rolling-7d'
  | 'distinct-days-3+'
  | 'spans-beyond-24h';

export interface OperationalIssue {
  _id: string;
  category: string;
  entityType: string | null;
  issueKey: string;
  status: OperationalIssueStatus;
  occurrenceCount: number;
  // Number of distinct days the pattern appeared on within the last 7d.
  // Optional because old documents created before the field existed won't
  // have it populated.
  distinctDays7d?: number;
  detectionCriteria?: OperationalIssueCriterion[];
  firstDetectedAt: string;
  lastDetectedAt: string;
  sampleProblemSummary: string;
  resolvedAt: string | null;
  resolvedBy?:
    | string
    | null
    | {
        _id: string;
        name?: string;
        username?: string;
      };
  resolutionNotes: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface OperationalIssueThresholds {
  ROLLING_24H_THRESHOLD: number;
  ROLLING_7D_THRESHOLD: number;
  // Backend may also expose the new persistence signals; keep them optional
  // so older API versions still type-check.
  DISTINCT_DAYS_THRESHOLD?: number;
  PERSISTENT_INACTIVITY_DAYS?: number;
}

export interface OperationalIssueListResponse {
  issues: OperationalIssue[];
  thresholds: OperationalIssueThresholds;
}

const API_BASE = '/api/operational-issues';

function getAuthHeaders(): Record<string, string> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
}

async function parseListResponse(
  res: Response,
): Promise<OperationalIssueListResponse> {
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${body || res.statusText}`);
  }
  const body = await res.json();
  if (!body?.success) {
    throw new Error(body?.message || 'Failed to load operational issues');
  }
  return {
    issues: Array.isArray(body.data) ? (body.data as OperationalIssue[]) : [],
    thresholds: {
      ROLLING_24H_THRESHOLD: Number(body.thresholds?.ROLLING_24H_THRESHOLD) || 5,
      ROLLING_7D_THRESHOLD: Number(body.thresholds?.ROLLING_7D_THRESHOLD) || 10,
      DISTINCT_DAYS_THRESHOLD:
        Number(body.thresholds?.DISTINCT_DAYS_THRESHOLD) || 3,
      PERSISTENT_INACTIVITY_DAYS:
        Number(body.thresholds?.PERSISTENT_INACTIVITY_DAYS) || 7,
    },
  };
}

/**
 * Fetch the list of currently active operational issues (general_repeated +
 * persistent_operational). The backend also auto-expires stale daily issues
 * on this call so the list stays clean without a cron job.
 */
export async function fetchActiveOperationalIssues(): Promise<OperationalIssueListResponse> {
  const res = await fetch(API_BASE, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return parseListResponse(res);
}

/**
 * Fetch archived (resolved) operational issues. Defaults to the most recent
 * 100 unless `limit` is provided.
 */
export async function fetchArchivedOperationalIssues(
  limit = 100,
): Promise<OperationalIssueListResponse> {
  const url = `${API_BASE}/archive?limit=${encodeURIComponent(limit)}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return parseListResponse(res);
}

/**
 * Mark an operational issue as resolved. Admin-only (the backend enforces).
 * Returns the updated issue document so the caller can move it into the
 * archive view locally without a full refetch.
 */
export async function markOperationalIssueResolved(
  id: string,
  notes = '',
): Promise<OperationalIssue> {
  const res = await fetch(`${API_BASE}/${encodeURIComponent(id)}/resolve`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ notes }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${body || res.statusText}`);
  }
  const body = await res.json();
  if (!body?.success || !body.data) {
    throw new Error(body?.message || 'Failed to resolve issue');
  }
  return body.data as OperationalIssue;
}
