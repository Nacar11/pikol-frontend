import type { Metadata } from 'next';
import { VenueList } from '@/features/catalog';

export const metadata: Metadata = { title: 'Venues · Pikol' };

export default function VenuesPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Venues</h1>
      <VenueList />
    </section>
  );
}
