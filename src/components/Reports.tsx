'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEnv } from './AppProvider';
import type { Report } from '@/lib/reports';

type Media = 'movie' | 'tv' | 'game';

/** Отправка на /api/report; возвращает текст для всплывашки. */
function useSend() {
  const { t, toast } = useEnv();
  const page = usePathname();
  const [busy, setBusy] = useState(false);
  const send = async (body: Record<string, unknown>) => {
    setBusy(true);
    try {
      const res = await fetch('/api/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, page }) });
      toast(t(res.ok ? 'rp_thanks' : res.status === 429 ? 'rp_limit' : 'rp_fail'));
      return res.ok;
    } catch {
      toast(t('rp_fail'));
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { busy, send };
}

/** Невидимое поле-ловушка для ботов. */
const Trap = ({ value, set }: { value: string; set: (v: string) => void }) => (
  <input className="trap" name="website" tabIndex={-1} autoComplete="off" aria-hidden value={value} onChange={e => set(e.target.value)} />
);

/** «Ошибка в дате?» под датами на странице релиза: раскрывается в короткую форму. */
export function ReportFix({ itemKey, title, media }: { itemKey: string; title: string; media: Media }) {
  const { t } = useEnv();
  const { busy, send } = useSend();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [trap, setTrap] = useState('');
  if (!open) return <button className="link-btn rp-open" onClick={() => setOpen(true)}>{t('rp_btn')}</button>;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await send({ kind: 'fix', key: itemKey, title, media, date, note, website: trap })) { setOpen(false); setDate(''); setNote(''); }
  };
  return (
    <form className="rp-form" onSubmit={submit}>
      <p className="rp-h">{t('rp_title')}</p>
      <label>{t('rp_date')}<input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
      <label>{t('rp_note')}<textarea rows={3} maxLength={1000} value={note} onChange={e => setNote(e.target.value)} placeholder={t('rp_note_ph')} /></label>
      <Trap value={trap} set={setTrap} />
      <div className="rp-acts">
        <button className="btn primary" disabled={busy || (!date && !note.trim())}>{t('rp_send')}</button>
        <button type="button" className="btn" onClick={() => setOpen(false)}>{t('rp_cancel')}</button>
      </div>
    </form>
  );
}

/** Форма «Предложить релиз». */
export function SubmitRelease() {
  const { t } = useEnv();
  const { busy, send } = useSend();
  const [media, setMedia] = useState<Media>('movie');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [link, setLink] = useState('');
  const [note, setNote] = useState('');
  const [trap, setTrap] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await send({ kind: 'new', media, title, date, link, note, website: trap })) { setTitle(''); setDate(''); setLink(''); setNote(''); }
  };
  return (
    <form className="rp-form rp-page" onSubmit={submit}>
      <fieldset className="rp-kind">
        <legend>{t('sb_kind')}</legend>
        {(['movie', 'tv', 'game'] as Media[]).map(m => (
          <label key={m} className="chip" data-on={media === m || undefined}>
            <input type="radio" name="media" value={m} checked={media === m} onChange={() => setMedia(m)} />
            {t(m === 'movie' ? 'ty_movie' : m === 'tv' ? 'ty_series' : 'ty_game')}
          </label>
        ))}
      </fieldset>
      <label>{t('sb_name')}<input required maxLength={200} value={title} onChange={e => setTitle(e.target.value)} /></label>
      <label>{t('sb_date')}<input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
      <label>{t('sb_src')}<input type="url" inputMode="url" maxLength={500} placeholder="https://" value={link} onChange={e => setLink(e.target.value)} /></label>
      <label>{t('rp_note')}<textarea rows={4} maxLength={1000} value={note} onChange={e => setNote(e.target.value)} /></label>
      <Trap value={trap} set={setTrap} />
      <div className="rp-acts">
        <button className="btn primary" disabled={busy || !title.trim() || (!date && !link && !note.trim())}>{t('rp_send')}</button>
      </div>
    </form>
  );
}

/** Сообщения посетителей для владельца сайта. */
export function ReportsList() {
  const { t, f } = useEnv();
  const [list, setList] = useState<Report[] | null>(null);
  const [denied, setDenied] = useState(false);
  useEffect(() => {
    let live = true;
    fetch('/api/report', { cache: 'no-store' })
      .then(async r => { if (!live) return; if (!r.ok) { setDenied(true); return; } setList(((await r.json()) as { reports: Report[] }).reports); })
      .catch(() => live && setDenied(true));
    return () => { live = false; };
  }, []);

  const drop = async (id: string) => {
    setList(l => l?.filter(r => r.id !== id) ?? null);
    await fetch(`/api/report?id=${id}`, { method: 'DELETE' }).catch(() => {});
  };

  if (denied) return <p className="empty-s">{t('rv_denied')}</p>;
  if (!list) return <div className="empty"><span className="spinner" aria-hidden /></div>;
  if (!list.length) return <p className="empty-s">{t('rv_none')}</p>;
  return (
    <ul className="rv-list">
      {list.map(r => (
        <li key={r.id} className="rv-item">
          <p className="card-m">
            <span className={`tag t-${r.kind === 'fix' ? 'online' : 'series'}`}>{t(r.kind === 'fix' ? 'rv_fix' : 'rv_new')}</span>
            <span className="tag">{t(r.media === 'movie' ? 'ty_movie' : r.media === 'tv' ? 'ty_series' : 'ty_game')}</span>
            <span>{new Date(r.at).toLocaleString()}</span>
          </p>
          <h3 className="card-t">{r.page ? <Link prefetch={false} href={r.page}>{r.title}</Link> : r.title}</h3>
          {r.date && <p><b>{t('rp_date')}</b> {f.date(new Date(`${r.date}T12:00:00`))}</p>}
          {r.link && <p><a href={r.link} target="_blank" rel="noreferrer nofollow">{r.link}</a></p>}
          {r.note && <p className="rv-note">{r.note}</p>}
          {r.by && <p className="rv-by">{r.by}</p>}
          <button className="btn" onClick={() => drop(r.id)}>{t('rv_done')}</button>
        </li>
      ))}
    </ul>
  );
}
