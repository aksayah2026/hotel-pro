import api from './api';

export const paymentService = {
  add: (data: { bookingId: string; amount: number; mode: 'CASH' | 'UPI' | 'CARD'; reference?: string; notes?: string }) =>
    api.post('/payments', data),

  getByBooking: (bookingId: string) =>
    api.get(`/payments/booking/${bookingId}`),
};
