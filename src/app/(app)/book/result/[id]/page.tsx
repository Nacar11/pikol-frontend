'use client';

import { useParams } from 'next/navigation';
import { ResultView } from '@/features/booking';

export default function ResultPage() {
  return <ResultView id={Number(useParams<{ id: string }>().id)} />;
}
