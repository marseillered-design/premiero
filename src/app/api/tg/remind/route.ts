import { connection, type NextRequest } from 'next/server';
import { hasKv } from '@/lib/kv';
import { ensureWebhook, firstSendToday, hasTelegram, sendWithPosters, tgUser, tgUsers, unlinkSub } from '@/lib/telegram';
import { dayKey, morningDigest } from '@/lib/reminders';
import { firstMail, hasMail, mailSubs, mailUser, sendMail, type MailKind } from '@/lib/mail';
import { reminderMail, unsubUrl, weeklyMail } from '@/lib/mail-content';

export const maxDuration = 300;

/** Пройти по списку в несколько потоков: TMDB и почта не любят сотни запросов разом. */
async function each(list: string[], work: (sub: string) => Promise<void>) {
  let next = 0;
  await Promise.all(Array.from({ length: 4 }, async () => { while (next < list.length) await work(list[next++]); }));
}

/**
 * Утренние напоминания (vercel.json → crons, 07:00 UTC — это 9–10 утра в Украине и Польше):
 * в Telegram и на почту — что из списка выходит сегодня и завтра; по понедельникам ещё письмо с подборкой недели.
 */
export async function GET(req: NextRequest) {
  await connection(); // запускается по расписанию, а не собирается заранее при сборке
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) return Response.json({ error: 'unauthorized' }, { status: 401 });
  if (!hasKv()) return Response.json({ skipped: 'not configured' });
  const today = dayKey(new Date());
  return Response.json({ telegram: await telegram(today), mail: await mail(today) });
}

async function telegram(today: string) {
  if (!hasTelegram()) return 'off';
  if (process.env.VERCEL_ENV === 'production' && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    await ensureWebhook(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`).catch(e => console.error('tg webhook', e));
  }
  const subs = await tgUsers();
  let sent = 0, gone = 0, failed = 0;
  await each(subs, async sub => {
    try {
      const u = await tgUser(sub);
      if (!u) { await unlinkSub(sub); return; }
      const digest = await morningDigest(u, today);
      if (!digest || !(await firstSendToday(sub, today))) return;
      await sendWithPosters(u.chat, digest.text, digest.posters);
      sent++;
    } catch (e) {
      // 403 — пользователь заблокировал бота: больше ему не пишем
      if (String(e).includes('403') || /blocked|deactivated|chat not found/i.test(String(e))) { await unlinkSub(sub).catch(() => {}); gone++; }
      else { failed++; console.error('tg remind', sub, e); }
    }
  });
  return { users: subs.length, sent, gone, failed };
}

async function mail(today: string) {
  if (!hasMail()) return 'off';
  const monday = new Date(today + 'T12:00:00Z').getUTCDay() === 1;
  const kinds: MailKind[] = monday ? ['r', 'w'] : ['r'];
  const out: Record<string, { users: number; sent: number; failed: number }> = {};
  for (const kind of kinds) {
    const subs = await mailSubs(kind);
    let sent = 0, failed = 0;
    await each(subs, async sub => {
      try {
        const u = await mailUser(sub);
        if (!u || !u.tok || !(kind === 'r' ? u.remind : u.weekly)) return;
        const m = kind === 'r' ? await reminderMail(u, today) : await weeklyMail(u, today);
        if (!m || !(await firstMail(sub, kind, today))) return;
        await sendMail({ to: u.email, subject: m.subject, html: m.html, text: m.text, unsub: unsubUrl(u, kind) });
        sent++;
      } catch (e) { failed++; console.error('mail', kind, sub, e); }
    });
    out[kind === 'r' ? 'reminders' : 'weekly'] = { users: subs.length, sent, failed };
  }
  return out;
}
