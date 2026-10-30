import type { Metadata } from 'next';
import { lang as rootLang } from 'next/root-params';
import { ABOUT, CONTACT_EMAIL } from '@/lib/about';
import { COUNTRIES, COUNTRY_CODES, isLang } from '@/lib/regions';
import { ogLocale } from '@/lib/structured';
import type { Lang } from '@/lib/types';

type Name = 'about' | 'contact';
const current = async (): Promise<Lang> => { const l = await rootLang(); return isLang(l) ? l : 'en'; };

/**
 * Текст зависит только от языка, а адресов много (язык + страна). Поэтому поиску показываем одну
 * страницу на язык: остальные ссылаются на неё как на основную, в карту сайта эти страницы не входят.
 */
export async function aboutMetadata(name: Name): Promise<Metadata> {
  const lang = await current();
  const p = ABOUT[lang][name];
  const main = lang === 'en' ? 'us' : lang === 'ru' ? 'kz' : COUNTRY_CODES.find(c => COUNTRIES[c].lang === lang) ?? 'us';
  const url = `/${lang}/${main}/${name}`;
  return {
    title: { absolute: `${p.title} · Premiero` },
    description: p.description,
    alternates: { canonical: url },
    openGraph: {
      siteName: 'Premiero', type: 'website', locale: ogLocale(lang, main), url,
      images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Premiero' }],
    },
  };
}

export default async function AboutPage({ name }: { name: Name }) {
  const p = ABOUT[await current()][name];
  return (
    <div className="wrap title-page legal">
      <h1 className="my-h">{p.title}</h1>
      <div className="sec">
        {p.paragraphs.map((text, i) => {
          const [before, after] = text.split('{email}');
          return <p key={i}>{before}{after !== undefined && <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>}{after}</p>;
        })}
      </div>
    </div>
  );
}
