const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('adflow_impersonate') || localStorage.getItem('adflow_token');
}

// Sign-in, sign-up and password endpoints answer 401/403 for wrong
// credentials — show that error instead of treating it as an expired session.
const AUTH_FORM_PATHS = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh', '/api/auth/forgot-password', '/api/auth/reset-password'];

// One refresh at a time: when several requests hit an expired access token
// together, they all wait for the same refresh call.
let refreshing: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = localStorage.getItem('adflow_refresh');
  if (!refreshToken) return false;
  try {
    const res = await fetch(BASE + '/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { accessToken: string; refreshToken: string };
    localStorage.setItem('adflow_token', data.accessToken);
    localStorage.setItem('adflow_refresh', data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

async function request<T = unknown>(path: string, opts: RequestInit = {}, retried = false): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((opts.headers as Record<string, string>) || {}),
  };

  const res = await fetch(BASE + path, { ...opts, headers });

  if (res.status === 401 && !AUTH_FORM_PATHS.includes(path)) {
    // Admin "Login as user" sessions are short-lived on purpose — never
    // refresh them with the admin's own refresh token.
    const impersonating = !!sessionStorage.getItem('adflow_impersonate');
    if (!retried && !impersonating) {
      refreshing = refreshing ?? refreshAccessToken().finally(() => { refreshing = null; });
      if (await refreshing) return request<T>(path, opts, true);
    }
    localStorage.removeItem('adflow_token');
    localStorage.removeItem('adflow_refresh');
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
