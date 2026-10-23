import { translator, type T } from './i18n';
import { COUNTRIES, LOCALE, nameIn } from './regions';
import { getReleases } from './releases';
import { addDaysKey, listBetween, posterUrl, userRegion } from './reminders';
import { titlePath } from './slug';
import { SITE } from './site';
import type { CalendarData, CalEvent, CalItem, CountryCode, Lang, WatchItem } from './types';
import type { MailUser } from './mail';

/*
 * Тексты писем: утреннее напоминание и подборка по понедельникам.
 * Вёрстка — таблицами и встроенными стилями: так письмо одинаково выглядит в Gmail, Outlook и Apple Mail.
 */
type Card = { title: string; url: string; poster: string | null; meta: string };
type Section = { h: string; sub?: string; cards: Card[] };
type Mail = { lang: Lang; heading: string; greeting: string; intro: string; sections: Section[]; why: string; unsub: string };

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const dateFmt = (lang: Lang) => new Intl.DateTimeFormat(LOCALE[lang], { day: 'numeric', month: 'long', timeZone: 'UTC' });
const fmt = (lang: Lang, key: string) => dateFmt(lang).format(new Date(key + 'T12:00:00Z'));
export const unsubUrl = (u: MailUser, kind: 'r' | 'w') => `${SITE}/api/mail/unsub?t=${u.tok}&k=${kind}`;
const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? '';

/** «Где и как» выходит релиз: в кино, онлайн на Netflix, серия на канале, игра на PC и PS5. */
function howOf(t: T, cals: (CalendarData | null)[]) {
  const ev = new Map<string, { e: CalEvent; it: CalItem; prov: string[] }>();
  for (const c of cals) {
    if (!c) continue;
    for (const e of c.events) {
      const it = c.items[e.item];
      if (it) ev.set(`${e.item}@${e.date}`, { e, it, prov: (it.providers ?? []).map(id => c.providers[id]?.name).filter((x): x is string => !!x) });
    }
  }
  return (key: string, media: WatchItem['media'], date: string, ep?: string | null) => {
    const hit = ev.get(`${key}@${date}`);
    if (!hit) return [t(media === 'tv' ? 'ty_series' : media === 'game' ? 'ty_game' : 'ty_movie'), ep].filter(Boolean).join(' · ');
    const { e, it, prov } = hit;
    if (e.kind === 'cinema') return t('ty_cinema');
    if (e.kind === 'disc') return t('ty_disc');
    if (e.kind === 'online') return [t('ty_online'), prov.slice(0, 2).join(', ')].filter(Boolean).join(' · ');
    if (e.kind === 'game') return [t('ty_game'), (e.plat ?? []).slice(0, 3).join(', ')].filter(Boolean).join(' · ');
    const num = ep ?? (e.eps?.length && it.season ? `${it.season}×${String(e.eps[0]).padStart(2, '0')}` : null);
    return [it.platform ?? t('ty_series'), num].filter(Boolean).join(' · ');
  };
}

const card = (it: Pick<WatchItem, 'media' | 'id' | 'title' | 'poster'>, lang: Lang, country: CountryCode, meta: string): Card =>
  ({ title: it.title, url: SITE + titlePath(lang, country, it.media, it.id, it.title), poster: posterUrl(it.poster, true), meta });

function render(m: Mail) {
  const t = translator(m.lang);
  // у обложек IGDB и постеров TMDB разные пропорции: у всех одна высота, чтобы ряды и подписи шли ровно
  const rows = (cards: Card[]) => {
    const out: string[] = [];
    for (let i = 0; i < cards.length; i += 3) {
      const row = cards.slice(i, i + 3);
      out.push(`<tr>${row.map(c => `<td width="33%" valign="top" style="padding:0 6px 18px">
        <a href="${c.url}" style="text-decoration:none;color:#2A1116">
          ${c.poster ? `<img src="${c.poster}" width="160" height="240" alt="" style="display:block;width:160px;max-width:100%;height:240px;object-fit:cover;border-radius:8px;border:0;background:#EFE6DC">` : `<div style="width:160px;max-width:100%;height:240px;border-radius:8px;background:#EFE6DC"></div>`}
          <div style="font:600 14px/1.3 Arial,sans-serif;margin-top:8px">${esc(c.title)}</div>
          <div style="font:12px/1.4 Arial,sans-serif;color:#7A6058;margin-top:2px">${esc(c.meta)}</div>
        </a></td>`).join('')}${'<td width="33%"></td>'.repeat(3 - row.length)}</tr>`);
    }
    return out.join('');
  };
  const body = m.sections.filter(s => s.cards.length).map(s => `
    <tr><td style="padding:24px 6px ${s.sub ? 2 : 10}px;font:700 18px/1.3 Arial,sans-serif;color:#2A1116">${esc(s.h)}</td></tr>
    ${s.sub ? `<tr><td style="padding:0 6px 12px;font:13px/1.4 Arial,sans-serif;color:#7A6058">${esc(s.sub)}</td></tr>` : ''}
    <tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows(s.cards)}</table></td></tr>`).join('');
  return `<!doctype html><html lang="${m.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(m.heading)}</title></head>
<body style="margin:0;background:#F6F1EA">
<div style="display:none;max-height:0;overflow:hidden">${esc(m.intro)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F1EA"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:14px;padding:22px 18px">
  <tr><td style="padding:0 6px"><a href="${SITE}" style="font:800 22px Arial,sans-serif;color:#2A1116;text-decoration:none"><img src="${SITE}/email-logo.png" width="32" height="32" alt="" style="display:inline-block;vertical-align:middle;width:32px;height:32px;border:0;border-radius:7px;margin-right:8px"><span style="vertical-align:middle">Premiero</span></a></td></tr>
  <tr><td style="padding:16px 6px 0;font:700 22px/1.3 Arial,sans-serif;color:#2A1116">${esc(m.heading)}</td></tr>
  <tr><td style="padding:12px 6px 0;font:15px/1.5 Arial,sans-serif;color:#2A1116">${esc(m.greeting)}<br>${esc(m.intro)}</td></tr>
  ${body}
  <tr><td style="padding:8px 6px 0"><a href="${SITE}/${m.lang}" style="display:inline-block;background:#C2331B;color:#FFFFFF;font:600 14px Arial,sans-serif;text-decoration:none;padding:10px 18px;border-radius:9px">${esc(t('em_open'))}</a></td></tr>
  <tr><td style="padding:26px 6px 0;font:12px/1.5 Arial,sans-serif;color:#7A6058">${esc(m.why)}<br><a href="${m.unsub}" style="color:#7A6058">${esc(t('em_unsub'))}</a></td></tr>
</table></td></tr></table></body></html>`;
}

function plain(m: Mail) {
  const t = translator(m.lang);
  return [m.greeting, m.intro, '', ...m.sections.filter(s => s.cards.length).flatMap(s => [s.h, ...(s.sub ? [s.sub] : []), ...s.cards.map(c => `• ${c.title} — ${c.meta}\n  ${c.url}`), '']),
    m.why, `${t('em_unsub')}: ${m.unsub}`].join('\n');
}
const out = (subject: string, m: Mail) => ({ subject, html: render(m), text: plain(m) });

/** Утреннее письмо: что из списка выходит сегодня и завтра. null — писать не о чем. */
export async function reminderMail(u: MailUser, today: string) {
  const { lang, country } = userRegion(u);
  const t = translator(lang);
  const tomorrow = addDaysKey(today, 1);
  const items = await listBetween(u.sub, lang, country, today, tomorrow);
  if (!items.length) return null;
  const cals = await Promise.all([...new Set([today.slice(0, 7), tomorrow.slice(0, 7)])].map(m => getReleases(country, lang, m).catch(() => null)));
  const how = howOf(t, cals);
  const now = items.filter(i => i.date === today), next = items.filter(i => i.date !== today);
  const cardOf = (i: WatchItem) => card(i, lang, country, `${fmt(lang, i.date!)} · ${how(i.key, i.media, i.date!, i.ep)}`);
  const subject = `${now.length ? t('tg_today') : t('tg_tomorrow')}: ${(now[0] ?? next[0]).title}${items.length > 1 ? ` +${items.length - 1}` : ''}`;
  const name = firstName(u.name);
  return out(subject, {
    lang, heading: subject, greeting: name ? t('em_hi', name) : t('em_hi0'),
    intro: now.length ? t('em_r_today', now.length) : t('em_r_tomorrow', next.length),
    sections: [{ h: t('tg_today'), cards: now.map(cardOf) }, { h: t('tg_tomorrow'), cards: next.map(cardOf) }],
    why: t('em_why_r'), unsub: unsubUrl(u, 'r'),
  });
}

/** Подборка по понедельникам: главные премьеры недели в стране и что выходит из списка. */
export async function weeklyMail(u: MailUser, today: string) {
  const { lang, country } = userRegion(u);
  const t = translator(lang);
  const end = addDaysKey(today, 6);
  const cals = await Promise.all([...new Set([today.slice(0, 7), end.slice(0, 7)])].map(m => getReleases(country, lang, m).catch(() => null)));
  const how = howOf(t, cals);
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
  const c = nameIn(COUNTRIES[country].name, lang);
  const subject = t('em_week_subj', fmt(lang, today), fmt(lang, end));
  const name = firstName(u.name);
  return out(subject, {
    lang, heading: subject, greeting: name ? t('em_hi', name) : t('em_hi0'), intro: t('em_w_intro', c),
    sections: [
      { h: t('em_week_mine'), sub: t('em_sub_mine'), cards: mine.map(i => card(i, lang, country, `${fmt(lang, i.date!)} · ${how(i.key, i.media, i.date!, i.ep)}`)) },
      { h: t('em_week_top'), sub: t('em_sub_top', c), cards: top.map(({ it, date }) => card(it, lang, country, `${fmt(lang, date)} · ${how(it.key, it.media, date)}`)) },
    ],
    why: t('em_why_w'), unsub: unsubUrl(u, 'w'),
  });
}
