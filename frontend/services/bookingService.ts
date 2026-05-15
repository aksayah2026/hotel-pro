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
  checkConnectivity: async () => {
    try {
      await api.get('/health', { timeout: 5000 });
      return true;
    } catch (err) {
      console.error('[KYC Upload] Connectivity Check Failed:', err);
      return false;
    }
  },

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
    console.log('[KYC Upload] Initializing Aadhaar upload for URI:', uri);
    const formData = new FormData();
    
    // 1. Sanitize URI and extract filename
    // Android often uses content:// URIs or provides file paths with query params
    const cleanUri = uri.split('?')[0];
    let filename = cleanUri.split('/').pop() || `aadhaar-${Date.now()}.jpg`;
    
    // 2. Dynamically extract extension and detect MIME type
    const extMatch = /\.(\w+)$/.exec(filename);
    const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';
    
    // Support common formats and HEIC/HEIF from newer devices
    let type = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    if (ext === 'heic' || ext === 'heif') {
      type = `image/${ext}`;
    }

    // Ensure filename has an extension for the backend's path.extname to work
    if (!filename.includes('.')) {
      filename = `${filename}.${ext}`;
    }

    console.log('[KYC Upload] Metadata detected:', { filename, ext, type, uri });
    console.log('[KYC Upload] Axios BaseURL:', api.defaults.baseURL);
    console.log('[KYC Upload] Full URL target:', `${api.defaults.baseURL}/bookings/aadhaar/upload`);

    // 3. Construct FormData specifically for React Native Android compatibility
    formData.append('aadhaar', {
      uri: uri, // Use original URI (content:// or file://)
      name: filename,
      type,
    } as any);

    try {
      console.log('[KYC Upload] Sending request...');
      const response = await api.post<{ success: boolean; data: { url: string } }>('/bookings/aadhaar/upload', formData, {
        headers: { 
          'Accept': 'application/json',
          // CRITICAL: Do NOT set 'Content-Type': 'multipart/form-data' manually.
        },
        timeout: 60000, 
      });
      
      console.log('[KYC Upload] Success:', response.data);
      return response;
    } catch (error: any) {
      console.error('[KYC Upload] ERROR DETAILS:', {
        message: error.message,
        code: error.code,
        isAxiosError: error.isAxiosError,
        request: error.request ? 'Request object exists' : 'No request object',
        response: error.response?.data || 'No response data',
        status: error.response?.status,
        url: error.config?.url,
        baseUrl: error.config?.baseURL,
        method: error.config?.method
      });
      
      if (error.message === 'Network Error') {
        console.error('[KYC Upload] Troubleshooting Network Error: Ensure Android Cleartext is enabled and BASE_URL IP is correct.');
      }
      
      const backendMessage = error.response?.data?.message;
      if (backendMessage) {
        throw new Error(backendMessage);
      }
      throw error;
    }
  },
};
