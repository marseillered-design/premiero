import { connection, type NextRequest } from 'next/server';
import { hasKv } from '@/lib/kv';
import { ensureWebhook, firstSendToday, hasTelegram, sendWithPosters, tgUser, tgUsers, unlinkSub } from '@/lib/telegram';
import { dayKey, morningDigest } from '@/lib/reminders';

export const maxDuration = 300;

/**
 * Утренние напоминания (vercel.json → crons, 07:00 UTC — это 9–10 утра в Украине и Польше):
 * каждому, кто подключил Telegram, — что из его списка выходит сегодня и завтра.
 */
export async function GET(req: NextRequest) {
  await connection(); // запускается по расписанию, а не собирается заранее при сборке
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) return Response.json({ error: 'unauthorized' }, { status: 401 });
  if (!hasTelegram() || !hasKv()) return Response.json({ skipped: 'not configured' });
  if (process.env.VERCEL_ENV === 'production' && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    await ensureWebhook(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`).catch(e => console.error('tg webhook', e));
  }

  const today = dayKey(new Date());
  const subs = await tgUsers();
  let sent = 0, gone = 0, failed = 0, next = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (next < subs.length) {
      const sub = subs[next++];
      try {
        const u = await tgUser(sub);
        if (!u) { await unlinkSub(sub); continue; }
        const digest = await morningDigest(u, today);
        if (!digest || !(await firstSendToday(sub, today))) continue;
        await sendWithPosters(u.chat, digest.text, digest.posters);
        sent++;
      } catch (e) {
        // 403 — пользователь заблокировал бота: больше ему не пишем
        if (String(e).includes('403') || /blocked|deactivated|chat not found/i.test(String(e))) { await unlinkSub(sub).catch(() => {}); gone++; }
        else { failed++; console.error('tg remind', sub, e); }
      }
    }
  }));
  return Response.json({ users: subs.length, sent, gone, failed });
}
