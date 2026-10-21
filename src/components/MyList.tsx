'use client';

import Link from 'next/link';
import { fromKey } from '@/lib/dates';
import { titlePath } from '@/lib/slug';
import Poster from './Poster';
import { useEnv } from './AppProvider';
import * as I from './icons';

/** «Мой список»: всё, что посетитель отметил, ближайшие релизы сверху, вышедшие внизу. */
export default function MyList() {
  const { t, f, lang, country, today, ready, watchItems, toggleWatch, account } = useEnv();
  const items = Object.values(watchItems);
  const now = ready ? today : null;
  const upcoming = items.filter(i => !i.date || !now || fromKey(i.date) >= now).sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999'));
  const past = items.filter(i => i.date && now && fromKey(i.date) < now).sort((a, b) => b.date!.localeCompare(a.date!));
  const kind = (m: string) => (m === 'game' ? 'game' : m === 'tv' ? 'series' : 'cinema');

  const row = (i: (typeof items)[number]) => {
    const href = titlePath(lang, country, i.media, i.id, i.title);
    return (
      <article className="card" key={i.key}>
        <Link className="poster-btn" href={href} aria-label={t('open', i.title)}><Poster path={i.poster} title={i.title} /></Link>
        <h3 className="card-t"><Link href={href}>{i.title}</Link></h3>
        <p className="card-m"><span className={`tag t-${kind(i.media)}`}>{t('ty_' + kind(i.media))}</span><span>{i.date ? `${f.date(fromKey(i.date))} · ${f.rel(fromKey(i.date))}` : t('tba')}</span></p>
        <div className="card-a"><button className="watch" aria-pressed aria-label={t('unwant')} title={t('unwant')} onClick={() => toggleWatch(i)}><I.Bell /></button></div>
      </article>
    );
  };

  return (
    <div className="wrap title-page my-page">
      <h1 className="my-h">{t('my_page')}</h1>
      {account.enabled && !account.user && <p className="note">{t('sync_hint')}</p>}
      {!ready ? <div className="empty"><span className="spinner" aria-hidden /></div>
        : !items.length ? <div className="empty"><b>{t('my_empty_t')}</b><span>{t('my_empty_s')}</span></div>
        : <>
          {upcoming.length > 0 && <section className="sec"><h2>{t('my_soon')}</h2><div className="grid">{upcoming.map(row)}</div></section>}
          {past.length > 0 && <section className="sec"><h2>{t('my_out')}</h2><div className="grid">{past.map(row)}</div></section>}
        </>}
    </div>
  );
}
