'use client';

import { useEffect, useRef, useState } from 'react';
import { COUNTRIES, nameIn } from '@/lib/regions';
import { addDays, diffDays, dkey } from '@/lib/dates';
import { hallLayout, hash, isPast, rng, seatPrice, type Session } from '@/lib/demo-cinemas';
import type { CalItem } from '@/lib/types';
import Poster from './Poster';
import { useEnv, type Env } from './AppProvider';
import * as I from './icons';
import { useModal } from './useModal';

type Step = 'seats' | 'pay' | 'done';
type Head = (crumb: string, back?: () => void) => React.ReactNode;

/* ---------- shared bits for showtime lists ---------- */
export function DateStrip({ from, days, sel, onPick }: { from: Date; days: number; sel: string; onPick: (k: string) => void }) {
  const { t, f, today } = useEnv();
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
export function SessBtn({ s, onPick }: { s: Session; onPick: (s: Session) => void }) {
  const { t, money, today, nowMin } = useEnv();
  return (
    <button className={`ses${isPast(s, today, nowMin) ? ' past' : ''}`} onClick={() => onPick(s)} aria-label={`${s.time}, ${s.fmt}, ${t('hall')} ${s.hall}, ${t('from')} ${money(s.price)}`}>
      <span className="tm">{s.time}</span><span className="fx">{s.fmt} · {t('hall')} {s.hall}</span><span className="pr">{t('from')} {money(s.price)}</span>
    </button>
  );
}

/* ---------- checkout dialog: seats → pay → ticket ---------- */
export default function Checkout({ session, item, onClose }: { session: Session; item: CalItem; onClose: () => void }) {
  const env = useEnv();
  const ref = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState<Step>('seats');
  const [seats, setSeats] = useState<Set<string>>(new Set());
  useModal(ref);
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);
  useEffect(() => { ref.current?.scrollTo({ top: 0 }); }, [step]);

  const { t } = env;
  const close = () => ref.current?.close();
  const head: Head = (crumb, back) => (
    <div className="m-head">
      {back && <button className="icon-btn" aria-label={t('back')} onClick={back}><I.Prev /></button>}
      <span className="crumb">{crumb}</span>
      <button className="icon-btn" aria-label={t('close')} onClick={close}><I.Close /></button>
    </div>
  );
  const props = { s: session, it: item, env, head, seats };
  return (
    <dialog ref={ref} onClose={onClose} onClick={e => { if (e.target === ref.current) close(); }} aria-labelledby="m-title">
      {step === 'seats' && <Seats {...props} setSeats={setSeats} onBack={close} onNext={() => setStep('pay')} />}
      {step === 'pay' && <Pay {...props} onBack={() => setStep('seats')} onPaid={() => setStep('done')} />}
      {step === 'done' && <Done {...props} onClose={close} />}
    </dialog>
  );
}

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

function Pay({ s, it, env, head, seats, onBack, onPaid }: CheckoutProps & { onBack: () => void; onPaid: () => void }) {
  const { t, money } = env;
  const { total, text } = seatsInfo(s, it, seats, env);
  return <>
    {head(`${it.title} · ${t('checkout_c')}`, onBack)}
    <div className="m-body">
      <h2 id="m-title" className="m-title">{t('how_buy')}</h2>
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
      <div className="pay-opts">
        <div className="opt main"><h4>{t('pay_t')}</h4><p>{t('pay_d')}</p><button className="btn primary" onClick={onPaid}>{t('pay_b')} · {money(total)}</button></div>
        <div className="opt"><h4>{t('partner_t')}</h4><p>{t('partner_d')}</p><button className="btn" onClick={() => env.toast(t('t_partner'))}>{t('partner_b')}</button></div>
      </div>
      <p className="note">{t('proto')}</p>
    </div>
  </>;
}

function Done({ s, it, env, head, seats, onClose }: CheckoutProps & { onClose: () => void }) {
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
          <span className="ln">{t('paid')}: <b>{money(total)}</b> · {nameIn(COUNTRIES[s.country].name, env.lang)}</span>
        </div>
        <div className="stub"><canvas ref={qr} width={25} height={25} aria-label={t('qr')} /><small>{code}</small></div>
      </div>
      <p className="done-note">{t('done_note')}</p>
      <div className="done-a"><button className="btn" onClick={onClose}>{t('close')}</button></div>
    </div>
  </>;
}
