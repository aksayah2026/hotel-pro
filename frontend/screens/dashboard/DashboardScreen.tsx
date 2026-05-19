import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, RefreshControl,
  TouchableOpacity, StatusBar, Dimensions, DeviceEventEmitter
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  TrendingUp, BedDouble, LogOut, Settings, Bell,
  AlertTriangle, ArrowUpRight, ArrowDownRight,
  Banknote, Smartphone, CreditCard, ChevronRight
} from 'lucide-react-native';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { dashboardService } from '../../services/dashboardService';
import { bookingService, Booking } from '../../services/bookingService';
import { notificationService } from '../../services/notificationService';
import { Card } from '../../components/Card';
import { Badge, statusVariant } from '../../components/Badge';
import { Loading } from '../../components/LoadingState';

const { width } = Dimensions.get('window');

interface DashboardData {
  rooms: { total: number; available: number; occupied: number; cleaning: number };
  bookings: { active: number; todayCheckIns: number; todayCheckOuts: number; pendingPayments: number };
}

interface RevenueAnalytics {
  value: number;
  change: number;
  modeSplit: { mode: string; amount: number }[];
  trend: { date: string; amount: number }[];
}

import { AdminDashboard } from './components/AdminDashboard';
import { StaffDashboard } from './components/StaffDashboard';
import { registerForPushNotificationsAsync } from '../../utils/notification';

export default function DashboardScreen() {
  const { theme } = useTheme();
  const { colors, spacing, fontSize, fontWeight, radius } = theme;
   const { user, tenant, logout, refreshUser, isAdmin } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();

  const [data, setData] = useState<DashboardData | null>(null);
  const [revenue, setRevenue] = useState<RevenueAnalytics | null>(null);
  const [revenueType, setRevenueType] = useState('today');
  const [history, setHistory] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [revenueLoading, setRevenueLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const revenueRequestRef = useRef<number>(0);
  const revenueTypeRef = useRef<string>(revenueType);
  const lastFetchedAtRef = useRef<number>(0);

  // Keep revenueTypeRef in sync
  useEffect(() => {
    revenueTypeRef.current = revenueType;
  }, [revenueType]);

  // Live Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Register push notifications on mount
  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  // Listen for real-time notification unread count updates
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('UPDATE_UNREAD_COUNT', (count: number) => {
      setUnreadNotifications(count);
    });
    return () => sub.remove();
  }, []);

  // Listen for real-time dashboard refresh signals from other screens
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('REFRESH_DASHBOARD', () => {
      fetchAll();
    });
    return () => sub.remove();
  }, [fetchAll]);

  const fetchRevenue = async (type: string) => {
    if (!isAdmin) return; // Staff shouldn't fetch revenue
    const requestId = ++revenueRequestRef.current;
    setRevenueLoading(true);
    try {
      const res = await dashboardService.getRevenueAnalytics(type);
      if (requestId === revenueRequestRef.current) {
        setRevenue(res.data.data);
      }
    } catch (err) {
      console.error('Revenue Fetch Error:', err);
    } finally {
      if (requestId === revenueRequestRef.current) {
        setRevenueLoading(false);
      }
    }
  };

  const fetchAll = useCallback(async () => {
    const requestId = ++revenueRequestRef.current;
    setRevenueLoading(true);
    try {
      const promises: any[] = [
        dashboardService.getStats(),
        bookingService.getAll({ type: 'history', limit: 5, sort: 'checkOutDate' }),
        notificationService.getAll(1, 1),
      ];
      
      if (isAdmin) {
        promises.push(dashboardService.getRevenueAnalytics(revenueTypeRef.current));
      }

      const results = await Promise.all(promises);
      setData(results[0].data.data);
      setHistory(results[1].data.data);
      setUnreadNotifications(results[2]?.data?.unreadCount || 0);
      if (isAdmin && results[3] && requestId === revenueRequestRef.current) {
        setRevenue(results[3].data.data);
      }
      lastFetchedAtRef.current = Date.now();
    } catch (err) {
      console.error('Dashboard Fetch Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      if (requestId === revenueRequestRef.current) {
        setRevenueLoading(false);
      }
    }
  }, [isAdmin]);

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [fetchAll])
  );

  // Trigger revenue fetch ONLY when filter tab changes
  useEffect(() => {
    if (!loading) {
      fetchRevenue(revenueType);
    }
  }, [revenueType]);

  useEffect(() => {
    if (route.params?.refresh) {
      fetchAll();
      navigation.setParams({ refresh: undefined });
    }
  }, [route.params?.refresh]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAll();
    refreshUser();
  };

  const occupancyRate = data && data.rooms.total > 0 
    ? Math.round((data.rooms.occupied / data.rooms.total) * 100) 
    : 0;

  const formatCurrency = (n: number) =>
    `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

  const formatClockTime = (date: Date) => {
    return date.toLocaleTimeString('en-IN', { 
      hour: '2-digit', minute: '2-digit', second: '2-digit', 
      hour12: true, timeZone: 'Asia/Kolkata' 
    }).toUpperCase();
  };

  const formatClockDate = (date: Date) => {
    return date.toLocaleDateString('en-IN', { 
      day: 'numeric', month: 'long', year: 'numeric', 
      timeZone: 'Asia/Kolkata' 
    });
  };

  const formatDay = (date: Date) => {
    return date.toLocaleDateString('en-IN', { 
      weekday: 'long', timeZone: 'Asia/Kolkata' 
    });
  };

  const formatPastEventDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const datePart = d.toLocaleDateString('en-IN', { 
      weekday: 'short', day: '2-digit', month: 'short',
      timeZone: 'Asia/Kolkata' 
    });
    const timePart = d.toLocaleTimeString('en-IN', { 
      hour: '2-digit', minute: '2-digit',
      hour12: true, timeZone: 'Asia/Kolkata' 
    });
    return `${datePart} • ${timePart.toUpperCase()}`;
  };

  // Instant shell rendering: only fallback to full-screen loader if essential auth/tenant metadata is missing
  if (loading && !tenant) return <Loading message="Syncing intelligence..." />;

  const getRoleLabel = () => {
    if (user?.role === 'TENANT_ADMIN') return `Owner: ${user.name}`;
    if (user?.role === 'STAFF') return `Staff: ${user.name}`;
    if (user?.role === 'SUPER_ADMIN') return 'System Admin';
    return 'Master Control Unit';
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header - BUG: Handle Notch / Status Bar */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: spacing.base, 
        paddingTop: insets.top + 10,
        paddingBottom: spacing.md,
      }}>
        <View>
          <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold as any, color: colors.primary }}>
            {tenant?.businessName || 'HotelPro Dashboard'}
          </Text>
          <Text style={{ fontSize: fontSize.xs, color: colors.textMuted }}>
            {getRoleLabel()}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Notification')}
            style={{ width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.divider, position: 'relative' }}>
            <Bell size={18} color={colors.textSecondary} />
            {unreadNotifications > 0 && (
              <View style={{
                position: 'absolute', top: -4, right: -4,
                backgroundColor: colors.error, borderRadius: 8,
                minWidth: 16, height: 16, paddingHorizontal: 4,
                justifyContent: 'center', alignItems: 'center'
              }}>
                <Text style={{ fontSize: 9, color: colors.textOnPrimary, fontWeight: 'bold' }}>
                  {unreadNotifications}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          {isAdmin && (
            <TouchableOpacity
              onPress={() => navigation.navigate('Settings')}
              style={{ width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.divider }}>
              <Settings size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={logout}
            style={{ width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.errorBg, justifyContent: 'center', alignItems: 'center' }}>
            <LogOut size={18} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        contentContainerStyle={{ 
          padding: spacing.base, 
          gap: spacing.lg,
          paddingBottom: insets.bottom + 100 // BUG: Prevent content cut at bottom
        }}>

        {/* TIME CARD */}
        <View style={{ alignItems: 'center', gap: 2, paddingVertical: spacing.sm }}>
          <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold as any, color: colors.primary, textTransform: 'uppercase', letterSpacing: 1 }}>
            {formatDay(currentTime)}
          </Text>
          <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.semiBold as any, color: colors.textSecondary }}>
            {formatClockDate(currentTime)}
          </Text>
          <View style={{ 
            marginTop: 4, paddingHorizontal: spacing.lg, paddingVertical: 4, 
            backgroundColor: colors.primary + '10', borderRadius: radius.full 
          }}>
            <Text style={{ fontSize: fontSize['3xl'], fontWeight: fontWeight.extraBold as any, color: colors.primary }}>
              {formatClockTime(currentTime)}
            </Text>
          </View>
        </View>

        {/* ROLE-BASED CONTENT */}
        {user?.role === 'STAFF' ? (
          <StaffDashboard 
            data={data}
            history={history}
            formatPastEventDate={formatPastEventDate}
            navigation={navigation}
            isLoading={loading || !data}
          />
        ) : (
          <AdminDashboard 
            revenue={revenue}
            revenueType={revenueType}
            setRevenueType={setRevenueType}
            fetchRevenue={fetchRevenue}
            data={data}
            occupancyRate={occupancyRate}
            formatCurrency={formatCurrency}
            navigation={navigation}
            formatPastEventDate={formatPastEventDate}
            history={history}
            isLoading={loading || !data}
            isRevenueLoading={(loading && !revenue) || revenueLoading}
          />
        )}

        {/* ALERTS SECTION (SHARED) */}
        {(data?.rooms.cleaning ?? 0) > 0 || (data?.bookings.pendingPayments ?? 0) > 0 ? (
          <View>
            <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold as any, color: colors.textSecondary, marginBottom: spacing.md }}>
              LIVE ALERTS
            </Text>
            <View style={{ gap: spacing.sm }}>
              {(data?.rooms.cleaning ?? 0) > 0 && (
                <View style={{ backgroundColor: colors.warning + '15', padding: spacing.md, borderRadius: radius.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.warning + '30' }}>
                  <AlertTriangle size={20} color={colors.warning} />
                  <Text style={{ fontSize: fontSize.sm, color: colors.warning, fontWeight: fontWeight.bold as any, flex: 1 }}>
                    {data?.rooms.cleaning} rooms need cleaning 🚪
                  </Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Main', { screen: 'Rooms' })}><ChevronRight size={18} color={colors.warning} /></TouchableOpacity>
                </View>
              )}
              {isAdmin && (data?.bookings.pendingPayments ?? 0) > 0 && (
                <View style={{ backgroundColor: '#FFF5E6', padding: spacing.md, borderRadius: radius.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: '#FFE0B3' }}>
                  <AlertTriangle size={20} color="#FF9900" />
                  <Text style={{ fontSize: fontSize.sm, color: '#FF9900', fontWeight: fontWeight.bold as any, flex: 1 }}>
                    {data?.bookings.pendingPayments} pending payments 💳
                  </Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Main', { screen: 'Bookings', params: { type: 'active' } })}><ChevronRight size={18} color="#FF9900" /></TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        ) : null}

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </View>
  );
}
