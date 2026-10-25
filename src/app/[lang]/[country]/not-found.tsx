import Link from 'next/link';
import { lang as rootLang, country as rootCountry } from 'next/root-params';
import { isCountry, isLang } from '@/lib/regions';
import { translator } from '@/lib/i18n';

export default async function NotFound() {
  const l = await rootLang(), c = await rootCountry();
  const lang = isLang(l) ? l : 'en';
  const t = translator(lang);
  return (
    <div className="wrap" style={{ paddingBlock: '60px' }}>
      <div className="empty">
        <b>{t('nf_t')}</b>
        <span>{t('nf_s')}</span>
        <Link prefetch={false} className="btn" href={`/${lang}/${isCountry(c) ? c : 'us'}`}>{t('to_cal')}</Link>
      </div>
    </div>
  );
}
