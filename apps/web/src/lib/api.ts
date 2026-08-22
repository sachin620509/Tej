import type { ApiFailure, ApiResponse } from '@instaframe/contracts';

export class ApiError extends Error {
  constructor(public code: string, message: string, public status: number) { super(message); }
}

let accessToken: string | null = null;
export const setAccessToken = (token: string | null) => { accessToken = token; };
export const getAccessToken = () => accessToken;

export async function api<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has('content-type')) headers.set('content-type', 'application/json');
  if (accessToken) headers.set('authorization', `Bearer ${accessToken}`);
  const response = await fetch(path, { ...init, headers, credentials: 'include' });
  if (response.status === 401 && retry && path !== '/api/auth/refresh') {
    const refreshed = await refreshAccessToken();
    if (refreshed) return api<T>(path, init, false);
  }
  const body = await response.json() as ApiResponse<T>;
  if (!response.ok || !body.success) {
    const failure = body as ApiFailure;
    throw new ApiError(failure.code ?? 'REQUEST_FAILED', failure.message ?? 'Request failed', response.status);
  }
  return body.data;
}

export async function refreshAccessToken() {
  try {
    const response = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
    const body = await response.json() as ApiResponse<{ accessToken: string }>;
    if (!response.ok || !body.success) throw new Error();
    setAccessToken(body.data.accessToken);
    return true;
  } catch {
    setAccessToken(null);
    return false;
  }
}
