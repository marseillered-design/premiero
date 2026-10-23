import { createHash } from 'node:crypto';
import { kv } from './kv';
import type { CountryCode, Lang } from './types';

/*
 * Бот-напоминалка в Telegram. Токен бота — TELEGRAM_BOT_TOKEN на Vercel (выдаёт @BotFather).
 * Данные в Redis:
 *   tgl:<код>        одноразовый код привязки (15 минут): кто нажал «Подключить Telegram» на сайте
 *   u:<sub> → tg     чат пользователя, tgLang / tgCountry — язык и страна для сообщений
 *   tg:<чат>         обратная ссылка: какой аккаунт привязан к чату (для /stop)
 *   tg:users         все аккаунты с включёнными напоминаниями
 *   tgs:<sub>:<день> напоминание за этот день уже отправлено
 */
const token = () => (process.env.TELEGRAM_BOT_TOKEN ?? '').trim();
export const hasTelegram = () => /^\d+:[\w-]{30,}$/.test(token());

/** Секрет, который Telegram присылает в заголовке каждого запроса к нашему адресу. Выводим из токена — отдельная переменная не нужна. */
export const webhookSecret = () => createHash('sha256').update(`premiero-webhook:${token()}`).digest('hex').slice(0, 48);

export async function tg<R = unknown>(method: string, body: Record<string, unknown> = {}): Promise<R> {
  const res = await fetch(`https://api.telegram.org/bot${token()}/${method}`, {
    method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; result?: R; description?: string };
  if (!data.ok) throw new Error(`Telegram ${method}: ${data.description ?? res.status}`);
  return data.result as R;
}

export const send = (chat: number | string, html: string) =>
  tg('sendMessage', { chat_id: chat, text: html, parse_mode: 'HTML', link_preview_options: { is_disabled: true } });

const CAPTION_MAX = 1024; // Telegram не принимает подписи к фото длиннее

/**
 * Сообщение с постерами: один постер — фото с подписью, несколько — альбом с подписью у первого.
 * Если Telegram не смог скачать картинку или текст не влезает в подпись, шлём просто текст.
 */
export async function sendWithPosters(chat: number | string, html: string, posters: string[]) {
  const photos = posters.slice(0, 10);
  if (photos.length && html.length <= CAPTION_MAX) {
    try {
      if (photos.length === 1) return await tg('sendPhoto', { chat_id: chat, photo: photos[0], caption: html, parse_mode: 'HTML' });
      return await tg('sendMediaGroup', {
        chat_id: chat,
        media: photos.map((url, i) => ({ type: 'photo', media: url, ...(i === 0 ? { caption: html, parse_mode: 'HTML' } : {}) })),
      });
    } catch (e) {
      // заблокированный бот — не повод слать текст ещё раз
      if (/403|blocked|deactivated|chat not found/i.test(String(e))) throw e;
    }
  }
  return send(chat, html);
}

/** Имя бота для ссылки t.me/<имя>: спрашиваем у Telegram один раз и запоминаем. */
let botName: string | null = null;
export async function botUsername() {
  if (!botName) botName = (await tg<{ username: string }>('getMe')).username;
  return botName;
}

/** Направить Telegram на наш адрес, если он ещё не туда (после покупки домена адрес сменится сам). */
export async function ensureWebhook(origin: string) {
  const url = `${origin}/api/tg`;
  const info = await tg<{ url: string }>('getWebhookInfo');
  if (info.url === url) return false;
  await tg('setWebhook', { url, secret_token: webhookSecret(), allowed_updates: ['message'], drop_pending_updates: true });
  await tg('setMyCommands', { commands: [{ command: 'list', description: 'Upcoming releases / Найближчі релізи' }, { command: 'stop', description: 'Turn off reminders / Вимкнути' }] }).catch(() => {});
  return true;
}

export const esc = (s: string) => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);

/* ---------- привязка чата к аккаунту ---------- */
interface LinkCode { sub: string; lang: Lang; country: CountryCode }

export async function newLinkCode(sub: string, lang: Lang, country: CountryCode) {
  const code = Buffer.from(crypto.getRandomValues(new Uint8Array(18))).toString('base64url');
  await kv(['SET', `tgl:${code}`, JSON.stringify({ sub, lang, country } satisfies LinkCode), 'EX', 900]);
  return code;
}

/** Чат прислал /start <код>: связываем его с аккаунтом. Возвращает язык аккаунта или null, если код не подошёл. */
export async function linkChat(code: string, chat: number): Promise<LinkCode | null> {
  if (!/^[\w-]{20,40}$/.test(code)) return null;
  const [raw] = await kv(['GETDEL', `tgl:${code}`]);
  let link: LinkCode;
  try { link = JSON.parse(String(raw)) as LinkCode; } catch { return null; }
  if (!raw || !link.sub) return null;
  const [oldChat, oldSub] = await kv(['HGET', `u:${link.sub}`, 'tg'], ['GET', `tg:${chat}`]);
  await kv(
    ...(oldChat && String(oldChat) !== String(chat) ? [['DEL', `tg:${oldChat}`]] : []),
    ...(oldSub && oldSub !== link.sub ? [['HDEL', `u:${oldSub}`, 'tg', 'tgLang', 'tgCountry'], ['SREM', 'tg:users', String(oldSub)]] : []),
    ['HSET', `u:${link.sub}`, 'tg', String(chat), 'tgLang', link.lang, 'tgCountry', link.country],
    ['SET', `tg:${chat}`, link.sub],
    ['SADD', 'tg:users', link.sub],
  );
  return link;
}

export async function unlinkSub(sub: string) {
  const [chat] = await kv(['HGET', `u:${sub}`, 'tg']);
  await kv(
    ...(chat ? [['DEL', `tg:${chat}`]] : []),
    ['HDEL', `u:${sub}`, 'tg', 'tgLang', 'tgCountry'],
    ['SREM', 'tg:users', sub],
  );
  return chat ? String(chat) : null;
}

export async function subOfChat(chat: number) {
  const [sub] = await kv(['GET', `tg:${chat}`]);
  return sub ? String(sub) : null;
}

export interface TgUser { sub: string; chat: string; lang: string; country: string }
export async function tgUser(sub: string): Promise<TgUser | null> {
  const [vals] = await kv(['HMGET', `u:${sub}`, 'tg', 'tgLang', 'tgCountry']);
  const [chat, lang, country] = Array.isArray(vals) ? (vals as (string | null)[]) : [];
  return chat ? { sub, chat, lang: lang ?? 'en', country: country ?? 'us' } : null;
}
export async function tgUsers() {
  const [subs] = await kv(['SMEMBERS', 'tg:users']);
  return Array.isArray(subs) ? (subs as string[]) : [];
}

/** Не слать одно и то же дважды, если задача по расписанию запустится повторно. */
export async function firstSendToday(sub: string, day: string) {
  const [ok] = await kv(['SET', `tgs:${sub}:${day}`, '1', 'NX', 'EX', 172800]);
  return ok === 'OK';
}
