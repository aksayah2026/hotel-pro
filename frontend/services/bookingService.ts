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
    
    // 1. Validate that selected image URI is not null or undefined
    if (!uri) {
      console.error('[KYC Upload] Validation Failed: Image URI is null or undefined.');
      throw new Error('Image URI is required for Aadhaar upload.');
    }

    // 2. Sanitize URI and extract filename
    const cleanUri = uri.split('?')[0];
    let filename = cleanUri.split('/').pop() || `aadhaar-${Date.now()}.jpg`;
    
    // 3. Dynamically extract extension and detect MIME type
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

    // 4. Perform comprehensive FormData validation logging
    console.log('[KYC Upload] FormData Validation:', {
      uri: uri,
      cleanUri: cleanUri,
      filename: filename,
      extension: ext,
      mimeType: type,
      isValidMime: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(type.toLowerCase()),
    });

    // 5. Construct FormData specifically for React Native Android compatibility
    const formData = new FormData();
    formData.append('aadhaar', {
      uri: uri, // Use original URI (content:// or file://)
      name: filename,
      type,
    } as any);

    const targetUrl = `${api.defaults.baseURL}/bookings/aadhaar/upload`;
    console.log('[KYC Upload] Target URL:', targetUrl);

    try {
      console.log('[KYC Upload] Sending request to backend...');
      const response = await api.post<{ success: boolean; data: { url: string } }>('/bookings/aadhaar/upload', formData, {
        headers: { 
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data', // Proper multipart header as requested
        },
        timeout: 60000, 
      });
      
      console.log('[KYC Upload] Upload successful! Response:', response.data);
      return response;
    } catch (error: any) {
      console.error('[KYC Upload] CRITICAL ERROR OCCURRED!');
      console.error('- File URI:', uri);
      console.error('- Target Request URL:', targetUrl);
      
      if (error.response) {
        // The server responded with a status code outside the 2xx range
        console.error('- Response Status:', error.response.status);
        console.error('- Response Headers:', error.response.headers);
        console.error('- Response Data:', JSON.stringify(error.response.data));
      } else if (error.request) {
        // The request was made but no response was received (e.g. ERR_NETWORK)
        console.error('- Network/No-Response Error (Request initiated, but no response received):', error.request);
        if (error.message) {
          console.error('- Network Error Message:', error.message);
        }
        console.error('[KYC Upload Guide] Troubleshooting Network Error:\n' +
          '1. Ensure your physical phone is connected to the SAME WiFi network as your backend PC.\n' +
          '2. Ensure Android cleartext traffic usesCleartextTraffic is true in app.json.\n' +
          '3. Check that backend port 5000 is allowed through the firewall on your PC.\n' +
          '4. Verify access in your mobile browser at: ' + api.defaults.baseURL.replace('/api', '/health'));
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('- Request Setup/Axios Config Error:', error.message);
      }
      
      const backendMessage = error.response?.data?.message;
      if (backendMessage) {
        throw new Error(backendMessage);
      }
      throw error;
    }
  },
};
