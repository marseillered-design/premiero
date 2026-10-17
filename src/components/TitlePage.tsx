import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { COUNTRIES, IMG, LOCALE, isCountry, isLang, nameIn } from '@/lib/regions';
import { translator } from '@/lib/i18n';
import { fromKey } from '@/lib/dates';
import { calendarPath, idFromSlug, titlePath } from '@/lib/slug';
import { getTitle, hasToken } from '@/lib/tmdb';
import type { Media, TitleDetail } from '@/lib/types';
import Poster from './Poster';
import { Episodes, Showtimes, TitleActions, Trailer, type TitleCore } from './TitleIslands';
import * as I from './icons';

type Params = Promise<{ lang: string; country: string; slug: string }>;

async function load(media: Media, params: Params) {
  const { lang, country, slug } = await params;
  const id = idFromSlug(slug);
  if (!isLang(lang) || !isCountry(country) || !id) return null;
  if (!hasToken()) return { lang, country, id, detail: null as TitleDetail | null };
  return { lang, country, id, detail: await getTitle(media, id, lang, country) };
}

export async function titleMetadata(media: Media, params: Params): Promise<Metadata> {
  const r = await load(media, params);
  if (!r?.detail) return {};
  const { lang, country, detail: d } = r;
  const t = translator(lang);
  const title = t(media === 'tv' ? 'meta_title_tv' : 'meta_title', d.title, d.year ?? '');
  const description = (d.overview || title).slice(0, 180);
  const image = IMG(d.backdrop, 'w1280') ?? IMG(d.poster, 'w780');
  return {
    title: { absolute: `${title} · Premiero` },
    description,
    alternates: { canonical: titlePath(lang, country, media, d.id, d.title) },
    openGraph: { title, description, type: media === 'tv' ? 'video.tv_show' : 'video.movie', images: image ? [{ url: image }] : [] },
    twitter: { card: 'summary_large_image', title, description, images: image ? [image] : [] },
  };
}

export default function TitlePage({ media, params }: { media: Media; params: Params }) {
  return (
    <Suspense fallback={<div className="wrap title-page"><div className="empty"><span className="spinner" aria-hidden /></div></div>}>
      <TitleContent media={media} params={params} />
    </Suspense>
  );
}

async function TitleContent({ media, params }: { media: Media; params: Params }) {
  const r = await load(media, params);
  if (!r) notFound();
  const { lang, country } = r;
  const t = translator(lang);
  if (!r.detail) {
    if (!hasToken()) return <div className="wrap title-page"><div className="empty"><b>{t('notoken_t')}</b><span>{t('notoken_s')}</span></div></div>;
    notFound();
  }
  const d = r.detail;
  const fullDate = new Intl.DateTimeFormat(LOCALE[lang], { day: 'numeric', month: 'long', year: 'numeric' });
  const day = (k: string) => fullDate.format(fromKey(k));
  const compact = new Intl.NumberFormat(LOCALE[lang], { notation: 'compact', maximumFractionDigits: 1 });
  const cName = nameIn(COUNTRIES[country].name, lang);
  const core: TitleCore = {
    id: d.id, media, title: d.title, poster: d.poster, cert: d.cert, popularity: d.popularity,
    theatrical: d.theatrical, digital: d.digital, nextEpisode: d.nextEpisode,
  };
  const kindKey = media === 'tv' ? 'ty_series' : d.theatrical ? 'ty_cinema' : 'ty_online';
  const kindCls = media === 'tv' ? 'series' : d.theatrical ? 'cinema' : 'online';
  const meta = [d.year, d.runtime ? `${d.runtime} ${t('min')}` : null, d.cert, d.genres.slice(0, 3).join(', ')].filter(Boolean) as string[];

  // Структурированные данные для поисковиков (schema.org)
  const ld = {
    '@context': 'https://schema.org', '@type': media === 'tv' ? 'TVSeries' : 'Movie',
    name: d.title, alternateName: d.original !== d.title ? d.original : undefined, description: d.overview || undefined,
    image: IMG(d.poster, 'w780') ?? undefined, datePublished: d.theatrical ?? d.year ?? undefined,
    director: media === 'movie' ? d.people.map(name => ({ '@type': 'Person', name })) : undefined,
    creator: media === 'tv' ? d.people.map(name => ({ '@type': 'Person', name })) : undefined,
    actor: d.cast.map(name => ({ '@type': 'Person', name })),
    aggregateRating: d.rating ? { '@type': 'AggregateRating', ratingValue: d.rating, bestRating: 10 } : undefined,
    trailer: d.trailer ? { '@type': 'VideoObject', name: `${d.title}: ${t('trailer')}`, embedUrl: `https://www.youtube.com/embed/${d.trailer}`, thumbnailUrl: `https://i.ytimg.com/vi/${d.trailer}/hqdefault.jpg` } : undefined,
  };

  return (
    <div className="wrap title-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />
      <nav className="crumbs"><Link href={calendarPath(lang, country)}><I.Prev /> {t('to_cal')}</Link></nav>

      <div className="hero">
        <Poster path={d.poster} title={d.title} cert={d.cert} size="w500" />
        <div>
          <span className={`tag t-${kindCls}`}>{t(kindKey)}{d.network ? ` · ${d.network}` : ''}</span>
          <h1>{d.title}</h1>
          {d.original && d.original !== d.title && <p className="orig">{d.original}</p>}
          <div className="meta">{meta.map(m => <span key={m}>{m}</span>)}</div>
          {(d.imdbId || d.rating) && (
            <div className="ratings">
              {d.imdbId && (
                <a className="imdb" href={`https://www.imdb.com/title/${d.imdbId}/`} target="_blank" rel="noreferrer"
                  aria-label={d.imdb ? t('imdb_l', d.imdb.rating.toFixed(1), compact.format(d.imdb.votes)) : 'IMDb'}>
                  <span className="imdb-logo">IMDb</span>
                  {d.imdb && <><b>{d.imdb.rating.toFixed(1)}</b><small>/10 · {compact.format(d.imdb.votes)}</small></>}
                </a>
              )}
              {d.rating ? <span className="tmdb-r" aria-label={t('tmdb_l', d.rating.toFixed(1))}><span className="tmdb-logo">TMDB</span><b>{d.rating.toFixed(1)}</b><small>/10</small></span> : null}
            </div>
          )}
          <div className="key-dates">
            {d.theatrical && <span><b>{t('in_cinema_on')}</b> {day(d.theatrical)}</span>}
            {d.digital && <span><b>{t('online_on')}</b> {day(d.digital)}</span>}
            {d.nextEpisode && <span><b>{t('next_ep')} {d.nextEpisode.season}×{String(d.nextEpisode.episode).padStart(2, '0')}</b> {day(d.nextEpisode.date)}</span>}
          </div>
          {d.overview && <p className="desc">{d.overview}</p>}
          <div className="credits">
            {d.people.length > 0 && <span>{t(media === 'tv' ? 'people_tv' : 'people_movie')}: <b>{d.people.join(', ')}</b></span>}
            {d.cast.length > 0 && <span>{t('cast')}: <b>{d.cast.join(', ')}</b></span>}
          </div>
          <TitleActions core={core} tmdbUrl={d.tmdbUrl} />
        </div>
      </div>

      {d.trailer && <section className="sec"><h2>{t('trailer')}</h2><Trailer id={d.trailer} title={d.title} /></section>}

      {media === 'movie' && (
        <section className="sec" id="tickets">
          <h2>{t('showtimes')}</h2>
          <Showtimes core={core} />
        </section>
      )}

      <section className="sec">
        <h2>{t('where')} <small>{cName}</small></h2>
        {d.providers.length ? (
          <div className="providers">
            {d.providers.map(p => (
              <span className="prov" key={p.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.logo && <img src={IMG(p.logo, 'w92')!} alt="" width={28} height={28} />}{p.name}
              </span>
            ))}
            {d.providersLink && <a className="reset" href={d.providersLink} target="_blank" rel="noreferrer">{t('all_prov')}</a>}
          </div>
        ) : <p className="note">{t('no_prov')}</p>}
      </section>

      {media === 'movie' && d.releases.some(x => x.date) && (
        <section className="sec">
          <h2>{t('rel_dates')} <small>{t('by_country')}</small></h2>
          <div className="rel-table">{d.releases.map(x => (
            <Link key={x.country} href={titlePath(lang, x.country, media, d.id, d.title)} className={`rel-c${x.country === country ? ' cur' : ''}`}>
              {nameIn(COUNTRIES[x.country].name, lang)}<b>{x.date ? day(x.date) : <span className="na">{t('tba')}</span>}</b>
            </Link>
          ))}</div>
        </section>
      )}

      {d.season && (
        <section className="sec">
          <h2>{t('ep_sched')} <small>{d.network ? `${d.network} · ` : ''}{t('season')} {d.season.number}</small></h2>
          <Episodes number={d.season.number} episodes={d.season.episodes} />
        </section>
      )}
    </div>
  );
}
