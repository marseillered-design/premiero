import type { Lang } from './types';
import type { Names } from './regions';

/** Жанры IGDB (их всего два десятка) с нашими переводами: сам IGDB отдаёт названия только по-английски. */
export const GAME_GENRES: Record<number, Names> = {
  2: { en: 'point-and-click', uk: 'квест', es: 'aventura gráfica', pl: 'przygodówka point-and-click', de: 'Point-and-Click', ru: 'квест' },
  4: { en: 'fighting', uk: 'файтинг', es: 'lucha', pl: 'bijatyka', de: 'Prügelspiel', ru: 'файтинг' },
  5: { en: 'shooter', uk: 'шутер', es: 'disparos', pl: 'strzelanka', de: 'Shooter', ru: 'шутер' },
  7: { en: 'music', uk: 'музична', es: 'musical', pl: 'muzyczna', de: 'Musik', ru: 'музыкальная' },
  8: { en: 'platformer', uk: 'платформер', es: 'plataformas', pl: 'platformówka', de: 'Plattformer', ru: 'платформер' },
  9: { en: 'puzzle', uk: 'головоломка', es: 'puzles', pl: 'logiczna', de: 'Puzzle', ru: 'головоломка' },
  10: { en: 'racing', uk: 'перегони', es: 'carreras', pl: 'wyścigi', de: 'Rennspiel', ru: 'гонки' },
  11: { en: 'real-time strategy', uk: 'стратегія в реальному часі', es: 'estrategia en tiempo real', pl: 'RTS', de: 'Echtzeitstrategie', ru: 'стратегия в реальном времени' },
  12: { en: 'RPG', uk: 'рольова', es: 'rol', pl: 'RPG', de: 'Rollenspiel', ru: 'ролевая' },
  13: { en: 'simulator', uk: 'симулятор', es: 'simulación', pl: 'symulator', de: 'Simulation', ru: 'симулятор' },
  14: { en: 'sport', uk: 'спорт', es: 'deportes', pl: 'sportowa', de: 'Sport', ru: 'спорт' },
  15: { en: 'strategy', uk: 'стратегія', es: 'estrategia', pl: 'strategia', de: 'Strategie', ru: 'стратегия' },
  16: { en: 'turn-based strategy', uk: 'покрокова стратегія', es: 'estrategia por turnos', pl: 'strategia turowa', de: 'Rundenstrategie', ru: 'пошаговая стратегия' },
  24: { en: 'tactical', uk: 'тактика', es: 'táctica', pl: 'taktyczna', de: 'Taktik', ru: 'тактика' },
  25: { en: 'hack and slash', uk: 'слешер', es: 'hack and slash', pl: 'hack and slash', de: 'Hack and Slash', ru: 'слешер' },
  26: { en: 'quiz', uk: 'вікторина', es: 'preguntas', pl: 'quiz', de: 'Quiz', ru: 'викторина' },
  30: { en: 'pinball', uk: 'пінбол', es: 'pinball', pl: 'pinball', de: 'Flipper', ru: 'пинбол' },
  31: { en: 'adventure', uk: 'пригоди', es: 'aventura', pl: 'przygodowa', de: 'Abenteuer', ru: 'приключения' },
  32: { en: 'indie', uk: 'інді', es: 'indie', pl: 'niezależna', de: 'Indie', ru: 'инди' },
  33: { en: 'arcade', uk: 'аркада', es: 'arcade', pl: 'zręcznościowa', de: 'Arcade', ru: 'аркада' },
  34: { en: 'visual novel', uk: 'візуальна новела', es: 'novela visual', pl: 'powieść wizualna', de: 'Visual Novel', ru: 'визуальная новелла' },
  35: { en: 'card & board', uk: 'карткова й настільна', es: 'cartas y tablero', pl: 'karciana i planszowa', de: 'Karten- und Brettspiel', ru: 'карточная и настольная' },
  36: { en: 'MOBA', uk: 'MOBA', es: 'MOBA', pl: 'MOBA', de: 'MOBA', ru: 'MOBA' },
};

export const gameGenreName = (id: number, lang: Lang) => {
  const n = GAME_GENRES[id];
  return n ? (n[lang] ?? n.en) : null;
};
