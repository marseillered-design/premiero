import { NextResponse, type NextRequest } from 'next/server';
import { userFrom } from '@/lib/auth';
import { hasKv } from '@/lib/kv';
import { isCountry, isLang } from '@/lib/regions';
import { translator } from '@/lib/i18n';
import { botUsername, ensureWebhook, hasTelegram, newLinkCode, send, tgUser, unlinkSub } from '@/lib/telegram';

const PRIVATE = { 'Cache-Control': 'private, no-store' };
const enabled = () => hasTelegram() && hasKv();

/** Подключены ли напоминания в Telegram. */
export async function GET(req: NextRequest) {
  const user = await userFrom(req);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!enabled()) return NextResponse.json({ enabled: false, linked: false }, { headers: PRIVATE });
  return NextResponse.json({ enabled: true, linked: !!(await tgUser(user.sub)) }, { headers: PRIVATE });
}

/** Ссылка t.me/<бот>?start=<код>: по ней Telegram откроет бота, и он свяжет чат с аккаунтом. */
export async function POST(req: NextRequest) {
  const user = await userFrom(req);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!enabled()) return NextResponse.json({ error: 'disabled' }, { status: 503 });
  const body = (await req.json().catch(() => null)) as { country?: unknown; lang?: unknown } | null;
  if (!isCountry(body?.country) || !isLang(body?.lang)) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  // на рабочем сайте заодно проверяем, что Telegram шлёт сообщения бота сюда
  if (process.env.VERCEL_ENV === 'production' && process.env.VERCEL_PROJECT_PRODUCTION_URL) await ensureWebhook(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`).catch(e => console.error('tg webhook', e));
  const [code, bot] = await Promise.all([newLinkCode(user.sub, body.lang, body.country), botUsername()]);
  return NextResponse.json({ url: `https://t.me/${bot}?start=${code}` }, { headers: PRIVATE });
}

/** Отключить напоминания. */
export async function DELETE(req: NextRequest) {
  const user = await userFrom(req);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!enabled()) return NextResponse.json({ linked: false }, { headers: PRIVATE });
  const u = await tgUser(user.sub);
  const chat = await unlinkSub(user.sub);
  if (chat && u) await send(chat, translator(isLang(u.lang) ? u.lang : 'en')('tg_off')).catch(() => {});
  return NextResponse.json({ linked: false }, { headers: PRIVATE });
}
