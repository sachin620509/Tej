import type { ApiFailure, ApiResponse } from '@instaframe/contracts';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const expoHost = Constants.expoConfig?.hostUri?.split(':')[0];
export const API_ORIGIN = (process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '')) ??
  (Platform.OS === 'web'
    ? 'http://localhost:4000'
    : expoHost
      ? `http://${expoHost}:4000`
      : 'http://localhost:4000');

let accessToken: string | null = null;

const KEY = 'instaframe.refreshToken';

export class ApiError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

export const setAccess = (value: string | null) => {
  accessToken = value;
};

export const getAccess = () => accessToken;

export async function mobileApi<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  const headers = new Headers(init.headers);

  headers.set('x-instaframe-client', 'mobile');

  if (init.body && !(init.body instanceof FormData)) {
    headers.set('content-type', 'application/json');
  }

  if (accessToken) {
    headers.set('authorization', `Bearer ${accessToken}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_ORIGIN}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(
      'NETWORK_UNAVAILABLE',
      `Cannot reach InstaFrame at ${API_ORIGIN}. Keep the API running and connect this phone to the same Wi-Fi.`,
    );
  }

  if (response.status === 401 && retry && await refresh()) {
    return mobileApi<T>(path, init, false);
  }

  let body: ApiResponse<T>;
  try {
    body = await response.json() as ApiResponse<T>;
  } catch {
    throw new ApiError('INVALID_SERVER_RESPONSE', 'The InstaFrame server returned an invalid response');
  }

  if (!response.ok || !body.success) {
    const failure = body as ApiFailure;
    throw new ApiError(failure.code, failure.message);
  }

  return body.data;
}

const webStorage = () =>
  typeof globalThis !== 'undefined' && 'sessionStorage' in globalThis
    ? globalThis.sessionStorage
    : undefined;

async function storeRefresh(value: string) {
  if (Platform.OS === 'web') {
    webStorage()?.setItem(KEY, value);
    return;
  }

  await SecureStore.setItemAsync(KEY, value, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

async function readRefresh() {
  if (Platform.OS === 'web') {
    return webStorage()?.getItem(KEY) ?? null;
  }

  return SecureStore.getItemAsync(KEY);
}

async function removeRefresh() {
  if (Platform.OS === 'web') {
    webStorage()?.removeItem(KEY);
    return;
  }

  await SecureStore.deleteItemAsync(KEY);
}

export async function saveSession(data: {
  accessToken: string;
  refreshToken: string;
}) {
  setAccess(data.accessToken);
  await storeRefresh(data.refreshToken);
}

export async function refresh() {
  const token = await readRefresh();

  if (!token) return false;

  try {
    const data = await mobileApi<{
      accessToken: string;
      refreshToken: string;
    }>(
      '/api/auth/refresh',
      {
        method: 'POST',
        body: JSON.stringify({
          refreshToken: token,
        }),
      },
      false,
    );

    await saveSession(data);
    return true;
  } catch {
    await clearSession();
    return false;
  }
}

export async function clearSession() {
  setAccess(null);
  await removeRefresh();
}

export async function storedRefresh() {
  return readRefresh();
}
