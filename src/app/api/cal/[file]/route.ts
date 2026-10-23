import type { NextRequest } from 'next/server';
import { feedOwner, loadAccount, saveItems } from '@/lib/account';
import { hasKv } from '@/lib/kv';
import { currentDate } from '@/lib/fresh';
import { isCountry, isLang } from '@/lib/regions';
import { translator } from '@/lib/i18n';
import { titlePath } from '@/lib/slug';
import { SITE } from '@/lib/site';
import type { CountryCode, Lang, WatchItem } from '@/lib/types';

/*
 * «Мой список» как календарь: /api/cal/<секретный ключ>.ics. Google, Apple и Outlook
 * перечитывают его сами раз в несколько часов. Перед выдачей сверяем ближайшие даты:
 * если релиз перенесли, событие в календаре тоже переедет.
 */
const CHECK = 40;            // сколько ближайших релизов сверять за один запрос
const DAY = 86400000;

const esc = (s: string) => s.replace(/[\\;,]/g, m => '\\' + m).replace(/\r?\n/g, '\\n');
const ymd = (k: string) => k.replaceAll('-', '');
const next = (k: string) => new Date(Date.parse(k + 'T00:00:00Z') + DAY).toISOString().slice(0, 10);
// строки iCalendar длиннее 75 байт переносим с пробелом в начале продолжения
function fold(line: string) {
  const bytes = Buffer.from(line, 'utf8');
  if (bytes.length <= 75) return line;
  const parts: string[] = []; let cur = '';
  for (const ch of line) {
    if (Buffer.byteLength(cur + ch, 'utf8') > (parts.length ? 74 : 75)) { parts.push(cur); cur = ''; }
    cur += ch;
  }
  parts.push(cur);
  return parts.join('\r\n ');
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const token = file.replace(/\.ics$/, '');
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token) || !hasKv()) return new Response('Not found', { status: 404 });
  const owner = await feedOwner(token);
  if (!owner) return new Response('Not found', { status: 404 });
  const lang: Lang = isLang(owner.lang) ? owner.lang : 'en';
  const country: CountryCode = isCountry(owner.country) ? owner.country : 'us';
  const t = translator(lang);

  const { watch } = await loadAccount(owner.sub);
  const items = Object.values(watch);
  const soon = new Date(Date.now() + 180 * DAY).toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * DAY).toISOString().slice(0, 10);

  // сверяем ближайшие релизы и сохраняем новые даты, если их перенесли
  const toCheck = items.filter(i => !i.date || (i.date >= weekAgo && i.date <= soon)).sort((a, b) => (a.date ?? '0').localeCompare(b.date ?? '0')).slice(0, CHECK);
  const fresh = await Promise.all(toCheck.map(i => currentDate(i, lang, country)));
  const moved: WatchItem[] = [];
  toCheck.forEach((it, i) => {
    const d = fresh[i];
    if (d !== undefined && d !== it.date) { it.date = d; moved.push(it); }
  });
  if (moved.length) await saveItems(owner.sub, moved).catch(() => {});

  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const icon = (m: WatchItem['media']) => (m === 'game' ? '🎮' : m === 'tv' ? '📺' : '🎬');
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Premiero//My list//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(t('cal_name'))}`, 'REFRESH-INTERVAL;VALUE=DURATION:PT6H', 'X-PUBLISHED-TTL:PT6H',
  ];
  for (const it of items) {
    if (!it.date) continue;
    const url = SITE + titlePath(lang, country, it.media, it.id, it.title);
    lines.push('BEGIN:VEVENT', `UID:${it.key}@premiero`, `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ymd(it.date)}`, `DTEND;VALUE=DATE:${ymd(next(it.date))}`,
      `SUMMARY:${esc(`${icon(it.media)} ${it.title}`)}`, `URL:${url}`, `DESCRIPTION:${esc(url)}`, 'TRANSP:TRANSPARENT', 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return new Response(lines.map(fold).join('\r\n') + '\r\n', {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=21600', 'Content-Disposition': 'inline; filename="premiero.ics"' },
  });
}
