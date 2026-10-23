import { Suspense } from 'react';
import type { Metadata } from 'next';
import { connection } from 'next/server';
import { headers } from 'next/headers';
import { lang as rootLang, country as rootCountry } from 'next/root-params';
import CalendarView, { type Section } from './CalendarView';
import FacetLinks from './FacetLinks';
import type { FacetFilter } from '@/lib/facets';
import { COUNTRIES, LANG_CODES, isCountry, isLang, nameIn } from '@/lib/regions';
import { translator } from '@/lib/i18n';
import { SITE } from '@/lib/site';
import { titlePath } from '@/lib/slug';
import { ldJson } from '@/lib/structured';
import type { CalendarData, CountryCode, Lang } from '@/lib/types';

const META: Record<Exclude<Section, 'all'>, [string, string]> = {
  movies: ['meta_movies_title', 'meta_movies_desc'], series: ['meta_series_title', 'meta_series_desc'], games: ['meta_games_title', 'meta_games_desc'],
};

/** Заголовок и описание страницы календаря: весь календарь или один раздел. */
export async function calendarMetadata(section?: Exclude<Section, 'all'>): Promise<Metadata> {
  const lang = await rootLang(), country = await rootCountry();
  if (!isLang(lang) || !isCountry(country)) return {};
  const t = translator(lang);
  const c = nameIn(COUNTRIES[country].name, lang);
  const tail = section ? `/${section}` : '';
  return {
    title: { absolute: `${t(section ? META[section][0] : 'meta_cal_title', c)} · Premiero` },
    description: t(section ? META[section][1] : 'meta_cal_desc', c),
    alternates: {
      canonical: `/${lang}/${country}${tail}`,
      languages: Object.fromEntries(LANG_CODES.map(l => [`${l}-${country.toUpperCase()}`, `/${l}/${country}${tail}`])),
    },
  };
}

// Часовой пояс страны: «сегодня» на сервере должно совпасть с календарём у посетителя
const TZ: Record<CountryCode, string> = {
  ua: 'Europe/Kyiv', pl: 'Europe/Warsaw', de: 'Europe/Berlin', gb: 'Europe/London', fr: 'Europe/Paris', es: 'Europe/Madrid',
  it: 'Europe/Rome', nl: 'Europe/Amsterdam', cz: 'Europe/Prague', ro: 'Europe/Bucharest', lt: 'Europe/Vilnius', lv: 'Europe/Riga',
  ee: 'Europe/Tallinn', md: 'Europe/Chisinau', by: 'Europe/Minsk', us: 'America/New_York', mx: 'America/Mexico_City',
  ge: 'Asia/Tbilisi', am: 'Asia/Yerevan', kz: 'Asia/Almaty', uz: 'Asia/Tashkent', kg: 'Asia/Bishkek',
};
const todayIn = (country: CountryCode) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ[country] ?? 'UTC' }).format(new Date());

/**
 * Месяц для первого экрана. Берём тот же ответ /api/calendar, что и браузер: он лежит в CDN,
 * так что это быстро даже на «холодном» сервере. Не успели за 2,5 с — календарь догрузится в браузере.
 */
async function monthFor(country: CountryCode, lang: Lang, today: string): Promise<CalendarData | null> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  if (!host) return null;
  const proto = /^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? 'http' : 'https';
  try {
    const res = await fetch(`${proto}://${host}/api/calendar?country=${country}&lang=${lang}&month=${today.slice(0, 7)}`, { signal: AbortSignal.timeout(2500) });
    return res.ok ? ((await res.json()) as CalendarData) : null;
  } catch { return null; }
}

const MEDIA: Record<Section, string[]> = { all: ['movie', 'tv', 'game'], movies: ['movie'], series: ['tv'], games: ['game'] };

/** Самые популярные релизы месяца списком ссылок: по нему Google может показать карусель. */
function itemList(data: CalendarData, section: Section = 'all', lang: Lang, country: CountryCode) {
  const items = Object.values(data.items).filter(i => MEDIA[section].includes(i.media)).sort((a, b) => b.popularity - a.popularity).slice(0, 20);
  return {
    '@context': 'https://schema.org', '@type': 'ItemList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, url: SITE + titlePath(lang, country, it.media, it.id, it.title) })),
  };
}

async function ServerMonth({ section, filter, lang, country }: { section?: Section; filter?: FacetFilter; lang: Lang; country: CountryCode }) {
  await connection();
  const today = todayIn(country);
  const data = await monthFor(country, lang, today);
  return <>
    {data && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(itemList(data, section, lang, country)) }} />}
    <CalendarView section={section} filter={filter} initial={data ? { today, data } : undefined} />
  </>;
}

export default async function CalendarPage({ section, filter, current }: { section?: Section; filter?: FacetFilter; current?: string }) {
  const lang = await rootLang(), country = await rootCountry();
  if (!isLang(lang) || !isCountry(country)) return <CalendarView section={section} filter={filter} />;
  const t = translator(lang);
  const c = nameIn(COUNTRIES[country].name, lang);
  return <>
    {/* заголовок страницы для поисковиков; у календарей-подборок он свой, видимый */}
    {/* название сайта для выдачи Google (иначе там может стоять просто адрес) */}
    {!section && !current && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebSite', name: 'Premiero', alternateName: 'thepremiero.com', url: SITE + '/' }) }} />}
    {!current && <h1 className="sr">{t(section && section !== 'all' ? META[section][0] : 'meta_cal_title', c)}</h1>}
    {/* пока сервер собирает месяц, показываем пустой календарь с панелью — та же разметка, без сдвигов */}
    <Suspense fallback={<CalendarView section={section} filter={filter} />}>
      <ServerMonth section={section} filter={filter} lang={lang} country={country} />
    </Suspense>
    <FacetLinks lang={lang} country={country} section={section ?? 'all'} current={current} />
  </>;
}
