'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { dkey, fromKey } from '@/lib/dates';
import { cinemasFor, hasTickets, sessionsFor, type Cinema, type Session } from '@/lib/demo-cinemas';
import { titlePath } from '@/lib/slug';
import type { CalItem } from '@/lib/types';
import Poster from './Poster';
import Checkout, { DateStrip, SessBtn } from './Checkout';
import { useEnv } from './AppProvider';
import * as I from './icons';
import { useModal } from './useModal';

export default function CinemasView() {
  const { t, lang, country, city, today, ready, cityName } = useEnv();
  const [films, setFilms] = useState<CalItem[]>([]);
  const [open, setOpen] = useState<Cinema | null>(null);
  const [checkout, setCheckout] = useState<{ s: Session; it: CalItem } | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    fetch(`/api/now-playing?country=${country}&lang=${lang}`, { signal: ac.signal })
      .then(r => (r.ok ? r.json() : []))
      .then(j => setFilms(Array.isArray(j) ? j : []))
      .catch(() => {});
    return () => ac.abort();
  }, [country, lang]);

  const cinemas = cinemasFor(city);
  const playing = ready ? films.filter(it => hasTickets(it, today)) : [];
  return (
    <>
      <div className="bar"><div className="wrap">
        <div className="cats"><span className="chip" aria-pressed="true">{cityName(city)}</span></div>
        <p className="bar-note">{t('cinemas_n', cinemas.length)} · {t('week')}</p>
      </div></div>
      <div className="wrap layout">
        <aside className="side"><p className="side-note">{t('cin_note')}</p></aside>
        <main>
          <div className="cin-grid">{cinemas.map(cin => {
            const now = playing.filter(it => sessionsFor(it, cin, today, country, today).length);
            return (
              <article className="cin" key={cin.id}>
                <h3>{cin.name}</h3>
                <p className="addr">{t('venue', cin.mall)} · {cityName(cin.city)} · {t('halls_n', cin.halls)}</p>
                <div className="fmts">{cin.formats.map(x => <span key={x} className={`fmt${x !== '2D' ? ' hi' : ''}`}>{x}</span>)}</div>
                <div className="thumbs">{now.slice(0, 7).map(it => <Poster key={it.key} path={it.poster} title={it.title} mini />)}</div>
                <div className="row"><span className="stat">{t('today_films', now.length)}</span><button className="buy" onClick={() => setOpen(cin)}>{t('sched_btn')}</button></div>
              </article>
            );
          })}</div>
        </main>
      </div>
      {open && <CinemaDialog cinema={open} films={playing} lang={lang} onClose={() => setOpen(null)} onSession={(s, it) => setCheckout({ s, it })} />}
      {checkout && <Checkout session={checkout.s} item={checkout.it} onClose={() => setCheckout(null)} />}
    </>
  );
}

function CinemaDialog({ cinema, films, onClose, onSession }: { cinema: Cinema; films: CalItem[]; lang: string; onClose: () => void; onSession: (s: Session, it: CalItem) => void }) {
  const { t, lang, country, today, cityName } = useEnv();
  const ref = useRef<HTMLDialogElement>(null);
  const [sel, setSel] = useState(dkey(today));
  useModal(ref);
  const day = fromKey(sel);
  const rows = films.map(it => ({ it, ss: sessionsFor(it, cinema, day, country, today) })).filter(r => r.ss.length)
    .sort((a, b) => b.it.popularity - a.it.popularity);
  return (
    <dialog ref={ref} onClose={onClose} onClick={e => { if (e.target === ref.current) ref.current?.close(); }} aria-labelledby="cin-title">
      <div className="m-head"><span className="crumb">{t('cinema_w')} · {cinema.name}</span><button className="icon-btn" aria-label={t('close')} onClick={() => ref.current?.close()}><I.Close /></button></div>
      <div className="m-body">
        <div>
          <h2 id="cin-title" className="m-title">{cinema.name}</h2>
          <p className="m-sub">{t('venue', cinema.mall)}, {cityName(cinema.city)} · {t('halls_n', cinema.halls)}</p>
          <div className="fmts" style={{ marginTop: 12 }}>{cinema.formats.map(x => <span key={x} className={`fmt${x !== '2D' ? ' hi' : ''}`}>{x}</span>)}</div>
        </div>
        <section className="sec">
          <h3>{t('schedule')}</h3>
          <DateStrip from={today} days={7} sel={sel} onPick={setSel} />
          {rows.length ? (
            <div className="venues">{rows.map(({ it, ss }) => {
              const href = titlePath(lang, country, 'movie', it.id, it.title);
              return (
                <div className="film-row" key={it.key}>
                  <Link href={href} aria-label={t('open', it.title)}><Poster path={it.poster} title={it.title} size="w154" /></Link>
                  <div>
                    <h4><Link href={href}>{it.title}</Link>{it.cert && <small>{it.cert}</small>}</h4>
                    <div className="sess">{ss.map(s => <SessBtn key={s.id} s={s} onPick={x => onSession(x, it)} />)}</div>
                  </div>
                </div>
              );
            })}</div>
          ) : <p className="note">{t('no_sess_s')}</p>}
          <p className="demo-note">{t('demo_sess')}</p>
        </section>
      </div>
    </dialog>
  );
}
