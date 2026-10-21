import { NextResponse, type NextRequest } from 'next/server';
import { userFrom } from '@/lib/auth';
import { isCountry } from '@/lib/regions';
import { saveSubs } from '@/lib/account';

export async function PUT(req: NextRequest) {
  const user = await userFrom(req);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { country?: unknown; ids?: unknown } | null;
  const ids = Array.isArray(body?.ids) ? body.ids.filter((x): x is number => Number.isInteger(x)).slice(0, 100) : null;
  if (!isCountry(body?.country) || !ids) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  await saveSubs(user.sub, body.country, ids);
  return NextResponse.json({ ok: true });
}
