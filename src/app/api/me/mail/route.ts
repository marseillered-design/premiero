import { NextResponse, type NextRequest } from 'next/server';
import { userFrom } from '@/lib/auth';
import { hasKv } from '@/lib/kv';
import { isCountry, isLang } from '@/lib/regions';
import { hasMail, mailUser, setMail } from '@/lib/mail';

const PRIVATE = { 'Cache-Control': 'private, no-store' };

/** Какие письма включены и на какой адрес они придут. */
export async function GET(req: NextRequest) {
  const user = await userFrom(req);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!hasMail() || !hasKv()) return NextResponse.json({ enabled: false }, { headers: PRIVATE });
  const m = await mailUser(user.sub);
  return NextResponse.json({ enabled: true, email: user.email, remind: !!m?.remind, weekly: !!m?.weekly }, { headers: PRIVATE });
}

/** { remind, weekly, lang, country } — включить или выключить письма. */
export async function POST(req: NextRequest) {
  const user = await userFrom(req);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!hasMail() || !hasKv()) return NextResponse.json({ error: 'disabled' }, { status: 503 });
  const b = (await req.json().catch(() => null)) as { remind?: unknown; weekly?: unknown; lang?: unknown; country?: unknown } | null;
  if (!b || !isLang(b.lang) || !isCountry(b.country)) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  await setMail(user.sub, { remind: b.remind === true, weekly: b.weekly === true, lang: b.lang, country: b.country });
  return NextResponse.json({ ok: true, remind: b.remind === true, weekly: b.weekly === true }, { headers: PRIVATE });
}
