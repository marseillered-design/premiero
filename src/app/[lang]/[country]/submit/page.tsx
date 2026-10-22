import type { Metadata } from 'next';
import { lang as rootLang } from 'next/root-params';
import { SubmitRelease } from '@/components/Reports';
import { isLang } from '@/lib/regions';
import { translator } from '@/lib/i18n';

const t = async () => { const l = await rootLang(); return translator(isLang(l) ? l : 'en'); };

export async function generateMetadata(): Promise<Metadata> {
  const tr = await t();
  return { title: { absolute: `${tr('sb_title')} · Premiero` }, description: tr('sb_intro') };
}

export default async function Page() {
  const tr = await t();
  return (
    <div className="wrap title-page legal">
      <h1 className="my-h">{tr('sb_title')}</h1>
      <p className="legal-intro">{tr('sb_intro')}</p>
      <SubmitRelease />
    </div>
  );
}
