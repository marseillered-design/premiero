import CalendarPage, { calendarMetadata } from '@/components/CalendarPage';

export function generateMetadata() {
  return calendarMetadata('movies');
}

export default function Page() {
  return <CalendarPage section="movies" />;
}
