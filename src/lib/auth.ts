import { SignJWT, createRemoteJWKSet, jwtVerify } from 'jose';
import type { NextRequest } from 'next/server';

/*
 * Вход через Google (OAuth 2.0, код авторизации + PKCE). Паролей сайт не хранит.
 * Ключи: GOOGLE_CLIENT_ID и GOOGLE_CLIENT_SECRET из Google Cloud, AUTH_SECRET — любая длинная
 * случайная строка для подписи куки сессии.
 */
export const SESSION_COOKIE = 'premiero_session';
export const FLOW_COOKIE = 'premiero_oauth';
const SESSION_DAYS = 180;

export const hasGoogle = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.AUTH_SECRET);
const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET!);

export interface User { sub: string; name: string; email: string; picture: string | null }

/* ---------- подписанные куки ---------- */
async function sign(payload: Record<string, unknown>, ttl: string) {
  return new SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime(ttl).sign(secret());
}
async function verify<T>(value: string | undefined): Promise<T | null> {
  if (!value || !process.env.AUTH_SECRET) return null;
  try { return (await jwtVerify(value, secret(), { algorithms: ['HS256'] })).payload as T; } catch { return null; }
}

export const sessionCookie = async (u: User) => ({
  name: SESSION_COOKIE, value: await sign({ ...u }, `${SESSION_DAYS}d`),
  options: { httpOnly: true, secure: true, sameSite: 'lax' as const, path: '/', maxAge: SESSION_DAYS * 86400 },
});
export async function userFrom(req: NextRequest): Promise<User | null> {
  const p = await verify<User>(req.cookies.get(SESSION_COOKIE)?.value);
  return p?.sub ? { sub: p.sub, name: p.name, email: p.email, picture: p.picture ?? null } : null;
}

/* ---------- шаги входа ---------- */
const b64url = (buf: ArrayBuffer | Uint8Array) => Buffer.from(buf instanceof Uint8Array ? buf : new Uint8Array(buf)).toString('base64url');
const random = (n = 32) => b64url(crypto.getRandomValues(new Uint8Array(n)));

/** Куда вернуть после входа: только свои относительные адреса. */
export const safeNext = (v: string | null) => (v && v.startsWith('/') && !v.startsWith('//') && !v.startsWith('/\\') ? v : '/');
export const redirectUri = (req: NextRequest) => `${req.nextUrl.origin}/api/auth/callback`;

export async function startFlow(req: NextRequest) {
  const state = random(), verifier = random(48);
  const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!, redirect_uri: redirectUri(req), response_type: 'code',
    scope: 'openid email profile', state, code_challenge: challenge, code_challenge_method: 'S256', prompt: 'select_account',
  }).toString();
  const flow = await sign({ state, verifier, next: safeNext(req.nextUrl.searchParams.get('next')) }, '10m');
  return { url, cookie: { name: FLOW_COOKIE, value: flow, options: { httpOnly: true, secure: true, sameSite: 'lax' as const, path: '/api/auth', maxAge: 600 } } };
}

const GOOGLE_KEYS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

/** Обмен кода на данные пользователя; null — если что-то не сошлось. */
export async function finishFlow(req: NextRequest): Promise<{ user: User; next: string } | null> {
  const flow = await verify<{ state: string; verifier: string; next: string }>(req.cookies.get(FLOW_COOKIE)?.value);
  const code = req.nextUrl.searchParams.get('code'), state = req.nextUrl.searchParams.get('state');
  if (!flow || !code || !state || state !== flow.state) return null;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', cache: 'no-store',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code, client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(req), grant_type: 'authorization_code', code_verifier: flow.verifier,
    }),
  });
  if (!res.ok) return null;
  const { id_token } = (await res.json()) as { id_token?: string };
  if (!id_token) return null;
  try {
    const { payload: p } = await jwtVerify(id_token, GOOGLE_KEYS, { issuer: ['https://accounts.google.com', 'accounts.google.com'], audience: process.env.GOOGLE_CLIENT_ID! });
    if (!p.sub || !p.email || p.email_verified === false) return null;
    return {
      user: { sub: p.sub, email: String(p.email), name: String(p.name ?? p.email), picture: typeof p.picture === 'string' ? p.picture : null },
      next: flow.next,
    };
  } catch { return null; }
}
