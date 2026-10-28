import { ApiClient, apiClient } from '@/lib/api-client';
import { ActionEventPageSchema } from '@/features/bookings';
import type { Page } from '@/lib/page';
import { CheckoutPageSchema, CheckoutSchema, type Checkout, type CheckoutItem } from './schemas';

const BASE = '/checkouts/me';

/** The same customer API the mobile app uses — no web-only shortcuts. */
export const checkoutApi = {
  /** Pay now: holds every hour, all or nothing. */
  create(items: CheckoutItem[], client: ApiClient = apiClient()): Promise<Checkout> {
    return client.post<unknown>(BASE, { items }).then((r) => CheckoutSchema.parse(r));
  },
  list(page: number, client: ApiClient = apiClient()): Promise<Page<Checkout>> {
    return client
      .get<unknown>(BASE, { params: { page, limit: 20 } })
      .then((r) => CheckoutPageSchema.parse(r));
  },
  get(id: number, client: ApiClient = apiClient()): Promise<Checkout> {
    return client.get<unknown>(`${BASE}/${id}`).then((r) => CheckoutSchema.parse(r));
  },
  /** The tracker: this payment's events, without staff names. */
  events(id: number, client: ApiClient = apiClient()) {
    return client.get<unknown>(`${BASE}/${id}/events`).then((r) => ActionEventPageSchema.parse(r));
  },
  /** Continue to Maya: the same session on every call. */
  pay(id: number, client: ApiClient = apiClient()): Promise<Checkout> {
    return client.post<unknown>(`${BASE}/${id}/pay`).then((r) => CheckoutSchema.parse(r));
  },
  cancel(id: number, client: ApiClient = apiClient()): Promise<Checkout> {
    return client.post<unknown>(`${BASE}/${id}/cancel`).then((r) => CheckoutSchema.parse(r));
  },
  /** Check again: the server asks Maya, never trusting the redirect. */
  refresh(id: number, client: ApiClient = apiClient()): Promise<Checkout> {
    return client
      .post<unknown>(`${BASE}/${id}/refresh-payment`)
      .then((r) => CheckoutSchema.parse(r));
  },
};
