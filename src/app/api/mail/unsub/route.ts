import type { NextRequest } from 'next/server';
import { hasKv, kv } from '@/lib/kv';
import { unsubscribe, type MailKind } from '@/lib/mail';
import { translator } from '@/lib/i18n';
import { isLang } from '@/lib/regions';
import { SITE } from '@/lib/site';
import type { Lang } from '@/lib/types';

/*
 * «Отписаться» из письма. GET показывает кнопку (почтовые сканеры открывают ссылки сами —
 * отписывать по одному открытию нельзя), POST отписывает: и эта кнопка, и отписка в один клик из Gmail.
 */
const page = (lang: Lang, title: string, body: string) => new Response(`<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title} · Premiero</title></head>
<body style="margin:0;background:#16090C;color:#F5EDE3;font:16px/1.5 Arial,sans-serif"><div style="max-width:460px;margin:12vh auto;padding:0 20px;text-align:center">
<div style="font:800 22px Arial,sans-serif;margin-bottom:24px"><img src="/email-logo.png" width="36" height="36" alt="" style="vertical-align:middle;border-radius:8px;margin-right:8px"><span style="vertical-align:middle">Premiero</span></div>
<h1 style="font-size:22px;margin:0 0 14px">${title}</h1>${body}
<p style="margin-top:28px"><a href="${SITE}/${lang}" style="color:#E7B65C">thepremiero.com</a></p></div></body></html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });

const kindOf = (k: string | null): MailKind | 'all' => (k === 'r' || k === 'w' ? k : 'all');

async function langOf(token: string): Promise<Lang> {
  if (!hasKv() || !/^[\w-]{20,40}$/.test(token)) return 'en';
  const [sub] = await kv(['GET', `ml:${token}`]);
  const [l] = sub ? await kv(['HGET', `u:${sub}`, 'mailLang']) : [null];
  return isLang(l) ? l : 'en';
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const token = sp.get('t') ?? '', kind = kindOf(sp.get('k'));
  const lang = await langOf(token);
  const t = translator(lang);
  return page(lang, t('un_t'), `<form method="post" action="/api/mail/unsub?t=${encodeURIComponent(token)}&k=${kind}">
<button style="background:#E7B65C;color:#2A1116;border:0;border-radius:10px;padding:12px 22px;font:600 16px Arial,sans-serif;cursor:pointer">${t(kind === 'w' ? 'un_btn_w' : kind === 'r' ? 'un_btn_r' : 'un_btn')}</button></form>`);
}

export async function POST(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const done = hasKv() ? await unsubscribe(sp.get('t') ?? '', kindOf(sp.get('k'))) : null;
  const lang: Lang = done && isLang(done.lang) ? done.lang : 'en';
  const t = translator(lang);
  return done ? page(lang, t('un_done'), `<p>${t('un_back')}</p>`) : page(lang, t('un_bad'), '');
}
