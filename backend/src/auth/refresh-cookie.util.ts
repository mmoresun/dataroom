import { Response } from 'express';

export const REFRESH_COOKIE_NAME = 'refreshToken';

/** herokuapp.com is on the Public Suffix List (deliberately, so each customer app is its
 * own "site"), so frontend/backend count as genuinely cross-site in production and need
 * `SameSite=None; Secure`. Locally (localhost:5173 vs :3001) it's same-site — SameSite only
 * cares about the registrable domain, not the port — so a plain `Lax` cookie over http works. */
function cookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    path: '/',
    secure: isProduction,
    sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
  };
}

export function setRefreshCookie(response: Response, token: string): void {
  response.cookie(REFRESH_COOKIE_NAME, token, cookieOptions());
}

export function clearRefreshCookie(response: Response): void {
  response.clearCookie(REFRESH_COOKIE_NAME, cookieOptions());
}
