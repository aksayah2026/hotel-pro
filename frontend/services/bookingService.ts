import api from './api';
import { Room } from './roomService';

export interface Customer {
  name: string;
  mobile: string;
  email?: string;
  aadhaarImage: string;
  address?: string;
}

export interface Payment {
  id: string;
  amount: number;
  mode: 'CASH' | 'UPI' | 'CARD';
  reference?: string;
  paidAt: string;
}

export interface BookingRoom {
  id: string;
  bookingId: string;
  roomId: string;
  room?: Room;
}

export interface Booking {
  id: string;
  bookingNumber: string;
  checkInDate: string;
  checkOutDate: string;
  actualCheckIn?: string;
  actualCheckOut?: string;
  status: 'BOOKED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED';
  roomAmount: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  extraTotal: number;
  paymentStatus: 'PENDING' | 'PARTIAL' | 'PAID';
  specialRequests?: string;
  notes?: string;
  bookingRooms?: BookingRoom[];
  // Legacy single room fallback (for display convenience)
  room?: Room;
  customer?: Customer;
  payments?: Payment[];
  extraCharges?: Array<{ id: string; label: string; amount: number; createdAt: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookingPayload {
  roomIds: string[];
  checkInDate: string;
  checkOutDate: string;
  customer: Customer;
  roomAmount: number;
  discount: number;
  totalAmount: number;
  doCheckIn?: boolean;
  specialRequests?: string;
  notes?: string;
  paymentType: 'ADVANCE' | 'FULL';
  advanceAmount: number;
  paymentMode: 'CASH' | 'UPI' | 'CARD';
  paymentReference?: string;
}

export const bookingService = {
  getAll: (params?: { type?: string; status?: string; page?: number; limit?: number; search?: string; roomId?: string; startDate?: string; endDate?: string; sort?: string; }) =>
    api.get<{ success: boolean; data: Booking[]; pagination: any }>('/bookings', { params }),

  getById: (id: string) =>
    api.get<{ success: boolean; data: Booking }>(`/bookings/${id}`),

  updateExtraCharges: (id: string, extraCharges: Array<{ label: string; amount: number }>) =>
    api.patch<{ success: boolean; data: Booking }>(`/bookings/${id}/extra-charges`, { extraCharges }),

  addExtraCharge: (id: string, label: string, amount: number) =>
    api.post<{ success: boolean; data: any }>(`/bookings/${id}/extra`, { label, amount }),

  create: (data: CreateBookingPayload) =>
    api.post<{ success: boolean; data: Booking }>('/bookings', data),

  checkIn: (id: string) =>
    api.patch<{ success: boolean; data: Booking }>(`/bookings/${id}/checkin`),

  checkOut: (id: string, data: { extraCharges?: Array<{ label: string; amount: number }>; notes?: string; collectAmount?: number; paymentMode?: string; reference?: string }) =>
    api.patch<{ success: boolean; data: Booking }>(`/bookings/${id}/checkout`, data),

  cancel: (id: string) =>
    api.patch(`/bookings/${id}/cancel`),

  uploadAadhaar: async (uri: string) => {
    const formData = new FormData();
    formData.append('aadhaar', {
      uri,
      name: 'aadhaar.jpg',
      type: 'image/jpeg',
    } as any);
    return api.post<{ success: boolean; data: { url: string } }>('/bookings/aadhaar/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
