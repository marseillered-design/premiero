'use client';

import { useEffect, useRef, useState } from 'react';
import { COUNTRIES } from '@/lib/regions';
import { addDays, diffDays, dkey, fromKey } from '@/lib/dates';
import { cinemasFor, firstSessionDay, hallLayout, hash, isPast, rng, seatPrice, sessionsFor, ticketState, type Cinema, type Session } from '@/lib/demo-cinemas';
import type { CalItem, TitleDetail } from '@/lib/types';
import Poster from './Poster';
import type { Env, ModalCtx } from './env';
import * as I from './icons';

type Step = 'info' | 'seats' | 'pay' | 'done';

export default function Modal({ ctx, env, onClose, setCtx }: { ctx: ModalCtx; env: Env; onClose: () => void; setCtx: (c: ModalCtx) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState<Step>('info');
  const [session, setSession] = useState<Session | null>(null);
  const [seats, setSeats] = useState<Set<string>>(new Set());
  const ctxKey = ctx.kind === 'title' ? ctx.key : ctx.id;

  useEffect(() => {
    const d = ref.current!;
    if (!d.open) d.showModal();
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);
  // новая карточка открывается с первого шага
  const [prevKey, setPrevKey] = useState(ctxKey);
  if (prevKey !== ctxKey) { setPrevKey(ctxKey); setStep('info'); setSession(null); setSeats(new Set()); }
  useEffect(() => { ref.current?.scrollTo({ top: 0 }); }, [ctxKey, step]);

  const { t } = env;
  const head = (crumb: string, back?: () => void) => (
    <div className="m-head">
      {back && <button className="icon-btn" aria-label={t('back')} onClick={back}><I.Prev /></button>}
      <span className="crumb">{crumb}</span>
      <button className="icon-btn" aria-label={t('close')} onClick={() => ref.current?.close()}><I.Close /></button>
    </div>
  );
  const pickSession = (s: Session) => { setSession(s); setSeats(new Set()); setStep('seats'); };

  let body: React.ReactNode;
  if (step === 'info' || !session) {
    body = ctx.kind === 'title'
      ? <TitleView key={ctx.key} itemKey={ctx.key} tickets={!!ctx.tickets} env={env} head={head} onSession={pickSession} />
      : <CinemaView key={ctx.id} cinema={cinemasFor(env.city).find(c => c.id === ctx.id)!} env={env} head={head} onSession={pickSession} openTitle={k => setCtx({ kind: 'title', key: k })} />;
  } else {
    const it = env.items[session.itemKey];
    if (step === 'seats') body = <Seats s={session} it={it} env={env} head={head} seats={seats} setSeats={setSeats} onBack={() => setStep('info')} onNext={() => setStep('pay')} />;
    else if (step === 'pay') body = <Pay s={session} it={it} env={env} head={head} seats={seats} onBack={() => setStep('seats')} onPaid={() => setStep('done')} />;
    else body = <Done s={session} it={it} env={env} head={head} seats={seats} onAgain={() => { setStep('info'); setSeats(new Set()); }} onClose={() => ref.current?.close()} />;
  }

  return (
    <dialog ref={ref} onClose={onClose} onClick={e => { if (e.target === ref.current) ref.current?.close(); }} aria-labelledby="m-title">
      {body}
    </dialog>
  );
}

type Head = (crumb: string, back?: () => void) => React.ReactNode;

/* ---------- shared bits ---------- */
function DateStrip({ from, days, sel, onPick, env }: { from: Date; days: number; sel: string; onPick: (k: string) => void; env: Env }) {
  const { t, f, today } = env;
  return (
    <div className="datestrip" role="group" aria-label={t('date_l')}>
      {Array.from({ length: days }, (_, i) => {
        const d = addDays(from, i), k = dkey(d), n = diffDays(d, today);
        return (
          <button key={k} className="ds" aria-pressed={k === sel} onClick={() => onPick(k)}>
            <span>{n === 0 ? t('today_s') : n === 1 ? t('tomorrow_s') : f.wd(d, true)}</span><b>{d.getDate()}</b><span>{f.monShort(d)}</span>
          </button>
        );
      })}
    </div>
  );
}
function SessBtn({ s, env, onPick }: { s: Session; env: Env; onPick: (s: Session) => void }) {
  const { t, money } = env;
  return (
    <button className={`ses${isPast(s, env.today, env.nowMin) ? ' past' : ''}`} onClick={() => onPick(s)} aria-label={`${s.time}, ${s.fmt}, ${t('hall')} ${s.hall}, ${t('from')} ${money(s.price)}`}>
      <span className="tm">{s.time}</span><span className="fx">{s.fmt} · {t('hall')} {s.hall}</span><span className="pr">{t('from')} {money(s.price)}</span>
    </button>
  );
}

/* ---------- title ---------- */
function TitleView({ itemKey, tickets, env, head, onSession }: { itemKey: string; tickets: boolean; env: Env; head: Head; onSession: (s: Session) => void }) {
  const { t, f, today, country, city, lang } = env;
  const it: CalItem | undefined = env.items[itemKey];
  const [media, idStr] = itemKey.split('-');
  const [detail, setDetail] = useState<TitleDetail | null>(null);
  const [failed, setFailed] = useState(false);
  const [date, setDate] = useState<string | null>(null);
  const ticketsRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ac = new AbortController();
    const season = it?.season ? `&season=${it.season}` : '';
    fetch(`/api/title/${media}/${idStr}?country=${country}&lang=${lang}${season}`, { signal: ac.signal })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: TitleDetail) => setDetail(d))
      .catch(e => { if ((e as Error).name !== 'AbortError') setFailed(true); });
    return () => ac.abort();
  }, [media, idStr, country, lang, it?.season]);

  useEffect(() => {
    if (tickets && detail) ticketsRef.current?.scrollIntoView({ block: 'start' });
  }, [tickets, detail]);

  const title = detail?.title ?? it?.title ?? '';
  const st = it ? ticketState(it, today) : 'none';
  const typeKey = media === 'tv' ? 'ty_series' : st === 'none' || st === 'tba' ? 'ty_online' : 'ty_cinema';
  const on = it ? env.watch.has(it.key) : false;

  if (!detail) {
    return <>{head(title)}<div className="m-body"><div className="empty">{failed ? <><b>{t('err_t')}</b><span>{t('err_s')}</span></> : <><span className="spinner" aria-hidden />{t('loading')}</>}</div></div></>;
  }

  const meta = [detail.year, detail.runtime ? `${detail.runtime} ${t('min')}` : null, detail.cert, detail.genres.slice(0, 3).join(', ')].filter(Boolean);
  const showTickets = media === 'movie' && it;
  let tix: React.ReactNode = null;
  if (showTickets) {
    if (st === 'on' || st === 'presale') {
      const from = firstSessionDay(it, today);
      const sel = date && fromKey(date) >= from ? date : dkey(from);
      const day = fromKey(sel);
      const rows = cinemasFor(city).map(cin => ({ cin, ss: sessionsFor(it, cin, day, country, today) })).filter(r => r.ss.length);
      tix = <>
        <DateStrip from={from} days={7} sel={sel} onPick={setDate} env={env} />
        {rows.length ? (
          <div className="venues">{rows.map(({ cin, ss }) => (
            <div className="venue" key={cin.id}>
              <div><h4><button onClick={() => env.openCinema(cin.id)}>{cin.name}</button></h4><p className="addr">{t('venue', cin.mall)}</p></div>
              <div className="sess">{ss.map(s => <SessBtn key={s.id} s={s} env={env} onPick={onSession} />)}</div>
            </div>
          ))}</div>
        ) : <p className="note">{t('no_sess', env.cityName(city))}</p>}
        <p className="demo-note">{t('demo_sess')}</p>
      </>;
    } else if (st === 'soon') tix = <p className="note">{t('soon_note', f.date(fromKey(it.theatrical!)))}</p>;
    else if (st === 'tba') tix = <p className="note">{t('tba_note', env.countryName(country))}</p>;
    else tix = <p className="note">{t('ended_note')}</p>;
  }

  return <>
    {head(`${t(typeKey)} · ${title}`)}
    <div className="m-body">
      <div className="hero">
        <Poster path={detail.poster} title={title} cert={detail.cert} size="w500" />
        <div>
          <span className={`tag t-${media === 'tv' ? 'series' : typeKey === 'ty_cinema' ? 'cinema' : 'online'}`}>{t(typeKey)}{detail.network ? ` · ${detail.network}` : ''}</span>
          <h2 id="m-title">{title}</h2>
          {detail.original && detail.original !== title && <p className="orig">{detail.original}</p>}
          <div className="meta">{meta.map(m => <span key={m}>{m}</span>)}{detail.rating ? <span className="stars"><I.Star />{detail.rating.toFixed(1)}</span> : null}</div>
          {detail.overview && <p className="desc">{detail.overview}</p>}
          <div className="credits">
            {detail.people.length > 0 && <span>{t(media === 'tv' ? 'people_tv' : 'people_movie')}: <b>{detail.people.join(', ')}</b></span>}
            {detail.cast.length > 0 && <span>{t('cast')}: <b>{detail.cast.join(', ')}</b></span>}
          </div>
          <div className="hero-a">
            {(st === 'on' || st === 'presale') && <button className="btn primary" onClick={() => ticketsRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })}>{st === 'on' ? t('buy') : t('buy_pre')}</button>}
            {detail.trailer && <a className="btn" href={`https://www.youtube.com/watch?v=${detail.trailer}`} target="_blank" rel="noreferrer"><I.Play /> {t('trailer')}</a>}
            {it && <button className="btn" aria-pressed={on} onClick={() => env.toggleWatch(it)}><I.Bell /> <span>{on ? t('in_list') : t('want')}</span></button>}
            <a className="btn" href={detail.tmdbUrl} target="_blank" rel="noreferrer">{t('tmdb_page')}</a>
          </div>
        </div>
      </div>

      {media === 'movie' && detail.releases.length > 0 && (
        <section className="sec">
          <h3>{t('rel_dates')} <small>{t('by_country')}</small></h3>
          <div className="rel-table">{detail.releases.map(r => (
            <div key={r.country} className={`rel-c${r.country === country ? ' cur' : ''}`}>{env.countryName(r.country)}<b>{r.date ? f.date(fromKey(r.date)) : <span className="na">{t('tba')}</span>}</b></div>
          ))}</div>
        </section>
      )}

      {showTickets && <section className="sec" id="tickets" ref={ticketsRef}><h3>{t('showtimes')} <small>{env.cityName(city)}</small></h3>{tix}</section>}

      {media === 'movie' && it?.digital && <section className="sec"><p className="note">{t('online_note', f.date(fromKey(it.digital)), f.rel(fromKey(it.digital)))}</p></section>}

      <section className="sec">
        <h3>{t('where')} <small>{env.countryName(country)}</small></h3>
        {detail.providers.length ? (
          <div className="providers">
            {detail.providers.map(p => (
              <span className="prov" key={p.name}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.logo && <img src={`https://image.tmdb.org/t/p/w92${p.logo}`} alt="" width={28} height={28} />}{p.name}
              </span>
            ))}
            {detail.providersLink && <a className="reset" href={detail.providersLink} target="_blank" rel="noreferrer">{t('all_prov')}</a>}
          </div>
        ) : <p className="note">{t('no_prov')}</p>}
      </section>

      {detail.season && (
        <section className="sec">
          <h3>{t('ep_sched')} <small>{detail.network ? `${detail.network} · ` : ''}{t('season')} {detail.season.number}</small></h3>
          <div className="eps">{detail.season.episodes.map(e => {
            const out = !!e.date && fromKey(e.date) <= today;
            return (
              <div key={e.n} className={`ep${out ? ' out' : ''}`}>
                <span className="n">{detail.season!.number}×{String(e.n).padStart(2, '0')}</span>
                <span>{e.name || t('ep_one', e.n)}{e.n === detail.season!.episodes.length ? ` · ${t('season_finale')}` : ''}</span>
                <span className="d">{e.date ? `${out ? t('out') + ' · ' : ''}${f.date(fromKey(e.date))}` : t('tba')}</span>
              </div>
            );
          })}</div>
        </section>
      )}
    </div>
  </>;
}

/* ---------- cinema ---------- */
function CinemaView({ cinema, env, head, onSession, openTitle }: { cinema: Cinema; env: Env; head: Head; onSession: (s: Session) => void; openTitle: (k: string) => void }) {
  const { t, today, country } = env;
  const [sel, setSel] = useState(dkey(today));
  const day = fromKey(sel);
  const rows = Object.values(env.items).filter(it => it.media === 'movie')
    .map(it => ({ it, ss: sessionsFor(it, cinema, day, country, today) })).filter(r => r.ss.length)
    .sort((a, b) => b.it.popularity - a.it.popularity);
  return <>
    {head(`${t('cinema_w')} · ${cinema.name}`)}
    <div className="m-body">
      <div>
        <h2 id="m-title" className="m-title">{cinema.name}</h2>
        <p className="m-sub">{t('venue', cinema.mall)}, {env.cityName(cinema.city)} · {t('halls_n', cinema.halls)}</p>
        <div className="fmts" style={{ marginTop: 12 }}>{cinema.formats.map(x => <span key={x} className={`fmt${x !== '2D' ? ' hi' : ''}`}>{x}</span>)}</div>
      </div>
      <section className="sec">
        <h3>{t('schedule')}</h3>
        <DateStrip from={today} days={7} sel={sel} onPick={setSel} env={env} />
        {rows.length ? (
          <div className="venues">{rows.map(({ it, ss }) => (
            <div className="film-row" key={it.key}>
              <button aria-label={t('open', it.title)} onClick={() => openTitle(it.key)}><Poster path={it.poster} title={it.title} size="w154" /></button>
              <div>
                <h4><button onClick={() => openTitle(it.key)}>{it.title}</button>{it.cert && <small>{it.cert}</small>}</h4>
                <div className="sess">{ss.map(s => <SessBtn key={s.id} s={s} env={env} onPick={onSession} />)}</div>
              </div>
            </div>
          ))}</div>
        ) : <p className="note">{t('no_sess_s')}</p>}
        <p className="demo-note">{t('demo_sess')}</p>
      </section>
    </div>
  </>;
}

/* ---------- checkout ---------- */
type CheckoutProps = { s: Session; it: CalItem; env: Env; head: Head; seats: Set<string> };
const sessLine = (s: Session, env: Env) => `${env.f.date(s.date)}, ${env.f.wd(s.date, true)}, ${s.time}`;
function seatsInfo(s: Session, it: CalItem, seats: Set<string>, env: Env) {
  const hall = hallLayout(s, it.popularity);
  let total = 0;
  const byRow: Record<number, number[]> = {};
  [...seats].map(k => k.split('-').map(Number)).sort((a, b) => a[0] - b[0] || a[1] - b[1]).forEach(([y, x]) => {
    total += seatPrice(s, y, hall.rows);
    (byRow[y] ||= []).push(x);
  });
  const text = Object.entries(byRow).map(([y, xs]) => `${env.t('row')} ${y}, ${env.t('seat_w', xs.length)} ${xs.join(', ')}`).join('; ');
  return { hall, total, text };
}

function Seats({ s, it, env, head, seats, setSeats, onBack, onNext }: CheckoutProps & { setSeats: (v: Set<string>) => void; onBack: () => void; onNext: () => void }) {
  const { t, money } = env;
  const { hall, total, text } = seatsInfo(s, it, seats, env);
  const half = hall.per / 2;
  const toggle = (k: string) => {
    const next = new Set(seats);
    if (next.has(k)) next.delete(k);
    else if (next.size >= 6) { env.toast(t('max6')); return; }
    else next.add(k);
    setSeats(next);
  };
  return <>
    {head(`${it.title} · ${s.cinema.name} · ${sessLine(s, env)}`, onBack)}
    <div className="m-body">
      <div><h2 id="m-title" className="m-title">{t('seats_t')}</h2><p className="m-sub">{s.cinema.name}, {t('hall')} {s.hall} · {s.fmt} · {sessLine(s, env)}</p></div>
      <div className="hall-wrap">
        <div className="screen">{t('screen')}</div>
        <div className="hall" style={{ gridTemplateColumns: `22px repeat(${half}, 24px) 14px repeat(${half}, 24px) 22px` }}>
          {Array.from({ length: hall.rows }, (_, yi) => {
            const y = yi + 1;
            return [
              <span key={`l${y}`} className="rn">{y}</span>,
              ...Array.from({ length: hall.per }, (_, xi) => {
                const x = xi + 1, k = `${y}-${x}`, taken = hall.taken.has(k);
                const seat = <button key={k} className={`seat${y === hall.rows ? ' comfort' : ''}`} aria-pressed={seats.has(k)} disabled={taken} aria-label={t('seat_l', y, x) + (taken ? t('taken_s') : '')} onClick={() => toggle(k)}>{x}</button>;
                return x === half + 1 ? [<span key={`a${k}`} className="aisle" />, seat] : seat;
              }).flat(),
              <span key={`r${y}`} className="rn">{y}</span>,
            ];
          })}
        </div>
        <div className="legend">
          <span><i />{t('free')} · {money(s.price)}</span><span><i className="lc" />{t('comfort')} · {money(seatPrice(s, hall.rows, hall.rows))}</span>
          <span><i className="ls" />{t('selected')}</span><span><i className="lt" />{t('taken')}</span>
        </div>
      </div>
    </div>
    <div className="checkout">
      <div className="sel">{seats.size ? <>{text}<b>{money(total)}</b></> : t('seat_hint')}</div>
      <button className="btn primary" disabled={!seats.size} onClick={onNext}>{t('cont')}</button>
    </div>
  </>;
}

function Summary({ s, it, env, seats }: Omit<CheckoutProps, 'head'>) {
  const { t, money } = env;
  const { total, text } = seatsInfo(s, it, seats, env);
  return (
    <div className="sum-box">
      <Poster path={it.poster} title={it.title} size="w154" />
      <dl>
        <dt>{t('f_film')}</dt><dd>{it.title}{it.cert ? `, ${it.cert}` : ''}</dd>
        <dt>{t('f_cinema')}</dt><dd>{s.cinema.name}, {t('venue', s.cinema.mall)}</dd>
        <dt>{t('f_session')}</dt><dd>{sessLine(s, env)} · {t('hall')} {s.hall} · {s.fmt}</dd>
        <dt>{t('f_seats')}</dt><dd>{text}</dd>
        <dt>{t('f_total')}</dt><dd className="mono">{money(total)}</dd>
      </dl>
    </div>
  );
}

function Pay({ s, it, env, head, seats, onBack, onPaid }: CheckoutProps & { onBack: () => void; onPaid: () => void }) {
  const { t, money } = env;
  const { total } = seatsInfo(s, it, seats, env);
  return <>
    {head(`${it.title} · ${t('checkout_c')}`, onBack)}
    <div className="m-body">
      <h2 id="m-title" className="m-title">{t('how_buy')}</h2>
      <Summary s={s} it={it} env={env} seats={seats} />
      <div className="pay-opts">
        <div className="opt main"><h4>{t('pay_t')}</h4><p>{t('pay_d')}</p><button className="btn primary" onClick={onPaid}>{t('pay_b')} · {money(total)}</button></div>
        <div className="opt"><h4>{t('partner_t')}</h4><p>{t('partner_d')}</p><button className="btn" onClick={() => env.toast(t('t_partner'))}>{t('partner_b')}</button></div>
      </div>
      <p className="note">{t('proto')}</p>
    </div>
  </>;
}

function Done({ s, it, env, head, seats, onAgain, onClose }: CheckoutProps & { onAgain: () => void; onClose: () => void }) {
  const { t, f, money } = env;
  const { total, text } = seatsInfo(s, it, seats, env);
  const code = String(hash(s.id + [...seats].join()) % 900000 + 100000);
  const qr = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = qr.current; if (!cv) return;
    const x = cv.getContext('2d')!, r = rng(s.id), N = 25;
    x.fillStyle = '#fff'; x.fillRect(0, 0, N, N); x.fillStyle = '#111';
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (r() < .5) x.fillRect(i, j, 1, 1);
    const finder = (ox: number, oy: number) => { x.fillStyle = '#fff'; x.fillRect(ox - 1, oy - 1, 9, 9); x.fillStyle = '#111'; x.fillRect(ox, oy, 7, 7); x.fillStyle = '#fff'; x.fillRect(ox + 1, oy + 1, 5, 5); x.fillStyle = '#111'; x.fillRect(ox + 2, oy + 2, 3, 3); };
    finder(0, 0); finder(N - 7, 0); finder(0, N - 7);
  }, [s.id]);
  return <>
    {head(t('ticket'))}
    <div className="m-body">
      <div className="ticket">
        <div className="main">
          <span className="tag t-cinema">{t('demo_ticket', code)}</span>
          <h3 id="m-title">{it.title}</h3>
          <span className="ln"><b>{f.date(s.date)}, {s.time}</b> · {f.wd(s.date)}</span>
          <span className="ln">{s.cinema.name}, {t('venue', s.cinema.mall)} · <b>{t('hall')} {s.hall}</b> · {s.fmt}</span>
          <span className="ln"><b>{text}</b></span>
          <span className="ln">{t('paid')}: <b>{money(total)}</b> · {COUNTRIES[s.country].name[env.lang]}</span>
        </div>
        <div className="stub"><canvas ref={qr} width={25} height={25} aria-label={t('qr')} /><small>{code}</small></div>
      </div>
      <p className="done-note">{t('done_note')}</p>
      <div className="done-a"><button className="btn" onClick={onClose}>{t('close')}</button><button className="btn primary" onClick={onAgain}>{t('other_sess')}</button></div>
    </div>
  </>;
}
