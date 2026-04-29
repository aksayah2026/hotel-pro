import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  RefreshControl, StatusBar, ActivityIndicator, TextInput
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Calendar, Eye, Phone, User, Search, X, ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { bookingService, Booking } from '../../services/bookingService';
import { Card } from '../../components/Card';
import { Badge, statusVariant } from '../../components/Badge';
import { EmptyState, Loading } from '../../components/LoadingState';
import { formatDisplayDate } from '../../utils/date';

const FILTERS = ['ALL', 'COMPLETED', 'CANCELLED'];

export default function PastEventsScreen() {
  const { theme } = useTheme();
  const { colors, spacing, fontSize, fontWeight, radius } = theme;
  const navigation = useNavigation<any>();

  const [bookings,  setBookings]  = useState<Booking[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchBookings = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (pageNum === 1 && !refreshing) setLoading(true);
      if (pageNum > 1) setLoadingMore(true);

      const params: any = { type: 'history', page: pageNum, limit: 10 };
      if (activeFilter !== 'ALL') params.status = activeFilter;
      if (debouncedSearch) params.search = debouncedSearch;

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
  }, [activeFilter, debouncedSearch, refreshing]);

  const onRefresh = () => {
     setRefreshing(true);
     fetchBookings(1, false);
  };

  const loadMore = () => {
    if (loadingMore || !hasMore || loading) return;
    fetchBookings(page + 1, true);
  };

  useEffect(() => {
    fetchBookings(1, false);
  }, [activeFilter, debouncedSearch]);

  useFocusEffect(
    useCallback(() => {
      fetchBookings(1, false);
    }, [fetchBookings])
  );

  const formatDate = (d: string) => {
    if (!d) return '';
    return formatDisplayDate(d);
  };

  const renderBooking = ({ item }: { item: Booking }) => {
    const totalAmount = Number(item.totalAmount);
    const paidAmount = Number(item.paidAmount);

    return (
      <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate('BookingDetail', { bookingId: item.id })}>
        <Card style={{ marginBottom: spacing.md, padding: 0, overflow: 'hidden' }} elevated>
          
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
              Room {item.bookingRooms?.[0]?.room?.roomNumber || 'N/A'}
            </Text>
          </View>

          <View style={{ padding: spacing.md, gap: spacing.sm }}>
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

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs }}>
              <View>
                <Text style={{ fontSize: fontSize.xs, color: colors.textMuted }}>Total Amount</Text>
                <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold as any, color: colors.textPrimary }}>
                  ₹{totalAmount.toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: fontSize.xs, color: colors.textMuted }}>Payment Status</Text>
                <Badge label={item.paymentStatus} variant={statusVariant(item.paymentStatus)} size="sm" />
              </View>
            </View>
          </View>

          <View style={{ borderTopWidth: 1, borderTopColor: colors.divider, backgroundColor: colors.backgroundSecondary }}>
            <TouchableOpacity
              onPress={() => navigation.navigate('BookingDetail', { bookingId: item.id })}
              style={{ paddingVertical: spacing.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.xs }}
            >
               <Eye size={16} color={colors.textSecondary} />
               <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.semiBold as any }}>View Full History</Text>
            </TouchableOpacity>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={{
        paddingHorizontal: spacing.base, paddingVertical: spacing.md,
        backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md }}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View>
            <Text style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold as any, color: colors.textPrimary }}>
              Past Events
            </Text>
            <Text style={{ fontSize: fontSize.sm, color: colors.textMuted }}>
              History of completed and cancelled stays
            </Text>
          </View>
        </View>

        <View style={{
          flexDirection: 'row', alignItems: 'center', backgroundColor: colors.backgroundSecondary,
          borderRadius: radius.md, paddingHorizontal: spacing.md, height: 44, gap: spacing.sm,
        }}>
          <Search size={18} color={colors.textMuted} />
          <TextInput
            placeholder="Search past guest, mobile, or ID..."
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
                  {item === 'ALL' ? 'All History' : item.charAt(0) + item.slice(1).toLowerCase()}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {loading ? (
         <Loading message="Fetching history..." />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(i) => i.id}
          renderItem={renderBooking}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: spacing.md }} /> : null}
          contentContainerStyle={{ padding: spacing.base, flexGrow: 1, paddingBottom: 20 }}
          ListEmptyComponent={
            <EmptyState
              icon={<Calendar size={56} color={colors.textMuted} />}
              title="No history found"
              message="There are no completed or cancelled events yet."
            />
          }
        />
      )}
    </SafeAreaView>
  );
}
