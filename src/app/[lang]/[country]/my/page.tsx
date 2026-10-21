import type { Metadata } from 'next';
import { lang as rootLang } from 'next/root-params';
import MyList from '@/components/MyList';
import { isLang } from '@/lib/regions';
import { translator } from '@/lib/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await rootLang();
  const t = translator(isLang(lang) ? lang : 'en');
  // личная страница: поисковикам её показывать незачем
  return { title: { absolute: `${t('my_page')} · Premiero` }, robots: { index: false, follow: true } };
}

export default function Page() {
  return <MyList />;
}
