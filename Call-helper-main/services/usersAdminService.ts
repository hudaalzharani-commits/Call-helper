export type ApiAdminUser = {
  _id: string;
  username: string;
  name: string;
  email?: string | null;
  role: 'admin' | 'user' | 'moderator' | 'customer_service';
  isActive: boolean;
  accountStatus?: 'active' | 'inactive' | 'suspended';
  avatar?: string | null;
  permAdminPanel?: boolean;
  permContentCreate?: boolean;
  uiVisibility?: Record<string, boolean>;
  lastLogin?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function parseJson(res: Response): Promise<{ success?: boolean; message?: string; data?: unknown }> {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

export async function fetchAdminUsers(): Promise<ApiAdminUser[]> {
  const res = await fetch('/api/users', { headers: authHeaders() });
  const body = await parseJson(res);
  if (!res.ok) {
    throw new Error(typeof body.message === 'string' ? body.message : 'فشل تحميل المستخدمين');
  }
  const data = body.data;
  return Array.isArray(data) ? (data as ApiAdminUser[]) : [];
}

export async function createAdminUser(payload: {
  username: string;
  password: string;
  name: string;
  email: string;
  role: string;
  status: string;
  uiVisibility?: Record<string, boolean>;
}): Promise<ApiAdminUser> {
  const res = await fetch('/api/users', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const body = await parseJson(res);
  if (!res.ok) {
    throw new Error(typeof body.message === 'string' ? body.message : 'فشل إنشاء المستخدم');
  }
  return body.data as ApiAdminUser;
}

export async function updateAdminUser(
  id: string,
  payload: Partial<{
    name: string;
    email: string;
    username: string;
    role: string;
    status: string;
    permAdminPanel: boolean;
    permContentCreate: boolean;
    uiVisibility?: Record<string, boolean>;
  }>,
): Promise<ApiAdminUser> {
  const res = await fetch(`/api/users/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const body = await parseJson(res);
  if (!res.ok) {
    throw new Error(typeof body.message === 'string' ? body.message : 'فشل تحديث المستخدم');
  }
  return body.data as ApiAdminUser;
}

export async function setAdminUserPassword(id: string, password: string): Promise<void> {
  const res = await fetch(`/api/users/${id}/password`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ password }),
  });
  const body = await parseJson(res);
  if (!res.ok) {
    throw new Error(typeof body.message === 'string' ? body.message : 'فشل تغيير كلمة المرور');
  }
}

export async function deleteAdminUser(id: string): Promise<void> {
  const res = await fetch(`/api/users/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const body = await parseJson(res);
  if (!res.ok) {
    throw new Error(typeof body.message === 'string' ? body.message : 'فشل حذف المستخدم');
  }
}
