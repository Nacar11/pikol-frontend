import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Venues · Pikol' };

// Phase 7 replaces this with venue list → courts → availability grid → book.
export default function VenuesPage() {
  return (
    <section className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight">Venues</h1>
      <p className="text-sm text-muted-foreground">
        Browsing venues and booking courts arrives in the next release.
      </p>
    </section>
  );
}
