import { connection } from 'next/server';
import { getReleases } from './releases';
import { COUNTRIES } from './regions';
import type { Facet, FacetSection } from './facets';
import type { CalendarData, CountryCode, Kind } from './types';

/*
 * Пустые календари-подборки («Документальные сериалы» в Литве, когда их в этом месяце нет)
 * закрываем от индекса и не кладём в карту сайта: страница показывает текущий месяц, и Google
 * видел на ней одно «Ничего не найдено» (soft 404, ноябрь 2026). Появятся релизы в месяце —
 * страница сама вернётся в индекс.
 */

const KINDS: Record<FacetSection, Kind[]> = { movies: ['cinema', 'online', 'disc'], series: ['series'], games: ['game'] };

/** Сколько релизов подборка показывает в месяце: те же правила, что у фильтров CalendarView по умолчанию. */
export function facetCount(section: FacetSection, f: Facet, data: CalendarData): number {
  const showAnime = f.kind === 'provider' && !!f.anime;
  return data.events.filter(ev => {
    const it = data.items[ev.item];
    if (!it || !KINDS[section].includes(ev.kind) || (it.anime && !showAnime)) return false;
    if (f.kind === 'genre') return it.genres.some(g => f.ids.includes(g));
    if (f.kind === 'platform') return ev.kind === 'game' && (it.platforms ?? []).includes(f.platform);
    return (ev.kind === 'online' || ev.kind === 'series') && (it.providers ?? []).some(p => f.ids.includes(p));
  }).length;
}

/**
 * Текущий месяц страны. Данные от языка не зависят (кроме названий), поэтому берём основной язык
 * страны: его каждую ночь прогревает /api/warm. Не успели за 2 с или ошибка — null, и тогда
 * подборку пустой не считаем.
 */
export async function countryMonth(country: CountryCode): Promise<CalendarData | null> {
  // «сегодня» — на момент запроса, а не сборки
  await connection();
  const month = new Date().toISOString().slice(0, 7);
  const load = getReleases(country, COUNTRIES[country].lang, month).catch(() => null);
  return Promise.race([load, new Promise<null>(r => setTimeout(() => r(null), 2000))]);
}

export const facetIsEmpty = (section: FacetSection, f: Facet, month: CalendarData | null) =>
  !!month && facetCount(section, f, month) === 0;
