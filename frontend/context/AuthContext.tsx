import React, { createContext, useContext, useState, useEffect } from 'react';
import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService, User, Tenant } from '../services/authService';

interface AuthContextValue {
  user: User | null;
  tenant: Tenant | null;
  token: string | null;
  subscriptionStatus: 'ACTIVE' | 'EXPIRED' | null;
  expiryDate: string | null;
  planName: string | null;
  isLoading: boolean;
  login: (mobile: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue>({} as AuthContextValue);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser]                             = useState<User | null>(null);
  const [tenant, setTenant]                         = useState<Tenant | null>(null);
  const [token, setToken]                           = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<'ACTIVE' | 'EXPIRED' | null>(null);
  const [expiryDate, setExpiryDate]               = useState<string | null>(null);
  const [planName, setPlanName]                   = useState<string | null>(null);
  const [isLoading, setIsLoading]                   = useState(true);

  useEffect(() => {
    loadStoredAuth();
    
    const subscription = DeviceEventEmitter.addListener('auth_error', () => {
      logout();
    });
    
    return () => subscription.remove();
  }, []);

  const loadStoredAuth = async () => {
    try {
      console.log('[AUTH CONTEXT] Hydrating stored auth state...');
      const storedToken = await AsyncStorage.getItem('auth_token');
      const storedUser  = await AsyncStorage.getItem('auth_user');
      const storedTenant = await AsyncStorage.getItem('auth_tenant');
      const storedSub   = await AsyncStorage.getItem('auth_subscription');
      const storedExpiry = await AsyncStorage.getItem('auth_expiry');
      const storedPlan   = await AsyncStorage.getItem('auth_plan');

      console.log('[AUTH CONTEXT] Hydration results - Token exists:', !!storedToken, 'User exists:', !!storedUser);

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        if (storedTenant) setTenant(JSON.parse(storedTenant));
        if (storedSub) setSubscriptionStatus(storedSub as any);
        if (storedExpiry) setExpiryDate(storedExpiry);
        if (storedPlan) setPlanName(storedPlan);
        
        console.log('[AUTH CONTEXT] Stored credentials loaded. Refreshing user profile...');
        refreshUser();
      }
    } catch (err) {
      console.log('[AUTH CONTEXT] Hydration error:', err);
    } finally {
      setIsLoading(false);
      console.log('[AUTH CONTEXT] Hydration complete, isLoading set to false.');
    }
  };

  const login = async (mobile: string, password: string) => {
    console.log('[AUTH CONTEXT] login() called for mobile:', mobile);
    const res = await authService.login(mobile, password);
    const { token: t, user: u, tenant: ten, subscriptionStatus: sub, expiryDate: exp, planName: pl } = res.data.data;
    
    console.log('[AUTH CONTEXT] Login API succeeded. Writing credentials to AsyncStorage...');
    await AsyncStorage.setItem('auth_token', t);
    await AsyncStorage.setItem('auth_user', JSON.stringify(u));
    if (ten) await AsyncStorage.setItem('auth_tenant', JSON.stringify(ten));
    await AsyncStorage.setItem('auth_subscription', sub);
    if (exp) await AsyncStorage.setItem('auth_expiry', exp);
    if (pl) await AsyncStorage.setItem('auth_plan', pl);

    console.log('[AUTH CONTEXT] AsyncStorage written successfully. Setting React state...');
    setToken(t);
    setUser(u as any);
    setTenant(ten);
    setSubscriptionStatus(sub);
    setExpiryDate(exp);
    setPlanName(pl);
  };

  const logout = async () => {
    console.log('[LOGOUT TRIGGERED] logout() context method invoked');
    console.log('[ASYNC STORAGE CLEARED] Wiping auth credentials from storage');
    
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('auth_user');
    await AsyncStorage.removeItem('auth_tenant');
    await AsyncStorage.removeItem('auth_subscription');
    await AsyncStorage.removeItem('auth_expiry');
    await AsyncStorage.removeItem('auth_plan');
    
    setToken(null);
    setUser(null);
    setTenant(null);
    setSubscriptionStatus(null);
    setExpiryDate(null);
    setPlanName(null);
    console.log('[AUTH CONTEXT] logout() complete. State reset successfully.');
  };

  const refreshUser = async () => {
    try {
      const res = await authService.getProfile();
      const { subscriptionStatus: sub, expiryDate: exp, planName: pl, ...u } = res.data.data;
      
      await AsyncStorage.setItem('auth_user', JSON.stringify(u));
      await AsyncStorage.setItem('auth_subscription', sub || '');
      if (exp) await AsyncStorage.setItem('auth_expiry', exp);
      if (pl) await AsyncStorage.setItem('auth_plan', pl);
      if (u.tenant) await AsyncStorage.setItem('auth_tenant', JSON.stringify(u.tenant));

      setUser(u as any);
      setSubscriptionStatus(sub as any);
      setExpiryDate(exp || null);
      setPlanName(pl || null);
      if (u.tenant) setTenant(u.tenant);
    } catch (_) {}
  };

  const isAdmin = user?.role === 'TENANT_ADMIN' || user?.role === 'SUPER_ADMIN';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <AuthContext.Provider value={{ 
        user, tenant, token, subscriptionStatus, expiryDate, planName, isLoading, 
        login, logout, refreshUser, 
        isAdmin, isSuperAdmin 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
