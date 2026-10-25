import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { COUNTRIES, LANG_CODES, isCountry, isLang, nameIn } from '@/lib/regions';
import { translator } from '@/lib/i18n';
import { findFacet, type Facet, type FacetFilter, type FacetSection } from '@/lib/facets';
import { facetLabel } from './FacetLinks';
import CalendarPage from './CalendarPage';
import { breadcrumbs, ldJson } from '@/lib/structured';
import * as I from './icons';
import type { Lang } from '@/lib/types';

type Params = Promise<{ lang: string; country: string; facet: string }>;
const HEAD: Record<FacetSection, string> = { movies: 'fh_movies', series: 'fh_series', games: 'fh_games' };

async function load(section: FacetSection, params: Params) {
  const { lang, country, facet } = await params;
  const f = findFacet(section, facet);
  if (!isLang(lang) || !isCountry(country) || !f) return null;
  if (f.kind === 'provider' && f.countries && !f.countries.includes(country)) return null;
  return { lang, country, f, label: await facetLabel(f, lang) };
}

const filterOf = (f: Facet, label: string): FacetFilter =>
  f.kind === 'platform' ? { platform: f.platform, label } : f.kind === 'provider' ? { providers: f.ids, label } : { genres: f.ids, label };
const cap = (s: string, lang: Lang) => s.charAt(0).toLocaleUpperCase(lang) + s.slice(1);

export async function facetMetadata(section: FacetSection, params: Params): Promise<Metadata> {
  const r = await load(section, params);
  if (!r) return {};
  const t = translator(r.lang);
  const c = nameIn(COUNTRIES[r.country].name, r.lang);
  const h = t(HEAD[section], r.label);
  const tail = `/${section}/${r.f.slug}`;
  return {
    title: { absolute: `${cap(h, r.lang)}, ${c} · Premiero` },
    description: t('fh_desc', cap(h, r.lang), c),
    alternates: {
      canonical: `/${r.lang}/${r.country}${tail}`,
      languages: Object.fromEntries(LANG_CODES.map(l => [`${l}-${r.country.toUpperCase()}`, `/${l}/${r.country}${tail}`])),
    },
  };
}

export default function FacetPage({ section, params }: { section: FacetSection; params: Params }) {
  return (
    <Suspense fallback={<div className="wrap title-page"><div className="empty"><span className="spinner" aria-hidden /></div></div>}>
      <FacetContent section={section} params={params} />
    </Suspense>
  );
}

/** Календарь-подборка: заголовок для поисковиков и обычный календарь раздела с включённым фильтром. */
async function FacetContent({ section, params }: { section: FacetSection; params: Params }) {
  const r = await load(section, params);
  if (!r) notFound();
  const { lang, country, f, label } = r;
  const t = translator(lang);
  const c = nameIn(COUNTRIES[country].name, lang);
  const home = `/${lang}/${country}`;
  const SEC: Record<FacetSection, string> = { movies: 'nav_movies', series: 'nav_series', games: 'nav_games' };
  const crumbs = breadcrumbs([['Premiero', home], [t(SEC[section]), `${home}/${section}`], [cap(t(HEAD[section], label), lang), `${home}/${section}/${f.slug}`]]);
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(crumbs) }} />
    <header className="wrap facet-head">
      <nav className="crumbs"><Link prefetch={false} href={`/${lang}/${country}/${section}`}><I.Prev /> {t('fh_back')}</Link></nav>
      <h1>{cap(t(HEAD[section], label), lang)}</h1>
      <p>{t('fh_intro', label, c)}</p>
    </header>
    <CalendarPage section={section} filter={filterOf(f, label)} current={`${section}/${f.slug}`} />
  </>;
}
