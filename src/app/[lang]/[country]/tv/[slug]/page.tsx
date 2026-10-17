import TitlePage, { titleMetadata } from '@/components/TitlePage';

export function generateMetadata({ params }: PageProps<'/[lang]/[country]/tv/[slug]'>) {
  return titleMetadata('tv', params);
}

export default function Page({ params }: PageProps<'/[lang]/[country]/tv/[slug]'>) {
  return <TitlePage media="tv" params={params} />;
}
