import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { IMG, LOCALE, SRCSET, isCountry, isLang } from '@/lib/regions';
import { translator } from '@/lib/i18n';
import { fromKey } from '@/lib/dates';
import { calendarPath, idFromSlug, titlePath } from '@/lib/slug';
import { getGame, hasIgdb, GAME_GENRE_OFFSET } from '@/lib/igdb';
import { gameGenreName } from '@/lib/game-genres';
import { hasKv } from '@/lib/kv';
import { wantCounts } from '@/lib/account';
import { releaseSentence, whenOf } from '@/lib/release-text';
import type { GameDetail } from '@/lib/types';
import Poster from './Poster';
import { TitleActions, Trailer, type TitleCore } from './TitleIslands';
import { ReportFix } from './Reports';
import * as I from './icons';

type Params = Promise<{ lang: string; country: string; slug: string }>;

async function load(params: Params) {
  const { lang, country, slug } = await params;
  const id = idFromSlug(slug);
  if (!isLang(lang) || !isCountry(country) || !id) return null;
  if (!hasIgdb()) return { lang, country, detail: null as GameDetail | null };
  return { lang, country, detail: await getGame(id, country) };
}

export async function gameMetadata(params: Params): Promise<Metadata> {
  const r = await load(params);
  if (!r?.detail) return {};
  const { lang, country, detail: d } = r;
  const t = translator(lang);
  const title = t('meta_title_game', d.title, d.release?.slice(0, 4) ?? '');
  const description = (d.summary || title).slice(0, 180);
  const image = IMG(d.backdrop, 'w1280') ?? IMG(d.poster, 'w500');
  return {
    title: { absolute: `${title} · Premiero` },
    description,
    alternates: { canonical: titlePath(lang, country, 'game', d.id, d.title) },
    openGraph: { title, description, type: 'website', images: image ? [{ url: image }] : [] },
    twitter: { card: 'summary_large_image', title, description, images: image ? [image] : [] },
  };
}

export default function GamePage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<div className="wrap title-page"><div className="empty"><span className="spinner" aria-hidden /></div></div>}>
      <GameContent params={params} />
    </Suspense>
  );
}

async function GameContent({ params }: { params: Params }) {
  const r = await load(params);
  if (!r) notFound();
  const { lang, country } = r;
  const t = translator(lang);
  if (!r.detail) {
    if (!hasIgdb()) return <div className="wrap title-page"><div className="empty"><b>{t('noigdb_t')}</b><span>{t('noigdb_s')}</span></div></div>;
    notFound();
  }
  const d = r.detail;
  // фраза о дате зависит от сегодняшнего дня (данные — из кэша)
  await connection();
  const today = new Date().toISOString().slice(0, 10);
  const fullDate = new Intl.DateTimeFormat(LOCALE[lang], { day: 'numeric', month: 'long', year: 'numeric' });
  const day = (k: string) => fullDate.format(fromKey(k));
  const genres = d.genres.map(g => gameGenreName(g - GAME_GENRE_OFFSET, lang)).filter(Boolean) as string[];
  const platforms = [...new Set(d.releases.map(x => x.platform))];
  const core: TitleCore = {
    id: d.id, media: 'game', title: d.title, poster: d.poster, cert: null, popularity: d.popularity,
    theatrical: null, digital: null, nextEpisode: null, release: d.release,
    want: hasKv() ? (await wantCounts([`game-${d.id}`]).catch(() => ({} as Record<string, number>)))[`game-${d.id}`] : undefined,
  };
  const meta = [d.release?.slice(0, 4), genres.slice(0, 3).join(', '), d.modes.slice(0, 2).join(', ')].filter(Boolean) as string[];

  // Структурированные данные для поисковиков (schema.org)
  const ld = {
    '@context': 'https://schema.org', '@type': 'VideoGame',
    name: d.title, description: d.summary || undefined, image: IMG(d.poster, 'w500') ?? undefined,
    datePublished: d.release ?? undefined, gamePlatform: platforms.length ? platforms : undefined, genre: genres.length ? genres : undefined,
    author: d.developers.length ? d.developers.map(name => ({ '@type': 'Organization', name })) : undefined,
    publisher: d.publishers.length ? d.publishers.map(name => ({ '@type': 'Organization', name })) : undefined,
    aggregateRating: d.rating ? { '@type': 'AggregateRating', ratingValue: d.rating, bestRating: 10, ratingCount: d.ratingCount } : undefined,
    trailer: d.trailer ? { '@type': 'VideoObject', name: `${d.title}: ${t('trailer')}`, embedUrl: `https://www.youtube.com/embed/${d.trailer}`, thumbnailUrl: `https://i.ytimg.com/vi/${d.trailer}/hqdefault.jpg` } : undefined,
  };

  const backdrop = IMG(d.backdrop, 'w1280');
  return (
    <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />
    <div className={`t-hero${backdrop ? '' : ' no-bd'}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {backdrop && <img className="t-hero-bg" src={backdrop} alt="" fetchPriority="high" />}
      <div className="wrap t-hero-in">
      <nav className="crumbs"><Link href={`${calendarPath(lang, country)}/games`}><I.Prev /> {t('to_games')}</Link></nav>

      <div className="hero">
        <Poster path={d.poster} title={d.title} size="w500" eager />
        <div>
          <span className="tag t-game">{t('ty_game')}{platforms.length ? ` · ${platforms.slice(0, 4).join(', ')}` : ''}</span>
          <h1>{d.title}</h1>
          <div className="meta">{meta.map(m => <span key={m}>{m}</span>)}</div>
          {d.rating ? (
            <div className="ratings">
              <a className="tmdb-r" href={d.igdbUrl} target="_blank" rel="noreferrer">
                <span className="tmdb-logo igdb-logo" aria-hidden>IGDB</span><b aria-hidden>{d.rating.toFixed(1)}</b><small aria-hidden>/10</small>
                <span className="sr">{t('igdb_l', d.rating.toFixed(1))}</span>
              </a>
            </div>
          ) : null}
          <div className="key-dates">
            <span><b>{t('g_release')}</b> {d.release ? day(d.release) : t('tba')}</span>
          </div>
          <p className="rel-sentence">{releaseSentence(lang, { kind: 'game', title: d.title, release: whenOf(d.release, today), platforms })}</p>
          <ReportFix itemKey={`game-${d.id}`} title={d.title} media="game" />
          {d.summary && <p className="desc" lang="en">{d.summary}</p>}
          <div className="credits">
            {d.developers.length > 0 && <span>{t('g_dev')}: <b>{d.developers.join(', ')}</b></span>}
            {d.publishers.length > 0 && <span>{t('g_pub')}: <b>{d.publishers.join(', ')}</b></span>}
          </div>
          <TitleActions core={core} ext={{ url: d.igdbUrl, label: t('igdb_page') }} />
        </div>
      </div>
      </div>
    </div>

    <div className="wrap title-page">
      {d.trailer && (
        <section className="sec">
          <h2>{t('trailer')}</h2>
          <Trailer id={d.trailer} title={d.title} />
          {d.trailerName && <p className="trailer-name">{d.trailerName}</p>}
        </section>
      )}

      {d.releases.length > 0 && (
        <section className="sec">
          <h2>{t('g_dates')} <small>{t('g_by_platform')}</small></h2>
          <div className="rel-table">{d.releases.map(x => (
            <span key={x.platform} className="rel-c">{x.platform}<b>{x.date ? day(x.date) : <span className="na">{t('tba')}</span>}</b></span>
          ))}</div>
        </section>
      )}

      <section className="sec">
        <h2>{t('g_where')}</h2>
        {d.stores.length ? (
          <div className="providers">
            {d.stores.map(s => <a className="prov" key={s.name} href={s.url} target="_blank" rel="noreferrer">{s.name}</a>)}
          </div>
        ) : <p className="note">{t('g_no_stores')}</p>}
      </section>

      {d.screenshots.length > 0 && (
        <section className="sec">
          <h2>{t('g_shots')}</h2>
          <div className="shots">{d.screenshots.map((s, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <a key={s} href={IMG(s, 'w1280')!} target="_blank" rel="noreferrer" aria-label={`${t('g_shots')} ${i + 1}: ${d.title}`}><img src={IMG(s, 'w780')!} srcSet={SRCSET(s, 'backdrop')} sizes="(max-width: 640px) 92vw, 300px" alt="" loading="lazy" decoding="async" /></a>
          ))}</div>
        </section>
      )}
    </div>
    </>
  );
}
