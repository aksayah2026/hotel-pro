import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { 
  TrendingUp, ArrowUpRight, ArrowDownRight, 
  Banknote, Smartphone, CreditCard, 
  ChevronRight 
} from 'lucide-react-native';
import { Card } from '../../../components/Card';
import { useTheme } from '../../../theme';

interface AdminDashboardProps {
  revenue: any;
  revenueType: string;
  setRevenueType: (t: string) => void;
  fetchRevenue: (t: string) => void;
  data: any;
  occupancyRate: number;
  formatCurrency: (n: number) => string;
  navigation: any;
  formatPastEventDate: (d: string) => string;
  history: any[];
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  revenue, revenueType, setRevenueType, fetchRevenue,
  data, occupancyRate, formatCurrency, navigation,
  formatPastEventDate, history
}) => {
  const { theme } = useTheme();
  const { colors, spacing, fontSize, fontWeight, radius } = theme;

  const modeIcon = (mode: string) => {
    if (mode === 'CASH') return <Banknote size={12} color={colors.textOnPrimary} />;
    if (mode === 'UPI') return <Smartphone size={12} color={colors.textOnPrimary} />;
    return <CreditCard size={12} color={colors.textOnPrimary} />;
  };

  return (
    <View style={{ gap: spacing.lg }}>
      {/* HERO REVENUE CARD */}
      <View style={{
        backgroundColor: colors.primary,
        borderRadius: radius['2xl'],
        padding: spacing.xl,
        ...theme.shadow.lg,
      }}>
        <View style={{ flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: radius.lg, padding: 2, alignSelf: 'flex-start', marginBottom: spacing.lg }}>
          {['today', 'month', 'year'].map(t => (
            <TouchableOpacity 
              key={t}
              onPress={() => {
                setRevenueType(t);
                fetchRevenue(t);
              }}
              style={{
                paddingHorizontal: spacing.md, paddingVertical: 4,
                backgroundColor: revenueType === t ? colors.surface : 'transparent',
                borderRadius: radius.md - 2
              }}>
              <Text style={{ 
                fontSize: 10, fontWeight: fontWeight.bold as any, 
                color: revenueType === t ? colors.primary : colors.textOnPrimary 
              }}>
                {t.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View>
            <Text style={{ fontSize: fontSize.xs, color: colors.textOnPrimary, opacity: 0.8, fontWeight: fontWeight.medium as any }}>
              {revenueType.toUpperCase()} REVENUE
            </Text>
            <Text style={{ fontSize: fontSize['5xl'], fontWeight: fontWeight.extraBold as any, color: colors.textOnPrimary, marginTop: 4 }}>
              {formatCurrency(revenue?.value ?? 0)}
            </Text>
          </View>
          <View style={{
            backgroundColor: 'rgba(255,255,255,0.2)',
            paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full,
            flexDirection: 'row', alignItems: 'center', gap: 4
          }}>
            {(revenue?.change ?? 0) >= 0 ? <ArrowUpRight size={14} color={colors.textOnPrimary} /> : <ArrowDownRight size={14} color={colors.textOnPrimary} />}
            <Text style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold as any, color: colors.textOnPrimary }}>
              {Math.abs(Math.round(revenue?.change ?? 0))}%
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl }}>
          {['CASH', 'UPI', 'CARD'].map(mode => {
            const item = revenue?.modeSplit.find((m: any) => m.mode === mode);
            return (
              <View key={mode} style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                  {modeIcon(mode)}
                  <Text style={{ fontSize: 10, color: colors.textOnPrimary, opacity: 0.7 }}>{mode}</Text>
                </View>
                <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold as any, color: colors.textOnPrimary }}>
                  {formatCurrency(item?.amount ?? 0)}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={{ height: 40, marginTop: spacing.lg, flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
          {revenue?.trend.map((t: any, i: number) => {
            const max = Math.max(...revenue.trend.map((x: any) => x.amount), 1);
            const height = (t.amount / max) * 100;
            return (
              <View key={i} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.3)', height: `${height}%`, borderRadius: 2 }} />
            );
          })}
        </View>
      </View>

      <TouchableOpacity 
        onPress={() => navigation.navigate('RevenueReport')}
        activeOpacity={0.7}
        style={{ 
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', 
          gap: spacing.sm, padding: spacing.md, backgroundColor: colors.surface, 
          borderRadius: radius.lg, borderWidth: 1, borderColor: colors.primary + '30',
          marginTop: -spacing.sm
        }}
      >
        <TrendingUp size={16} color={colors.primary} />
        <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold as any, color: colors.primary }}>
          View Detailed Revenue Report →
        </Text>
      </TouchableOpacity>

      {/* ROOM OVERVIEW */}
      <Card style={{ padding: spacing.xl }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl }}>
          <View>
            <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold as any, color: colors.textPrimary }}>Room Status</Text>
            <Text style={{ fontSize: fontSize.xs, color: colors.textMuted }}>Real-time inventory</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: fontSize['2xl'], fontWeight: fontWeight.extraBold as any, color: colors.primary }}>{occupancyRate}%</Text>
            <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: fontWeight.bold as any }}>OCCUPANCY</Text>
          </View>
        </View>

        <View style={{ height: 12, backgroundColor: colors.divider, borderRadius: 6, overflow: 'hidden', flexDirection: 'row' }}>
          <View style={{ flex: data?.rooms.occupied ?? 0, backgroundColor: colors.occupied }} />
          <View style={{ flex: data?.rooms.available ?? 0, backgroundColor: colors.success }} />
          <View style={{ flex: data?.rooms.cleaning ?? 0, backgroundColor: colors.warning }} />
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xl }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold as any, color: colors.textPrimary }}>{data?.rooms.total}</Text>
            <Text style={{ fontSize: 10, color: colors.textMuted }}>TOTAL</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold as any, color: colors.success }}>{data?.rooms.available}</Text>
            <Text style={{ fontSize: 10, color: colors.textMuted }}>AVAILABLE</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold as any, color: colors.occupied }}>{data?.rooms.occupied}</Text>
            <Text style={{ fontSize: 10, color: colors.textMuted }}>OCCUPIED</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold as any, color: colors.warning }}>{data?.rooms.cleaning}</Text>
            <Text style={{ fontSize: 10, color: colors.textMuted }}>CLEANING</Text>
          </View>
        </View>
      </Card>

      {/* STAY OPERATIONS */}
      <View>
        <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold as any, color: colors.textSecondary, marginBottom: spacing.md }}>
          STAY OPERATIONS
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Card style={{ flex: 1, alignItems: 'center', padding: spacing.md }}>
            <Text style={{ fontSize: fontSize.lg, marginBottom: 4 }}>🏨</Text>
            <Text style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold as any, color: colors.primary }}>{data?.bookings.todayCheckIns}</Text>
            <Text style={{ fontSize: 10, color: colors.textMuted }}>INCOMING</Text>
          </Card>
          <Card style={{ flex: 1, alignItems: 'center', padding: spacing.md }}>
            <Text style={{ fontSize: fontSize.lg, marginBottom: 4 }}>🚪</Text>
            <Text style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold as any, color: '#FF9900' }}>{data?.bookings.todayCheckOuts}</Text>
            <Text style={{ fontSize: 10, color: colors.textMuted }}>OUTGOING</Text>
          </Card>
          <Card style={{ flex: 1, alignItems: 'center', padding: spacing.md }}>
            <Text style={{ fontSize: fontSize.lg, marginBottom: 4 }}>💳</Text>
            <Text style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold as any, color: colors.success }}>{revenue?.modeSplit.length ?? 0}</Text>
            <Text style={{ fontSize: 10, color: colors.textMuted }}>TRANSACTIONS</Text>
          </Card>
        </View>
      </View>

      {/* PAST EVENTS */}
      <View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
          <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold as any, color: colors.textSecondary }}>PAST EVENTS</Text>
          <TouchableOpacity onPress={() => navigation.navigate('PastEvents')}><Text style={{ fontSize: fontSize.xs, color: colors.primary }}>View All →</Text></TouchableOpacity>
        </View>
        <Card padding={0} style={{ overflow: 'hidden' }}>
          {history.map((item: any, idx: number) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => navigation.navigate('BookingDetail', { bookingId: item.id })}
              style={{
                flexDirection: 'row', alignItems: 'center', padding: spacing.md,
                borderBottomWidth: idx === history.length - 1 ? 0 : 1,
                borderBottomColor: colors.divider,
              }}>
              <View style={{ width: 100 }}>
                <Text style={{ fontSize: 10, fontWeight: fontWeight.bold as any, color: colors.textMuted }}>
                  {formatPastEventDate(item.updatedAt as any)}
                </Text>
              </View>
              <View style={{ width: 1, height: 24, backgroundColor: colors.divider, marginHorizontal: spacing.sm }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold as any, color: colors.textPrimary }}>
                  Room {item.bookingRooms?.[0]?.room?.roomNumber || 'N/A'}
                </Text>
                <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary }}>{item.customer?.name}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 2 }}>
                <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold as any, color: colors.success }}>
                  {formatCurrency(Number(item.totalAmount))}
                </Text>
                <View style={{ backgroundColor: colors.success + '15', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10 }}>
                  <Text style={{ fontSize: 8, color: colors.success, fontWeight: fontWeight.bold as any }}>COMPLETED</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </Card>
      </View>
    </View>
  );
};
