'use client';

import { useLayoutEffect, type RefObject } from 'react';

/**
 * Открывает <dialog> как модальное окно и закрывает его, когда компонент уходит со сцены.
 * Это важно и при переходе на другую страницу: Next.js прячет прежнюю страницу через
 * <Activity>, а открытое модальное окно иначе делало бы новую страницу некликабельной.
 */
export function useModal(ref: RefObject<HTMLDialogElement | null>) {
  useLayoutEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    return () => { if (d?.open) d.close(); };
  }, [ref]);
}
