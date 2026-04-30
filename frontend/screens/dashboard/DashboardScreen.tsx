import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, RefreshControl,
  TouchableOpacity, StatusBar, Dimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  TrendingUp, BedDouble, LogOut, Settings,
  AlertTriangle, ArrowUpRight, ArrowDownRight,
  Banknote, Smartphone, CreditCard, ChevronRight
} from 'lucide-react-native';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { dashboardService } from '../../services/dashboardService';
import { bookingService, Booking } from '../../services/bookingService';
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
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Live Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchRevenue = async (type: string) => {
    if (!isAdmin) return; // Staff shouldn't fetch revenue
    try {
      const res = await dashboardService.getRevenueAnalytics(type);
      setRevenue(res.data.data);
    } catch (err) {
      console.error('Revenue Fetch Error:', err);
    }
  };

  const fetchAll = useCallback(async () => {
    try {
      const promises: any[] = [
        dashboardService.getStats(),
        bookingService.getAll({ status: 'COMPLETED', limit: 5, sort: 'updatedAt' })
      ];
      
      if (isAdmin) {
        promises.push(dashboardService.getRevenueAnalytics(revenueType));
      }

      const results = await Promise.all(promises);
      setData(results[0].data.data);
      setHistory(results[1].data.data);
      if (isAdmin && results[2]) {
        setRevenue(results[2].data.data);
      }
    } catch (err) {
      console.error('Dashboard Fetch Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [revenueType, isAdmin]);

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [fetchAll])
  );

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

  if (loading) return <Loading message="Syncing intelligence..." />;

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
