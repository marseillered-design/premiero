import Link from 'next/link';
import { facetsFor, type Facet, type FacetSection } from '@/lib/facets';
import { getGenres, hasToken } from '@/lib/tmdb';
import { GAME_GENRE_OFFSET } from '@/lib/igdb';
import { gameGenreName } from '@/lib/game-genres';
import { translator } from '@/lib/i18n';
import type { CountryCode, Lang } from '@/lib/types';
import type { Section } from './CalendarView';

const LABELS: Record<FacetSection, string> = { movies: 'nav_movies', series: 'nav_series', games: 'nav_games' };

/** Название подборки на языке посетителя: платформа, сервис или жанр. */
export async function facetLabel(f: Facet, lang: Lang): Promise<string> {
  const t = translator(lang);
  if (f.kind === 'platform') return t('pf_' + f.platform);
  if (f.kind === 'provider') return f.name;
  const id = f.ids[0];
  if (id >= GAME_GENRE_OFFSET) return gameGenreName(id - GAME_GENRE_OFFSET, lang) ?? String(id);
  const names = hasToken() ? await getGenres(lang).catch(() => ({} as Record<number, string>)) : {};
  return names[id] ?? f.slug;
}

/**
 * Ссылки на календари-подборки под календарём: внутренние ссылки помогают поисковикам найти
 * страницы вроде «Игры для PlayStation» или «Сериалы Netflix».
 */
export default async function FacetLinks({ lang, country, section, current }: { lang: Lang; country: CountryCode; section: Section; current?: string }) {
  const t = translator(lang);
  const sections: FacetSection[] = section === 'all' ? ['movies', 'series', 'games'] : [section];
  const groups = await Promise.all(sections.map(async sec => ({
    sec, links: await Promise.all(facetsFor(sec, country).map(async f => ({ f, label: await facetLabel(f, lang) }))),
  })));
  return (
    <nav className="wrap facet-links" aria-label={t('fh_more')}>
      <h2>{t('fh_more')}</h2>
      {groups.map(({ sec, links }) => (
        <div key={sec}>
          {sections.length > 1 && <h3>{t(LABELS[sec])}</h3>}
          <ul>{links.map(({ f, label }) => (
            <li key={f.slug}><Link prefetch={false} href={`/${lang}/${country}/${sec}/${f.slug}`} aria-current={current === `${sec}/${f.slug}` ? 'page' : undefined}>{label}</Link></li>
          ))}</ul>
        </div>
      ))}
    </nav>
  );
}
