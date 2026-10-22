import { ApiClient, apiClient } from '@/lib/api-client';
import {
  AdminBookingPageSchema,
  AdminBookingSchema,
  type AdminBooking,
  type AdminBookingPage,
  type ListParams,
  type ManualPaymentMethod,
  type Outcome,
  type WalkInRequest,
} from './schemas';

const DAY_LIMIT = 200;
const PAGE_SIZE = 20;

export const adminBookingsApi = {
  day(venueId: number, date: string, client: ApiClient = apiClient()): Promise<AdminBookingPage> {
    return client
      .get<unknown>('/admin/bookings', {
        params: { venue_id: venueId, date, limit: DAY_LIMIT },
      })
      .then((r) => AdminBookingPageSchema.parse(r));
  },

  list(params: ListParams, client: ApiClient = apiClient()): Promise<AdminBookingPage> {
    return client
      .get<unknown>('/admin/bookings', { params })
      .then((r) => AdminBookingPageSchema.parse(r));
  },

  get(id: number, client: ApiClient = apiClient()): Promise<AdminBooking> {
    return client.get<unknown>(`/admin/bookings/${id}`).then((r) => AdminBookingSchema.parse(r));
  },

  walkIn(req: WalkInRequest, client: ApiClient = apiClient()): Promise<AdminBooking> {
    return client
      .post<unknown>('/admin/bookings/walk-in', req)
      .then((r) => AdminBookingSchema.parse(r));
  },

  cancel(id: number, reason: string, client: ApiClient = apiClient()): Promise<AdminBooking> {
    return client
      .post<unknown>(`/admin/bookings/${id}/cancel`, { reason })
      .then((r) => AdminBookingSchema.parse(r));
  },

  markPaid(
    id: number,
    method: ManualPaymentMethod,
    client: ApiClient = apiClient(),
  ): Promise<AdminBooking> {
    return client
      .post<unknown>(`/admin/bookings/${id}/mark-paid`, { payment_method: method })
      .then((r) => AdminBookingSchema.parse(r));
  },

  outcome(id: number, outcome: Outcome, client: ApiClient = apiClient()): Promise<AdminBooking> {
    return client
      .post<unknown>(`/admin/bookings/${id}/outcome`, { outcome })
      .then((r) => AdminBookingSchema.parse(r));
  },

  resolve(id: number, resolution: string, client: ApiClient = apiClient()): Promise<AdminBooking> {
    return client
      .post<unknown>(`/admin/bookings/${id}/resolve`, { resolution })
      .then((r) => AdminBookingSchema.parse(r));
  },

  unfulfilled(page: number, client: ApiClient = apiClient()): Promise<AdminBookingPage> {
    return client
      .get<unknown>('/admin/bookings/unfulfilled', { params: { page, limit: PAGE_SIZE } })
      .then((r) => AdminBookingPageSchema.parse(r));
  },

  reopenClosure(
    id: number,
    reason: string,
    client: ApiClient = apiClient(),
  ): Promise<AdminBooking> {
    return client
      .post<unknown>(`/admin/closures/${id}/cancel`, { reason })
      .then((r) => AdminBookingSchema.parse(r));
  },
};
