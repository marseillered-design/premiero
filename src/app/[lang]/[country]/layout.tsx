import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { lang as rootLang, country as rootCountry } from 'next/root-params';
import { Golos_Text, JetBrains_Mono, Unbounded } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import AppProvider from '@/components/AppProvider';
import { COUNTRY_CODES, LANG_CODES, isCountry, isLang } from '@/lib/regions';
import '../../globals.css';

const display = Unbounded({ variable: '--font-display', subsets: ['latin', 'latin-ext', 'cyrillic'], weight: ['500', '700', '800'] });
const body = Golos_Text({ variable: '--font-body', subsets: ['latin', 'latin-ext', 'cyrillic'], weight: ['400', '500', '600'] });
const mono = JetBrains_Mono({ variable: '--font-mono', subsets: ['latin', 'latin-ext', 'cyrillic'], weight: ['400', '600'] });

const site = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000';

export async function generateStaticParams() {
  return LANG_CODES.flatMap(lang => COUNTRY_CODES.map(country => ({ lang, country })));
}

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: { default: 'Premiero', template: '%s · Premiero' },
};

export default async function RootLayout({ children }: LayoutProps<'/[lang]/[country]'>) {
  const lang = await rootLang();
  const country = await rootCountry();
  if (!isLang(lang) || !isCountry(country)) notFound();
  return (
    <html lang={lang} className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <AppProvider lang={lang} country={country}>{children}</AppProvider>
        <Analytics />
      </body>
    </html>
  );
}
