import { ApiClient, apiClient } from '@/lib/api-client';
import {
  BookingPageSchema,
  BookingSchema,
  CheckoutBookingSchema,
  type Booking,
  type BookingPage,
  type CheckoutBooking,
  type HoldRequest,
} from './schemas';

const PAGE_SIZE = 20;

export const bookingsApi = {
  create(req: HoldRequest, client: ApiClient = apiClient()): Promise<CheckoutBooking> {
    return client.post<unknown>('/bookings', req).then((r) => CheckoutBookingSchema.parse(r));
  },

  mine(page: number, client: ApiClient = apiClient()): Promise<BookingPage> {
    return client
      .get<unknown>('/bookings/me', { params: { page, limit: PAGE_SIZE } })
      .then((r) => BookingPageSchema.parse(r));
  },

  get(id: number, client: ApiClient = apiClient()): Promise<Booking> {
    return client.get<unknown>(`/bookings/me/${id}`).then((r) => BookingSchema.parse(r));
  },

  cancel(id: number, client: ApiClient = apiClient()): Promise<Booking> {
    return client
      .post<unknown>(`/bookings/me/${id}/cancel`, {})
      .then((r) => BookingSchema.parse(r));
  },

  checkout(id: number, client: ApiClient = apiClient()): Promise<CheckoutBooking> {
    return client
      .post<unknown>(`/bookings/me/${id}/checkout`)
      .then((r) => CheckoutBookingSchema.parse(r));
  },

  refreshPayment(id: number, client: ApiClient = apiClient()): Promise<Booking> {
    return client
      .post<unknown>(`/bookings/me/${id}/refresh-payment`)
      .then((r) => BookingSchema.parse(r));
  },
};
