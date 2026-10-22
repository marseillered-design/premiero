import FacetPage, { facetMetadata } from '@/components/FacetPage';

export function generateMetadata({ params }: PageProps<'/[lang]/[country]/movies/[facet]'>) {
  return facetMetadata('movies', params);
}

export default function Page({ params }: PageProps<'/[lang]/[country]/movies/[facet]'>) {
  return <FacetPage section="movies" params={params} />;
}
