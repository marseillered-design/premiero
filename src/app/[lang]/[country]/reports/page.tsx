import type { Metadata } from 'next';
import { lang as rootLang } from 'next/root-params';
import { ReportsList } from '@/components/Reports';
import { isLang } from '@/lib/regions';
import { translator } from '@/lib/i18n';

const t = async () => { const l = await rootLang(); return translator(isLang(l) ? l : 'en'); };

export async function generateMetadata(): Promise<Metadata> {
  // служебная страница владельца сайта
  return { title: { absolute: `${(await t())('rv_title')} · Premiero` }, robots: { index: false, follow: false } };
}

export default async function Page() {
  return (
    <div className="wrap title-page">
      <h1 className="my-h">{(await t())('rv_title')}</h1>
      <ReportsList />
    </div>
  );
}
