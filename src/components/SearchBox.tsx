'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { titlePath } from '@/lib/slug';
import type { SearchHit } from '@/lib/tmdb';
import Poster from './Poster';
import { useEnv } from './AppProvider';
import * as I from './icons';

/**
 * Строка поиска в панели календаря. Набранный текст по-прежнему фильтрует релизы месяца,
 * а под строкой появляются подсказки по всей базе: любые фильмы, сериалы и игры.
 */
export default function SearchBox({ q, onChange }: { q: string; onChange: (v: string) => void }) {
  const { t, lang, country } = useEnv();
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const term = q.trim();

  useEffect(() => {
    if (term.length < 2) return;
    const ac = new AbortController();
    // ждём паузу в наборе, чтобы не спрашивать сервер на каждую букву
    const id = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(term)}&lang=${lang}`, { signal: ac.signal })
        .then(r => r.json()).then((d: { results: SearchHit[] }) => setHits(d.results)).catch(() => {});
    }, 250);
    return () => { clearTimeout(id); ac.abort(); };
  }, [term, lang]);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);

  const shown = term.length >= 2 ? hits : null;
  const kind = (m: SearchHit['media']) => (m === 'game' ? 'game' : m === 'tv' ? 'series' : 'cinema');
  return (
    <div className="search-box" ref={box} onKeyDown={e => { if (e.key === 'Escape') setOpen(false); }}>
      <label className="search">
        <I.Search />
        <input id="q" type="search" value={q} placeholder={t('search')} aria-label={t('search_l')} autoComplete="off"
          aria-controls="search-hits"
          onFocus={() => setOpen(true)} onChange={e => { onChange(e.target.value); setOpen(true); if (e.target.value.trim().length < 2) setHits(null); }} />
      </label>
      {open && shown && (
        <div className="search-pop" id="search-hits">
          <p className="search-h">{shown.length ? t('search_all') : t('search_none')}</p>
          {shown.map(h => (
            <Link key={h.key} className="search-hit" href={titlePath(lang, country, h.media, h.id, h.title)} onClick={() => setOpen(false)}>
              <Poster path={h.poster} title={h.title} mini />
              <span className="search-t">{h.title}</span>
              <span className={`tag t-${kind(h.media)}`}>{t(h.media === 'movie' ? 'ty_movie' : 'ty_' + kind(h.media))}</span>
              <span className="search-y">{h.year ?? ''}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
