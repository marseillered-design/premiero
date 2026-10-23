import type { NextRequest } from 'next/server';
import { hasKv } from '@/lib/kv';
import { translator } from '@/lib/i18n';
import { LANG_CODES } from '@/lib/regions';
import { hasTelegram, linkChat, send, sendWithPosters, subOfChat, tgUser, unlinkSub, webhookSecret } from '@/lib/telegram';
import { dayKey, upcomingList, userRegion } from '@/lib/reminders';
import { SITE } from '@/lib/site';
import type { Lang } from '@/lib/types';

interface Update { message?: { text?: string; chat: { id: number; type: string }; from?: { language_code?: string } } }

/** Сюда Telegram присылает сообщения боту (адрес задаёт ensureWebhook). */
export async function POST(req: NextRequest) {
  if (!hasTelegram() || !hasKv()) return new Response('Not found', { status: 404 });
  if (req.headers.get('x-telegram-bot-api-secret-token') !== webhookSecret()) return new Response('Forbidden', { status: 403 });
  const msg = ((await req.json().catch(() => null)) as Update | null)?.message;
  if (!msg?.text || msg.chat.type !== 'private') return Response.json({ ok: true });
  const chat = msg.chat.id;
  const code = (msg.from?.language_code ?? '').slice(0, 2);
  const guess: Lang = (LANG_CODES as readonly string[]).includes(code) ? (code as Lang) : 'en';
  const [cmd, arg] = msg.text.trim().split(/\s+/, 2);

  try {
    if (cmd === '/start' && arg) {
      const link = await linkChat(arg, chat);
      if (link) await send(chat, translator(link.lang)('tg_linked'));
      else await send(chat, translator(guess)('tg_bad'));
    } else if (cmd === '/stop') {
      const sub = await subOfChat(chat);
      const u = sub ? await tgUser(sub) : null;
      if (sub) await unlinkSub(sub);
      await send(chat, translator(u ? userRegion(u).lang : guess)('tg_off'));
    } else {
      const sub = await subOfChat(chat);
      const u = sub ? await tgUser(sub) : null;
      if (!u) await send(chat, translator(guess)('tg_hello', `${SITE}/${guess}/my`));
      else if (cmd === '/list') { const l = await upcomingList(u, dayKey(new Date())); await sendWithPosters(chat, l.text, l.posters); }
      else await send(chat, translator(userRegion(u).lang)('tg_help'));
    }
  } catch (e) {
    console.error('tg webhook', e);
  }
  // Telegram повторяет запрос, если не получил 200, поэтому отвечаем «ок» и при ошибке
  return Response.json({ ok: true });
}
