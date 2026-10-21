'use client';

import { useEffect, useState } from 'react';
import { useEnv } from './AppProvider';

/** «Мой список» в своём календаре: личная ссылка-подписка для Google, Apple и Outlook. */
export default function CalendarLink() {
  const { t, lang, country, toast } = useEnv();
  const [url, setUrl] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    fetch('/api/me/calendar').then(r => r.json()).then((d: { url: string | null }) => setUrl(d.url)).catch(() => setUrl(null));
  }, []);
  const create = () => fetch('/api/me/calendar', { method: 'POST', body: JSON.stringify({ country, lang }) })
    .then(r => r.json()).then((d: { url: string | null }) => setUrl(d.url)).catch(() => {});
  if (url === undefined) return null;

  const webcal = url?.replace(/^https?:/, 'webcal:');
  const copy = () => { if (url) navigator.clipboard.writeText(url).then(() => toast(t('cal_copied'))).catch(() => {}); };
  return (
    <section className="sec cal-sub">
      <h2>{t('cal_h')}</h2>
      <p className="note">{t('cal_text')}</p>
      {!url ? <button className="btn primary" onClick={create}>{t('cal_get')}</button> : (
        <div className="cal-sub-a">
          <a className="btn primary" href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal!)}`} target="_blank" rel="noreferrer">{t('cal_google')}</a>
          <a className="btn" href={webcal}>{t('cal_apple')}</a>
          <button className="btn" onClick={copy}>{t('cal_copy')}</button>
          <button className="reset" onClick={() => { if (confirm(t('cal_new_hint'))) create(); }}>{t('cal_new')}</button>
        </div>
      )}
    </section>
  );
}
