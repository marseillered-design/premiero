import { kv } from './kv';

/*
 * Сообщения от посетителей: «неверная дата» на странице релиза и «предложить релиз».
 * Хранятся списком в Redis (последние 500), читает их владелец на странице /reports.
 * Кто владелец — задаёт переменная ADMIN_EMAILS на Vercel (адреса Google через запятую).
 */
export type ReportKind = 'fix' | 'new';
export interface Report {
  id: string;
  at: string;                 // когда пришло, ISO
  kind: ReportKind;
  media: 'movie' | 'tv' | 'game';
  key: string | null;         // релиз, к которому относится исправление
  title: string;
  date: string | null;        // правильная или ожидаемая дата, YYYY-MM-DD
  link: string | null;        // источник
  note: string;
  page: string | null;        // откуда отправлено
  by: string | null;          // почта, если посетитель вошёл
}

const LIST = 'reports';
const KEEP = 500;
const PER_HOUR = 10;

export const isAdmin = (email: string | null | undefined) =>
  !!email && (process.env.ADMIN_EMAILS ?? '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean).includes(email.toLowerCase());

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Проверяет и обрезает присланное; null, если сообщение пустое или кривое. */
export function cleanReport(b: Record<string, unknown>, by: string | null): Report | null {
  const kind = b.kind === 'new' ? 'new' : b.kind === 'fix' ? 'fix' : null;
  const media = b.media === 'tv' || b.media === 'game' ? b.media : 'movie';
  const title = str(b.title, 200);
  const note = str(b.note, 1000);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(str(b.date, 10)) ? str(b.date, 10) : null;
  const rawLink = str(b.link, 500);
  const link = /^https?:\/\/\S+$/i.test(rawLink) ? rawLink : null;
  const key = /^(movie|tv|game)-\d+$/.test(str(b.key, 40)) ? str(b.key, 40) : null;
  const page = str(b.page, 300).startsWith('/') ? str(b.page, 300) : null;
  if (!kind || !title) return null;
  if (kind === 'fix' && !key) return null;
  if (!note && !date && !link) return null;
  return { id: crypto.randomUUID(), at: new Date().toISOString(), kind, media, key, title, date, link, note, page, by };
}

/** Не больше PER_HOUR сообщений в час с одного адреса. */
export async function allowed(ip: string) {
  const k = `rl:rep:${ip}`;
  const [n] = await kv(['INCR', k], ['EXPIRE', k, 3600, 'NX']);
  return Number(n) <= PER_HOUR;
}

export async function saveReport(r: Report) {
  await kv(['LPUSH', LIST, JSON.stringify(r)], ['LTRIM', LIST, 0, KEEP - 1]);
}

export async function listReports(): Promise<Report[]> {
  const [raw] = await kv(['LRANGE', LIST, 0, KEEP - 1]);
  return (Array.isArray(raw) ? (raw as string[]) : []).flatMap(s => { try { return [JSON.parse(s) as Report]; } catch { return []; } });
}

export async function dropReport(id: string) {
  const [raw] = await kv(['LRANGE', LIST, 0, KEEP - 1]);
  const hit = (Array.isArray(raw) ? (raw as string[]) : []).find(s => s.includes(`"id":"${id}"`));
  if (hit) await kv(['LREM', LIST, 1, hit]);
}
