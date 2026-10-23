'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { addDays, dkey, fromKey } from '@/lib/dates';
import type { Episode, Media } from '@/lib/types';
import { useEnv } from './AppProvider';
import * as I from './icons';

export interface TitleCore {
  id: number; media: Media; title: string; poster: string | null; cert: string | null;
  popularity: number; theatrical: string | null; digital: string | null;
  nextEpisode: { date: string; season: number; episode: number } | null;
  release?: string | null;   // у игр: дата выхода
  want?: number;             // сколько аккаунтов отметили релиз
}

/** Кнопки под описанием; `ext` — страница источника данных (TMDB или IGDB). */
export function TitleActions({ core, ext }: { core: TitleCore; ext: { url: string; label: string } }) {
  const { t, watch, toggleWatch, account } = useEnv();
  const key = `${core.media}-${core.id}`;
  const on = watch.has(key);
  // число пришло с сервера при загрузке; нажатия сразу меняют его на экране
  // (на сервере считаются только списки вошедших пользователей)
  const [delta, setDelta] = useState(0);
  const want = Math.max(0, (core.want ?? 0) + delta);
  const toggle = () => {
    if (account.user) setDelta(d => d + (on ? -1 : 1));
    toggleWatch({ key, media: core.media, id: core.id, title: core.title, poster: core.poster, date: core.release ?? core.theatrical ?? core.digital ?? core.nextEpisode?.date ?? null });
  };
  return (
    <div className="hero-a">
      <button className="btn" aria-pressed={on} onClick={toggle}><I.Bell /> <span>{on ? t('in_list') : t(core.media === 'game' ? 'want_game' : 'want')}</span>{want ? <span className="want-count" title={t('want_n', want)}>{want}</span> : null}</button>
      <AddToCalendar core={core} />
      <a className="btn" href={ext.url} target="_blank" rel="noreferrer">{ext.label}</a>
    </div>
  );
}

/* ---------- «Добавить в календарь»: Google Calendar и файл .ics ---------- */
const ymd = (k: string) => k.replaceAll('-', '');
const icsEscape = (s: string) => s.replace(/[\\;,]/g, m => '\\' + m).replace(/\n/g, '\\n');

function AddToCalendar({ core }: { core: TitleCore }) {
  const { t, f, today, ready } = useEnv();
  const events: { label: string; text: string; date: string }[] = [];
  if (core.theatrical) events.push({ label: t('in_cinema_on'), text: t('ev_cinema', core.title), date: core.theatrical });
  if (core.digital) events.push({ label: t('online_on'), text: t('ev_online', core.title), date: core.digital });
  if (core.release) events.push({ label: t('g_release'), text: t('ev_game', core.title), date: core.release });
  if (core.nextEpisode) events.push({ label: t('next_ep'), text: t('ev_episode', core.title, core.nextEpisode.season, core.nextEpisode.episode), date: core.nextEpisode.date });
  // прошедшие даты в календарь добавлять незачем
  const upcoming = ready ? events.filter(e => fromKey(e.date) >= today) : events;
  if (!upcoming.length) return null;

  // адрес страницы известен только в браузере, поэтому ссылку собираем в момент клика
  const google = (e: typeof events[number]) => {
    const end = dkey(addDays(fromKey(e.date), 1));
    const p = new URLSearchParams({ action: 'TEMPLATE', text: e.text, dates: `${ymd(e.date)}/${ymd(end)}`, details: location.href });
    window.open(`https://calendar.google.com/calendar/render?${p}`, '_blank', 'noopener');
  };
  const ics = (e: typeof events[number]) => {
    const end = ymd(dkey(addDays(fromKey(e.date), 1)));
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const body = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Premiero//Release calendar//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
      `UID:${core.media}-${core.id}-${ymd(e.date)}@premiero`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${ymd(e.date)}`, `DTEND;VALUE=DATE:${end}`,
      `SUMMARY:${icsEscape(e.text)}`, `URL:${location.href}`, `DESCRIPTION:${icsEscape(location.href)}`, 'END:VEVENT', 'END:VCALENDAR',
    ].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([body], { type: 'text/calendar;charset=utf-8' }));
    a.download = `${core.title.replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase()}-${e.date}.ics`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  return (
    <details className="cal-menu">
      <summary className="btn"><CalIcon /> {t('add_cal')}</summary>
      <div className="cal-pop">
        {upcoming.map(e => (
          <div className="cal-row" key={e.label}>
            <span className="cal-when"><b>{e.label}</b> {f.date(fromKey(e.date))}</span>
            <span className="cal-links">
              <button onClick={() => google(e)}>{t('gcal')}</button>
              <button onClick={() => ics(e)}>{t('ics')}</button>
            </span>
          </div>
        ))}
      </div>
    </details>
  );
}
const CalIcon = () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4M12 13v5M9.5 15.5h5" /></svg>;

/* ---------- трейлер: картинка-заглушка, плеер грузится по клику ---------- */
export function Trailer({ id, title }: { id: string; title: string }) {
  const { t } = useEnv();
  const [play, setPlay] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  // Next.js прячет ушедшую страницу через <Activity>, а не удаляет её, и видео продолжало бы
  // играть на фоне. Перед скрытием выгружаем плеер и возвращаем обложку.
  useLayoutEffect(() => {
    const el = frame;
    return () => {
      if (el.current) el.current.src = 'about:blank';
      setPlay(false);
    };
  }, []);
  return (
    <div className="trailer">
      {play ? (
        <iframe ref={frame} src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`} title={`${t('trailer')}: ${title}`} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
      ) : (
        <button className="trailer-cover" onClick={() => setPlay(true)} aria-label={t('play_trailer')}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" />
          <span className="trailer-play"><I.Play /> {t('play_trailer')}</span>
        </button>
      )}
    </div>
  );
}

/* ---------- график серий: «вышла» зависит от сегодняшней даты ---------- */
export function Episodes({ number, episodes }: { number: number; episodes: Episode[] }) {
  const { t, f, today, ready } = useEnv();
  return (
    <div className="eps">{episodes.map(e => {
      const out = ready && !!e.date && fromKey(e.date) <= today;
      return (
        <div key={e.n} className={`ep${out ? ' out' : ''}`}>
          <span className="n">{number}×{String(e.n).padStart(2, '0')}</span>
          <span>{e.name || t('ep_one', e.n)}{e.n === episodes.length ? ` · ${t('season_finale')}` : ''}</span>
          <span className="d">{e.date ? `${out ? t('out') + ' · ' : ''}${f.date(fromKey(e.date))}` : t('tba')}</span>
        </div>
      );
    })}</div>
  );
}
