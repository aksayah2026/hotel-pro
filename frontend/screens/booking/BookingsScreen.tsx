import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  RefreshControl, StatusBar, Alert, Modal, TextInput, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Calendar, Plus, LogIn, XCircle, CreditCard, LogOut, Eye, Phone, User, Search, Filter, X } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { bookingService, Booking } from '../../services/bookingService';
import { Card } from '../../components/Card';
import { Badge, statusVariant } from '../../components/Badge';
import { Button } from '../../components/Button';
import { EmptyState, Loading } from '../../components/LoadingState';
import { formatDisplayShort, formatLocalDate, formatDisplayDate } from '../../utils/date';

const FILTERS = ['ALL', 'BOOKED', 'CHECKED_IN'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WEEKDAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

export default function BookingsScreen() {
  const { theme } = useTheme();
  const { colors, spacing, fontSize, fontWeight, radius } = theme;
  const navigation = useNavigation<any>();

  const [bookings,  setBookings]  = useState<Booking[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Search & Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [pickerType, setPickerType] = useState<'in' | 'out' | null>(null);
  const [tempDate, setTempDate] = useState(new Date());
  const [checkInFrom, setCheckInFrom] = useState('');
  const [checkOutTo, setCheckOutTo] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchBookings = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (pageNum === 1 && !refreshing) setLoading(true);
      if (pageNum > 1) setLoadingMore(true);

      const params: any = { type: 'active', page: pageNum, limit: 10 };
      if (activeFilter !== 'ALL') params.status = activeFilter;
      if (debouncedSearch) params.search = debouncedSearch;
      if (checkInFrom) params.checkInFrom = checkInFrom;
      if (checkOutTo) params.checkOutTo = checkOutTo;

      const res = await bookingService.getAll(params);
      const { data: newData, pagination } = res.data;
      
      setBookings(prev => append ? [...prev, ...newData] : newData);
      setPage(pagination.page);
      setHasMore(pagination.page < pagination.pages);
    } catch (_) {
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [activeFilter, debouncedSearch, checkInFrom, checkOutTo, refreshing]);

  const onRefresh = () => {
     setRefreshing(true);
     fetchBookings(1, false);
  };

  const loadMore = () => {
    if (loadingMore || !hasMore || loading) return;
    fetchBookings(page + 1, true);
  };

  // Reset and fetch when filters change
  useEffect(() => {
    fetchBookings(1, false);
  }, [activeFilter, debouncedSearch, checkInFrom, checkOutTo]);

  useFocusEffect(
    useCallback(() => {
      // Refresh visible page on focus
      fetchBookings(1, false);
    }, [fetchBookings])
  );

  const clearFilters = () => {
    setCheckInFrom('');
    setCheckOutTo('');
    setShowFilters(false);
  };

  const formatDate = (d: string) => {
    if (!d) return '';
    return formatDisplayDate(d);
  };

  const isToday = (d: string) => {
    const t = new Date(); t.setHours(0,0,0,0);
    const c = new Date(d); c.setHours(0,0,0,0);
    return t.getTime() === c.getTime();
  };

  const handleQuickCheckIn = (id: string, checkInDate: string) => {
    if (!isToday(checkInDate)) {
      Alert.alert('Not Allowed', 'Check-in is only possible on the check-in date.');
      return;
    }
    Alert.alert('Check-In Guest', 'Are you sure you want to check-in this guest?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Yes, Check-In', onPress: async () => {
         try {
           setActionLoading(true);
           await bookingService.checkIn(id);
           fetchBookings();
         } catch (e: any) {
           Alert.alert('Error', e?.response?.data?.message || 'Check-in failed');
         } finally {
           setActionLoading(false);
         }
      }}
    ]);
  };

  const handleQuickCancel = (id: string) => {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
         try {
           setActionLoading(true);
           await bookingService.cancel(id);
           fetchBookings();
         } catch (e) {
           Alert.alert('Error', 'Failed to cancel booking');
         } finally {
           setActionLoading(false);
         }
      }}
    ]);
  };

  const renderBooking = ({ item }: { item: Booking }) => {
    const totalAmount = Number(item.totalAmount);
    const paidAmount = Number(item.paidAmount);
    const balance = totalAmount - paidAmount;

    return (
      <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate('BookingDetail', { bookingId: item.id })}>
        <Card style={{ marginBottom: spacing.md, padding: 0, overflow: 'hidden' }} elevated>
          
          {/* Header Area */}
          <View style={{
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
            backgroundColor: colors.backgroundSecondary, padding: spacing.md,
            borderBottomWidth: 1, borderBottomColor: colors.divider,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold as any, color: colors.textPrimary }}>
                {item.bookingNumber}
              </Text>
              <Badge label={item.status} variant={statusVariant(item.status)} size="sm" />
            </View>
            <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold as any, color: colors.primary }}>
              Room {item.room?.roomNumber || item.bookingRooms?.[0]?.room?.roomNumber} {(item.bookingRooms?.length || 0) > 1 ? `(+${(item.bookingRooms?.length || 0) - 1})` : ''}
            </Text>
          </View>

          {/* Body Area */}
          <View style={{ padding: spacing.md, gap: spacing.sm }}>
            {/* Customer Info */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' }}>
                  <User size={18} color={colors.primary} />
                </View>
                <View>
                  <Text style={{ fontSize: fontSize.base, color: colors.textPrimary, fontWeight: fontWeight.bold as any }}>
                    {item.customer?.name || 'Unknown'}
                  </Text>
                  {item.customer?.mobile && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <Phone size={12} color={colors.textMuted} />
                      <Text style={{ fontSize: fontSize.xs, color: colors.textMuted }}>{item.customer.mobile}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Dates & Duration */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.background, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.divider }}>
              <Calendar size={14} color={colors.textMuted} />
              <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.medium as any }}>
                {formatDate(item.checkInDate)}
              </Text>
              <Text style={{ fontSize: fontSize.xs, color: colors.textMuted, marginHorizontal: 2 }}>→</Text>
              <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.medium as any }}>
                {formatDate(item.checkOutDate)}
              </Text>
            </View>

            {/* Financial Breakdown */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs }}>
              <View>
                <Text style={{ fontSize: fontSize.xs, color: colors.textMuted }}>Total</Text>
                <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold as any, color: colors.textPrimary }}>
                  ₹{totalAmount.toLocaleString('en-IN')}
                </Text>
              </View>
              <View>
                <Text style={{ fontSize: fontSize.xs, color: colors.textMuted }}>Paid</Text>
                <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold as any, color: colors.success }}>
                  ₹{paidAmount.toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: fontSize.xs, color: colors.textMuted }}>Balance</Text>
                <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold as any, color: balance > 0 ? colors.error : colors.success }}>
                  ₹{balance.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>

            {/* Payment Badge Status */}
            <View style={{ alignSelf: 'flex-start', marginTop: spacing.xs }}>
               <Badge label={item.paymentStatus} variant={statusVariant(item.paymentStatus)} size="sm" />
            </View>
          </View>

          {/* Action Buttons Row */}
          <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.divider, backgroundColor: colors.backgroundSecondary }}>
            {item.status === 'BOOKED' && (
              <>
                <TouchableOpacity
                  onPress={() => handleQuickCancel(item.id)}
                  style={{ flex: 1, paddingVertical: spacing.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.xs, borderRightWidth: 1, borderRightColor: colors.divider }}
                >
                   <XCircle size={16} color={colors.error} />
                   <Text style={{ fontSize: fontSize.sm, color: colors.error, fontWeight: fontWeight.semiBold as any }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleQuickCheckIn(item.id, item.checkInDate)}
                  style={{ flex: 1, paddingVertical: spacing.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.xs, backgroundColor: colors.primaryLight }}
                >
                   <LogIn size={16} color={colors.primary} />
                   <Text style={{ fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.semiBold as any }}>Check-In</Text>
                </TouchableOpacity>
              </>
            )}

            {item.status === 'CHECKED_IN' && (
              <>
                <TouchableOpacity
                  onPress={() => navigation.navigate('AddPayment', { bookingId: item.id, onRefresh: fetchBookings })}
                  style={{ flex: 1, paddingVertical: spacing.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.xs, borderRightWidth: 1, borderRightColor: colors.divider }}
                >
                   <CreditCard size={16} color={colors.info} />
                   <Text style={{ fontSize: fontSize.sm, color: colors.info, fontWeight: fontWeight.semiBold as any }}>Pay</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => navigation.navigate('CheckOut', { bookingId: item.id, onRefresh: fetchBookings })}
                  style={{ flex: 1, paddingVertical: spacing.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.xs }}
                >
                   <LogOut size={16} color={colors.warning} />
                   <Text style={{ fontSize: fontSize.sm, color: colors.warning, fontWeight: fontWeight.semiBold as any }}>Checkout</Text>
                </TouchableOpacity>
              </>
            )}

            {(item.status === 'COMPLETED' || item.status === 'CANCELLED') && (
              <TouchableOpacity
                onPress={() => navigation.navigate('BookingDetail', { bookingId: item.id })}
                style={{ flex: 1, paddingVertical: spacing.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.xs }}
              >
                 <Eye size={16} color={colors.textSecondary} />
                 <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.semiBold as any }}>View Details</Text>
              </TouchableOpacity>
            )}
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={{
        paddingHorizontal: spacing.base, paddingVertical: spacing.md,
        backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
          <View>
            <Text style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold as any, color: colors.textPrimary }}>
              Bookings
            </Text>
            <Text style={{ fontSize: fontSize.sm, color: colors.textMuted }}>
              {bookings.length} {activeFilter !== 'ALL' ? activeFilter.toLowerCase() : 'total'} records
            </Text>
          </View>
          <TouchableOpacity onPress={() => setShowFilters(true)} style={{ padding: spacing.sm, backgroundColor: colors.backgroundSecondary, borderRadius: radius.md }}>
             <Filter size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', backgroundColor: colors.backgroundSecondary,
          borderRadius: radius.md, paddingHorizontal: spacing.md, height: 44, gap: spacing.sm,
        }}>
          <Search size={18} color={colors.textMuted} />
          <TextInput
            placeholder="Search name, mobile, or ID..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{ flex: 1, color: colors.textPrimary, fontSize: fontSize.sm }}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
               <X size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={{ backgroundColor: colors.surface, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.divider, ...theme.shadow.sm }}>
        <FlatList
          horizontal
          data={FILTERS}
          keyExtractor={(i) => i}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.base, gap: spacing.sm, paddingTop: spacing.sm }}
          renderItem={({ item }) => {
            const active = activeFilter === item;
            return (
              <TouchableOpacity
                onPress={() => setActiveFilter(item)}
                style={{
                  paddingHorizontal: spacing.base, paddingVertical: spacing.sm,
                  borderRadius: radius.full,
                  backgroundColor: active ? colors.primary : colors.backgroundSecondary,
                  borderWidth: 1, borderColor: active ? colors.primary : colors.border,
                }}>
                <Text style={{
                  fontSize: fontSize.sm, fontWeight: fontWeight.semiBold as any,
                  color: active ? colors.textOnPrimary : colors.textSecondary,
                }}>
                  {item === 'ALL' ? 'All' : item.replace('_', ' ').charAt(0) + item.replace('_', ' ').slice(1).toLowerCase()}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {loading || actionLoading ? (
         <Loading message="Processing..." />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(i) => i.id}
          renderItem={renderBooking}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: spacing.md }} /> : null}
          contentContainerStyle={{ padding: spacing.base, flexGrow: 1, paddingBottom: 100 }}
          ListEmptyComponent={
            <EmptyState
              icon={<Calendar size={56} color={colors.textMuted} />}
              title="No bookings"
              message="No bookings found. Tap the plus button to create one."
            />
          }
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => navigation.navigate('SelectDates')}
        style={{
          position: 'absolute',
          right: spacing.lg,
          bottom: spacing.lg,
          width: 60,
          height: 60,
          borderRadius: 30,
          backgroundColor: colors.primary,
          justifyContent: 'center',
          alignItems: 'center',
          ...theme.shadow.lg,
          elevation: 6,
        }}>
        <Plus size={28} color={colors.textOnPrimary} />
      </TouchableOpacity>

      {/* Filter Modal */}
      <Modal visible={showFilters} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: spacing.xl * 2 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
              <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold as any, color: colors.textPrimary }}>Advanced Filters</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}><X size={24} color={colors.textMuted} /></TouchableOpacity>
            </View>
            
            <View style={{ gap: spacing.md, marginBottom: spacing.lg }}>
              <View>
                <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold as any, color: colors.textSecondary, marginBottom: spacing.xs }}>Check-In After</Text>
                <TouchableOpacity 
                  onPress={() => setPickerType('in')}
                  style={{ 
                    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
                    backgroundColor: colors.backgroundSecondary, borderRadius: radius.md, padding: spacing.md 
                  }}
                >
                  <Calendar size={18} color={colors.primary} />
                  <Text style={{ color: checkInFrom ? colors.textPrimary : colors.textMuted, fontSize: fontSize.base }}>
                    {checkInFrom ? formatDate(checkInFrom) : 'Select Start Date'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View>
                <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold as any, color: colors.textSecondary, marginBottom: spacing.xs }}>Check-Out Before</Text>
                <TouchableOpacity 
                  onPress={() => setPickerType('out')}
                  style={{ 
                    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
                    backgroundColor: colors.backgroundSecondary, borderRadius: radius.md, padding: spacing.md 
                  }}
                >
                  <Calendar size={18} color={colors.primary} />
                  <Text style={{ color: checkOutTo ? colors.textPrimary : colors.textMuted, fontSize: fontSize.base }}>
                    {checkOutTo ? formatDate(checkOutTo) : 'Select End Date'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md }}>
              <TouchableOpacity onPress={clearFilters} style={{ flex: 1, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}>
                <Text style={{ color: colors.textSecondary, fontWeight: fontWeight.bold as any }}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowFilters(false)} style={{ flex: 1, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center' }}>
                <Text style={{ color: colors.textOnPrimary, fontWeight: fontWeight.bold as any }}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Picker Multi-Modal */}
      <Modal visible={pickerType !== null} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: spacing.lg }}>
          <Card style={{ padding: spacing.md, backgroundColor: colors.surface }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
              <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold as any, color: colors.textPrimary }}>
                Select {pickerType === 'in' ? 'Start' : 'End'} Date
              </Text>
              <TouchableOpacity onPress={() => setPickerType(null)}><X size={20} color={colors.textMuted} /></TouchableOpacity>
            </View>

            {/* Simple Month Navigator */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md, backgroundColor: colors.backgroundSecondary, padding: spacing.sm, borderRadius: radius.md }}>
              <TouchableOpacity onPress={() => setTempDate(new Date(tempDate.getFullYear(), tempDate.getMonth() - 1, 1))}>
                <Text style={{ color: colors.primary, fontWeight: fontWeight.bold as any, padding: spacing.sm }}>Prev</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: fontSize.base, fontWeight: fontWeight.bold as any, color: colors.textPrimary }}>
                {MONTHS[tempDate.getMonth()]} {tempDate.getFullYear()}
              </Text>
              <TouchableOpacity onPress={() => setTempDate(new Date(tempDate.getFullYear(), tempDate.getMonth() + 1, 1))}>
                <Text style={{ color: colors.primary, fontWeight: fontWeight.bold as any, padding: spacing.sm }}>Next</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', marginBottom: spacing.sm }}>
              {WEEKDAYS.map(w => (
                <View key={w} style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: fontSize.xs, color: colors.textMuted, fontWeight: fontWeight.bold as any }}>{w}</Text>
                </View>
              ))}
            </View>

            {/* Calendar Grid */}
            <View>
              {(() => {
                const firstDay = new Date(tempDate.getFullYear(), tempDate.getMonth(), 1);
                const lastDay = new Date(tempDate.getFullYear(), tempDate.getMonth() + 1, 0);
                const offset = firstDay.getDay();
                const days = Array.from({ length: lastDay.getDate() }, (_, i) => i + 1);
                const cells = [...Array(offset).fill(null), ...days];
                const rows = [];
                for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

                return rows.map((row, ri) => (
                  <View key={ri} style={{ flexDirection: 'row', marginBottom: 4 }}>
                    {row.map((day, di) => {
                      if (!day) return <View key={di} style={{ flex: 1 }} />;
                      const dateStr = formatLocalDate(new Date(tempDate.getFullYear(), tempDate.getMonth(), day));
                      const isSelected = (pickerType === 'in' ? checkInFrom : checkOutTo) === dateStr;
                      
                      return (
                        <TouchableOpacity
                          key={di}
                          onPress={() => {
                            if (pickerType === 'in') setCheckInFrom(dateStr);
                            else setCheckOutTo(dateStr);
                            setPickerType(null);
                          }}
                          style={{ 
                            flex: 1, alignItems: 'center', paddingVertical: 8,
                            backgroundColor: isSelected ? colors.primary : 'transparent',
                            borderRadius: radius.md
                          }}
                        >
                          <Text style={{ 
                            fontSize: fontSize.sm, 
                            color: isSelected ? colors.textOnPrimary : colors.textPrimary,
                            fontWeight: isSelected ? fontWeight.bold as any : fontWeight.regular as any
                          }}>
                            {day}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ));
              })()}
            </View>
          </Card>
        </View>
      </Modal>

    </SafeAreaView>
  );
}
