'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { COUNTRIES, IMG, nameIn } from '@/lib/regions';
import { addDays, diffDays, dkey, fromKey, mkey } from '@/lib/dates';
import { titlePath } from '@/lib/slug';
import type { CalEvent, CalItem, CalendarData, Kind, Platform } from '@/lib/types';
import Poster from './Poster';
import { store, useEnv } from './AppProvider';
import * as I from './icons';
import { useModal } from './useModal';
import FeaturedRail from './FeaturedRail';

type View = 'feed' | 'month' | 'list';
export type Cat = 'all' | Kind;
type Load = { status: 'loading' | 'ok' | 'error' | 'no_token'; data?: CalendarData };
const KINDS: Kind[] = ['cinema', 'series', 'online', 'game'];
const TYPE_ORDER: Record<Kind, number> = { cinema: 0, online: 1, series: 2, game: 3 };
const KIND_COLOR: Record<Kind, string> = { cinema: 'var(--t-cinema)', series: 'var(--t-series)', online: 'var(--t-online)', game: 'var(--t-game)' };
// сколько самых частых жанров месяца показывать сразу; остальные — по кнопке «Ещё»
const TOP_GENRES = 10;
const PLATFORMS: Platform[] = ['pc', 'ps', 'xbox', 'nintendo', 'mobile'];

/** Календарь релизов. На странице игр открывается сразу с категорией «Игры». */
export default function CalendarView({ initialCat = 'all' }: { initialCat?: Cat }) {
  const env = useEnv();
  const { t, f, lang, country, today, ready, watch, subs } = env;
  const [month, setMonth] = useState<Date | null>(null);
  const [view, setView] = useState<View>('feed');
  const [cat, setCat] = useState<Cat>(initialCat);
  const [plats, setPlats] = useState<Set<Platform>>(new Set());
  const [genres, setGenres] = useState<Set<number>>(new Set());
  const [allGenres, setAllGenres] = useState(false);
  const [onlyWatch, setOnlyWatch] = useState(false);
  const [onlySubs, setOnlySubs] = useState(false);
  const [showEps, setShowEps] = useState(true);
  const [showAnime, setShowAnime] = useState(false);
  const [q, setQ] = useState('');
  const [showPast, setShowPast] = useState(false);
  const [subsOpen, setSubsOpen] = useState(false);
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [pendingScroll, setPendingScroll] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    const v = store.get<string>('premiero.view', 'feed');
    /* eslint-disable react-hooks/set-state-in-effect */
    setView(v === 'month' || v === 'list' ? v : 'feed');
    setShowAnime(store.get<boolean>('premiero.anime', false));
    setOnlySubs(store.get<boolean>('premiero.subsOnly', false));
    setMonth(m => m ?? new Date(today.getFullYear(), today.getMonth(), 1));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [ready, today]);

  const monthKey = month ? mkey(month) : null;
  useEffect(() => {
    if (!monthKey) return;
    const ac = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoad({ status: 'loading' });
    const url = `/api/calendar?country=${country}&lang=${lang}&month=${monthKey}`;
    // запрос, начатый ещё из HTML (см. page.tsx), используем один раз
    const w = window as { __premieroCal?: { url: string; res: Promise<Response> } };
    const early = w.__premieroCal?.url === url ? w.__premieroCal.res : null;
    delete w.__premieroCal;
    (early ?? fetch(url, { signal: ac.signal }))
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
      if (cat !== 'all' && ev.kind !== cat) return false;
      if (genres.size && !it.genres.some(g => genres.has(g))) return false;
      if (onlyWatch && !watch.has(it.key)) return false;
      if (!showEps && ev.kind === 'series' && !ev.premiere) return false;
      if (!showAnime && it.anime) return false;
      if (plats.size && ev.kind === 'game' && !(it.platforms ?? []).some(x => plats.has(x))) return false;
      // подписки на стриминги касаются только онлайн-релизов и сериалов
      if (subsActive && (ev.kind === 'online' || ev.kind === 'series') && !(it.providers ?? []).some(p => subs.has(p))) return false;
      if (needle && !it.title.toLowerCase().includes(needle)) return false;
      return true;
    }).sort((a, b) => a.date.localeCompare(b.date) || TYPE_ORDER[a.kind] - TYPE_ORDER[b.kind] || data.items[b.item].popularity - data.items[a.item].popularity);
  }, [data, q, cat, genres, plats, onlyWatch, watch, showEps, showAnime, subsActive, subs]);

  useEffect(() => {
    if (!pendingScroll || load.status !== 'ok') return;
    const secs = [...document.querySelectorAll<HTMLElement>('[data-day-sec]')];
    secs.find(s => s.dataset.daySec! >= pendingScroll)?.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPendingScroll(null);
  }, [pendingScroll, load.status, view]);

  // Провайдеры месяца: сначала самые частые
  const providerList = useMemo(() => {
    if (!data) return [];
    const cnt: Record<number, number> = {};
    Object.values(data.items).forEach(it => it.providers?.forEach(p => { cnt[p] = (cnt[p] ?? 0) + 1; }));
    return Object.values(data.providers).sort((a, b) => (cnt[b.id] ?? 0) - (cnt[a.id] ?? 0));
  }, [data]);

  if (!month) return <div className="wrap layout"><div /><main><div className="empty"><span className="spinner" aria-hidden />{t('loading')}</div></main></div>;

  const C = COUNTRIES[country];
  const cName = nameIn(C.name, lang);
  const isCurMonth = mkey(month) === mkey(today);
  const shiftMonth = (n: number) => {
    if (n === 0) { setMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setShowPast(false); setPendingScroll(dkey(today)); }
    else { setMonth(m => new Date(m!.getFullYear(), m!.getMonth() + n, 1)); window.scrollTo({ top: 0 }); }
  };
  const resetFilters = () => { setGenres(new Set()); setPlats(new Set()); setOnlyWatch(false); setShowEps(true); setQ(''); };
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
  const watchBtn = (it: CalItem) => {
    const on = watch.has(it.key);
    return <button className="watch" aria-pressed={on} aria-label={on ? t('unwant') : t('want')} title={t('want')} onClick={() => env.toggleWatch(it.key, it.title)}><I.Bell /></button>;
  };
  const actionBtn = (ev: CalEvent, it: CalItem) =>
    ev.kind === 'online' || ev.kind === 'series' ? <Link className="buy ghost" href={href(it)}>{t('watch_btn')}</Link> : null;
  const meta = (ev: CalEvent, it: CalItem) => (
    <p className="card-m">
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
        <Link className="poster-btn" href={href(it)} aria-label={t('open', it.title)}><Poster path={it.poster} title={it.title} cert={it.cert} /></Link>
        <h3 className="card-t"><Link href={href(it)}>{it.title}</Link></h3>
        {meta(ev, it)}
        <div className="card-a">{watchBtn(it)}{actionBtn(ev, it)}</div>
      </article>
    );
  };
  const summary = (list: CalEvent[]) => {
    const n: Record<Kind, Set<string>> = { cinema: new Set(), series: new Set(), online: new Set(), game: new Set() };
    list.forEach(e => n[e.kind].add(e.item));
    return (
      <div className="summary">
        {KINDS.filter(k => n[k].size).map(k => (
          <span className="k" key={k}><span className="sw" style={{ background: KIND_COLOR[k] }} /><b>{n[k].size}</b> {t('s_' + k, n[k].size)}</span>
        ))}
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
        key: e.item, href: href(it), image: IMG(it.backdrop!, 'w780')!, title: it.title, kind: e.kind,
        rating: it.rating, date: `${f.date(d)} · ${f.rel(d)}`,
      };
    })} />;
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
      </>
    );
  };

  const renderMonth = () => {
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
                    return <li key={e.item + e.kind}><Link className={`m-ev t-${e.kind}`} title={it.title} href={href(it)}><Poster path={it.poster} title={it.title} mini /><span className="m-t">{it.title}</span></Link></li>;
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
            const where = e.kind === 'cinema' ? t('in_theaters') : e.kind === 'series' ? [it.platform, epLabel(e, it)].filter(Boolean).join(' · ') : e.kind === 'game' ? (e.plat ?? []).join(', ') : t('streaming');
            return (
              <tr key={e.item + e.kind + e.date}>
                <td className="date">{f.date(d)}<small>{f.wd(d, true)} · {f.rel(d)}</small></td>
                <td><Link className="l-title" href={href(it)}><Poster path={it.poster} title={it.title} mini />{it.title}</Link></td>
                <td>{kindTag(e.kind)}</td>
                <td className="muted">{it.genres.map(genreName).filter(Boolean).slice(0, 3).join(', ')}</td>
                <td className="muted">{where}</td>
                <td>{actionBtn(e, it)}</td>
              </tr>
            );
          })}</tbody>
        </table></div>
      </>
    );
  };

  const genreIds = (() => {
    if (!data) return [];
    const cnt: Record<number, number> = {};
    const keys = new Set(data.events.filter(e => cat === 'all' || e.kind === cat).map(e => e.item));
    keys.forEach(k => data.items[k]?.genres.forEach(g => { if (data.genres[g]) cnt[g] = (cnt[g] ?? 0) + 1; }));
    return Object.keys(cnt).map(Number).sort((a, b) => cnt[b] - cnt[a]);
  })();
  const hasGames = !!data?.events.some(e => e.kind === 'game');
  const dirty = genres.size > 0 || plats.size > 0 || onlyWatch || !showEps || q !== '';

  let main: React.ReactNode;
  if (load.status === 'loading') main = <div className="empty"><span className="spinner" aria-hidden />{t('loading')}</div>;
  else if (load.status === 'no_token') main = <div className="empty"><b>{t('notoken_t')}</b><span>{t('notoken_s')}</span></div>;
  else if (load.status === 'error') main = <div className="empty"><b>{t('err_t')}</b><span>{t('err_s')}</span></div>;
  else main = view === 'month' ? renderMonth() : view === 'list' ? renderList() : renderFeed();

  return (
    <>
      <div className="bar"><div className="wrap">
        <div className="cats" role="group" aria-label={t('kind')}>
          {(['all', ...KINDS] as Cat[]).map(k => (
            <button key={k} className="chip" aria-pressed={cat === k} onClick={() => setCat(k)}>
              {k !== 'all' && <span className="sw" style={{ background: KIND_COLOR[k] }} />}{t(k)}
            </button>
          ))}
        </div>
        <label className="search">
          <I.Search />
          <input id="q" type="search" value={q} placeholder={t('search')} aria-label={t('search_l')} onChange={e => setQ(e.target.value)} />
        </label>
        <div className="month-nav">
          <button className="icon-btn" aria-label={t('prev')} onClick={() => shiftMonth(-1)}><I.Prev /></button>
          <h2>{f.monthTitle(month)}</h2>
          <button className="icon-btn" aria-label={t('next')} onClick={() => shiftMonth(1)}><I.Next /></button>
          <button className="today-btn" onClick={() => shiftMonth(0)}>{t('today')}</button>
        </div>
        <div className="views" role="group" aria-label={t('view')}>
          {([['feed', 'v_feed', I.Feed], ['month', 'v_month', I.Month], ['list', 'v_list', I.List]] as const).map(([v, k, Icon]) => (
            <button key={v} aria-pressed={view === v} aria-label={t(k)} title={t(k)} onClick={() => { setView(v); store.set('premiero.view', v); }}><Icon /></button>
          ))}
        </div>
      </div></div>

      <div className="wrap layout">
        <aside className="side">
          <div hidden={!genreIds.length}>
            <h3>{t('genres')}</h3>
            <div className="genres">{(allGenres ? genreIds : genreIds.filter((g, i) => i < TOP_GENRES || genres.has(g))).map(g => (
              <button key={g} className="chip" aria-pressed={genres.has(g)} onClick={() => setGenres(s => { const n = new Set(s); if (n.has(g)) n.delete(g); else n.add(g); return n; })}>{data!.genres[g]}</button>
            ))}
              {genreIds.length > TOP_GENRES && (
                <button className="chip more" onClick={() => setAllGenres(v => !v)} aria-expanded={allGenres}>
                  {allGenres ? t('less') : t('more_n', genreIds.length - TOP_GENRES)}
                </button>
              )}
            </div>
          </div>
          {hasGames && (cat === 'all' || cat === 'game') && (
            <div>
              <h3>{t('platforms')}</h3>
              <div className="genres">{PLATFORMS.map(x => (
                <button key={x} className="chip" aria-pressed={plats.has(x)} onClick={() => setPlats(s => { const n = new Set(s); if (n.has(x)) n.delete(x); else n.add(x); return n; })}>{t('pf_' + x)}</button>
              ))}</div>
            </div>
          )}
          <div>
            <h3>{t('show')}</h3>
            <div className="toggles">
              <label className="toggle"><input type="checkbox" checked={onlyWatch} onChange={e => setOnlyWatch(e.target.checked)} /> {t('my_list')} ({watch.size})</label>
              {cat !== 'game' && <>
                <label className="toggle"><input type="checkbox" checked={showEps} onChange={e => setShowEps(e.target.checked)} /> {t('new_eps')}</label>
                <label className="toggle"><input type="checkbox" checked={showAnime} onChange={e => { setShowAnime(e.target.checked); store.set('premiero.anime', e.target.checked); }} /> {t('anime')}</label>
              </>}
            </div>
          </div>
          <div hidden={cat === 'game' || cat === 'cinema'}>
            <h3>{t('subs')}</h3>
            <div className="toggles">
              <label className="toggle"><input type="checkbox" checked={onlySubs} disabled={!subs.size} onChange={e => { setOnlySubs(e.target.checked); store.set('premiero.subsOnly', e.target.checked); }} /> {t('subs_only')}{subs.size ? ` (${subs.size})` : ''}</label>
              <button className="reset" onClick={() => setSubsOpen(true)}>{subs.size ? t('subs_n', subs.size) + ' · ' : ''}{t('subs_edit')}</button>
            </div>
          </div>
          {dirty && <button className="reset" onClick={resetFilters}>{t('reset')}</button>}
          <p className="side-note">{data?.approxRegion ? t('approx', cName) : t('side_note', cName)}{' '}
            <a href="#country" onClick={() => setTimeout(() => document.getElementById('country')?.focus(), 300)}>{t('change_country')}</a></p>
        </aside>
        <main aria-live="polite">{main}</main>
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
