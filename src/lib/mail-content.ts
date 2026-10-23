import { translator } from './i18n';
import { LOCALE } from './regions';
import { getReleases } from './releases';
import { addDaysKey, listBetween, posterUrl, userRegion } from './reminders';
import { titlePath } from './slug';
import { SITE } from './site';
import type { CalItem, CountryCode, Lang, WatchItem } from './types';
import type { MailUser } from './mail';

/*
 * Тексты писем: утреннее напоминание и подборка по понедельникам.
 * Вёрстка — таблицами и встроенными стилями: так письмо одинаково выглядит в Gmail, Outlook и Apple Mail.
 */
type Card = { title: string; url: string; poster: string | null; meta: string };
type Section = { h: string; cards: Card[] };

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const dateFmt = (lang: Lang) => new Intl.DateTimeFormat(LOCALE[lang], { day: 'numeric', month: 'long', timeZone: 'UTC' });
const fmt = (lang: Lang, key: string) => dateFmt(lang).format(new Date(key + 'T12:00:00Z'));
export const unsubUrl = (u: MailUser, kind: 'r' | 'w') => `${SITE}/api/mail/unsub?t=${u.tok}&k=${kind}`;

function cardOf(it: Pick<WatchItem, 'media' | 'id' | 'title' | 'poster'> & { ep?: string | null }, lang: Lang, country: CountryCode, meta: string): Card {
  return { title: it.title, url: SITE + titlePath(lang, country, it.media, it.id, it.title), poster: posterUrl(it.poster, true), meta: it.media === 'tv' && it.ep ? `${meta} · ${it.ep}` : meta };
}

function render(lang: Lang, heading: string, sections: Section[], why: string, unsub: string) {
  const t = translator(lang);
  const rows = (cards: Card[]) => {
    const out: string[] = [];
    for (let i = 0; i < cards.length; i += 3) {
      const row = cards.slice(i, i + 3);
      out.push(`<tr>${row.map(c => `<td width="33%" valign="top" style="padding:0 6px 18px">
        <a href="${c.url}" style="text-decoration:none;color:#2A1116">
          ${c.poster ? `<img src="${c.poster}" width="160" alt="" style="display:block;width:100%;max-width:160px;height:auto;border-radius:8px;border:0">` : ''}
          <div style="font:600 14px/1.3 Arial,sans-serif;margin-top:8px">${esc(c.title)}</div>
          <div style="font:12px/1.4 Arial,sans-serif;color:#7A6058;margin-top:2px">${esc(c.meta)}</div>
        </a></td>`).join('')}${'<td width="33%"></td>'.repeat(3 - row.length)}</tr>`);
    }
    return out.join('');
  };
  const body = sections.filter(s => s.cards.length).map(s => `
    <tr><td style="padding:22px 6px 10px;font:700 18px/1.3 Arial,sans-serif;color:#2A1116">${esc(s.h)}</td></tr>
    <tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows(s.cards)}</table></td></tr>`).join('');
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(heading)}</title></head>
<body style="margin:0;background:#F6F1EA">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F1EA"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:14px;padding:22px 18px">
  <tr><td style="padding:0 6px"><a href="${SITE}" style="font:800 22px Arial,sans-serif;color:#2A1116;text-decoration:none"><span style="display:inline-block;background:#E7B65C;color:#2A1116;border-radius:6px;padding:2px 7px;margin-right:6px">P</span>Premiero</a></td></tr>
  <tr><td style="padding:16px 6px 0;font:700 22px/1.3 Arial,sans-serif;color:#2A1116">${esc(heading)}</td></tr>
  ${body}
  <tr><td style="padding:8px 6px 0"><a href="${SITE}/${lang}" style="display:inline-block;background:#C2331B;color:#FFFFFF;font:600 14px Arial,sans-serif;text-decoration:none;padding:10px 18px;border-radius:9px">${esc(t('em_open'))}</a></td></tr>
  <tr><td style="padding:26px 6px 0;font:12px/1.5 Arial,sans-serif;color:#7A6058">${esc(why)}<br><a href="${unsub}" style="color:#7A6058">${esc(t('em_unsub'))}</a></td></tr>
</table></td></tr></table></body></html>`;
}

const plain = (heading: string, sections: Section[], why: string, unsub: string, unsubLabel: string) =>
  [heading, '', ...sections.filter(s => s.cards.length).flatMap(s => [s.h, ...s.cards.map(c => `• ${c.title} — ${c.meta}\n  ${c.url}`), '']), why, `${unsubLabel}: ${unsub}`].join('\n');

/** Утреннее письмо: что из списка выходит сегодня и завтра. null — писать не о чем. */
export async function reminderMail(u: MailUser, today: string) {
  const { lang, country } = userRegion(u);
  const t = translator(lang);
  const items = await listBetween(u.sub, lang, country, today, addDaysKey(today, 1));
  if (!items.length) return null;
  const now = items.filter(i => i.date === today), next = items.filter(i => i.date !== today);
  const sections: Section[] = [
    { h: t('tg_today'), cards: now.map(i => cardOf(i, lang, country, fmt(lang, i.date!))) },
    { h: t('tg_tomorrow'), cards: next.map(i => cardOf(i, lang, country, fmt(lang, i.date!))) },
  ];
  const first = (now[0] ?? next[0]).title;
  const subject = `${now.length ? t('tg_today') : t('tg_tomorrow')}: ${first}${items.length > 1 ? ` +${items.length - 1}` : ''}`;
  const unsub = unsubUrl(u, 'r');
  return { subject, html: render(lang, subject, sections, t('em_why_r'), unsub), text: plain(subject, sections, t('em_why_r'), unsub, t('em_unsub')) };
}

/** Подборка по понедельникам: главные премьеры недели в стране и что выходит из списка. */
export async function weeklyMail(u: MailUser, today: string) {
  const { lang, country } = userRegion(u);
  const t = translator(lang);
  const end = addDaysKey(today, 6);
  const months = [...new Set([today.slice(0, 7), end.slice(0, 7)])];
  const cals = await Promise.all(months.map(m => getReleases(country, lang, m).catch(() => null)));
  const best = new Map<string, { it: CalItem; date: string }>();
  for (const c of cals) {
    if (!c) continue;
    for (const ev of c.events) {
      if (ev.date < today || ev.date > end || (ev.kind === 'series' && !ev.premiere)) continue;
      const it = c.items[ev.item];
      if (it && !best.has(it.key)) best.set(it.key, { it, date: ev.date });
    }
  }
  const top = [...best.values()].sort((a, b) => b.it.popularity - a.it.popularity).slice(0, 9);
  const mine = await listBetween(u.sub, lang, country, today, end);
  if (!top.length && !mine.length) return null;
  const sections: Section[] = [
    { h: t('em_week_mine'), cards: mine.map(i => cardOf(i, lang, country, fmt(lang, i.date!))) },
    { h: t('em_week_top'), cards: top.map(({ it, date }) => cardOf(it, lang, country, fmt(lang, date))) },
  ];
  const subject = t('em_week_subj', fmt(lang, today), fmt(lang, end));
  const unsub = unsubUrl(u, 'w');
  return { subject, html: render(lang, subject, sections, t('em_why_w'), unsub), text: plain(subject, sections, t('em_why_w'), unsub, t('em_unsub')) };
}
