import FacetPage, { facetMetadata } from '@/components/FacetPage';

export function generateMetadata({ params }: PageProps<'/[lang]/[country]/games/[facet]'>) {
  return facetMetadata('games', params);
}

export default function Page({ params }: PageProps<'/[lang]/[country]/games/[facet]'>) {
  return <FacetPage section="games" params={params} />;
}
