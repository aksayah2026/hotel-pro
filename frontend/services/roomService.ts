import api from './api';

export interface RoomType {
  id: string;
  name: string;
}

export interface Amenity {
  id: string;
  name: string;
}

export interface Room {
  id: string;
  roomNumber: string;
  typeId: string;
  roomType: RoomType;
  floor: number;
  capacity: number;
  baseTariff: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'CLEANING' | 'MAINTENANCE';
  amenities: Amenity[];
  description?: string;
  isActive: boolean;
}

export const roomService = {
  getAll: (params?: { status?: string; type?: string }) =>
    api.get<{ success: boolean; data: Room[] }>('/rooms', { params }),

  getAvailable: (checkIn: string, checkOut: string) =>
    api.get<{ success: boolean; data: Room[] }>('/rooms/available', {
      params: { checkIn, checkOut },
    }),

  getById: (id: string) =>
    api.get<{ success: boolean; data: Room }>(`/rooms/${id}`),

  create: (data: any) =>
    api.post<{ success: boolean; data: Room }>('/rooms', data),

  update: (id: string, data: any) =>
    api.put<{ success: boolean; data: Room }>(`/rooms/${id}`, data),

  updateStatus: (id: string, status: Room['status']) =>
    api.patch(`/rooms/${id}/status`, { status }),

  delete: (id: string) =>
    api.delete(`/rooms/${id}`),

  // Room Types
  getTypes: () => api.get<{ success: boolean; data: RoomType[] }>('/room-types'),
  createType: (name: string) => api.post('/room-types', { name }),
  deleteType: (id: string) => api.delete(`/room-types/${id}`),

  // Amenities
  getAmenities: () => api.get<{ success: boolean; data: Amenity[] }>('/amenities'),
  createAmenity: (name: string) => api.post('/amenities', { name }),
  deleteAmenity: (id: string) => api.delete(`/amenities/${id}`),
};
