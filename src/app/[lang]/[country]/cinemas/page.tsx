import type { Metadata } from 'next';
import { lang as rootLang } from 'next/root-params';
import CinemasView from '@/components/CinemasView';
import { isLang } from '@/lib/regions';
import { translator } from '@/lib/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await rootLang();
  return isLang(lang) ? { title: translator(lang)('nav_cin') } : {};
}

export default function Page() {
  return <CinemasView />;
}
