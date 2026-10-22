import type { Metadata } from 'next';
import { lang as rootLang, country as rootCountry } from 'next/root-params';
import CalendarView, { type Section } from './CalendarView';
import FacetLinks from './FacetLinks';
import type { FacetFilter } from '@/lib/facets';
import { COUNTRIES, LANG_CODES, isCountry, isLang, nameIn } from '@/lib/regions';
import { translator } from '@/lib/i18n';

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

export default async function CalendarPage({ section, filter, current }: { section?: Section; filter?: FacetFilter; current?: string }) {
  const lang = await rootLang(), country = await rootCountry();
  // Месяц зависит от часов посетителя, поэтому адрес собирает браузер. CalendarView подхватит этот запрос.
  const early = `(function(){try{var d=new Date(),m=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'),u='/api/calendar?country=${country}&lang=${lang}&month='+m;window.__premieroCal={url:u,res:fetch(u)}}catch(e){}})()`;
  return <>
    {isLang(lang) && isCountry(country) && <script dangerouslySetInnerHTML={{ __html: early }} />}
    <CalendarView section={section} filter={filter} />
    {isLang(lang) && isCountry(country) && <FacetLinks lang={lang} country={country} section={section ?? 'all'} current={current} />}
  </>;
}
