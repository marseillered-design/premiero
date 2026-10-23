'use client';

import { useCallback, useEffect, useState } from 'react';
import { useEnv } from './AppProvider';

type State = { enabled: boolean; linked: boolean };

/** Напоминания в Telegram: бот пишет в день выхода всего, что есть в «Моём списке». */
export default function TelegramLink() {
  const { t, lang, country } = useEnv();
  const [state, setState] = useState<State | null>(null);
  const [waiting, setWaiting] = useState(false);
  const load = useCallback(() => fetch('/api/me/telegram').then(r => r.json()).then((d: State) => {
    setState({ enabled: !!d.enabled, linked: !!d.linked });
    if (d.linked) setWaiting(false);
  }).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);
  // пока посетитель в Telegram жмёт «Start», проверяем при возврате на вкладку
  useEffect(() => {
    if (!waiting) return;
    const back = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', back);
    const timer = setInterval(load, 4000);
    return () => { document.removeEventListener('visibilitychange', back); clearInterval(timer); };
  }, [waiting, load]);

  if (!state?.enabled) return null;
  const connect = () => {
    // окно открываем сразу по клику, иначе браузер его заблокирует; адрес подставим, когда придёт
    const win = window.open('', '_blank');
    fetch('/api/me/telegram', { method: 'POST', body: JSON.stringify({ lang, country }) })
      .then(r => r.json()).then((d: { url?: string }) => {
        if (!d.url) { win?.close(); return; }
        if (win) win.location.href = d.url; else location.href = d.url;
        setWaiting(true);
      }).catch(() => win?.close());
  };
  const disconnect = () => fetch('/api/me/telegram', { method: 'DELETE' }).then(() => setState(s => s && { ...s, linked: false })).catch(() => {});

  return (
    <section className="sec cal-sub tg-sub">
      <h2>{t('tg_h')}</h2>
      <p className="note">{t('tg_text')}</p>
      {state.linked ? (
        <div className="cal-sub-a">
          <span className="tg-on">✓ {t('tg_on')}</span>
          <button className="reset" onClick={disconnect}>{t('tg_off_btn')}</button>
        </div>
      ) : (
        <div className="cal-sub-a">
          <button className="btn primary tg-btn" onClick={connect}><TgIcon /> {t('tg_connect')}</button>
          {waiting && <span className="note">{t('tg_wait')}</span>}
        </div>
      )}
    </section>
  );
}

const TgIcon = () => <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M21.9 4.3 18.8 19c-.2 1-.8 1.3-1.7.8l-4.6-3.4-2.2 2.1c-.3.3-.5.5-1 .5l.3-4.7 8.6-7.8c.4-.3-.1-.5-.6-.2L6.9 12.9 2.4 11.5c-1-.3-1-1 .2-1.5L20.5 3c.8-.3 1.6.2 1.4 1.3Z" /></svg>;
