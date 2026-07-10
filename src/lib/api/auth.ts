import { apiFetch } from '@/lib/api/client';

export interface User {
  id: number;
  email: string | null;
  provider: string;
  socialId?: string | null;
  firstName: string | null;
  lastName: string | null;
  photo?: { id: string; path: string } | null;
  role?: { id: number; name: string } | null;
  status?: { id: number; name: string };
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  tokenExpires: number;
  user: User;
}

export function loginWithEmail(email: string, password: string): Promise<LoginResponse> {
  return apiFetch('/auth/email/login', { method: 'POST', body: { email, password } });
}

export function loginWithGoogle(idToken: string): Promise<LoginResponse> {
  return apiFetch('/auth/google/login', { method: 'POST', body: { idToken } });
}

export function register(email: string, password: string, firstName: string, lastName: string): Promise<void> {
  return apiFetch('/auth/email/register', { method: 'POST', body: { email, password, firstName, lastName } });
}

export function fetchMe(): Promise<User> {
  return apiFetch('/auth/me');
}

export function logoutRequest(): Promise<void> {
  return apiFetch('/auth/logout', { method: 'POST' });
}
