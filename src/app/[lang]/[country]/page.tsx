import type { Metadata } from 'next';
import { lang as rootLang, country as rootCountry } from 'next/root-params';
import CalendarView from '@/components/CalendarView';
import { COUNTRIES, LANG_CODES, isCountry, isLang, nameIn } from '@/lib/regions';
import { translator } from '@/lib/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await rootLang(), country = await rootCountry();
  if (!isLang(lang) || !isCountry(country)) return {};
  const t = translator(lang);
  const c = nameIn(COUNTRIES[country].name, lang);
  return {
    title: { absolute: `${t('meta_cal_title', c)} · Premiero` },
    description: t('meta_cal_desc', c),
    alternates: {
      canonical: `/${lang}/${country}`,
      languages: Object.fromEntries(LANG_CODES.map(l => [`${l}-${country.toUpperCase()}`, `/${l}/${country}`])),
    },
  };
}

export default function Page() {
  return <CalendarView />;
}
