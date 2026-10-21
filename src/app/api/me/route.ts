import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, hasGoogle, userFrom } from '@/lib/auth';
import { hasKv } from '@/lib/kv';
import { deleteAccount, loadAccount } from '@/lib/account';

const PRIVATE = { 'Cache-Control': 'private, no-store' };

/** Кто вошёл и что у него сохранено. Страницы сайта общие и кэшируются, личное приходит отсюда. */
export async function GET(req: NextRequest) {
  const enabled = hasGoogle() && hasKv();
  const user = enabled ? await userFrom(req) : null;
  if (!user) return NextResponse.json({ enabled, user: null }, { headers: PRIVATE });
  const data = await loadAccount(user.sub);
  return NextResponse.json({ enabled, user: { name: user.name, email: user.email, picture: user.picture }, ...data }, { headers: PRIVATE });
}

/** Удалить аккаунт: профиль, список и подписки стираются сразу. */
export async function DELETE(req: NextRequest) {
  const user = await userFrom(req);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  await deleteAccount(user.sub);
  const res = NextResponse.json({ ok: true }, { headers: PRIVATE });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
