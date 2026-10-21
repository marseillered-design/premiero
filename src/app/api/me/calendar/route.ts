import { NextResponse, type NextRequest } from 'next/server';
import { userFrom } from '@/lib/auth';
import { calToken, dropCalToken, newCalToken } from '@/lib/account';
import { isCountry, isLang } from '@/lib/regions';

const PRIVATE = { 'Cache-Control': 'private, no-store' };
const link = (req: NextRequest, token: string | null) => (token ? `${req.nextUrl.origin}/api/cal/${token}.ics` : null);

/** Ссылка на календарь «Моего списка»: узнать, создать (или заменить на новую), отключить. */
export async function GET(req: NextRequest) {
  const user = await userFrom(req);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json({ url: link(req, await calToken(user.sub)) }, { headers: PRIVATE });
}
export async function POST(req: NextRequest) {
  const user = await userFrom(req);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { country?: unknown; lang?: unknown } | null;
  if (!isCountry(body?.country) || !isLang(body?.lang)) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  return NextResponse.json({ url: link(req, await newCalToken(user.sub, body.country, body.lang)) }, { headers: PRIVATE });
}
export async function DELETE(req: NextRequest) {
  const user = await userFrom(req);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  await dropCalToken(user.sub);
  return NextResponse.json({ url: null }, { headers: PRIVATE });
}
