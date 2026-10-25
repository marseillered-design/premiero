import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { lang as rootLang, country as rootCountry } from 'next/root-params';
import Poster from '@/components/Poster';
import { COUNTRIES, LANG_CODES, LOCALE, isCountry, isLang, nameIn } from '@/lib/regions';
import { translator } from '@/lib/i18n';
import { fromKey } from '@/lib/dates';
import { titlePath } from '@/lib/slug';
import { getUpcoming, type UpcomingGroup } from '@/lib/upcoming';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await rootLang(), country = await rootCountry();
  if (!isLang(lang) || !isCountry(country)) return {};
  const t = translator(lang);
  const c = nameIn(COUNTRIES[country].name, lang);
  return {
    title: { absolute: `${t('meta_up_title', c)} · Premiero` },
    description: t('meta_up_desc', c),
    alternates: {
      canonical: `/${lang}/${country}/upcoming`,
      languages: Object.fromEntries(LANG_CODES.map(l => [`${l}-${country.toUpperCase()}`, `/${l}/${country}/upcoming`])),
    },
  };
}

export default function Page() {
  return (
    <Suspense fallback={<div className="wrap title-page"><div className="empty"><span className="spinner" aria-hidden /></div></div>}>
      <Upcoming />
    </Suspense>
  );
}

const GROUPS: [UpcomingGroup, string][] = [['movies', 'nav_movies'], ['series', 'nav_series'], ['games', 'nav_games']];

/** «Самые ожидаемые»: готовая страница с сервера, чтобы поисковики видели весь список сразу. */
async function Upcoming() {
  // список зависит от сегодняшней даты, поэтому страница собирается по запросу (данные — из кэша календаря)
  await connection();
  const lang = await rootLang(), country = await rootCountry();
  if (!isLang(lang) || !isCountry(country)) return null;
  const t = translator(lang);
  const c = nameIn(COUNTRIES[country].name, lang);
  const groups = await getUpcoming(country, lang, new Date());
  const fmt = new Intl.DateTimeFormat(LOCALE[lang], { day: 'numeric', month: 'long' });
  const kindTag = (k: string) => (k === 'game' ? 'game' : k === 'series' ? 'series' : k);

  return (
    <div className="wrap title-page upcoming">
      <h1 className="my-h">{t('up_h', c)}</h1>
      <p className="legal-intro">{t('up_intro')}</p>
      <nav className="up-tabs" aria-label={t('nav')}>
        {GROUPS.map(([g, label]) => groups[g].length ? <a key={g} href={`#${g}`} className="chip">{t(label)}</a> : null)}
      </nav>
      {GROUPS.map(([g, label]) => groups[g].length ? (
        <section key={g} id={g} className="sec">
          <h2>{t(label)} <small>{t('up_next3')}</small></h2>
          <ol className="grid up-list">{groups[g].map(({ item: it, date, kind }, i) => {
            const href = titlePath(lang, country, it.media, it.id, it.title);
            return (
              <li className="card" key={it.key}>
                <Link prefetch={false} className="poster-btn" href={href} tabIndex={-1} aria-hidden>
                  <span className="up-rank">{i + 1}</span>
                  <Poster path={it.poster} title={it.title} cert={it.cert} />
                </Link>
                <h3 className="card-t"><Link prefetch={false} href={href}>{it.title}</Link></h3>
                <p className="card-m"><span className={`tag t-${kindTag(kind)}`}>{t('ty_' + kindTag(kind))}</span><span>{fmt.format(fromKey(date))}</span></p>
              </li>
            );
          })}</ol>
        </section>
      ) : null)}
    </div>
  );
}
