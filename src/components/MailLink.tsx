'use client';

import { useEffect, useState } from 'react';
import { useEnv } from './AppProvider';

type State = { enabled: boolean; email?: string; remind: boolean; weekly: boolean };

/** Письма на почту: напоминания о выходе и подборка недели. По умолчанию выключены — человек включает сам. */
export default function MailLink() {
  const { t, lang, country, toast } = useEnv();
  const [s, setS] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    fetch('/api/me/mail').then(r => r.json()).then((d: State) => setS({ enabled: !!d.enabled, email: d.email, remind: !!d.remind, weekly: !!d.weekly })).catch(() => {});
  }, []);
  if (!s?.enabled) return null;

  // пример письма прямо сейчас, чтобы не ждать понедельника
  const sample = () => {
    setBusy(true);
    fetch('/api/me/mail/sample', { method: 'POST' })
      .then(r => toast(t(r.ok ? 'ml_sample_ok' : r.status === 429 ? 'rp_limit' : 'rp_fail', s.email ?? '')))
      .catch(() => toast(t('rp_fail')))
      .finally(() => setBusy(false));
  };

  const save = (next: Pick<State, 'remind' | 'weekly'>) => {
    const prev = s;
    setS({ ...s, ...next });
    fetch('/api/me/mail', { method: 'POST', body: JSON.stringify({ ...next, lang, country }) })
      .then(r => { if (!r.ok) throw new Error(String(r.status)); toast(t('ml_saved')); })
      .catch(() => setS(prev));
  };
  return (
    <section className="sec cal-sub ml-sub">
      <h2>{t('ml_h')}</h2>
      <p className="note">{t('ml_text', s.email ?? '')}</p>
      <div className="toggles">
        <label className="toggle"><input type="checkbox" checked={s.remind} onChange={e => save({ remind: e.target.checked, weekly: s.weekly })} /> {t('ml_remind')}</label>
        <label className="toggle"><input type="checkbox" checked={s.weekly} onChange={e => save({ remind: s.remind, weekly: e.target.checked })} /> {t('ml_weekly')}</label>
      </div>
      {(s.remind || s.weekly) && <button className="reset ml-sample" disabled={busy} onClick={sample}>{t('ml_sample')}</button>}
    </section>
  );
}
