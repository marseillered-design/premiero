import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { lang as rootLang, country as rootCountry } from 'next/root-params';
import { Golos_Text, JetBrains_Mono, Unbounded } from 'next/font/google';
import { preconnect } from 'react-dom';
import AppProvider from '@/components/AppProvider';
import { COUNTRY_CODES, LANG_CODES, isCountry, isLang } from '@/lib/regions';
import { THEME_INIT } from '@/lib/theme';
import { SITE } from '@/lib/site';
import '../../globals.css';

// Без предзагрузки: браузер скачивает только те наборы букв, что встречаются на странице
// (украинской странице не нужна латиница с диакритикой), а не все девять файлов сразу
const display = Unbounded({ variable: '--font-display', subsets: ['latin', 'latin-ext', 'cyrillic'], weight: ['500', '700', '800'], preload: false });
const body = Golos_Text({ variable: '--font-body', subsets: ['latin', 'latin-ext', 'cyrillic'], weight: ['400', '500', '600'], preload: false });
const mono = JetBrains_Mono({ variable: '--font-mono', subsets: ['latin', 'latin-ext', 'cyrillic'], weight: ['400', '600'], preload: false });



export async function generateStaticParams() {
  return LANG_CODES.flatMap(lang => COUNTRY_CODES.map(country => ({ lang, country })));
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: 'Premiero', template: '%s · Premiero' },
  // картинка для превью ссылок; у страниц фильмов, сериалов и игр — свой кадр
  openGraph: { siteName: 'Premiero', type: 'website', images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Premiero' }] },
  twitter: { card: 'summary_large_image', images: ['/og.png'] },
};

export default async function RootLayout({ children }: LayoutProps<'/[lang]/[country]'>) {
  const lang = await rootLang();
  const country = await rootCountry();
  if (!isLang(lang) || !isCountry(country)) notFound();
  // постеры и кадры идут с image.tmdb.org и images.igdb.com: соединение открываем, пока грузится остальное
  preconnect('https://image.tmdb.org');
  preconnect('https://images.igdb.com');
  return (
    <html lang={lang} className={`${display.variable} ${body.variable} ${mono.variable}`} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_INIT }} /></head>
      <body>
        {/* Vercel Web Analytics ушла вместе с Vercel: посетителей считает Cloudflare */}
        <AppProvider lang={lang} country={country}>{children}</AppProvider>
      </body>
    </html>
  );
}
