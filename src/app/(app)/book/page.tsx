import { PageHeader } from '@/components/layout/page-header';
import { VenueCards } from '@/features/booking';

export default function BookPage() {
  return (
    <>
      <PageHeader
        section="Book"
        title="Book a court"
        description="Pick a venue, then the hours you want. You pay for them together."
      />
      <VenueCards />
    </>
  );
}
