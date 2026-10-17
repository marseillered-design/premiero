'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { COUNTRIES, COUNTRY_CODES, LANGS, LOCALE, isCountry, isLang } from '@/lib/regions';
import { translator } from '@/lib/i18n';
import { addDays, dateFmt, diffDays, dkey, fromKey, mkey, sod } from '@/lib/dates';
import { cinemasFor, hasTickets, sessionsFor, ticketState } from '@/lib/demo-cinemas';
import type { CalEvent, CalItem, CalendarData, CountryCode, Kind, Lang } from '@/lib/types';
import Poster from './Poster';
import Modal from './Modal';
import { store, type Env, type ModalCtx } from './env';
import * as I from './icons';

type View = 'feed' | 'month' | 'list';
type Cat = 'all' | Kind;
type Load = { status: 'loading' | 'ok' | 'error' | 'no_token'; data?: CalendarData };
const TYPE_ORDER: Record<Kind, number> = { cinema: 0, online: 1, series: 2 };
const KIND_COLOR: Record<Kind, string> = { cinema: 'var(--t-cinema)', series: 'var(--t-series)', online: 'var(--t-online)' };
const EPOCH = new Date(2000, 0, 1); // заглушка до монтирования, на экран не попадает

export default function CalendarApp() {
  // Дата и localStorage доступны только в браузере, поэтому приложение стартует после монтирования
  const [boot, setBoot] = useState<{ today: Date; nowMin: number } | null>(null);
  const [country, setCountry] = useState<CountryCode>('ua');
  const [city, setCity] = useState('Kyiv');
  const [lang, setLang] = useState<Lang>('uk');
  const [langPicked, setLangPicked] = useState(false);
  const [month, setMonth] = useState<Date>(() => new Date(2000, 0, 1));
  const [view, setView] = useState<View>('feed');
  const [cat, setCat] = useState<Cat>('all');
  const [genres, setGenres] = useState<Set<number>>(new Set());
  const [onlyTickets, setOnlyTickets] = useState(false);
  const [onlyWatch, setOnlyWatch] = useState(false);
  const [showEps, setShowEps] = useState(true);
  const [q, setQ] = useState('');
  const [showPast, setShowPast] = useState(false);
  const [page, setPage] = useState<'calendar' | 'cinemas'>('calendar');
  const [watch, setWatch] = useState<Set<string>>(new Set());
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [nowPlaying, setNowPlaying] = useState<CalItem[]>([]);
  const [modal, setModal] = useState<ModalCtx | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [pendingScroll, setPendingScroll] = useState<string | null>(null);

  useEffect(() => {
    const now = new Date();
    const region = store.get<{ country?: string; city?: string } | null>('premiero.region', null);
    const savedLang = store.get<string | null>('premiero.lang', null);
    const c = isCountry(region?.country) ? region.country : 'ua';
    const cityOk = COUNTRIES[c].cities.some(x => x.id === region?.city);
    /* eslint-disable react-hooks/set-state-in-effect */
    setCountry(c);
    setCity(cityOk ? region!.city! : COUNTRIES[c].cities[0].id);
    setLang(isLang(savedLang) ? savedLang : COUNTRIES[c].lang);
    setLangPicked(isLang(savedLang));
    const v = store.get<string>('premiero.view', 'feed');
    setView(v === 'month' || v === 'list' ? v : 'feed');
    setWatch(new Set(store.get<string[]>('premiero.watch', [])));
    setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setBoot({ today: sod(now), nowMin: now.getHours() * 60 + now.getMinutes() });
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const monthKey = mkey(month);
  useEffect(() => {
    if (!boot) return;
    const ac = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoad({ status: 'loading' });
    fetch(`/api/calendar?country=${country}&lang=${lang}&month=${monthKey}`, { signal: ac.signal })
      .then(async r => {
        const j = await r.json();
        if (r.status === 503 && j.error === 'no_token') setLoad({ status: 'no_token' });
        else if (!r.ok) setLoad({ status: 'error' });
        else setLoad({ status: 'ok', data: j as CalendarData });
      })
      .catch(e => { if ((e as Error).name !== 'AbortError') setLoad({ status: 'error' }); });
    return () => ac.abort();
  }, [boot, country, lang, monthKey]);

  useEffect(() => {
    if (!boot) return;
    const ac = new AbortController();
    fetch(`/api/now-playing?country=${country}&lang=${lang}`, { signal: ac.signal })
      .then(r => (r.ok ? r.json() : []))
      .then(j => setNowPlaying(Array.isArray(j) ? j : []))
      .catch(() => {});
    return () => ac.abort();
  }, [boot, country, lang]);

  useEffect(() => {
    if (!toastMsg) return;
    const id = setTimeout(() => setToastMsg(null), 3200);
    return () => clearTimeout(id);
  }, [toastMsg]);

  const today = boot?.today ?? EPOCH;
  const t = useMemo(() => translator(lang), [lang]);
  const f = useMemo(() => dateFmt(lang, today), [lang, today]);
  const data = load.data;

  // Все известные тайтлы: месяц календаря плюс то, что сейчас идёт в кино
  const items = useMemo(() => {
    const map: Record<string, CalItem> = {};
    for (const it of nowPlaying) map[it.key] = it;
    if (data) Object.assign(map, data.items);
    return map;
  }, [data, nowPlaying]);

  const money = useCallback((v: number) => {
    const C = COUNTRIES[country];
    return new Intl.NumberFormat(LOCALE[lang], { style: 'currency', currency: C.currency, minimumFractionDigits: C.decimals, maximumFractionDigits: C.decimals }).format(v);
  }, [country, lang]);

  const toggleWatch = useCallback((it: CalItem) => {
    setWatch(prev => {
      const next = new Set(prev);
      const on = !next.has(it.key);
      if (on) next.add(it.key); else next.delete(it.key);
      store.set('premiero.watch', [...next]);
      setToastMsg(on ? t('added', it.title) : t('removed', it.title));
      return next;
    });
  }, [t]);

  const cityName = useCallback((id: string) => {
    for (const c of Object.values(COUNTRIES)) { const x = c.cities.find(y => y.id === id); if (x) return x.name[lang]; }
    return id;
  }, [lang]);

  const env: Env = {
    t, f, lang, country, city, cityName, countryName: c => COUNTRIES[c].name[lang], today, nowMin: boot?.nowMin ?? 0,
    items, watch, toggleWatch, toast: setToastMsg, money,
    openTitle: (key, tickets) => setModal({ kind: 'title', key, tickets }), openCinema: id => setModal({ kind: 'cinema', id }),
  };

  const events = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    return data.events.filter(ev => {
      const it = data.items[ev.item];
      if (!it) return false;
      if (cat !== 'all' && ev.kind !== cat) return false;
      if (genres.size && !it.genres.some(g => genres.has(g))) return false;
      if (onlyWatch && !watch.has(it.key)) return false;
      if (onlyTickets && !hasTickets(it, today)) return false;
      if (!showEps && ev.kind === 'series' && !ev.premiere) return false;
      if (needle && !it.title.toLowerCase().includes(needle)) return false;
      return true;
    }).sort((a, b) => a.date.localeCompare(b.date) || TYPE_ORDER[a.kind] - TYPE_ORDER[b.kind] || data.items[b.item].popularity - data.items[a.item].popularity);
  }, [data, q, cat, genres, onlyWatch, watch, onlyTickets, today, showEps]);

  useEffect(() => {
    if (!pendingScroll || load.status !== 'ok') return;
    const secs = [...document.querySelectorAll<HTMLElement>('[data-day-sec]')];
    const el = secs.find(s => s.dataset.daySec! >= pendingScroll);
    el?.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPendingScroll(null);
  }, [pendingScroll, load.status, view]);

  if (!boot) return <div className="boot" aria-busy="true" />;

  const C = COUNTRIES[country];
  const isCurMonth = mkey(month) === mkey(today);
  const changeCountry = (c: CountryCode) => {
    setCountry(c);
    const first = COUNTRIES[c].cities[0].id;
    setCity(first);
    if (!langPicked) setLang(COUNTRIES[c].lang);
    store.set('premiero.region', { country: c, city: first });
  };
  const shiftMonth = (n: number) => {
    if (n === 0) { setMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setShowPast(false); setPendingScroll(dkey(today)); }
    else { setMonth(m => new Date(m.getFullYear(), m.getMonth() + n, 1)); window.scrollTo({ top: 0 }); }
  };
  const resetFilters = () => { setGenres(new Set()); setOnlyTickets(false); setOnlyWatch(false); setShowEps(true); setQ(''); };
  const jumpToDay = (k: string) => { setShowPast(true); setView('feed'); store.set('premiero.view', 'feed'); setPendingScroll(k); };

  /* ---------- small pieces ---------- */
  const epLabel = (ev: CalEvent, it: CalItem) => {
    if (!ev.eps?.length) return '';
    const a = ev.eps[0], b = ev.eps[ev.eps.length - 1];
    const base = a === b ? `${it.season}×${String(a).padStart(2, '0')}` : t('eps_range', a, b);
    if (ev.premiere) return `${t('premiere')}, ${base}`;
    return ev.finale ? `${base}, ${t('finale')}` : base;
  };
  const kindTag = (k: Kind) => <span className={`tag t-${k}`}>{t('ty_' + k)}</span>;
  const genreName = (id: number) => data?.genres[id] ?? '';
  const WatchBtn = ({ it }: { it: CalItem }) => {
    const on = watch.has(it.key);
    return <button className="watch" aria-pressed={on} aria-label={on ? t('unwant') : t('want')} title={t('want')} onClick={() => toggleWatch(it)}><I.Bell /></button>;
  };
  const ActionBtn = ({ ev, it }: { ev: CalEvent; it: CalItem }) => {
    const st = ev.kind === 'cinema' ? ticketState(it, today) : 'none';
    if (st === 'on') return <button className="buy" onClick={() => env.openTitle(it.key, true)}>{t('tickets')}</button>;
    if (st === 'presale') return <button className="buy" onClick={() => env.openTitle(it.key, true)}>{t('presale')}</button>;
    if (ev.kind !== 'cinema') return <button className="buy ghost" onClick={() => env.openTitle(it.key)}>{t('watch_btn')}</button>;
    return null;
  };
  const Meta = ({ ev, it }: { ev: CalEvent; it: CalItem }) => (
    <p className="card-m">
      {kindTag(ev.kind)}
      <span>
        {ev.kind === 'series' ? [it.platform, epLabel(ev, it)].filter(Boolean).join(' · ')
          : ev.approx ? t('world')
          : [it.cert, genreName(it.genres[0])].filter(Boolean).join(' · ')}
      </span>
      {it.rating ? <span className="stars"><I.Star />{it.rating.toFixed(1)}</span> : null}
    </p>
  );
  const Card = ({ ev }: { ev: CalEvent }) => {
    const it = data!.items[ev.item];
    return (
      <article className="card">
        <button className="poster-btn" aria-label={t('open', it.title)} onClick={() => env.openTitle(it.key)}><Poster path={it.poster} title={it.title} cert={it.cert} /></button>
        <h3 className="card-t"><button onClick={() => env.openTitle(it.key)}>{it.title}</button></h3>
        <Meta ev={ev} it={it} />
        <div className="card-a"><WatchBtn it={it} /><ActionBtn ev={ev} it={it} /></div>
      </article>
    );
  };
  const Summary = ({ list }: { list: CalEvent[] }) => {
    const n: Record<Kind, Set<string>> = { cinema: new Set(), series: new Set(), online: new Set() };
    list.forEach(e => n[e.kind].add(e.item));
    return (
      <div className="summary">
        {(['cinema', 'series', 'online'] as Kind[]).filter(k => n[k].size).map(k => (
          <span className="k" key={k}><span className="sw" style={{ background: KIND_COLOR[k] }} /><b>{n[k].size}</b> {t('s_' + k, n[k].size)}</span>
        ))}
      </div>
    );
  };
  const Empty = () => <div className="empty"><b>{t('empty_t')}</b><span>{t('empty_s')}</span><button className="btn" onClick={resetFilters}>{t('reset')}</button></div>;

  /* ---------- views ---------- */
  const renderFeed = () => {
    if (!events.length) return <Empty />;
    const cut = dkey(addDays(today, -2));
    const shown = isCurMonth && !showPast ? events.filter(e => e.date >= cut) : events;
    const hidden = events.length - shown.length;
    const days = new Map<string, CalEvent[]>();
    shown.forEach(e => days.set(e.date, [...(days.get(e.date) ?? []), e]));
    return (
      <>
        <Summary list={events} />
        {hidden > 0 && <button className="btn show-past" onClick={() => setShowPast(true)}>{t('show_past', hidden)}</button>}
        {[...days].map(([k, list]) => {
          const d = fromKey(k), n = diffDays(d, today);
          return (
            <section key={k} className={`day${n === 0 ? ' is-today' : ''}${n < 0 ? ' is-past' : ''}`} data-day-sec={k}>
              <header className="day-h">
                <h2>{f.date(d)}<span className="wd">{f.wd(d)}</span></h2>
                <span className="rel">{f.rel(d)}</span><span className="rule" /><span className="cnt">{t('releases_n', list.length)}</span>
              </header>
              <div className="grid">{list.map(ev => <Card key={ev.item + ev.kind + ev.date} ev={ev} />)}</div>
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
        <Summary list={events} />
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
                    return <li key={e.item + e.kind}><button className={`m-ev t-${e.kind}`} title={it.title} onClick={() => env.openTitle(it.key)}><Poster path={it.poster} title={it.title} mini /><span className="m-t">{it.title}</span></button></li>;
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
    if (!events.length) return <Empty />;
    return (
      <>
        <Summary list={events} />
        <div className="table-wrap"><table>
          <thead><tr><th>{t('th_date')}</th><th>{t('th_title')}</th><th>{t('th_type')}</th><th>{t('th_genre')}</th><th>{t('th_where')}</th><th /></tr></thead>
          <tbody>{events.map(e => {
            const it = data!.items[e.item], d = fromKey(e.date);
            const where = e.kind === 'cinema' ? t('in_theaters') : e.kind === 'series' ? [it.platform, epLabel(e, it)].filter(Boolean).join(' · ') : t('streaming');
            return (
              <tr key={e.item + e.kind + e.date}>
                <td className="date">{f.date(d)}<small>{f.wd(d, true)} · {f.rel(d)}</small></td>
                <td><button className="l-title" onClick={() => env.openTitle(it.key)}><Poster path={it.poster} title={it.title} mini />{it.title}</button></td>
                <td>{kindTag(e.kind)}</td>
                <td className="muted">{it.genres.map(genreName).filter(Boolean).slice(0, 3).join(', ')}</td>
                <td className="muted">{where}</td>
                <td><ActionBtn ev={e} it={it} /></td>
              </tr>
            );
          })}</tbody>
        </table></div>
      </>
    );
  };

  const renderCinemas = () => {
    const playing = Object.values(items).filter(it => it.media === 'movie' && hasTickets(it, today));
    return (
      <div className="cin-grid">{cinemasFor(city).map(cin => {
        const films = playing.filter(it => sessionsFor(it, cin, today, country, today).length);
        return (
          <article className="cin" key={cin.id}>
            <h3>{cin.name}</h3>
            <p className="addr">{t('venue', cin.mall)} · {cityName(cin.city)} · {t('halls_n', cin.halls)}</p>
            <div className="fmts">{cin.formats.map(x => <span key={x} className={`fmt${x !== '2D' ? ' hi' : ''}`}>{x}</span>)}</div>
            <div className="thumbs">{films.slice(0, 7).map(it => <Poster key={it.key} path={it.poster} title={it.title} mini />)}</div>
            <div className="row"><span className="stat">{t('today_films', films.length)}</span><button className="buy" onClick={() => env.openCinema(cin.id)}>{t('sched_btn')}</button></div>
          </article>
        );
      })}</div>
    );
  };

  const genreIds = (() => {
    if (!data) return [];
    const cnt: Record<number, number> = {};
    Object.values(data.items).forEach(it => it.genres.forEach(g => { if (data.genres[g]) cnt[g] = (cnt[g] ?? 0) + 1; }));
    return Object.keys(cnt).map(Number).sort((a, b) => cnt[b] - cnt[a]);
  })();
  const dirty = genres.size > 0 || onlyTickets || onlyWatch || !showEps || q !== '';

  let main: React.ReactNode;
  if (page === 'cinemas') main = renderCinemas();
  else if (load.status === 'loading') main = <div className="empty"><span className="spinner" aria-hidden />{t('loading')}</div>;
  else if (load.status === 'no_token') main = <div className="empty"><b>{t('notoken_t')}</b><span>{t('notoken_s')}</span></div>;
  else if (load.status === 'error') main = <div className="empty"><b>{t('err_t')}</b><span>{t('err_s')}</span></div>;
  else main = view === 'month' ? renderMonth() : view === 'list' ? renderList() : renderFeed();

  return (
    <div lang={lang}>
      <header className="top">
        <div className="wrap">
          <div className="brand"><span className="bulbs" aria-hidden>{Array.from({ length: 9 }, (_, i) => <i key={i} />)}</span>Premiero<small>{t('tagline')}</small></div>
          <nav className="nav" aria-label={t('nav')}>
            <button aria-current={page === 'calendar' ? 'page' : undefined} onClick={() => setPage('calendar')}>{t('nav_cal')}</button>
            <button aria-current={page === 'cinemas' ? 'page' : undefined} onClick={() => { setPage('cinemas'); window.scrollTo({ top: 0 }); }}>{t('nav_cin')}</button>
          </nav>
          <label className="search">
            <I.Search />
            <input id="q" type="search" value={q} placeholder={t('search')} aria-label={t('search_l')} onChange={e => { setQ(e.target.value); setPage('calendar'); }} />
          </label>
          <div className="region">
            <select id="country" aria-label={t('country')} value={country} onChange={e => changeCountry(e.target.value as CountryCode)}>
              {COUNTRY_CODES.map(k => <option key={k} value={k}>{COUNTRIES[k].name[lang]}</option>)}
            </select>
            <select id="city" aria-label={t('city')} value={city} onChange={e => { setCity(e.target.value); store.set('premiero.region', { country, city: e.target.value }); }}>
              {C.cities.map(c => <option key={c.id} value={c.id}>{c.name[lang]}</option>)}
            </select>
            <select id="lang" aria-label={t('lang')} value={lang} onChange={e => { const v = e.target.value as Lang; setLang(v); setLangPicked(true); store.set('premiero.lang', v); }}>
              {(Object.keys(LANGS) as Lang[]).map(k => <option key={k} value={k}>{LANGS[k]}</option>)}
            </select>
          </div>
        </div>
      </header>

      <div className="bar"><div className="wrap">
        {page === 'calendar' ? <>
          <div className="cats" role="group" aria-label={t('kind')}>
            {(['all', 'cinema', 'series', 'online'] as Cat[]).map(k => (
              <button key={k} className="chip" aria-pressed={cat === k} onClick={() => setCat(k)}>
                {k !== 'all' && <span className="sw" style={{ background: KIND_COLOR[k] }} />}{t(k)}
              </button>
            ))}
          </div>
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
        </> : <>
          <div className="cats"><span className="chip" aria-pressed="true">{cityName(city)}</span></div>
          <p className="bar-note">{t('cinemas_n', cinemasFor(city).length)} · {t('week')}</p>
        </>}
      </div></div>

      <div className="wrap layout">
        <aside className="side">
          {page === 'calendar' ? <>
            <div hidden={!genreIds.length}>
              <h3>{t('genres')}</h3>
              <div className="genres">{genreIds.map(g => (
                <button key={g} className="chip" aria-pressed={genres.has(g)} onClick={() => setGenres(s => { const n = new Set(s); if (n.has(g)) n.delete(g); else n.add(g); return n; })}>{data!.genres[g]}</button>
              ))}</div>
            </div>
            <div>
              <h3>{t('show')}</h3>
              <div className="toggles">
                <label className="toggle"><input type="checkbox" checked={onlyTickets} onChange={e => setOnlyTickets(e.target.checked)} /> {t('only_t')}</label>
                <label className="toggle"><input type="checkbox" checked={onlyWatch} onChange={e => setOnlyWatch(e.target.checked)} /> {t('my_list')} ({watch.size})</label>
                <label className="toggle"><input type="checkbox" checked={showEps} onChange={e => setShowEps(e.target.checked)} /> {t('new_eps')}</label>
              </div>
            </div>
            {dirty && <button className="reset" onClick={resetFilters}>{t('reset')}</button>}
            <p className="side-note">{data?.approxRegion ? t('approx', C.name[lang]) : t('side_note', C.name[lang])}</p>
          </> : <p className="side-note">{t('cin_note')}</p>}
        </aside>
        <main aria-live="polite">{main}</main>
      </div>

      <footer className="foot"><div className="wrap">
        <span>{t('attr')} This product uses the TMDB API but is not endorsed or certified by TMDB.</span>
        <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer">themoviedb.org</a>
      </div></footer>

      {modal && <Modal ctx={modal} env={env} onClose={() => setModal(null)} setCtx={setModal} />}
      <div className={`toast${toastMsg ? ' show' : ''}`} role="status">{toastMsg}</div>
    </div>
  );
}
