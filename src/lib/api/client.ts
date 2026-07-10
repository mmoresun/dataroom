// Baked in at build time by Vite — must be set wherever this app is actually built,
// not just in CI. Heroku's own buildpack rebuilds this app on every push too, so
// VITE_API_URL needs to be a Heroku config var on the frontend app as well, or every
// request silently ends up at this app's own origin ("/undefined/...") instead of the
// real backend.
const API_URL = import.meta.env.VITE_API_URL;

/** Shared source of truth for the persisted access token — read here on every
 * request, and by AuthProvider when it writes/clears it on login/logout. */
export const TOKEN_KEY = 'dataroom-auth-token';

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string>;

  constructor(message: string, status: number, errors?: Record<string, string>) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
}

/** "incorrectPassword" -> "Incorrect password" */
function humanizeErrorCode(code: string): string {
  const spaced = code.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * The backend uses two different error-body shapes: the standard Nest HTTP-exception
 * shape (`{ message: string | string[] }`, e.g. 404s or class-validator ValidationPipe
 * errors), and this boilerplate's own convention for domain failures like a wrong
 * password (`{ errors: { <field>: <code> } }`, e.g. `{ errors: { password: 'incorrectPassword' } }`).
 */
function extractErrorMessage(data: unknown, status: number): string {
  const body = data as { message?: unknown; errors?: Record<string, string> } | undefined;
  if (body?.message) {
    return Array.isArray(body.message) ? body.message.join(', ') : String(body.message);
  }
  if (body?.errors) {
    const firstCode = Object.values(body.errors)[0];
    if (firstCode) return humanizeErrorCode(firstCode);
  }
  return `Request failed (${status})`;
}

/** Thin fetch wrapper for the backend API — JSON in, JSON out, throws ApiError on non-2xx.
 * Attaches the persisted access token automatically; callers never pass it explicitly. */
export async function apiFetch<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const res = await fetch(`${API_URL}${path}`, {
    method: opts.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => undefined);

  if (!res.ok) {
    const body = data as { errors?: Record<string, string> } | undefined;
    throw new ApiError(extractErrorMessage(data, res.status), res.status, body?.errors);
  }
  return data as T;
}
