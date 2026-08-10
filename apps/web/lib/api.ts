const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('adflow_impersonate') || localStorage.getItem('adflow_token');
}

async function request<T = unknown>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((opts.headers as Record<string, string>) || {}),
  };

  const res = await fetch(BASE + path, { ...opts, headers });

  if (res.status === 401) {
    localStorage.removeItem('adflow_token');
    localStorage.removeItem('adflow_user');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.message || 'Request failed');
  return data as T;
}

export const api = {
  get: <T = unknown>(path: string) => request<T>(path),
  post: <T = unknown>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T = unknown>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T = unknown>(path: string) => request<T>(path, { method: 'DELETE' }),
};
