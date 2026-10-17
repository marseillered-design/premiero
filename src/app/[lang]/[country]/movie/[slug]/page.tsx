import TitlePage, { titleMetadata } from '@/components/TitlePage';

export function generateMetadata({ params }: PageProps<'/[lang]/[country]/movie/[slug]'>) {
  return titleMetadata('movie', params);
}

export default function Page({ params }: PageProps<'/[lang]/[country]/movie/[slug]'>) {
  return <TitlePage media="movie" params={params} />;
}
