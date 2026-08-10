export function setToken(token: string): void {
  localStorage.setItem('adflow_token', token);
}

export function getToken(): string | null {
  return localStorage.getItem('adflow_token');
}

export function setUser(user: unknown): void {
  localStorage.setItem('adflow_user', JSON.stringify(user));
}

export function getUser(): unknown {
  const u = localStorage.getItem('adflow_user');
  if (!u) return null;
  try {
    return JSON.parse(u);
  } catch {
    return null;
  }
}

export function clearAuth(): void {
  localStorage.removeItem('adflow_token');
  localStorage.removeItem('adflow_user');
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

// Impersonation helpers — stored in sessionStorage so they don't persist across tabs/windows
export function startImpersonation(impersonateToken: string): void {
  const adminToken = localStorage.getItem('adflow_token');
  if (adminToken) sessionStorage.setItem('adflow_admin_token', adminToken);
  sessionStorage.setItem('adflow_impersonate', impersonateToken);
}

export function stopImpersonation(): void {
  sessionStorage.removeItem('adflow_impersonate');
  sessionStorage.removeItem('adflow_admin_token');
}

export function getImpersonateToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('adflow_impersonate');
}

export function isImpersonating(): boolean {
  return !!getImpersonateToken();
}
