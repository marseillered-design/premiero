import type { Metadata } from 'next';
import { lang as rootLang } from 'next/root-params';
import { LOCALE, isLang } from '@/lib/regions';
import { PRIVACY, PRIVACY_UPDATED } from '@/lib/privacy';
import { CONTACT_EMAIL } from '@/lib/about';
import type { Lang } from '@/lib/types';

const current = async (): Promise<Lang> => { const l = await rootLang(); return isLang(l) ? l : 'en'; };

export async function generateMetadata(): Promise<Metadata> {
  const p = PRIVACY[await current()];
  return { title: { absolute: `${p.title} · Premiero` }, description: p.intro };
}

export default async function Page() {
  const lang = await current();
  const p = PRIVACY[lang];
  const updated = new Intl.DateTimeFormat(LOCALE[lang], { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(PRIVACY_UPDATED));
  return (
    <div className="wrap title-page legal">
      <h1 className="my-h">{p.title}</h1>
      <p className="legal-intro">{p.intro}</p>
      {p.sections.map(s => (
        <section className="sec" key={s.h}>
          <h2>{s.h}</h2>
          {s.p.map((x, i) => { const [before, after] = x.split('{email}'); return <p key={i}>{before}{after !== undefined && <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>}{after}</p>; })}
        </section>
      ))}
      <p className="legal-date">{p.updated}: {updated}</p>
    </div>
  );
}
