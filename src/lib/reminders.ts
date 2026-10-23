import { loadAccount, saveItems } from './account';
import { currentDate } from './fresh';
import { translator } from './i18n';
import { LOCALE, isCountry, isLang } from './regions';
import { titlePath } from './slug';
import { SITE } from './site';
import { esc, type TgUser } from './telegram';
import type { CountryCode, Lang, WatchItem } from './types';

const DAY = 86400000;
const CHECK = 30; // сколько ближайших релизов сверять с TMDB/IGDB за раз
export const dayKey = (d: Date) => d.toISOString().slice(0, 10);
const plus = (k: string, n: number) => dayKey(new Date(Date.parse(k + 'T00:00:00Z') + n * DAY));
const icon = (m: WatchItem['media']) => (m === 'game' ? '🎮' : m === 'tv' ? '📺' : '🎬');

export const userRegion = (u: Pick<TgUser, 'lang' | 'country'>) => ({
  lang: (isLang(u.lang) ? u.lang : 'en') as Lang,
  country: (isCountry(u.country) ? u.country : 'us') as CountryCode,
});

/** Релизы из списка с датами в окне [from; to], даты сверены с источником (релизы переносят). */
async function itemsBetween(sub: string, lang: Lang, country: CountryCode, from: string, to: string) {
  const { watch } = await loadAccount(sub);
  const near = Object.values(watch).filter(i => i.date && i.date >= plus(from, -3) && i.date <= plus(to, 3))
    .sort((a, b) => a.date!.localeCompare(b.date!)).slice(0, CHECK);
  const fresh = await Promise.all(near.map(i => currentDate(i, lang, country)));
  const moved: WatchItem[] = [];
  near.forEach((it, n) => { const d = fresh[n]; if (d !== undefined && d !== it.date) { it.date = d; moved.push(it); } });
  if (moved.length) await saveItems(sub, moved).catch(() => {});
  return near.filter(i => i.date && i.date >= from && i.date <= to).sort((a, b) => a.date!.localeCompare(b.date!));
}

const line = (it: WatchItem, lang: Lang, country: CountryCode) =>
  `${icon(it.media)} <a href="${SITE}${titlePath(lang, country, it.media, it.id, it.title)}">${esc(it.title)}</a>`;

/** Постер для Telegram: он скачивает картинку сам и понимает только JPEG/PNG (IGDB по умолчанию у нас WebP). */
export function posterUrl(path: string | null) {
  if (!path) return null;
  if (!path.startsWith('igdb:')) return `https://image.tmdb.org/t/p/w500${path}`;
  const [, type, id] = path.split(':');
  return `https://images.igdb.com/igdb/image/upload/t_${type === 'cover' ? 'cover_big' : 'screenshot_med'}/${id}.jpg`;
}

/** Утреннее сообщение: что выходит сегодня и завтра, с постерами. null — сообщать нечего. */
export async function morningDigest(u: TgUser, today: string): Promise<{ text: string; posters: string[] } | null> {
  const { lang, country } = userRegion(u);
  const t = translator(lang);
  const items = await itemsBetween(u.sub, lang, country, today, plus(today, 1));
  const now = items.filter(i => i.date === today), next = items.filter(i => i.date !== today);
  if (!items.length) return null;
  const parts: string[] = [];
  if (now.length) parts.push(`🔔 <b>${t('tg_today')}</b>\n${now.map(i => line(i, lang, country)).join('\n')}`);
  if (next.length) parts.push(`<b>${t('tg_tomorrow')}</b>\n${next.map(i => line(i, lang, country)).join('\n')}`);
  // сначала постеры того, что выходит сегодня
  const posters = [...now, ...next].map(i => posterUrl(i.poster)).filter((x): x is string => !!x);
  return { text: parts.join('\n\n'), posters };
}

/** Ответ на /list: ближайшие два месяца из списка, с постерами первых релизов. */
export async function upcomingList(u: TgUser, today: string): Promise<{ text: string; posters: string[] }> {
  const { lang, country } = userRegion(u);
  const t = translator(lang);
  const items = (await itemsBetween(u.sub, lang, country, today, plus(today, 60))).slice(0, 25);
  if (!items.length) return { text: t('tg_empty'), posters: [] };
  const fmt = new Intl.DateTimeFormat(LOCALE[lang], { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const text = `<b>${t('tg_soon')}</b>\n${items.map(i => `${fmt.format(new Date(i.date + 'T00:00:00Z'))} · ${line(i, lang, country)}`).join('\n')}`;
  return { text, posters: items.slice(0, 10).map(i => posterUrl(i.poster)).filter((x): x is string => !!x) };
}

export const myListUrl = (lang: Lang, country: CountryCode) => `${SITE}/${lang}/${country}/my`;
