import api from './api';

export interface Tenant {
  id: string;
  businessName: string;
  ownerName: string;
  address: string;
  phoneNumber: string;
  mobile: string;
  isActive?: boolean;
}

export interface User {
  id: string;
  name: string;
  mobile: string;
  role: 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'STAFF';
  isActive: boolean;
  tenantId?: string;
  tenant?: Tenant;
  subscriptionStatus?: 'ACTIVE' | 'EXPIRED';
  expiryDate?: string;
  planName?: string;
  createdAt: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    token: string;
    subscriptionStatus: 'ACTIVE' | 'EXPIRED';
    expiryDate: string | null;
    planName: string | null;
    user: { 
      id: string; 
      name: string; 
      mobile: string; 
      role: User['role'];
      tenantId?: string;
    };
    tenant: Tenant | null;
  };
}

export const authService = {
  login: (mobile: string, password: string) =>
    api.post<LoginResponse>('/auth/login', { mobile, password }),

  getProfile: () => api.get<{ success: boolean; data: User }>('/auth/profile'),

  createUser: (data: Partial<User> & { password?: string }) =>
    api.post('/auth/users', data),

  getAllUsers: () => api.get<{ success: boolean; data: User[] }>('/auth/users'),

  updateUser: (id: string, data: Partial<User> & { password?: string }) =>
    api.put(`/auth/users/${id}`, data),

  deleteUser: (id: string) =>
    api.delete(`/auth/users/${id}`),
};
