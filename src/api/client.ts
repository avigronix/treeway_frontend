import { clearToken, emitAuthEvent, getToken } from '@/auth/token';

// Every backend response is {msg, status, data}. Errors also carry data.error.
export const API_BASE = '/api/v1';
const DEFAULT_TIMEOUT_MS = 20_000;

export const MSG = {
  network: 'No internet. Please check your connection and try again.',
  timeout: 'The network is slow. Please check your connection.',
  server: 'Something went wrong. Please try again.',
  tooMany: 'Too many tries. Please wait a few minutes.',
  loginAgain: 'Please log in again.',
  blocked: 'This ID is blocked. Please contact support.',
} as const;

/** Backend error names (data.error) plus the ones the app adds for network trouble. */
export type ApiErrorName =
  | 'Unauthorized'
  | 'Blocked'
  | 'Inactive'
  | 'Forbidden'
  | 'Validation Error'
  | 'Balance'
  | 'Duplicate'
  | 'Busy'
  | 'Cursor'
  | 'Mail'
  | 'Server'
  | 'Network'
  | 'Timeout'
  | 'Error'
  | (string & {});

export class ApiError extends Error {
  readonly status: number;
  readonly error: ApiErrorName;
  readonly data: unknown;

  constructor(status: number, error: ApiErrorName, msg: string, data?: unknown) {
    super(msg);
    this.name = 'ApiError';
    this.status = status;
    this.error = error;
    this.data = data;
  }

  /** 409 Busy: safe to offer a "Try again" button. */
  get isBusy(): boolean {
    return this.status === 409 && this.error === 'Busy';
  }
  /** 409 Duplicate: it was already done. Refresh, do not repeat. */
  get isDuplicate(): boolean {
    return this.status === 409 && this.error !== 'Busy';
  }
  /** No answer from the server (offline or timeout). For money actions: refresh data, never retry blindly. */
  get isNoAnswer(): boolean {
    return this.status === 0;
  }
}

export interface Envelope<T> {
  msg: string;
  status: number;
  data: T;
}

export type QueryParams = Record<string, string | number | boolean | null | undefined>;

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  query?: QueryParams;
  /** JSON body */
  json?: unknown;
  /** multipart body (file uploads) */
  form?: FormData;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export function buildUrl(path: string, query?: QueryParams): URL {
  const url = new URL(API_BASE + path, window.location.origin);
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  }
  return url;
}

function isEnvelope(x: unknown): x is Envelope<unknown> {
  return typeof x === 'object' && x !== null && 'status' in x && 'msg' in x;
}

/** Full response, for the few screens that need the status (e.g. 202 = waiting for a second admin). */
export async function apiEnvelope<T>(path: string, opts: ApiOptions = {}): Promise<Envelope<T>> {
  const token = getToken();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let body: BodyInit | undefined;
  if (opts.form) body = opts.form;
  else if (opts.json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.json);
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new ApiError(0, 'Network', MSG.network);
  }

  // Our own timeout, joined with the caller's signal (TanStack Query cancels old requests).
  const ctrl = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    ctrl.abort();
  }, opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const onCallerAbort = () => ctrl.abort();
  opts.signal?.addEventListener('abort', onCallerAbort, { once: true });

  let res: Response;
  try {
    res = await fetch(buildUrl(path, opts.query), {
      method: opts.method ?? (body ? 'POST' : 'GET'),
      headers,
      body,
      signal: ctrl.signal,
      credentials: 'omit',
      cache: 'no-store',
    });
  } catch (err) {
    if (timedOut) throw new ApiError(0, 'Timeout', MSG.timeout);
    if (opts.signal?.aborted) throw err; // cancelled by the caller: not an error to show
    throw new ApiError(0, 'Network', MSG.network);
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', onCallerAbort);
  }

  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    payload = null; // e.g. an HTML 502 page from nginx
  }

  const env = isEnvelope(payload) ? (payload as Envelope<T>) : null;
  const status = env?.status ?? res.status;

  if (res.ok && status < 400 && env) return env;

  const data = env?.data as { error?: string } | null | undefined;
  const name: ApiErrorName = data?.error ?? (status >= 500 ? 'Server' : 'Error');
  let msg = env?.msg || '';

  if (status === 401) {
    // A 401 with a token = the session ended (expired, logout-all, password change). A 401 without a
    // token is a normal form error, e.g. "Wrong ID or password." on the login screen.
    // The reason is set BEFORE the token goes, so every guard that re-renders already knows where to send them.
    if (token) {
      msg = MSG.loginAgain;
      emitAuthEvent({ type: 'logout', msg });
      clearToken();
    }
  } else if (status === 403 && name === 'Blocked') {
    emitAuthEvent({ type: 'blocked', msg: msg || MSG.blocked });
    clearToken();
  } else if (status === 429) {
    msg ||= MSG.tooMany;
  }
  if (!msg || (status >= 500 && !env)) msg = MSG.server;

  throw new ApiError(status, name, msg, env?.data);
}

/** Returns `data` of the response, or throws ApiError. */
export async function api<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  return (await apiEnvelope<T>(path, opts)).data;
}
