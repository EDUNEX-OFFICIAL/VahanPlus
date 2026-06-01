import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SEC } from '@vahanplus/contracts';

export { SESSION_COOKIE_NAME };

function baseCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  };
}

export function getSessionCookieOptions() {
  return {
    ...baseCookieOptions(),
    maxAge: SESSION_MAX_AGE_SEC * 1000,
  };
}

export function getClearSessionCookieOptions() {
  return {
    ...baseCookieOptions(),
    maxAge: 0,
  };
}

export function getTokenFromRequest(req) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    return header.slice(7);
  }
  const cookieToken = req.cookies?.[SESSION_COOKIE_NAME];
  return typeof cookieToken === 'string' && cookieToken.length > 0 ? cookieToken : null;
}
