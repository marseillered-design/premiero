'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { useEnv } from './AppProvider';

/** Кнопка «Войти через Google» или меню аккаунта. Пока вход не настроен на сервере, ничего не показывает. */
export default function AccountMenu({ home }: { home: string }) {
  const { t, account, signOut, deleteAccount } = useEnv();
  const menu = useRef<HTMLDetailsElement>(null);
  if (!account.enabled) return null;
  const close = () => menu.current?.removeAttribute('open');

  if (!account.user) {
    // вход идёт через обработчик /api/auth/login, а не через страницу, поэтому нужен полный переход
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    const signIn = () => { location.href = `/api/auth/login?next=${encodeURIComponent(location.pathname + location.search)}`; };
    return <button className="btn sign-in" onClick={signIn}><GoogleIcon /> <span>{t('sign_in')}</span></button>;
  }

  const u = account.user;
  return (
    <details className="acc" ref={menu}>
      <summary className="acc-btn" aria-label={t('account')} title={u.name}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {u.picture ? <img src={u.picture} alt="" width={32} height={32} referrerPolicy="no-referrer" /> : <span className="acc-ph">{u.name.slice(0, 1)}</span>}
      </summary>
      <div className="acc-pop">
        <p className="acc-who"><b>{u.name}</b><span>{u.email}</span></p>
        <Link href={`${home}/my`} onClick={close}>{t('my_page')}</Link>
        <Link href={`${home}/privacy`} onClick={close}>{t('privacy')}</Link>
        <button onClick={() => { close(); signOut(); }}>{t('sign_out')}</button>
        <button className="danger" onClick={() => { if (confirm(t('del_confirm'))) { close(); deleteAccount(); } }}>{t('del_account')}</button>
      </div>
    </details>
  );
}

const GoogleIcon = () => (
  <svg width={16} height={16} viewBox="0 0 48 48" aria-hidden>
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.6 13.2l7.9 6.2C12.4 13.7 17.7 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z" />
    <path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.2C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.8l7.9-6.2z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.2-8.5 2.2-6.3 0-11.6-4.2-13.5-9.9l-7.9 6.2C6.6 42.6 14.6 48 24 48z" />
  </svg>
);
