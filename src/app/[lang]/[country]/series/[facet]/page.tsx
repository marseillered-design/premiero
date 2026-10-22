import FacetPage, { facetMetadata } from '@/components/FacetPage';

export function generateMetadata({ params }: PageProps<'/[lang]/[country]/series/[facet]'>) {
  return facetMetadata('series', params);
}

export default function Page({ params }: PageProps<'/[lang]/[country]/series/[facet]'>) {
  return <FacetPage section="series" params={params} />;
}
