import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { 
  BedDouble, LogIn, LogOut, Brush, 
  AlertTriangle, ChevronRight, PlusCircle, 
  Clock, History
} from 'lucide-react-native';
import { Card } from '../../../components/Card';
import { useTheme } from '../../../theme';
import { Skeleton } from '../../../components/Skeleton';

interface StaffDashboardProps {
  data: any;
  history: any[];
  formatPastEventDate: (d: string) => string;
  navigation: any;
  isLoading?: boolean;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = React.memo(({
  data, history, formatPastEventDate, navigation, isLoading = false
}) => {
  const { theme } = useTheme();
  const { colors, spacing, fontSize, fontWeight, radius } = theme;

  const quickActions = [
    { label: 'New Booking', icon: PlusCircle, color: colors.primary, screen: 'SelectDates' },
    { label: 'Check-in', icon: LogIn, color: colors.success, screen: 'Bookings', params: { activeTab: 'BOOKED' } },
    { label: 'Check-out', icon: LogOut, color: '#FF9900', screen: 'Bookings', params: { activeTab: 'CHECKED_IN' } },
    { label: 'Mark Cleaning', icon: Brush, color: colors.warning, screen: 'Rooms' },
  ];

  return (
    <View style={{ gap: spacing.lg }}>
      {/* QUICK ACTIONS */}
      <View>
        <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold as any, color: colors.textSecondary, marginBottom: spacing.md }}>
          QUICK ACTIONS
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
          {quickActions.map((action, i) => (
            <TouchableOpacity
              key={i}
              disabled={isLoading}
              onPress={() => navigation.navigate(action.screen, action.params)}
              style={{
                width: '47%',
                backgroundColor: colors.surface,
                padding: spacing.lg,
                borderRadius: radius.xl,
                alignItems: 'center',
                gap: spacing.sm,
                borderWidth: 1,
                borderColor: colors.divider,
                ...theme.shadow.sm,
              }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: action.color + '15', justifyContent: 'center', alignItems: 'center' }}>
                <action.icon size={20} color={action.color} />
              </View>
              <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold as any, color: colors.textPrimary }}>
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* TODAY TASKS */}
      <View>
        <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold as any, color: colors.textSecondary, marginBottom: spacing.md }}>
          TODAY TASKS
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
           <Card style={{ flex: 1, alignItems: 'center', padding: spacing.md, borderLeftWidth: 4, borderLeftColor: colors.primary }}>
              {isLoading ? (
                <Skeleton width={40} height={24} borderRadius={4} style={{ marginBottom: 4 }} />
              ) : (
                <Text style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold as any, color: colors.primary }}>{data?.bookings.todayCheckIns}</Text>
              )}
              <Text style={{ fontSize: 10, color: colors.textMuted }}>INCOMING</Text>
           </Card>
           <Card style={{ flex: 1, alignItems: 'center', padding: spacing.md, borderLeftWidth: 4, borderLeftColor: '#FF9900' }}>
              {isLoading ? (
                <Skeleton width={40} height={24} borderRadius={4} style={{ marginBottom: 4 }} />
              ) : (
                <Text style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold as any, color: '#FF9900' }}>{data?.bookings.todayCheckOuts}</Text>
              )}
              <Text style={{ fontSize: 10, color: colors.textMuted }}>OUTGOING</Text>
           </Card>
           <Card style={{ flex: 1, alignItems: 'center', padding: spacing.md, borderLeftWidth: 4, borderLeftColor: colors.warning }}>
              {isLoading ? (
                <Skeleton width={40} height={24} borderRadius={4} style={{ marginBottom: 4 }} />
              ) : (
                <Text style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold as any, color: colors.warning }}>{data?.rooms.cleaning}</Text>
              )}
              <Text style={{ fontSize: 10, color: colors.textMuted }}>CLEANING</Text>
           </Card>
        </View>
      </View>

      {/* ROOM STATUS SUMMARY */}
      <Card style={{ padding: spacing.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}>
            <BedDouble size={20} color={colors.primary} />
            <View style={{ flex: 1, marginRight: spacing.sm }}>
              <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold as any, color: colors.textPrimary }}>Room Status</Text>
              {isLoading ? (
                <Skeleton width={180} height={12} borderRadius={4} style={{ marginTop: 4 }} />
              ) : (
                <Text style={{ fontSize: fontSize.xs, color: colors.textMuted }}>{data?.rooms.available} available / {data?.rooms.occupied} occupied</Text>
              )}
            </View>
          </View>
          <TouchableOpacity disabled={isLoading} onPress={() => navigation.navigate('Rooms')}>
            <Text style={{ fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.bold as any }}>View All</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* RECENT ACTIVITY */}
      <View>
         <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
            <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold as any, color: colors.textSecondary }}>RECENT ACTIVITIES</Text>
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
                  <Skeleton width={60} height={12} borderRadius={4} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Skeleton width={110} height={16} borderRadius={4} />
                    <Skeleton width={130} height={12} borderRadius={4} />
                  </View>
                  <Skeleton width={60} height={14} borderRadius={8} />
                </View>
              ))
            ) : (
              history.map((item, idx) => (
                <View
                  key={item.id}
                  style={{
                    flexDirection: 'row', alignItems: 'center', padding: spacing.md,
                    borderBottomWidth: idx === history.length - 1 ? 0 : 1,
                    borderBottomColor: colors.divider,
                  }}>
                  <View style={{ width: 80 }}>
                    <Text style={{ fontSize: 9, fontWeight: fontWeight.bold as any, color: colors.textMuted }}>
                       {formatPastEventDate(item.eventDate as any).split('•')[1]}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                     <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold as any, color: colors.textPrimary }}>
                       Room {item.bookingRooms?.[0]?.room?.roomNumber || 'N/A'}
                     </Text>
                     <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary }}>{item.customer?.name}</Text>
                  </View>
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
              ))
            )}
            {!isLoading && history.length === 0 && (
              <View style={{ padding: spacing.xl, alignItems: 'center' }}>
                <Text style={{ fontSize: fontSize.xs, color: colors.textMuted }}>No recent activity</Text>
              </View>
            )}
         </Card>
      </View>
    </View>
  );
});
