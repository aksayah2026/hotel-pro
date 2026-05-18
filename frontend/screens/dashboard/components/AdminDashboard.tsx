import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { 
  TrendingUp, ArrowUpRight, ArrowDownRight, 
  Banknote, Smartphone, CreditCard, 
  ChevronRight 
} from 'lucide-react-native';
import { Card } from '../../../components/Card';
import { useTheme } from '../../../theme';
import { Skeleton } from '../../../components/Skeleton';

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
  isLoading?: boolean;
  isRevenueLoading?: boolean;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = React.memo(({
  revenue, revenueType, setRevenueType, fetchRevenue,
  data, occupancyRate, formatCurrency, navigation,
  formatPastEventDate, history, isLoading = false,
  isRevenueLoading = false
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
              disabled={isRevenueLoading}
              onPress={() => {
                setRevenueType(t);
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
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: fontSize.xs, color: colors.textOnPrimary, opacity: 0.8, fontWeight: fontWeight.medium as any }}>
              {revenueType === 'today' ? "TODAY'S REVENUE" : revenueType === 'month' ? "MONTHLY REVENUE" : "YEARLY REVENUE"}
            </Text>
            {isRevenueLoading ? (
              <Skeleton width={160} height={36} borderRadius={8} style={{ marginTop: 8, backgroundColor: 'rgba(255,255,255,0.2)' }} />
            ) : (
              <Text style={{ fontSize: fontSize['5xl'], fontWeight: fontWeight.extraBold as any, color: colors.textOnPrimary, marginTop: 4 }}>
                {formatCurrency(revenue?.value ?? 0)}
              </Text>
            )}
          </View>
          {!isRevenueLoading && revenue?.change !== undefined && (
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
          )}
        </View>

        {isRevenueLoading ? (
          <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl }}>
            <Skeleton width="28%" height={32} borderRadius={6} style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
            <Skeleton width="28%" height={32} borderRadius={6} style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
            <Skeleton width="28%" height={32} borderRadius={6} style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl }}>
            {['CASH', 'UPI', 'CARD'].map(mode => {
              const item = revenue?.modeSplit?.find((m: any) => m.mode === mode);
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
        )}

        {isRevenueLoading ? (
          <View style={{ height: 40, marginTop: spacing.lg, flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} width="10%" height="100%" borderRadius={2} style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
            ))}
          </View>
        ) : (
          <View style={{ height: 40, marginTop: spacing.lg, flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
            {revenue?.trend?.map((t: any, i: number) => {
              const max = Math.max(...(revenue.trend.map((x: any) => x.amount) || [1]), 1);
              const height = (t.amount / max) * 100;
              return (
                <View key={i} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.3)', height: `${height}%`, borderRadius: 2 }} />
              );
            })}
          </View>
        )}
      </View>

      <TouchableOpacity 
        disabled={isRevenueLoading}
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
            <Text style={{ fontSize: fontSize.xs, color: colors.textMuted }}>Real-time Inventory</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            {isLoading ? (
              <Skeleton width={60} height={28} borderRadius={6} />
            ) : (
              <Text style={{ fontSize: fontSize['2xl'], fontWeight: fontWeight.extraBold as any, color: colors.primary }}>{occupancyRate}%</Text>
            )}
            <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: fontWeight.bold as any }}>OCCUPANCY</Text>
          </View>
        </View>

        {isLoading ? (
          <Skeleton width="100%" height={12} borderRadius={6} />
        ) : (
          <View style={{ height: 12, backgroundColor: colors.divider, borderRadius: 6, overflow: 'hidden', flexDirection: 'row' }}>
            <View style={{ flex: data?.rooms.occupied ?? 0, backgroundColor: colors.occupied }} />
            <View style={{ flex: data?.rooms.available ?? 0, backgroundColor: colors.success }} />
            <View style={{ flex: data?.rooms.cleaning ?? 0, backgroundColor: colors.warning }} />
          </View>
        )}

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xl }}>
          <View style={{ alignItems: 'center' }}>
            {isLoading ? (
              <Skeleton width={40} height={20} borderRadius={4} style={{ marginBottom: 4 }} />
            ) : (
              <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold as any, color: colors.textPrimary }}>{data?.rooms.total}</Text>
            )}
            <Text style={{ fontSize: 10, color: colors.textMuted }}>TOTAL</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            {isLoading ? (
              <Skeleton width={40} height={20} borderRadius={4} style={{ marginBottom: 4 }} />
            ) : (
              <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold as any, color: colors.success }}>{data?.rooms.available}</Text>
            )}
            <Text style={{ fontSize: 10, color: colors.textMuted }}>AVAILABLE</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            {isLoading ? (
              <Skeleton width={40} height={20} borderRadius={4} style={{ marginBottom: 4 }} />
            ) : (
              <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold as any, color: colors.occupied }}>{data?.rooms.occupied}</Text>
            )}
            <Text style={{ fontSize: 10, color: colors.textMuted }}>OCCUPIED</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            {isLoading ? (
              <Skeleton width={40} height={20} borderRadius={4} style={{ marginBottom: 4 }} />
            ) : (
              <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold as any, color: colors.warning }}>{data?.rooms.cleaning}</Text>
            )}
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
            {isLoading ? (
              <Skeleton width={40} height={24} borderRadius={4} style={{ marginBottom: 4 }} />
            ) : (
              <Text style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold as any, color: colors.primary }}>{data?.bookings.todayCheckIns}</Text>
            )}
            <Text style={{ fontSize: 10, color: colors.textMuted }}>INCOMING</Text>
          </Card>
          <Card style={{ flex: 1, alignItems: 'center', padding: spacing.md }}>
            <Text style={{ fontSize: fontSize.lg, marginBottom: 4 }}>🚪</Text>
            {isLoading ? (
              <Skeleton width={40} height={24} borderRadius={4} style={{ marginBottom: 4 }} />
            ) : (
              <Text style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold as any, color: '#FF9900' }}>{data?.bookings.todayCheckOuts}</Text>
            )}
            <Text style={{ fontSize: 10, color: colors.textMuted }}>OUTGOING</Text>
          </Card>
          <Card style={{ flex: 1, alignItems: 'center', padding: spacing.md }}>
            <Text style={{ fontSize: fontSize.lg, marginBottom: 4 }}>💳</Text>
            {isLoading ? (
              <Skeleton width={40} height={24} borderRadius={4} style={{ marginBottom: 4 }} />
            ) : (
              <Text style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold as any, color: colors.success }}>{data?.bookings.transactions ?? 0}</Text>
            )}
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
          {isLoading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <View
                key={idx}
                style={{
                  flexDirection: 'row', alignItems: 'center', padding: spacing.md,
                  borderBottomWidth: idx === 2 ? 0 : 1,
                  borderBottomColor: colors.divider,
                  gap: spacing.md
                }}>
                <Skeleton width={70} height={14} borderRadius={4} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Skeleton width={100} height={16} borderRadius={4} />
                  <Skeleton width={140} height={12} borderRadius={4} />
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Skeleton width={50} height={16} borderRadius={4} />
                  <Skeleton width={60} height={14} borderRadius={8} />
                </View>
              </View>
            ))
          ) : (
            history.map((item: any, idx: number) => (
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
                    {formatPastEventDate(item.eventDate as any)}
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
                  <Text style={{ 
                    fontSize: fontSize.sm, 
                    fontWeight: fontWeight.bold as any, 
                    color: item.status === 'CANCELLED' ? colors.error : colors.success 
                  }}>
                    {formatCurrency(Number(item.totalAmount))}
                  </Text>
                  <View style={{ 
                    backgroundColor: item.status === 'CANCELLED' ? colors.error + '15' : colors.success + '15', 
                    paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10 
                  }}>
                    <Text style={{ 
                      fontSize: 8, 
                      color: item.status === 'CANCELLED' ? colors.error : colors.success, 
                      fontWeight: fontWeight.bold as any 
                    }}>
                      {item.status}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
          {!isLoading && history.length === 0 && (
            <View style={{ padding: spacing.xl, alignItems: 'center' }}>
              <Text style={{ fontSize: fontSize.xs, color: colors.textMuted }}>No past events</Text>
            </View>
          )}
        </Card>
      </View>
    </View>
  );
});
