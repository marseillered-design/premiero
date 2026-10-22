import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { COUNTRIES, IMG, LOCALE, isCountry, isLang, nameIn } from '@/lib/regions';
import { translator } from '@/lib/i18n';
import { releaseSentence, whenOf } from '@/lib/release-text';
import { fromKey } from '@/lib/dates';
import { calendarPath, idFromSlug, titlePath } from '@/lib/slug';
import { getTitle, hasToken } from '@/lib/tmdb';
import { hasKv } from '@/lib/kv';
import { wantCounts } from '@/lib/account';
import type { TitleDetail, TmdbMedia as Media } from '@/lib/types';
import Poster from './Poster';
import { Episodes, TitleActions, Trailer, type TitleCore } from './TitleIslands';
import { ReportFix } from './Reports';
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
  // фраза о дате зависит от сегодняшнего дня, поэтому страница собирается по запросу (данные — из кэша)
  await connection();
  const today = new Date().toISOString().slice(0, 10);
  const sentence = media === 'tv'
    ? releaseSentence(lang, { kind: 'tv', title: d.title, next: d.nextEpisode ? { ...whenOf(d.nextEpisode.date, today)!, s: d.nextEpisode.season, e: d.nextEpisode.episode } : null })
    : releaseSentence(lang, { kind: 'movie', title: d.title, country: cName, cinema: whenOf(d.theatrical, today), online: whenOf(d.digital, today) });
  const core: TitleCore = {
    id: d.id, media, title: d.title, poster: d.poster, cert: d.cert, popularity: d.popularity,
    theatrical: d.theatrical, digital: d.digital, nextEpisode: d.nextEpisode,
    want: hasKv() ? (await wantCounts([`${media}-${d.id}`]).catch(() => ({} as Record<string, number>)))[`${media}-${d.id}`] : undefined,
  };
  const kindKey = media === 'tv' ? 'ty_series' : d.theatrical ? 'ty_cinema' : 'ty_online';
  const kindCls = media === 'tv' ? 'series' : d.theatrical ? 'cinema' : 'online';
  const meta = [d.year, d.runtime ? `${d.runtime} ${t('min')}` : null, d.cert, d.genres.slice(0, 3).join(', ')].filter(Boolean) as string[];

  // Структурированные данные для поисковиков (schema.org)
  const ld = {
    '@context': 'https://schema.org', '@type': media === 'tv' ? 'TVSeries' : 'Movie',
    name: d.title, alternateName: d.original !== d.title ? d.original : undefined, description: d.overview || undefined,
    image: IMG(d.poster, 'w780') ?? undefined, datePublished: d.theatrical ?? d.year ?? undefined,
    director: media === 'movie' ? d.people.map(p => ({ '@type': 'Person', name: p.name })) : undefined,
    creator: media === 'tv' ? d.people.map(p => ({ '@type': 'Person', name: p.name })) : undefined,
    actor: d.cast.slice(0, 5).map(p => ({ '@type': 'Person', name: p.name })),
    aggregateRating: d.rating ? { '@type': 'AggregateRating', ratingValue: d.rating, bestRating: 10 } : undefined,
    trailer: d.trailer ? { '@type': 'VideoObject', name: `${d.title}: ${t('trailer')}`, embedUrl: `https://www.youtube.com/embed/${d.trailer}`, thumbnailUrl: `https://i.ytimg.com/vi/${d.trailer}/hqdefault.jpg` } : undefined,
  };

  const backdrop = IMG(d.backdrop, 'w1280');
  return (
    <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />
    {/* Кинематографичная шапка: кадр из фильма во всю ширину, поверх постер и главное */}
    <div className={`t-hero${backdrop ? '' : ' no-bd'}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {backdrop && <img className="t-hero-bg" src={backdrop} alt="" fetchPriority="high" />}
      <div className="wrap t-hero-in">
      <nav className="crumbs"><Link href={calendarPath(lang, country)}><I.Prev /> {t('to_cal')}</Link></nav>

      <div className="hero">
        <Poster path={d.poster} title={d.title} cert={d.cert} size="w500" sizes="(max-width: 640px) 160px, (max-width: 960px) 200px, 280px" eager />
        <div>
          <span className={`tag t-${kindCls}`}>{t(kindKey)}{d.network ? ` · ${d.network}` : ''}</span>
          <h1>{d.title}</h1>
          {d.original && d.original !== d.title && <p className="orig">{d.original}</p>}
          <div className="meta">{meta.map(m => <span key={m}>{m}</span>)}</div>
          {(d.imdbId || d.rating) && (
            <div className="ratings">
              {d.imdbId && (
                <a className="imdb" href={`https://www.imdb.com/title/${d.imdbId}/`} target="_blank" rel="noreferrer"
                  >
                  <span className="imdb-logo" aria-hidden={!!d.imdb}>IMDb</span>
                  {d.imdb && <><b aria-hidden>{d.imdb.rating.toFixed(1)}</b><small aria-hidden>/10 · {compact.format(d.imdb.votes)}</small>
                    <span className="sr">{t('imdb_l', d.imdb.rating.toFixed(1), compact.format(d.imdb.votes))}</span></>}
                </a>
              )}
              {d.rating ? <span className="tmdb-r" aria-label={t('tmdb_l', d.rating.toFixed(1))}><span className="tmdb-logo">TMDB</span><b>{d.rating.toFixed(1)}</b><small>/10</small></span> : null}
            </div>
          )}
          <div className="key-dates">
            {d.theatrical && <span><b>{t('in_cinema_on')}</b> {day(d.theatrical)}</span>}
            {d.digital && <span><b>{t('online_on')}</b> {day(d.digital)}</span>}
            {d.physical && <span><b>{t('ty_disc')}</b> {day(d.physical)}</span>}
            {d.nextEpisode && <span><b>{t('next_ep')} {d.nextEpisode.season}×{String(d.nextEpisode.episode).padStart(2, '0')}</b> {day(d.nextEpisode.date)}</span>}
          </div>
          <p className="rel-sentence">{sentence}</p>
          <ReportFix itemKey={`${media}-${d.id}`} title={d.title} media={media} />
          {d.overview && <p className="desc">{d.overview}</p>}
          {d.people.length > 0 && (
            <div className="people">
              <span className="people-l">{t(media === 'tv' ? 'people_tv' : 'people_movie')}</span>
              {d.people.map(p => (
                <span className="person-chip" key={p.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.photo ? <img src={IMG(p.photo, 'w185')!} alt="" width={28} height={28} loading="lazy" /> : <span className="person-ph" aria-hidden>{p.name.slice(0, 1)}</span>}
                  {p.name}
                </span>
              ))}
            </div>
          )}
          <TitleActions core={core} ext={{ url: d.tmdbUrl, label: t('tmdb_page') }} />
        </div>
      </div>
      </div>
    </div>

    <div className="wrap title-page">
      {d.cast.length > 0 && (
        <section className="sec">
          <h2>{t('cast')}</h2>
          <ul className="cast-scroll">{d.cast.map(p => (
            <li className="actor" key={p.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {p.photo ? <img src={IMG(p.photo, 'w185')!} alt="" width={84} height={120} loading="lazy" decoding="async" /> : <span className="actor-ph" aria-hidden>{p.name.slice(0, 1)}</span>}
              <span className="actor-name">{p.name}</span>
              {p.character && <span className="actor-char">{p.character}</span>}
            </li>
          ))}</ul>
        </section>
      )}

      {d.trailer && (
        <section className="sec">
          <h2>{t('trailer')}{d.season && media === 'tv' ? <small>{t('season')} {d.season.number}</small> : null}</h2>
          <Trailer id={d.trailer} title={d.title} />
          {d.trailerName && <p className="trailer-name">{d.trailerName}</p>}
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
    </>
  );
}
