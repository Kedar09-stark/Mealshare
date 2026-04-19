export interface AuthUser {
  id: number;
  username: string;
  email?: string;
  role: string;
}

export const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000';

export function getToken(): string | null {
  return localStorage.getItem('ms_token');
}

export function getUser(): AuthUser | null {
  const raw = localStorage.getItem('ms_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

// Alias for compatibility with components expecting getCurrentUser
export const getCurrentUser = getUser;

export function setAuth(token: string, user: AuthUser) {
  localStorage.setItem('ms_token', token);
  localStorage.setItem('ms_user', JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem('ms_token');
  localStorage.removeItem('ms_user');
}

export async function apiLogin(username: string, password: string) {
  const res = await fetch(`${API_BASE}/api/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Login failed');
  }
  return res.json();
}

export async function apiRegister(payload: { username: string; email?: string; password: string; role: string; businessLicenseNumber?: string; ngoRegistrationNumber?: string; }) {
  const res = await fetch(`${API_BASE}/api/register/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Register failed');
  }
  return res.json();
}

export function authHeader() {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}
