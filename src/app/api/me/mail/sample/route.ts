import { NextResponse, type NextRequest } from 'next/server';
import { userFrom } from '@/lib/auth';
import { hasKv, kv } from '@/lib/kv';
import { hasMail, mailUser, sendMail } from '@/lib/mail';
import { reminderMail, unsubUrl, weeklyMail } from '@/lib/mail-content';
import { dayKey } from '@/lib/reminders';

/** «Прислать пример письма»: подборка недели прямо сейчас — себе на почту, не чаще трёх раз в сутки. */
export async function POST(req: NextRequest) {
  const user = await userFrom(req);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!hasMail() || !hasKv()) return NextResponse.json({ error: 'disabled' }, { status: 503 });
  const u = await mailUser(user.sub);
  if (!u?.tok || !(u.remind || u.weekly)) return NextResponse.json({ error: 'off' }, { status: 400 });
  const [n] = await kv(['INCR', `mlx:${user.sub}`], ['EXPIRE', `mlx:${user.sub}`, 86400, 'NX']);
  if (Number(n) > 3) return NextResponse.json({ error: 'limit' }, { status: 429 });
  const today = dayKey(new Date());
  const m = (await weeklyMail(u, today)) ?? (await reminderMail(u, today));
  if (!m) return NextResponse.json({ error: 'empty' }, { status: 404 });
  try {
    await sendMail({ to: u.email, subject: m.subject, html: m.html, text: m.text, unsub: unsubUrl(u, 'w') });
  } catch (e) {
    console.error('mail sample', e);
    return NextResponse.json({ error: 'send' }, { status: 502 });
  }
  return NextResponse.json({ ok: true, to: u.email });
}
