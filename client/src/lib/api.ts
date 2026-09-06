import { enqueue, flushQueue, getCachedLesson, getCachedTemplate } from './offline';

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const TOKEN_KEY = 'sheettomate_access_token';

export class QueuedError extends Error {
  queued = true as const;
}

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    return;
  }
  localStorage.removeItem(TOKEN_KEY);
}

async function parseBody(res: Response): Promise<{ success?: boolean; message?: string; data?: unknown }> {
  return res.json().catch(() => ({}));
}

export async function api<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const online = typeof navigator === 'undefined' || navigator.onLine;

  if (!online && method !== 'GET' && method !== 'HEAD') {
    if (options.body instanceof FormData) {
      throw new ApiError(0, 'File uploads need a connection. Try again when you are online.');
    }
    await enqueue({
      path,
      method,
      body: typeof options.body === 'string' ? options.body : options.body ? JSON.stringify(options.body) : undefined,
    });
    throw new QueuedError('Saved offline. We will send this when you reconnect.');
  }

  if (!online && method === 'GET') {
    const cached = await readOfflineCache<T>(path);
    if (cached !== undefined) return cached;
  }

  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getAccessToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      credentials: 'include',
    });
  } catch {
    if (method === 'GET') {
      const cached = await readOfflineCache<T>(path);
      if (cached !== undefined) return cached;
    }
    throw new ApiError(0, 'Network error. Check your connection.');
  }

  if (res.status === 401 && retry && !path.startsWith('/auth/')) {
    const refreshed = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    const refreshJson = await parseBody(refreshed);
    const data = refreshJson.data as { accessToken?: string } | undefined;
    if (refreshed.ok && data?.accessToken) {
      setAccessToken(data.accessToken);
      return api<T>(path, options, false);
    }
    setAccessToken(null);
  }

  const json = await parseBody(res);
  if (!res.ok || json.success === false) {
    throw new ApiError(res.status, json.message ?? 'Request failed');
  }
  return json.data as T;
}

async function readOfflineCache<T>(path: string): Promise<T | undefined> {
  const tpl = await getCachedTemplate(path);
  if (tpl) return tpl as T;
  const lessonMatch = path.match(/\/lessons\/([^/?]+)/);
  if (lessonMatch) {
    const lesson = await getCachedLesson(lessonMatch[1]);
    if (lesson) return lesson as T;
  }
  return undefined;
}

export async function flushQueuedApi() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  await flushQueue(async (item) => {
    await api(item.path, { method: item.method, body: item.body });
  });
}
