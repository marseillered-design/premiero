import { kv, pairs } from './kv';
import type { CountryCode, Lang } from './types';

/*
 * Письма через Resend (RESEND_API_KEY на Vercel). Человек сам включает их в «Моём списке»:
 *   u:<sub> → mailR / mailW     напоминания о выходе / подборка недели (1 — включено)
 *            mailLang, mailCountry   язык и страна писем — с той версии сайта, где включили
 *            mailTok             секрет для ссылки «Отписаться» (ml:<токен> → sub)
 *   mail:r, mail:w              кому слать напоминания и подборку
 *   mls:<sub>:<день>, mlw:<sub>:<неделя>   уже отправлено — повторно не шлём
 */
const key = () => (process.env.RESEND_API_KEY ?? '').trim();
export const hasMail = () => key().startsWith('re_');
const FROM = 'Premiero <reminders@thepremiero.com>';

export type MailKind = 'r' | 'w';
export interface MailUser { sub: string; email: string; name: string; lang: string; country: string; tok: string; remind: boolean; weekly: boolean }

export async function sendMail(m: { to: string; subject: string; html: string; text: string; unsub: string }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST', cache: 'no-store',
    headers: { Authorization: `Bearer ${key()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM, to: [m.to], subject: m.subject, html: m.html, text: m.text,
      // отписка в один клик прямо из Gmail и других почтовых программ
      headers: { 'List-Unsubscribe': `<${m.unsub}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);
}

export async function mailUser(sub: string): Promise<MailUser | null> {
  const [raw] = await kv(['HGETALL', `u:${sub}`]);
  const u = pairs(raw);
  if (!u.email) return null;
  return {
    sub, email: u.email, name: u.name ?? '', lang: u.mailLang ?? 'en', country: u.mailCountry ?? 'us',
    tok: u.mailTok ?? '', remind: u.mailR === '1', weekly: u.mailW === '1',
  };
}

/** Включить или выключить письма; язык и страна запоминаются с той версии сайта, где нажали. */
export async function setMail(sub: string, p: { remind: boolean; weekly: boolean; lang: Lang; country: CountryCode }) {
  const [tok] = await kv(['HGET', `u:${sub}`, 'mailTok']);
  let token = tok ? String(tok) : '';
  const cmds: (string | number)[][] = [];
  if (!token && (p.remind || p.weekly)) {
    token = Buffer.from(crypto.getRandomValues(new Uint8Array(18))).toString('base64url');
    cmds.push(['SET', `ml:${token}`, sub], ['HSET', `u:${sub}`, 'mailTok', token]);
  }
  cmds.push(
    ['HSET', `u:${sub}`, 'mailR', p.remind ? '1' : '0', 'mailW', p.weekly ? '1' : '0', 'mailLang', p.lang, 'mailCountry', p.country],
    [p.remind ? 'SADD' : 'SREM', 'mail:r', sub],
    [p.weekly ? 'SADD' : 'SREM', 'mail:w', sub],
  );
  await kv(...cmds);
}

/** Ссылка «Отписаться»: по токену, без входа на сайт. */
export async function unsubscribe(token: string, kind: MailKind | 'all') {
  if (!/^[\w-]{20,40}$/.test(token)) return null;
  const [sub] = await kv(['GET', `ml:${token}`]);
  if (!sub) return null;
  const s = String(sub);
  const cmds: (string | number)[][] = [];
  if (kind !== 'w') cmds.push(['HSET', `u:${s}`, 'mailR', '0'], ['SREM', 'mail:r', s]);
  if (kind !== 'r') cmds.push(['HSET', `u:${s}`, 'mailW', '0'], ['SREM', 'mail:w', s]);
  await kv(...cmds);
  const [lang] = await kv(['HGET', `u:${s}`, 'mailLang']);
  return { sub: s, lang: lang ? String(lang) : 'en' };
}

/** При удалении аккаунта: убрать из рассылок и погасить ссылку отписки. */
export async function dropMail(sub: string) {
  const [tok] = await kv(['HGET', `u:${sub}`, 'mailTok']);
  await kv(['SREM', 'mail:r', sub], ['SREM', 'mail:w', sub], ...(tok ? [['DEL', `ml:${tok}`]] : []));
}

export async function mailSubs(kind: MailKind) {
  const [subs] = await kv(['SMEMBERS', `mail:${kind}`]);
  return Array.isArray(subs) ? (subs as string[]) : [];
}

/** Одно письмо каждого вида в день (напоминание) или в неделю (подборка), даже если задача запустится дважды. */
export async function firstMail(sub: string, kind: MailKind, period: string) {
  const [ok] = await kv(['SET', `ml${kind === 'r' ? 's' : 'w'}:${sub}:${period}`, '1', 'NX', 'EX', kind === 'r' ? 172800 : 864000]);
  return ok === 'OK';
}
