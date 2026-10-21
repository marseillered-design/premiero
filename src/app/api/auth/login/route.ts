import { NextResponse, type NextRequest } from 'next/server';
import { hasGoogle, safeNext, startFlow } from '@/lib/auth';

/** Кнопка «Войти»: уводим на Google, после входа он вернёт на /api/auth/callback. */
export async function GET(req: NextRequest) {
  if (!hasGoogle()) return NextResponse.redirect(new URL(safeNext(req.nextUrl.searchParams.get('next')), req.url));
  const { url, cookie } = await startFlow(req);
  const res = NextResponse.redirect(url);
  res.cookies.set(cookie.name, cookie.value, cookie.options);
  return res;
}
