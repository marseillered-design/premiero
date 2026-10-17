import type { Metadata } from 'next';
import { Golos_Text, JetBrains_Mono, Unbounded } from 'next/font/google';
import './globals.css';

const display = Unbounded({ variable: '--font-display', subsets: ['latin', 'cyrillic'], weight: ['500', '700', '800'] });
const body = Golos_Text({ variable: '--font-body', subsets: ['latin', 'cyrillic'], weight: ['400', '500', '600'] });
const mono = JetBrains_Mono({ variable: '--font-mono', subsets: ['latin', 'cyrillic'], weight: ['400', '600'] });

export const metadata: Metadata = {
  title: 'Premiero',
  description: 'Movie & series release calendar with showtimes and tickets for Ukraine, the US, Mexico and Central Asia.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
