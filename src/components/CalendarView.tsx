'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { COUNTRIES, IMG, SRCSET, nameIn } from '@/lib/regions';
import { addDays, dateFmt, diffDays, dkey, fromKey, mkey } from '@/lib/dates';
import { titlePath } from '@/lib/slug';
import type { CalEvent, CalItem, CalendarData, Kind, Platform } from '@/lib/types';
import type { FacetFilter } from '@/lib/facets';
import Poster from './Poster';
import { store, useEnv } from './AppProvider';
import * as I from './icons';
import { useModal } from './useModal';
import FeaturedRail from './FeaturedRail';
import SearchBox from './SearchBox';

type View = 'feed' | 'month' | 'list';
export type Cat = 'all' | Kind;
type Load = { status: 'loading' | 'ok' | 'error' | 'no_token'; data?: CalendarData };
const KINDS: Kind[] = ['cinema', 'series', 'online', 'disc', 'game'];
/** Разделы сайта и какие типы релизов в них входят. */
export type Section = 'all' | 'movies' | 'series' | 'games';
const SECTION_KINDS: Record<Section, Kind[]> = { all: KINDS, movies: ['cinema', 'online', 'disc'], series: ['series'], games: ['game'] };
const TYPE_ORDER: Record<Kind, number> = { cinema: 0, online: 1, disc: 2, series: 3, game: 4 };
const KIND_COLOR: Record<Kind, string> = { cinema: 'var(--t-cinema)', series: 'var(--t-series)', online: 'var(--t-online)', disc: 'var(--t-disc)', game: 'var(--t-game)' };
const GENRES_TOP = 12; // в панели фильтров сначала самые частые жанры месяца
const PLATFORMS: Platform[] = ['pc', 'ps', 'xbox', 'nintendo', 'mobile'];

/** Месяц, отрисованный на сервере: сегодняшняя дата в стране посетителя и релизы этого месяца. */
export interface InitialMonth { today: string; data: CalendarData }

/**
 * Календарь релизов: весь или один раздел (фильмы, сериалы, игры).
 * С `initial` первый экран рисуется на сервере (постеры есть уже в HTML), после загрузки
 * берётся дата с часов посетителя; без него календарь сам запрашивает месяц.
 */
export default function CalendarView({ section = 'all', filter, initial }: { section?: Section; filter?: FacetFilter; initial?: InitialMonth }) {
  const kinds = SECTION_KINDS[section];
  const env = useEnv();
  const { t, lang, country, ready, watch, subs } = env;
  // до загрузки в браузере дата приходит с сервера, иначе первый экран нечем было бы нарисовать
  const serverToday = initial && !ready ? fromKey(initial.today) : null;
  const today = serverToday ?? env.today;
  const serverFmt = useMemo(() => (initial ? dateFmt(lang, fromKey(initial.today)) : null), [initial, lang]);
  const f = serverToday && serverFmt ? serverFmt : env.f;
  const [month, setMonth] = useState<Date | null>(() => (initial ? fromKey(initial.today.slice(0, 7) + '-01') : null));
  // месяц, уже пришедший с сервера: повторно его не запрашиваем
  const have = useRef(initial ? `${country}/${lang}/${initial.today.slice(0, 7)}` : null);
  const [view, setView] = useState<View>('feed');
  const [cat, setCat] = useState<Cat>('all');
  const [plats, setPlats] = useState<Set<Platform>>(() => new Set(filter?.platform ? [filter.platform] : []));
  const [genres, setGenres] = useState<Set<number>>(() => new Set(filter?.genres ?? []));
  // стриминг страницы-календаря (например, «Сериалы Netflix»); снимается крестиком в панели
  const [provs, setProvs] = useState<Set<number>>(() => new Set(filter?.providers ?? []));
  const [onlyWatch, setOnlyWatch] = useState(false);
  const [onlySubs, setOnlySubs] = useState(false);
  const [showEps, setShowEps] = useState(true);
  const [showAnime, setShowAnime] = useState(false);
  const [q, setQ] = useState('');
  const [showPast, setShowPast] = useState(false);
  const [subsOpen, setSubsOpen] = useState(false);
  const [allGenres, setAllGenres] = useState(false);
  const [load, setLoad] = useState<Load>(() => (initial ? { status: 'ok', data: initial.data } : { status: 'loading' }));
  const [pendingScroll, setPendingScroll] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    const v = store.get<string>('premiero.view', 'feed');
    /* eslint-disable react-hooks/set-state-in-effect */
    setView(v === 'month' || v === 'list' ? v : 'feed');
    setShowAnime(store.get<boolean>('premiero.anime', false));
    setOnlySubs(store.get<boolean>('premiero.subsOnly', false));
    // если у посетителя уже другой месяц, чем на сервере (полночь в другом часовом поясе), переключаемся
    const own = new Date(today.getFullYear(), today.getMonth(), 1);
    setMonth(m => (!m || (initial && mkey(m) === initial.today.slice(0, 7)) ? own : m));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [ready, today, initial]);

  const monthKey = month ? mkey(month) : null;
  useEffect(() => {
    if (!monthKey) return;
    if (have.current === `${country}/${lang}/${monthKey}`) { have.current = null; return; }
    have.current = null;
    const ac = new AbortController();
    setLoad({ status: 'loading' });
    fetch(`/api/calendar?country=${country}&lang=${lang}&month=${monthKey}`, { signal: ac.signal })
      .then(async r => {
        const j = await r.json();
        if (ac.signal.aborted) return;
        if (r.status === 503 && j.error === 'no_token') setLoad({ status: 'no_token' });
        else if (!r.ok) setLoad({ status: 'error' });
        else setLoad({ status: 'ok', data: j as CalendarData });
      })
      .catch(e => { if (!ac.signal.aborted && (e as Error).name !== 'AbortError') setLoad({ status: 'error' }); });
    return () => ac.abort();
  }, [country, lang, monthKey]);

  const data = load.data;
  const subsActive = onlySubs && subs.size > 0;
  const events = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    return data.events.filter(ev => {
      const it = data.items[ev.item];
      if (!it) return false;
      if (!kinds.includes(ev.kind)) return false;
      if (cat !== 'all' && ev.kind !== cat) return false;
      if (genres.size && !it.genres.some(g => genres.has(g))) return false;
      if (onlyWatch && !watch.has(it.key)) return false;
      if (!showEps && ev.kind === 'series' && !ev.premiere) return false;
      if (!showAnime && it.anime) return false;
      if (plats.size && ev.kind === 'game' && !(it.platforms ?? []).some(x => plats.has(x))) return false;
      if (provs.size && !((ev.kind === 'online' || ev.kind === 'series') && (it.providers ?? []).some(x => provs.has(x)))) return false;
      // подписки на стриминги касаются только онлайн-релизов и сериалов
      if (subsActive && (ev.kind === 'online' || ev.kind === 'series') && !(it.providers ?? []).some(p => subs.has(p))) return false;
      if (needle && !it.title.toLowerCase().includes(needle)) return false;
      return true;
    }).sort((a, b) => a.date.localeCompare(b.date) || TYPE_ORDER[a.kind] - TYPE_ORDER[b.kind] || data.items[b.item].popularity - data.items[a.item].popularity);
  }, [data, kinds, q, cat, genres, plats, provs, onlyWatch, watch, showEps, showAnime, subsActive, subs]);

  useEffect(() => {
    if (!pendingScroll || load.status !== 'ok') return;
    const secs = [...document.querySelectorAll<HTMLElement>('[data-day-sec]')];
    secs.find(s => s.dataset.daySec! >= pendingScroll)?.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPendingScroll(null);
  }, [pendingScroll, load.status, view]);

  const rank = useMemo(() => {
    const m = new Map<string, number>();
    if (!data) return m;
    const group = (k: Kind) => (k === 'online' || k === 'cinema' || k === 'disc' ? 'movies' : k);
    const byGroup: Record<string, CalItem[]> = {};
    for (const ev of data.events) {
      const it = data.items[ev.item];
      if (!it) continue;
      (byGroup[group(ev.kind)] ??= []).push(it);
    }
    for (const list of Object.values(byGroup)) {
      [...new Map(list.map(i => [i.key, i])).values()].sort((a, b) => b.popularity - a.popularity).forEach((it, i) => { if (!m.has(it.key)) m.set(it.key, i); });
    }
    return m;
  }, [data]);

  // Провайдеры месяца: сначала самые частые
  const providerList = useMemo(() => {
    if (!data) return [];
    const cnt: Record<number, number> = {};
    Object.values(data.items).forEach(it => it.providers?.forEach(p => { cnt[p] = (cnt[p] ?? 0) + 1; }));
    return Object.values(data.providers).sort((a, b) => (cnt[b.id] ?? 0) - (cnt[a.id] ?? 0));
  }, [data]);

  // До монтирования месяц неизвестен (он зависит от часов посетителя), но панель и боковая колонка
  // рисуются сразу, чтобы страница не прыгала, когда появятся данные

  const C = COUNTRIES[country];
  const cName = nameIn(C.name, lang);
  const isCurMonth = !!month && mkey(month) === mkey(today);
  const shiftMonth = (n: number) => {
    if (!month) return;
    if (n === 0) { setMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setShowPast(false); setPendingScroll(dkey(today)); }
    else { setMonth(m => new Date(m!.getFullYear(), m!.getMonth() + n, 1)); window.scrollTo({ top: 0 }); }
  };
  const resetFilters = () => { setCat('all'); setGenres(new Set()); setPlats(new Set()); setProvs(new Set()); setOnlyWatch(false); setShowEps(true); setOnlySubs(false); store.set('premiero.subsOnly', false); setQ(''); };
  const jumpToDay = (k: string) => { setShowPast(true); setView('feed'); store.set('premiero.view', 'feed'); setPendingScroll(k); };
  const href = (it: CalItem) => titlePath(lang, country, it.media, it.id, it.title);

  /* ---------- small pieces (render helpers, not components) ---------- */
  const epLabel = (ev: CalEvent, it: CalItem) => {
    if (!ev.eps?.length) return '';
    const a = ev.eps[0], b = ev.eps[ev.eps.length - 1];
    const base = a === b ? `${it.season}×${String(a).padStart(2, '0')}` : t('eps_range', a, b);
    if (ev.premiere) return `${t('premiere')}, ${base}`;
    return ev.finale ? `${base}, ${t('finale')}` : base;
  };
  const kindTag = (k: Kind) => <span className={`tag t-${k}`}>{t('ty_' + k)}</span>;
  const genreName = (id: number) => data?.genres[id] ?? '';
  // метка как у releases.com: место релиза по популярности среди своего типа в этом месяце
  const want = data?.want ?? {};
  const antLabel = (ev: CalEvent, it: CalItem) => {
    const r = rank.get(it.key);
    if (r === undefined || r > 9) return null;
    if (ev.date < dkey(today)) return <span className="ant ant-pop">{t('ant_pop')}</span>;
    return r < 3 ? <span className="ant ant-top">{t('ant_top')}</span> : <span className="ant">{t('ant')}</span>;
  };
  const watchBtn = (ev: CalEvent, it: CalItem) => {
    const on = watch.has(it.key);
    const item = { key: it.key, media: it.media, id: it.id, title: it.title, poster: it.poster, date: ev.date };
    return <button className="watch" aria-pressed={on} aria-label={on ? t('unwant') : t('want')} title={t('want')} onClick={() => env.toggleWatch(item)}><I.Bell /></button>;
  };
  // у онлайн-релизов и сериалов — «Смотреть», у игр — «Играть»; обе ведут на страницу релиза
  const actionBtn = (ev: CalEvent, it: CalItem) =>
    ev.kind === 'online' || ev.kind === 'series' ? <Link prefetch={false} className="buy ghost" href={href(it)}>{t('watch_btn')}</Link>
      : ev.kind === 'game' ? <Link prefetch={false} className="buy ghost" href={href(it)}>{t('play_btn')}</Link> : null;
  const meta = (ev: CalEvent, it: CalItem) => (
    <p className="card-m">
      {antLabel(ev, it)}
      {kindTag(ev.kind)}
      <span>
        {ev.kind === 'series' ? [it.platform, epLabel(ev, it)].filter(Boolean).join(' · ')
          : ev.kind === 'game' ? (ev.plat ?? []).join(', ')
          : ev.approx ? t('world')
          : [it.cert, genreName(it.genres[0])].filter(Boolean).join(' · ')}
      </span>
      {it.rating ? <span className="stars"><I.Star />{it.rating.toFixed(1)}</span> : null}
    </p>
  );
  const card = (ev: CalEvent) => {
    const it = data!.items[ev.item];
    return (
      <article className="card" key={ev.item + ev.kind + ev.date}>
        <Link prefetch={false} className="poster-btn" href={href(it)} tabIndex={-1} aria-hidden><Poster path={it.poster} title={it.title} cert={it.cert} /></Link>
        <h3 className="card-t"><Link prefetch={false} href={href(it)}>{it.title}</Link></h3>
        {meta(ev, it)}
        <div className="card-a">{watchBtn(ev, it)}{actionBtn(ev, it)}{want[it.key] >= 3 && <span className="want-n" title={t('want_n', want[it.key])}><I.Bell />{want[it.key]}</span>}</div>
      </article>
    );
  };
  const summary = (list: CalEvent[]) => {
    const n: Record<Kind, Set<string>> = { cinema: new Set(), series: new Set(), online: new Set(), disc: new Set(), game: new Set() };
    list.forEach(e => n[e.kind].add(e.item));
    return (
      <div className="summary">
        {KINDS.filter(k => n[k].size).map(k => (
          <span className="k" key={k}><span className="sw" style={{ background: KIND_COLOR[k] }} /><b>{n[k].size}</b> {t('s_' + k, n[k].size)}</span>
        ))}
      </div>
    );
  };
  // в конце ленты — не тупик, а переход дальше: следующий месяц одной кнопкой
  const endOfMonth = () => {
    if (!month) return null;
    const next = new Date(month.getFullYear(), month.getMonth() + 1, 1);
    return (
      <div className="eom">
        <div className="eom-tear" aria-hidden />
        <TicketIcon />
        <p className="eom-t">{t('end_t')}</p>
        <p className="eom-s">{t('end_s')}</p>
        <button className="btn primary" onClick={() => shiftMonth(1)}>{f.monthTitle(next)} <I.Next /></button>
      </div>
    );
  };
  const empty = <div className="empty"><b>{t('empty_t')}</b><span>{t('empty_s')}</span><button className="btn" onClick={resetFilters}>{t('reset')}</button></div>;

  // Главные премьеры ближайших дней: большие карточки с кадром из фильма
  const featured = () => {
    const from = dkey(addDays(today, -3)), to = dkey(addDays(today, 10));
    const seen = new Set<string>();
    const list = events
      .filter(e => e.date >= from && e.date <= to && (e.kind !== 'series' || e.premiere) && data!.items[e.item].backdrop)
      .sort((a, b) => data!.items[b.item].popularity - data!.items[a.item].popularity)
      .filter(e => !seen.has(e.item) && seen.add(e.item))
      .slice(0, 8);
    if (list.length < 3) return null;
    return <FeaturedRail slides={list.map(e => {
      const it = data!.items[e.item], d = fromKey(e.date);
      return {
        key: e.item, href: href(it), image: IMG(it.backdrop!, 'w780')!, srcSet: SRCSET(it.backdrop!, 'backdrop'), title: it.title, kind: e.kind,
        rating: it.rating, date: `${f.date(d)} · ${f.rel(d)}`,
      };
    })} />;
  };

  // «Горячее на этой неделе», как у releases.com: отдельный ряд для игр, фильмов и сериалов на общей странице
  const HOT: [string, Kind[], string][] = [['hot_games', ['game'], '/games'], ['hot_movies', ['cinema', 'online'], '/movies'], ['hot_series', ['series'], '/series']];
  const hotRows = () => {
    if (section !== 'all') return null;
    const from = dkey(addDays(today, -3)), to = dkey(addDays(today, 7));
    return HOT.map(([key, ks, path]) => {
      const seen = new Set<string>();
      const list = events
        .filter(e => e.date >= from && e.date <= to && ks.includes(e.kind))
        .sort((a, b) => data!.items[b.item].popularity - data!.items[a.item].popularity)
        .filter(e => !seen.has(e.item) && seen.add(e.item))
        .slice(0, 10);
      if (list.length < 3) return null;
      return (
        <section className="hot" key={key}>
          <div className="feat-top"><h2 className="feat-h">{t(key)}</h2><Link prefetch={false} className="feat-more" href={`/${lang}/${country}${path}`}>{t('all_link')} →</Link></div>
          <ul className="hot-row">{list.map(e => {
            const it = data!.items[e.item];
            return (
              <li key={e.item}><Link prefetch={false} href={href(it)}>
                <Poster path={it.poster} title={it.title} sizes="128px" />
                <span className="hot-t">{it.title}</span>
                <span className="hot-d">{f.date(fromKey(e.date))}</span>
              </Link></li>
            );
          })}</ul>
        </section>
      );
    });
  };

  /* ---------- views ---------- */
  const renderFeed = () => {
    if (!events.length) return empty;
    const cut = dkey(addDays(today, -2));
    const shown = isCurMonth && !showPast ? events.filter(e => e.date >= cut) : events;
    const hidden = events.length - shown.length;
    const days = new Map<string, CalEvent[]>();
    shown.forEach(e => days.set(e.date, [...(days.get(e.date) ?? []), e]));
    const allDays = new Map<string, number>();
    events.forEach(e => allDays.set(e.date, (allDays.get(e.date) ?? 0) + 1));
    return (
      <>
        {isCurMonth && !q && featured()}
        {isCurMonth && !q && hotRows()}
        <nav className="daybar" aria-label={t('v_feed')}>
          {[...allDays].map(([k, n]) => {
            const d = fromKey(k), rel = diffDays(d, today);
            return (
              <button key={k} className={`dchip${rel === 0 ? ' is-today' : ''}${rel < 0 ? ' is-past' : ''}`} onClick={() => jumpToDay(k)} >
                <span aria-hidden>{f.wd(d, true)}</span><b aria-hidden>{d.getDate()}</b><i aria-hidden>{n}</i>
                <span className="sr">{`${f.date(d)}, ${t('releases_n', n)}`}</span>
              </button>
            );
          })}
        </nav>
        {summary(events)}
        {hidden > 0 && <button className="btn show-past" onClick={() => setShowPast(true)}>{t('show_past', hidden)}</button>}
        {[...days].map(([k, list]) => {
          const d = fromKey(k), n = diffDays(d, today);
          return (
            <section key={k} className={`day${n === 0 ? ' is-today' : ''}${n < 0 ? ' is-past' : ''}`} data-day-sec={k}>
              <header className="day-h">
                <span className="day-tile" aria-hidden><span>{f.wd(d, true)}</span><b>{d.getDate()}</b></span>
                <div className="day-txt"><h2>{f.date(d)}</h2><span className="wd">{f.wd(d)}</span></div>
                <span className="rel">{f.rel(d)}</span><span className="rule" /><span className="cnt">{t('releases_n', list.length)}</span>
              </header>
              <div className="grid">{list.map(card)}</div>
            </section>
          );
        })}
        {endOfMonth()}
      </>
    );
  };

  const renderMonth = () => {
    if (!month) return null;
    const lead = (month.getDay() + 6) % 7;
    const dim = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const weeks = Math.ceil((lead + dim) / 7);
    const start = addDays(month, -lead);
    const byDay: Record<string, CalEvent[]> = {};
    events.forEach(e => (byDay[e.date] ||= []).push(e));
    return (
      <>
        {summary(events)}
        <div className="month">
          {Array.from({ length: 7 }, (_, i) => <div className="wdh" key={'w' + i}>{f.wd(addDays(start, i), true)}</div>)}
          {Array.from({ length: weeks * 7 }, (_, i) => {
            const d = addDays(start, i), k = dkey(d), list = byDay[k] ?? [];
            return (
              <div key={k} className={`cell${d.getMonth() !== month.getMonth() ? ' out' : ''}${diffDays(d, today) === 0 ? ' today' : ''}`}>
                <button className="cell-d" aria-label={`${f.date(d)}, ${t('releases_n', list.length)}`} onClick={() => jumpToDay(k)}>{d.getDate()}</button>
                {list.length > 0 && <>
                  <ul>{list.slice(0, 3).map(e => {
                    const it = data!.items[e.item];
                    return <li key={e.item + e.kind}><Link prefetch={false} className={`m-ev t-${e.kind}`} title={it.title} href={href(it)}><Poster path={it.poster} title={it.title} mini /><span className="m-t">{it.title}</span></Link></li>;
                  })}</ul>
                  {list.length > 3 && <button className="more" onClick={() => jumpToDay(k)}>+{list.length - 3}</button>}
                  <span className="dots" aria-hidden>{list.slice(0, 6).map(e => <i key={e.item + e.kind} className={`t-${e.kind}`} />)}</span>
                </>}
              </div>
            );
          })}
        </div>
      </>
    );
  };

  const renderList = () => {
    if (!events.length) return empty;
    return (
      <>
        {summary(events)}
        <div className="table-wrap"><table>
          <thead><tr><th>{t('th_date')}</th><th>{t('th_title')}</th><th>{t('th_type')}</th><th>{t('th_genre')}</th><th>{t('th_where')}</th><th /></tr></thead>
          <tbody>{events.map(e => {
            const it = data!.items[e.item], d = fromKey(e.date);
            const where = e.kind === 'cinema' ? t('in_theaters') : e.kind === 'series' ? [it.platform, epLabel(e, it)].filter(Boolean).join(' · ') : e.kind === 'game' ? (e.plat ?? []).join(', ') : e.kind === 'disc' ? t('ty_disc') : t('streaming');
            return (
              <tr key={e.item + e.kind + e.date}>
                <td className="date">{f.date(d)}<small>{f.wd(d, true)} · {f.rel(d)}</small></td>
                <td><Link prefetch={false} className="l-title" href={href(it)}><Poster path={it.poster} title={it.title} mini />{it.title}</Link></td>
                <td>{kindTag(e.kind)}</td>
                <td className="muted">{it.genres.map(genreName).filter(Boolean).slice(0, 3).join(', ')}</td>
                <td className="muted">{where}</td>
                <td>{actionBtn(e, it)}</td>
              </tr>
            );
          })}</tbody>
        </table></div>
        {endOfMonth()}
      </>
    );
  };

  const genreCount: Record<number, number> = {};
  if (data) {
    const keys = new Set(data.events.filter(e => (cat === 'all' ? kinds.includes(e.kind) : e.kind === cat)).map(e => e.item));
    keys.forEach(k => data.items[k]?.genres.forEach(g => { if (data.genres[g]) genreCount[g] = (genreCount[g] ?? 0) + 1; }));
  }
  const genreIds = Object.keys(genreCount).map(Number).sort((a, b) => genreCount[b] - genreCount[a]);
  const shown = cat === 'all' ? kinds : [cat];
  const showsScreen = shown.some(k => k !== 'game');
  const showsStreaming = shown.includes('online') || shown.includes('series');
  // сколько фильтров включено — число на кнопке «Фильтры»
  const active = (cat !== 'all' ? 1 : 0) + genres.size + plats.size + (onlyWatch ? 1 : 0)
    + (!showEps && shown.includes('series') ? 1 : 0) + (onlySubs && subs.size && showsStreaming ? 1 : 0);
  const toggleIn = <V,>(set: (f: (s: Set<V>) => Set<V>) => void, v: V) => set(s => { const n = new Set(s); if (n.has(v)) n.delete(v); else n.add(v); return n; });
  const views = (
    <div className="views" role="group" aria-label={t('view')}>
      {([['feed', 'v_feed', I.Feed], ['month', 'v_month', I.Month], ['list', 'v_list', I.List]] as const).map(([v, k, Icon]) => (
        <button key={v} aria-pressed={view === v} aria-label={t(k)} title={t(k)} onClick={() => { setView(v); store.set('premiero.view', v); }}><Icon /></button>
      ))}
    </div>
  );

  let main: React.ReactNode;
  if (!month || load.status === 'loading') main = <div className="empty"><span className="spinner" aria-hidden />{t('loading')}</div>;
  else if (load.status === 'no_token') main = <div className="empty"><b>{t('notoken_t')}</b><span>{t('notoken_s')}</span></div>;
  else if (load.status === 'error') main = <div className="empty"><b>{t('err_t')}</b><span>{t('err_s')}</span></div>;
  else main = view === 'month' ? renderMonth() : view === 'list' ? renderList() : renderFeed();

  return (
    <>
      <div className="bar"><div className="wrap">
        <FilterMenu count={active} onReset={resetFilters}>
          {kinds.length > 1 && <section>
            <h3>{t('kind')}</h3>
            <div className="fm-chips">{(['all', ...kinds] as Cat[]).map(k => (
              <button key={k} className="chip" aria-pressed={cat === k} onClick={() => setCat(k)}>
                {k !== 'all' && <span className="sw" style={{ background: KIND_COLOR[k] }} />}{t(k)}
              </button>
            ))}</div>
          </section>}
          {genreIds.length > 0 && <section>
            <h3>{t('genres')}</h3>
            <div className="gmenu-grid">{(allGenres ? genreIds : genreIds.filter((g, i) => i < GENRES_TOP || genres.has(g))).map(g => (
              <button key={g} className="gmenu-item" aria-pressed={genres.has(g)} onClick={() => toggleIn(setGenres, g)}>
                <span>{data?.genres[g]}</span><small>{genreCount[g]}</small>
              </button>
            ))}</div>
            {!allGenres && genreIds.length > GENRES_TOP && <button className="reset fm-more" onClick={() => setAllGenres(true)}>{t('all_genres', genreIds.length)}</button>}
          </section>}
          {kinds.includes('game') && (cat === 'all' || cat === 'game') && <section>
            <h3>{t('platforms')}</h3>
            <div className="fm-chips">{PLATFORMS.map(x => (
              <button key={x} className="chip" aria-pressed={plats.has(x)} onClick={() => toggleIn(setPlats, x)}>{t('pf_' + x)}</button>
            ))}</div>
          </section>}
          <section>
            <h3>{t('show')}</h3>
            <div className="toggles">
              <label className="toggle"><input type="checkbox" checked={onlyWatch} onChange={e => setOnlyWatch(e.target.checked)} /> {t('my_list')} ({watch.size})</label>
              {shown.includes('series') && <label className="toggle"><input type="checkbox" checked={showEps} onChange={e => setShowEps(e.target.checked)} /> {t('new_eps')}</label>}
              {showsScreen && <label className="toggle"><input type="checkbox" checked={showAnime} onChange={e => { setShowAnime(e.target.checked); store.set('premiero.anime', e.target.checked); }} /> {t('anime')}</label>}
            </div>
          </section>
          {showsStreaming && <section>
            <h3>{t('subs')}</h3>
            <div className="toggles">
              <label className="toggle"><input type="checkbox" checked={onlySubs} disabled={!subs.size} onChange={e => { setOnlySubs(e.target.checked); store.set('premiero.subsOnly', e.target.checked); }} /> {t('subs_only')}{subs.size ? ` (${subs.size})` : ''}</label>
              <button className="reset" onClick={() => setSubsOpen(true)}>{subs.size ? t('subs_n', subs.size) + ' · ' : ''}{t('subs_edit')}</button>
            </div>
          </section>}
          {/* на телефоне переключатель вида живёт здесь, в панели ему не хватает места */}
          <section className="fm-views"><h3>{t('view')}</h3>{views}</section>
        </FilterMenu>
        {provs.size > 0 && filter?.label && (
          <button className="chip prov-chip" aria-pressed onClick={() => setProvs(new Set())} aria-label={`${filter.label}: ${t('reset')}`}>{filter.label} <I.Close /></button>
        )}
        <SearchBox q={q} onChange={setQ} />
        <div className="month-nav">
          <button className="icon-btn" aria-label={t('prev')} onClick={() => shiftMonth(-1)}><I.Prev /></button>
          <h2>{month ? f.monthTitle(month) : ' '}</h2>
          <button className="icon-btn" aria-label={t('next')} onClick={() => shiftMonth(1)}><I.Next /></button>
          <button className="today-btn" onClick={() => shiftMonth(0)}>{t('today')}</button>
        </div>
        <div className="bar-views">{views}</div>
      </div></div>

      <div className="wrap layout">
        <main aria-live="polite">
          {main}
          {/* страну меняют в подвале; здесь — только предупреждение, когда у TMDB мало местных дат */}
          {data?.approxRegion && <p className="side-note">{t('approx', cName)}</p>}
        </main>
      </div>

      {subsOpen && <SubsDialog providers={providerList} onClose={() => setSubsOpen(false)} onSaved={s => { if (s.size) { setOnlySubs(true); store.set('premiero.subsOnly', true); } }} />}
    </>
  );
}

/** Выбор стримингов, на которые подписан посетитель. Список берётся из релизов месяца в его стране. */
function SubsDialog({ providers, onClose, onSaved }: { providers: { id: number; name: string; logo: string | null }[]; onClose: () => void; onSaved: (s: Set<number>) => void }) {
  const { t, subs, setSubs, countryName, country } = useEnv();
  const ref = useRef<HTMLDialogElement>(null);
  const [sel, setSel] = useState<Set<number>>(() => new Set(subs));
  useModal(ref);
  const toggle = (id: number) => setSel(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const save = () => { setSubs(sel); onSaved(sel); ref.current?.close(); };
  return (
    <dialog ref={ref} className="subs-dlg" onClose={onClose} onClick={e => { if (e.target === ref.current) ref.current?.close(); }} aria-labelledby="subs-title">
      <div className="m-head"><span className="crumb" id="subs-title">{t('subs')} · {countryName(country)}</span><button className="icon-btn" aria-label={t('close')} onClick={() => ref.current?.close()}><I.Close /></button></div>
      <div className="m-body">
        <p className="m-sub">{t('subs_pick')}</p>
        {providers.length ? (
          <div className="prov-grid">{providers.map(p => (
            <label key={p.id} className={`prov-pick${sel.has(p.id) ? ' on' : ''}`}>
              <input type="checkbox" checked={sel.has(p.id)} onChange={() => toggle(p.id)} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {p.logo ? <img src={IMG(p.logo, 'w92')!} alt="" width={32} height={32} /> : <span className="prov-ph" />}
              <span>{p.name}</span>
            </label>
          ))}</div>
        ) : <p className="note">{t('subs_none')}</p>}
      </div>
      <div className="checkout"><span className="sel">{t('subs_n', sel.size)}</span><button className="btn primary" onClick={save}>{t('done')}</button></div>
    </dialog>
  );
}

/**
 * «Фильтры»: одна кнопка с числом включённых фильтров вместо ряда переключателей.
 * На компьютере панель выпадает под кнопкой, на телефоне выезжает снизу.
 */
function FilterMenu({ count, onReset, children }: { count: number; onReset: () => void; children: React.ReactNode }) {
  const { t } = useEnv();
  const [open, setOpen] = useState<false | 'menu' | 'sheet'>(false);
  const box = useRef<HTMLDivElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      const n = e.target as Node;
      // окно выбора стримингов открывается поверх панели — клик в нём не закрывает её
      if (!box.current?.contains(n) && !pop.current?.contains(n) && !(n instanceof Element && n.closest('dialog'))) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('dialog[open]')) setOpen(false); };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc); };
  }, [open]);
  return (
    <div className="gmenu fmenu" ref={box}>
      <button className="chip gmenu-btn" aria-expanded={!!open} aria-haspopup="true" aria-pressed={count > 0} onClick={() => setOpen(v => (v ? false : matchMedia('(max-width: 640px)').matches ? 'sheet' : 'menu'))}>
        <I.Sliders />{t('filters')}{count ? <b className="gmenu-n">{count}</b> : null}
      </button>
      {open && wrapSheet(open,
        <div className="gmenu-pop fm-pop" ref={pop} role="group" aria-label={t('filters')}>
          <div className="gmenu-head">
            <b>{t('filters')}</b>
            {count > 0 && <button className="reset" onClick={onReset}>{t('reset')}</button>}
          </div>
          {children}
          <button className="btn primary gmenu-done" onClick={() => setOpen(false)}>{t('done')}</button>
        </div>,
      )}
    </div>
  );
}

const wrapSheet = (mode: 'menu' | 'sheet', pop: React.ReactNode) =>
  mode === 'menu' ? pop : createPortal(<div className="gmenu-sheet">{pop}</div>, document.body);

/** Билет из логотипа, маленький: значок в конце месяца. */
const TicketIcon = () => (
  <svg className="eom-icon" width={56} height={36} viewBox="14 22 68 52" aria-hidden>
    <path d="M14 28a6 6 0 0 1 6-6h56a6 6 0 0 1 6 6v12a8 8 0 0 0 0 16v12a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6V56a8 8 0 0 0 0-16z" fill="currentColor" />
    <path d="M63 27v42" stroke="var(--bg)" strokeWidth={3.5} strokeDasharray="5 4" />
  </svg>
);
