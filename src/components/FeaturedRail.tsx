'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { Kind } from '@/lib/types';
import { store, useEnv } from './AppProvider';
import * as I from './icons';

export interface Slide { key: string; href: string; image: string; title: string; kind: Kind; rating: number | null; date: string }

const STEP_MS = 6000;
const PAUSE_KEY = 'premiero.featPaused';

/**
 * Лента главных премьер с автопрокруткой. По правилам доступности (WCAG 2.2.2):
 * видимая кнопка паузы, остановка при наведении, фокусе и скрытой вкладке,
 * без автопрокрутки для тех, кто просил систему уменьшить движение.
 */
export default function FeaturedRail({ slides }: { slides: Slide[] }) {
  const { t } = useEnv();
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [stopped, setStopped] = useState(false);   // выбор посетителя: кнопка «стоп»
  const [hold, setHold] = useState(false);         // временно: наведение или фокус внутри
  const [hidden, setHidden] = useState(false);     // вкладка браузера не видна
  const [reduced, setReduced] = useState(false);
  const [warm, setWarm] = useState(false);         // первая картинка готова: можно грузить остальные

  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    /* eslint-disable react-hooks/set-state-in-effect */
    setReduced(mq.matches);
    setStopped(store.get<boolean>(PAUSE_KEY, false) || mq.matches);
    /* eslint-enable react-hooks/set-state-in-effect */
    const late = setTimeout(() => setWarm(true), 3000);
    const onVis = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => { document.removeEventListener('visibilitychange', onVis); clearTimeout(late); };
  }, []);

  const goTo = useCallback((i: number) => {
    const el = track.current;
    const n = slides.length;
    const next = ((i % n) + n) % n;
    const target = el?.children[next] as HTMLElement | undefined;
    if (!el || !target) return;
    setWarm(true);
    setIndex(next); // сразу, не дожидаясь событий прокрутки (в фоновой вкладке их нет)
    // .feat-track позиционирован, поэтому offsetLeft карточки отсчитывается от начала ленты
    el.scrollTo({ left: target.offsetLeft, behavior: reduced ? 'auto' : 'smooth' });
  }, [slides.length, reduced]);

  // Номер текущей карточки по положению прокрутки: работает и для свайпа, и для стрелок
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const kids = [...el.children] as HTMLElement[];
        const left = el.scrollLeft;
        let best = 0;
        kids.forEach((k, i) => { if (Math.abs(k.offsetLeft - left) < Math.abs(kids[best].offsetLeft - left)) best = i; });
        // у правого края последние карточки не могут встать в начало: считаем активной последнюю
        if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 4) best = kids.length - 1;
        setIndex(best);
      }, 60);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => { el.removeEventListener('scroll', onScroll); clearTimeout(timer); };
  }, []);

  const running = !stopped && !hold && !hidden;
  useEffect(() => {
    if (!running) return;
    const id = setTimeout(() => goTo(index + 1 >= slides.length ? 0 : index + 1), STEP_MS);
    return () => clearTimeout(id);
  }, [running, index, slides.length, goTo]);

  const toggle = () => { const v = !stopped; setStopped(v); store.set(PAUSE_KEY, v); };

  return (
    <section className="featured" aria-roledescription="carousel" aria-label={t('featured')}
      onMouseEnter={() => setHold(true)} onMouseLeave={() => setHold(false)}
      onFocus={() => setHold(true)} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setHold(false); }}>
      <div className="feat-head">
        <h2 className="feat-h">{t('featured')}</h2>
        <div className="feat-ctl">
          <button className="icon-btn" onClick={toggle} aria-label={stopped ? t('feat_play') : t('feat_pause')} title={stopped ? t('feat_play') : t('feat_pause')}>
            {stopped ? <I.Play /> : <PauseIcon />}
          </button>
          <button className="icon-btn" onClick={() => goTo(index - 1)} aria-label={t('feat_prev')}><I.Prev /></button>
          <button className="icon-btn" onClick={() => goTo(index + 1)} aria-label={t('feat_next')}><I.Next /></button>
        </div>
      </div>
      <div className="feat-track" ref={track} aria-live={running ? 'off' : 'polite'}>
        {slides.map((s, i) => (
          <Link key={s.key} className={`feat t-${s.kind}`} href={s.href}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {(i < 2 || warm) && <img src={s.image} alt="" loading={i < 2 ? 'eager' : 'lazy'} fetchPriority={i === 0 ? 'high' : undefined} onLoad={i === 0 ? () => setWarm(true) : undefined} />}
            <span className="feat-body">
              <span className="feat-meta"><span className="tag">{t('ty_' + s.kind)}</span>{s.rating ? <span className="stars"><I.Star />{s.rating.toFixed(1)}</span> : null}</span>
              <span className="feat-title">{s.title}</span>
              <span className="feat-date">{s.date}</span>
            </span>
          </Link>
        ))}
      </div>
      <div className="feat-dots" role="group" aria-label={t('featured')}>
        {slides.map((s, i) => (
          <button key={s.key} className={`fdot${i === index ? ' on' : ''}${i === index && running ? ' run' : ''}`} style={{ ['--step' as string]: `${STEP_MS}ms` }}
            aria-label={`${t('feat_slide', i + 1, slides.length)}: ${s.title}`} aria-current={i === index ? 'true' : undefined} onClick={() => goTo(i)}>
            <span />
          </button>
        ))}
      </div>
    </section>
  );
}

const PauseIcon = () => <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" aria-hidden><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>;
