import type { Metadata } from 'next';
import { lang as rootLang, country as rootCountry } from 'next/root-params';
import CalendarView, { type Cat } from './CalendarView';
import { COUNTRIES, LANG_CODES, isCountry, isLang, nameIn } from '@/lib/regions';
import { translator } from '@/lib/i18n';

/** Заголовок и описание страницы календаря: общий календарь или только игры (`section = 'games'`). */
export async function calendarMetadata(section?: 'games'): Promise<Metadata> {
  const lang = await rootLang(), country = await rootCountry();
  if (!isLang(lang) || !isCountry(country)) return {};
  const t = translator(lang);
  const c = nameIn(COUNTRIES[country].name, lang);
  const tail = section ? `/${section}` : '';
  return {
    title: { absolute: `${t(section ? 'meta_games_title' : 'meta_cal_title', c)} · Premiero` },
    description: t(section ? 'meta_games_desc' : 'meta_cal_desc', c),
    alternates: {
      canonical: `/${lang}/${country}${tail}`,
      languages: Object.fromEntries(LANG_CODES.map(l => [`${l}-${country.toUpperCase()}`, `/${l}/${country}${tail}`])),
    },
  };
}

export default async function CalendarPage({ cat }: { cat?: Cat }) {
  const lang = await rootLang(), country = await rootCountry();
  // Месяц зависит от часов посетителя, поэтому адрес собирает браузер. CalendarView подхватит этот запрос.
  const early = `(function(){try{var d=new Date(),m=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'),u='/api/calendar?country=${country}&lang=${lang}&month='+m;window.__premieroCal={url:u,res:fetch(u)}}catch(e){}})()`;
  return <>
    {isLang(lang) && isCountry(country) && <script dangerouslySetInnerHTML={{ __html: early }} />}
    <CalendarView initialCat={cat} />
  </>;
}
