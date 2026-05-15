import type { OperationalUpdate, UpdateFormData } from '../types';

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

export interface BackendOperationalUpdate {
  _id: string;
  title: string;
  description: string;
  type: OperationalUpdate['type'];
  status: OperationalUpdate['status'];
  priority: OperationalUpdate['priority'];
  startDate?: string;
  endDate?: string | null;
  affectedServices?: string[];
  createdBy?: { _id?: string; name?: string; username?: string } | string;
  createdAt?: string;
  updatedAt?: string;
}

function displayUser(u: BackendOperationalUpdate['createdBy']): string {
  if (!u) return '—';
  if (typeof u === 'string') return u;
  return u.name || u.username || '—';
}

export function mapOperationalUpdate(doc: BackendOperationalUpdate): OperationalUpdate {
  return {
    id: String(doc._id),
    title: doc.title,
    description: doc.description,
    type: doc.type,
    status: doc.status,
    priority: doc.priority,
    startDate: doc.startDate ? new Date(doc.startDate) : new Date(),
    endDate: doc.endDate ? new Date(doc.endDate) : undefined,
    affectedServices: Array.isArray(doc.affectedServices) ? doc.affectedServices : [],
    createdBy: displayUser(doc.createdBy),
    createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : new Date(),
  };
}

export async function listOperationalUpdates(): Promise<OperationalUpdate[]> {
  const rows = await authedFetch<BackendOperationalUpdate[] | unknown>('/api/operational-updates', {
    method: 'GET',
  });
  if (!Array.isArray(rows)) return [];
  return rows.map(mapOperationalUpdate);
}

export async function createOperationalUpdate(input: UpdateFormData): Promise<OperationalUpdate> {
  const body = {
    title: input.title,
    description: input.description,
    type: input.type,
    priority: input.priority,
    status: input.status || 'scheduled',
    startDate: input.startDate instanceof Date ? input.startDate.toISOString() : new Date().toISOString(),
    endDate: input.endDate instanceof Date ? input.endDate.toISOString() : input.endDate === null ? null : undefined,
    affectedServices: (input.affectedServices || []).filter(Boolean),
  };
  const doc = await authedFetch<BackendOperationalUpdate>('/api/operational-updates', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return mapOperationalUpdate(doc);
}

export async function updateOperationalUpdate(id: string, input: Partial<UpdateFormData>): Promise<OperationalUpdate> {
  const body: Record<string, unknown> = {};
  if (input.title !== undefined) body.title = input.title;
  if (input.description !== undefined) body.description = input.description;
  if (input.type !== undefined) body.type = input.type;
  if (input.priority !== undefined) body.priority = input.priority;
  if (input.status !== undefined) body.status = input.status;
  if (input.startDate !== undefined)
    body.startDate = input.startDate instanceof Date ? input.startDate.toISOString() : input.startDate;
  if (input.endDate !== undefined) {
    body.endDate =
      input.endDate === null
        ? null
        : input.endDate instanceof Date
          ? input.endDate.toISOString()
          : new Date(input.endDate as string).toISOString();
  }
  if (input.affectedServices !== undefined) body.affectedServices = input.affectedServices.filter(Boolean);

  const doc = await authedFetch<BackendOperationalUpdate>(`/api/operational-updates/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return mapOperationalUpdate(doc);
}

export async function deleteOperationalUpdate(id: string): Promise<void> {
  await authedFetch<null>(`/api/operational-updates/${id}`, { method: 'DELETE' });
}
