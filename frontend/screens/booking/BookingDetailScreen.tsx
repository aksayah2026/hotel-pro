import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StatusBar, Alert, TouchableOpacity, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LogIn, LogOut, XCircle, CreditCard, Phone, User, BedDouble, Download, Plus, X, Banknote } from 'lucide-react-native';
import { Linking } from 'react-native';
import { useTheme } from '../../theme';
import { bookingService, Booking } from '../../services/bookingService';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Badge, statusVariant } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Loading } from '../../components/LoadingState';
import { formatDisplayDate, formatDateTimeIST } from '../../utils/date';
import { BASE_URL } from '../../services/api';

const STATIC_URL = BASE_URL.replace('/api', '');

const isToday = (d: string) => {
  const t = new Date(); t.setHours(0,0,0,0);
  const c = new Date(d); c.setHours(0,0,0,0);
  return t.getTime() === c.getTime();
};

export default function BookingDetailScreen() {
  const { theme } = useTheme();
  const { colors, spacing, fontSize, fontWeight, radius } = theme;
  const navigation = useNavigation<any>();
  const route      = useRoute<any>();
  const bookingId  = route?.params?.bookingId;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showExtraModal, setShowExtraModal] = useState(false);
  const [extraLabel, setExtraLabel] = useState('');
  const [extraAmount, setExtraAmount] = useState('');

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await bookingService.getById(bookingId);
      setBooking(res.data.data);
    } catch {
      Alert.alert('Error', 'Failed to load booking');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!bookingId) return;
    const unsubscribe = navigation.addListener('focus', () => { fetch(); });
    return unsubscribe;
  }, [navigation, bookingId]);

  if (!bookingId) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <Header title="Booking Details" showBack />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl }}>
           <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold as any, color: colors.textPrimary }}>Invalid Navigation</Text>
           <Text style={{ fontSize: fontSize.sm, color: colors.error, textAlign: 'center', marginTop: spacing.sm }}>
             Missing Booking ID parameter. Cannot load booking details.
           </Text>
           <Button label="Go Back" onPress={() => navigation.goBack()} style={{ marginTop: spacing.xl }} />
        </View>
      </SafeAreaView>
    );
  }

  useEffect(() => { fetch(); }, [bookingId]);

  const handleCheckIn = async () => {
    if (!isToday(booking?.checkInDate ?? '')) {
      Alert.alert('Not Allowed', 'Check-in is only possible on the check-in date.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await bookingService.checkIn(bookingId);
      setBooking(res.data.data);
      Alert.alert('✅ Checked In', 'Guest has been successfully checked in.', [
        { 
          text: 'OK', 
          onPress: () => {
             navigation.reset({ index: 0, routes: [{ name: 'Main', params: { screen: 'Bookings' } }] });
          }
        }
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Check-in failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel', style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          try {
            await bookingService.cancel(bookingId);
            Alert.alert('Booking Cancelled', 'The booking has been successfully cancelled.', [
              {
                text: 'OK',
                onPress: () => {
                  navigation.reset({ index: 0, routes: [{ name: 'Main', params: { screen: 'Bookings' } }] });
                }
              }
            ]);
          } catch { Alert.alert('Error', 'Failed to cancel booking'); }
          finally { setActionLoading(false); }
        },
      },
    ]);
  };
  
  const handleAddExtraCharge = async () => {
    if (!extraLabel || !extraAmount) {
      Alert.alert('Missing Info', 'Please enter both label and amount.');
      return;
    }
    setActionLoading(true);
    try {
      await bookingService.addExtraCharge(bookingId, extraLabel, parseFloat(extraAmount));
      setShowExtraModal(false);
      setExtraLabel('');
      setExtraAmount('');
      fetch();
      Alert.alert('Success', 'Extra charge added.');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Failed to add extra charge');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !booking) return <Loading message="Loading booking…" />;

  const formatDate = (d: string) => formatDisplayDate(d);

  const totalPaid  = booking.paidAmount;
  const remaining  = booking.pendingAmount;
  const extraTotal = booking.extraTotal;
  const baseAmount = Number(booking.totalAmount) - extraTotal;
  const roomsList  = booking.bookingRooms ?? [];

  const SummaryRow = ({ label, value }: { label: string; value: string }) => (
    <View style={{
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.divider,
    }}>
      <Text style={{ fontSize: fontSize.sm, color: colors.textMuted }}>{label}</Text>
      <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semiBold as any, color: colors.textPrimary }}>{value}</Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <Header title="Booking Detail" showBack />

      <ScrollView contentContainerStyle={{ padding: spacing.base, gap: spacing.base }}>
        {/* Status Hero */}
        <Card style={{ borderColor: colors.border }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold as any, color: colors.textPrimary }}>
                {booking.bookingNumber}
              </Text>
              {/* Show all rooms */}
              {roomsList.length > 0 ? (
                <Text style={{ fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 }}>
                  {roomsList.map((br) => `Room ${br.room?.roomNumber}`).join(' · ')}
                </Text>
              ) : booking.room && (
                <Text style={{ fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 }}>
                  Room {booking.room.roomNumber} · {booking.room.roomType?.name}
                </Text>
              )}
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
                <Badge label={booking.status} variant={statusVariant(booking.status)} size="md" />
                <Badge label={booking.paymentStatus} variant={statusVariant(booking.paymentStatus)} size="md" />
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: fontSize['2xl'], fontWeight: fontWeight.extraBold as any, color: colors.textPrimary }}>
                ₹{Number(booking.totalAmount).toLocaleString('en-IN')}
              </Text>
              <Text style={{ fontSize: fontSize.xs, color: colors.textMuted }}>total</Text>
            </View>
          </View>
        </Card>

        {/* Rooms Detail */}
        {roomsList.length > 0 && (
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
              <BedDouble size={18} color={colors.primary} />
              <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold as any, color: colors.textPrimary }}>
                Rooms ({roomsList.length})
              </Text>
            </View>
            {roomsList.map((br, idx) => (
              <View key={br.id} style={{
                paddingVertical: spacing.sm,
                borderBottomWidth: idx < roomsList.length - 1 ? 1 : 0,
                borderBottomColor: colors.divider,
              }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semiBold as any, color: colors.textPrimary }}>
                    Room {br.room?.roomNumber}
                  </Text>
                  <Text style={{ fontSize: fontSize.sm, color: colors.textMuted }}>
                    {br.room?.roomType?.name}
                  </Text>
                </View>
                <Text style={{ fontSize: fontSize.xs, color: colors.textMuted }}>
                  Floor {br.room?.floor} · {br.room?.capacity} guests
                </Text>
              </View>
            ))}
          </Card>
        )}

        {/* Booking Info */}
        <Card>
          <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold as any, color: colors.textPrimary, marginBottom: spacing.md }}>
            Booking Details
          </Text>
          <SummaryRow label="Check-In"  value={formatDate(booking.checkInDate)} />
          <SummaryRow label="Check-Out" value={formatDate(booking.checkOutDate)} />
          {booking.actualCheckIn  && <SummaryRow label="Actual Check-In"  value={formatDateTimeIST(booking.actualCheckIn)} />}
          {booking.actualCheckOut && <SummaryRow label="Actual Check-Out" value={formatDateTimeIST(booking.actualCheckOut)} />}
        </Card>

        {/* Customer */}
        {booking.customer && (
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
              <User size={18} color={colors.primary} />
              <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold as any, color: colors.textPrimary }}>Customer</Text>
            </View>
            <SummaryRow label="Name"   value={booking.customer.name} />
            <SummaryRow label="Mobile" value={booking.customer.mobile} />
            {booking.customer.email   && <SummaryRow label="Email"   value={booking.customer.email} />}
            {booking.customer.address && <SummaryRow label="Address" value={booking.customer.address} />}
            
            {booking.customer.aadhaarImage && (
              <View style={{ marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.divider }}>
                <TouchableOpacity 
                   onPress={() => Linking.openURL(`${STATIC_URL}${booking.customer?.aadhaarImage}`)}
                   style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primary + '10', padding: spacing.sm, borderRadius: radius.md }}
                >
                  <Download size={20} color={colors.primary} />
                  <Text style={{ fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.bold as any }}>Download Aadhaar Card</Text>
                </TouchableOpacity>
              </View>
            )}
          </Card>
        )}

        {/* Billing Details */}
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
            <Banknote size={18} color={colors.primary} />
            <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold as any, color: colors.textPrimary }}>Billing Details</Text>
          </View>
          
          <SummaryRow label="Room Charges" value={`₹${Number(booking.roomAmount || 0).toLocaleString('en-IN')}`} />
          {Number(booking.discount || 0) > 0 && (
            <SummaryRow label="Discount" value={`-₹${Number(booking.discount).toLocaleString('en-IN')}`} />
          )}

          {booking.extraCharges?.map((ec: any, i: number) => (
            <SummaryRow key={i} label={ec.label} value={`+₹${Number(ec.amount).toLocaleString('en-IN')}`} />
          ))}

          <View style={{
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
            paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.divider,
            marginTop: spacing.xs
          }}>
            <Text style={{ fontSize: fontSize.sm, color: colors.textPrimary, fontWeight: fontWeight.bold as any }}>Grand Total</Text>
            <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold as any, color: colors.textPrimary }}>
              ₹{Number(booking.totalAmount).toLocaleString('en-IN')}
            </Text>
          </View>

          <View style={{
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
            paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.divider,
          }}>
            <Text style={{ fontSize: fontSize.sm, color: colors.textMuted }}>Paid Amount</Text>
            <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold as any, color: colors.success }}>
              ₹{totalPaid.toLocaleString('en-IN')}
            </Text>
          </View>

          <View style={{
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
            paddingVertical: spacing.sm,
          }}>
            <Text style={{ fontSize: fontSize.sm, color: remaining > 0 ? colors.error : colors.success, fontWeight: fontWeight.bold as any }}>
              {remaining > 0 ? 'Pending Amount' : 'Fully Paid'}
            </Text>
            {remaining > 0 && (
              <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold as any, color: colors.error }}>
                ₹{remaining.toLocaleString('en-IN')}
              </Text>
            )}
          </View>

          {/* Payment History */}
          {booking.payments && booking.payments.length > 0 && (
            <View style={{ marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.divider }}>
              <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semiBold as any, color: colors.textSecondary, marginBottom: spacing.sm }}>
                Payment History
              </Text>
              {booking.payments.map((p) => (
                <View key={p.id} style={{
                  flexDirection: 'row', justifyContent: 'space-between',
                  paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.divider,
                }}>
                  <View>
                    <Text style={{ fontSize: fontSize.sm, color: colors.textPrimary, fontWeight: fontWeight.medium as any }}>{p.mode}</Text>
                    <Text style={{ fontSize: fontSize.xs, color: colors.textMuted }}>
                      {formatDateTimeIST(p.paidAt)}
                    </Text>
                  </View>
                  <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold as any, color: colors.success }}>
                    +₹{Number(p.amount).toLocaleString('en-IN')}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {/* Action Buttons */}
      {booking.status !== 'COMPLETED' && booking.status !== 'CANCELLED' && (
        <View style={{
          padding: spacing.base, backgroundColor: colors.surface,
          borderTopWidth: 1, borderTopColor: colors.divider,
          gap: spacing.sm, ...theme.shadow.lg,
        }}>
          {/* Start of Logical Stay Workflow (Add Extra -> Payment -> Checkout) */}
          
          {/* 1. Add Extra Charge (CHECKED_IN only - Outline) */}
          {booking.status === 'CHECKED_IN' && (
            <Button
              label="Add Extra Charge"
              variant="secondary"
              onPress={() => setShowExtraModal(true)}
              fullWidth
              style={{ backgroundColor: colors.backgroundSecondary, borderColor: colors.primary }}
              textStyle={{ color: colors.primary }}
              icon={<Plus size={18} color={colors.primary} />}
            />
          )}

          {/* 2. Add Payment (Applicable to both BOOKED and CHECKED_IN - Primary) */}
          {remaining > 0 && (
            <Button
              label={`Add Payment (₹${remaining.toLocaleString('en-IN')} due)`}
              variant="primary"
              onPress={() => navigation.navigate('AddPayment', { bookingId: booking.id })}
              fullWidth
              icon={<CreditCard size={18} color={colors.textOnPrimary} />}
              style={{ opacity: 0.9 }}
            />
          )}

          {/* 3. Check-Out (CHECKED_IN only - Strongest CTA) */}
          {booking.status === 'CHECKED_IN' && (
            <Button
              label="Check-Out Guest"
              size="lg"
              onPress={() => navigation.navigate('CheckOut', { bookingId: booking.id })}
              loading={actionLoading}
              fullWidth
              icon={<LogOut size={20} color={colors.textOnPrimary} />}
            />
          )}

          {/* --- Other Actions (Check-In & Cancel for BOOKED) --- */}

          {/* Check-In (BOOKED only) */}
          {booking.status === 'BOOKED' && (
            <Button
              label="Check-In Guest"
              size="lg"
              onPress={handleCheckIn}
              loading={actionLoading}
              fullWidth
              icon={<LogIn size={20} color={colors.textOnPrimary} />}
            />
          )}

          {/* Cancel (BOOKED only) */}
          {['BOOKED'].includes(booking.status) && (
            <Button
              label="Cancel Booking"
              variant="ghost"
              onPress={handleCancel}
              loading={actionLoading}
              fullWidth
              icon={<XCircle size={18} color={colors.error} />}
              textStyle={{ color: colors.error }}
            />
          )}
        </View>
      )}

      {/* Extra Charge Modal */}
      <View>
        <Modal visible={showExtraModal} animationType="slide" transparent>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.lg }}>
            <Card style={{ padding: spacing.lg, borderRadius: radius.xl }}>
               <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
                 <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold as any, color: colors.textPrimary }}>Add Extra Charge</Text>
                 <TouchableOpacity onPress={() => setShowExtraModal(false)}><X size={24} color={colors.textMuted} /></TouchableOpacity>
               </View>

               <Input
                 label="Charge Description"
                 placeholder="e.g. Extra Bed, Laundry, etc."
                 value={extraLabel}
                 onChangeText={setExtraLabel}
               />
               
               <Input
                 label="Amount (₹)"
                 placeholder="Enter amount"
                 keyboardType="numeric"
                 value={extraAmount}
                 onChangeText={setExtraAmount}
               />

               <View style={{ gap: spacing.md, marginTop: spacing.md }}>
                  <Button 
                    label="Add Charge" 
                    onPress={handleAddExtraCharge} 
                    loading={actionLoading} 
                    fullWidth 
                  />
                  <Button 
                    label="Cancel" 
                    variant="ghost" 
                    onPress={() => setShowExtraModal(false)} 
                    fullWidth 
                    textStyle={{ color: colors.textMuted }}
                  />
               </View>
            </Card>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}
