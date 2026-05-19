import type { TrainingEntry, TrainingFormData } from '../types';

function getToken(): string | null {
  try {
    return localStorage.getItem('token');
  } catch {
    return null;
  }
}

async function authedFetch<T>(input: string, init: RequestInit): Promise<T> {
  const token = getToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const res = await fetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

  const json = await res.json();
  if (!json?.success) {
    throw new Error(json?.message || 'Request failed');
  }

  return json.data as T;
}

export interface BackendTrainingEntry {
  _id: string;
  scenario: string;
  correctResponse: string;
  alternativeResponses?: string[];
  category: string;
  submittedBy?: { _id?: string; name?: string; username?: string } | string;
  status: TrainingEntry['status'];
  reviewedBy?: { _id?: string; name?: string; username?: string } | string | null;
  reviewedAt?: string | null;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  attachmentUrl?: string;
  attachmentOriginalName?: string;
  relatedCaseId?: string;
}

function displayUser(u: BackendTrainingEntry['submittedBy']): string {
  if (!u) return '—';
  if (typeof u === 'string') return u;
  return u.name || u.username || '—';
}

function displayReviewer(u: BackendTrainingEntry['reviewedBy']): string | undefined {
  if (!u) return undefined;
  if (typeof u === 'string') return u;
  return u.name || u.username || undefined;
}

function submitterId(u: BackendTrainingEntry['submittedBy']): string {
  if (!u) return '';
  if (typeof u === 'string') return u;
  return u._id ? String(u._id) : '';
}

export function mapTrainingEntry(doc: BackendTrainingEntry): TrainingEntry {
  return {
    id: String(doc._id),
    scenario: doc.scenario,
    correctResponse: doc.correctResponse,
    alternativeResponses: doc.alternativeResponses ?? [],
    category: doc.category,
    relatedCaseId:
      typeof doc.relatedCaseId === 'string' && doc.relatedCaseId.trim()
        ? doc.relatedCaseId.trim()
        : undefined,
    submittedBy: displayUser(doc.submittedBy),
    submitterUserId: submitterId(doc.submittedBy),
    submittedAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
    status: doc.status,
    reviewedBy: displayReviewer(doc.reviewedBy),
    reviewedAt: doc.reviewedAt ? new Date(doc.reviewedAt) : undefined,
    notes: doc.notes || undefined,
    attachmentUrl: typeof doc.attachmentUrl === 'string' && doc.attachmentUrl.trim()
      ? doc.attachmentUrl.trim()
      : undefined,
    attachmentOriginalName:
      typeof doc.attachmentOriginalName === 'string' && doc.attachmentOriginalName.trim()
        ? doc.attachmentOriginalName.trim()
        : undefined,
  };
}

export async function listTrainingEntries(status?: string): Promise<TrainingEntry[]> {
  const qp = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
  const rows = await authedFetch<BackendTrainingEntry[] | unknown>(`/api/training-entries${qp}`, {
    method: 'GET',
  });
  if (!Array.isArray(rows)) return [];
  return rows.map(mapTrainingEntry);
}

export async function createTrainingEntry(
  input: TrainingFormData,
  attachment?: File | null,
): Promise<TrainingEntry> {
  if (attachment) {
    const token = getToken();
    if (!token) {
      throw new Error('Not authenticated');
    }
    const fd = new FormData();
    fd.append('scenario', input.scenario);
    fd.append('correctResponse', input.correctResponse);
    fd.append('category', input.category || 'عام');
    fd.append('relatedCaseId', (input.relatedCaseId || '').trim());
    fd.append('alternativeResponses', JSON.stringify(input.alternativeResponses || []));
    fd.append('attachment', attachment);

    const res = await fetch('/api/training-entries', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: fd,
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.success) {
      throw new Error(json?.message || `HTTP ${res.status}`);
    }
    return mapTrainingEntry(json.data as BackendTrainingEntry);
  }

  const doc = await authedFetch<BackendTrainingEntry>('/api/training-entries', {
    method: 'POST',
    body: JSON.stringify({
      scenario: input.scenario,
      correctResponse: input.correctResponse,
      alternativeResponses: input.alternativeResponses || [],
      category: input.category || 'عام',
      relatedCaseId: (input.relatedCaseId || '').trim(),
    }),
  });
  return mapTrainingEntry(doc);
}

export async function updateTrainingEntry(id: string, input: TrainingFormData): Promise<TrainingEntry> {
  const doc = await authedFetch<BackendTrainingEntry>(`/api/training-entries/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      scenario: input.scenario,
      correctResponse: input.correctResponse,
      alternativeResponses: input.alternativeResponses || [],
      category: input.category,
      relatedCaseId: (input.relatedCaseId || '').trim(),
    }),
  });
  return mapTrainingEntry(doc);
}

export async function deleteTrainingEntry(id: string): Promise<void> {
  await authedFetch<null>(`/api/training-entries/${id}`, { method: 'DELETE' });
}

export async function reviewTrainingEntry(
  id: string,
  status: 'approved' | 'rejected',
  notes?: string,
): Promise<TrainingEntry> {
  const doc = await authedFetch<BackendTrainingEntry>(`/api/training-entries/${id}/review`, {
    method: 'POST',
    body: JSON.stringify({ status, notes: notes || '' }),
  });
  return mapTrainingEntry(doc);
}
