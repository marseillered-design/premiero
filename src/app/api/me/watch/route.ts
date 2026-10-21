import { NextResponse, type NextRequest } from 'next/server';
import { userFrom } from '@/lib/auth';
import { addItems, cleanItem, removeItem } from '@/lib/account';
import type { WatchItem } from '@/lib/types';

/** { add: WatchItem[] } добавляет (в том числе список из браузера при первом входе), { remove: key } убирает. */
export async function POST(req: NextRequest) {
  const user = await userFrom(req);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { add?: unknown[]; remove?: unknown } | null;
  if (Array.isArray(body?.add)) await addItems(user.sub, body.add.slice(0, 500).map(cleanItem).filter((x): x is WatchItem => !!x));
  if (typeof body?.remove === 'string' && /^(movie|tv|game)-\d+$/.test(body.remove)) await removeItem(user.sub, body.remove);
  return NextResponse.json({ ok: true });
}
