import {
  BadgeCheck,
  Ban,
  Banknote,
  CalendarCheck,
  CalendarPlus,
  CalendarX,
  CheckCheck,
  CircleX,
  ClipboardCheck,
  CreditCard,
  DoorOpen,
  Flag,
  Hourglass,
  Play,
  TimerOff,
  Undo2,
  UserX,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { z } from 'zod';
import { formatEventTime } from '@/lib/manila';
import { formatPeso } from '@/lib/money';

const ActionEventTypeSchema = z.enum([
  'HOLD_PLACED',
  'WALK_IN_BOOKED',
  'CLOSURE_CREATED',
  'PAYMENT_STARTED',
  'PAYMENT_SUCCEEDED',
  'PAYMENT_FAILED',
  'PAYMENT_CANCELLED',
  'CONFIRMED',
  'MARKED_PAID',
  'COMPLETED',
  'NO_SHOW',
  'CANCELLED',
  'EXPIRED',
  'REFUNDED',
  'VOIDED',
  'FLAGGED',
  'RESOLVED',
  'REOPENED',
  // Derived by the server on read, never stored.
  'PLAY_STARTED',
  'HOLD_ENDED',
]);

export const ActionEventSchema = z.object({
  id: z.number().nullable(),
  type: ActionEventTypeSchema,
  occurred_at: z.string(),
  actor: z.object({
    kind: z.enum(['STAFF', 'CUSTOMER', 'SYSTEM']),
    name: z.string().nullable(),
  }),
  booking_id: z.number().nullable(),
  reference_code: z.string().nullable(),
  court_name: z.string().nullable(),
  data: z.record(z.string(), z.unknown()),
  derived: z.boolean(),
});

export const ActionEventPageSchema = z.object({
  data: z.array(ActionEventSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  has_more: z.boolean(),
});

export type ActionEvent = z.infer<typeof ActionEventSchema>;
export type EventTone = 'wait' | 'confirmed' | 'done' | 'bad' | 'neutral';

type Look = { title: string; chip: string; tone: EventTone; icon: LucideIcon };

/** Amber waits, blue is booked, green is money in or play done, red is
 * anything that went wrong or was taken back, grey is housekeeping. */
export const EVENT_LOOK: Record<ActionEvent['type'], Look> = {
  HOLD_PLACED: { title: 'Hours held', chip: 'Awaiting payment', tone: 'wait', icon: Hourglass },
  WALK_IN_BOOKED: {
    title: 'Walk-in booked',
    chip: 'Confirmed',
    tone: 'confirmed',
    icon: CalendarPlus,
  },
  CLOSURE_CREATED: { title: 'Court closed', chip: 'Closed', tone: 'neutral', icon: Wrench },
  PAYMENT_STARTED: {
    title: 'Payment started',
    chip: 'Awaiting payment',
    tone: 'wait',
    icon: CreditCard,
  },
  PAYMENT_SUCCEEDED: { title: 'Payment successful', chip: 'Paid', tone: 'done', icon: BadgeCheck },
  PAYMENT_FAILED: { title: 'Payment failed', chip: 'Failed', tone: 'bad', icon: CircleX },
  PAYMENT_CANCELLED: { title: 'Payment cancelled', chip: 'Cancelled', tone: 'bad', icon: Ban },
  CONFIRMED: {
    title: 'Booking confirmed',
    chip: 'Confirmed',
    tone: 'confirmed',
    icon: CalendarCheck,
  },
  MARKED_PAID: { title: 'Payment collected', chip: 'Paid', tone: 'done', icon: Banknote },
  COMPLETED: { title: 'Completed', chip: 'Completed', tone: 'done', icon: CheckCheck },
  NO_SHOW: { title: 'No-show', chip: 'No-show', tone: 'bad', icon: UserX },
  CANCELLED: { title: 'Booking cancelled', chip: 'Cancelled', tone: 'bad', icon: CalendarX },
  EXPIRED: { title: 'Hold expired', chip: 'Expired', tone: 'bad', icon: TimerOff },
  REFUNDED: { title: 'Payment refunded', chip: 'Refunded', tone: 'bad', icon: Undo2 },
  VOIDED: { title: 'Payment voided', chip: 'Voided', tone: 'bad', icon: Undo2 },
  FLAGGED: { title: 'Flagged for review', chip: 'Needs review', tone: 'bad', icon: Flag },
  RESOLVED: { title: 'Resolved', chip: 'Resolved', tone: 'neutral', icon: ClipboardCheck },
  REOPENED: { title: 'Court reopened', chip: 'Reopened', tone: 'neutral', icon: DoorOpen },
  PLAY_STARTED: { title: 'Play started', chip: 'In progress', tone: 'confirmed', icon: Play },
  HOLD_ENDED: { title: 'Hold ended', chip: 'Expired', tone: 'bad', icon: TimerOff },
};

const METHODS: Record<string, string> = {
  CASH: 'Cash',
  MANUAL_GCASH: 'GCash (manual)',
  ONLINE: 'Maya',
};

function str(v: unknown): string | null {
  return typeof v === 'string' && v ? v : null;
}

function peso(v: unknown): string | null {
  return typeof v === 'number' ? formatPeso(v) : null;
}

/** One line under the title, from the event's data — or nothing. */
export function eventDetail(e: ActionEvent): string | null {
  const d = e.data;
  const join = (...xs: (string | null)[]) => xs.filter(Boolean).join(' · ') || null;
  switch (e.type) {
    case 'HOLD_PLACED': {
      const until = str(d.expires_at);
      return join(peso(d.total_centavos), until && `held until ${formatEventTime(until).time}`);
    }
    case 'WALK_IN_BOOKED':
      return str(d.notes) && `Notes: ${str(d.notes)}`;
    case 'CLOSURE_CREATED':
    case 'CANCELLED':
    case 'REOPENED':
    case 'FLAGGED':
      return str(d.reason) && `Reason: ${str(d.reason)}`;
    case 'RESOLVED':
      return str(d.resolution);
    case 'PAYMENT_STARTED':
      return join(peso(d.amount_centavos), 'Maya checkout opened');
    case 'PAYMENT_SUCCEEDED':
      return join(
        peso(d.amount_centavos) && `${peso(d.amount_centavos)} via Maya`,
        d.late === true ? 'after the hold ended' : null,
      );
    case 'MARKED_PAID':
      return join(peso(d.amount_centavos), METHODS[str(d.method) ?? ''] ?? null);
    case 'CONFIRMED':
      return d.late === true ? 'Paid after the hold ended; the hours were still free' : null;
    case 'REFUNDED':
    case 'VOIDED':
      return join(
        peso(d.amount_centavos) && `${peso(d.amount_centavos)} returned`,
        str(d.reference) && `ref ${str(d.reference)}`,
      );
    default:
      return null;
  }
}
