import React, { useState } from 'react';
import {
  View, Text, ScrollView, StatusBar, Alert, TouchableOpacity, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { CheckCircle, Calendar, User, CreditCard, Banknote, BedDouble } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { StepIndicator } from '../../components/StepIndicator';
import { bookingService } from '../../services/bookingService';
import { Room } from '../../services/roomService';
import { formatDisplayDate } from '../../utils/date';
import { Input } from '../../components/Input';

interface Customer {
  name: string; mobile: string; email?: string;
  address?: string; aadhaarImage: string;
}

const isToday = (d: string) => {
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const c = new Date(d); c.setHours(0, 0, 0, 0);
  return t.getTime() === c.getTime();
};

export default function ConfirmBookingScreen() {
  const { theme } = useTheme();
  const { colors, spacing, fontSize, fontWeight, radius } = theme;
  const navigation = useNavigation<any>();
  const route      = useRoute<any>();
  
  const rooms = route?.params?.rooms;
  const checkIn = route?.params?.checkIn;
  const checkOut = route?.params?.checkOut;
  const nights = route?.params?.nights;
  const customer = route?.params?.customer;
  const totalAmount = route?.params?.totalAmount;
  const roomAmount  = route?.params?.roomAmount;
  const discount    = route?.params?.discount;

  const [bookingType, setBookingType] = useState<'book' | 'checkin'>('book');
  const [loading, setLoading] = useState(false);
  
  const [paymentType, setPaymentType] = useState<'ADVANCE' | 'FULL'>('FULL');
  const [advanceAmount, setAdvanceAmount] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'CARD'>('CASH');
  const [paymentReference, setPaymentReference] = useState('');

  if (!rooms || !checkIn || !checkOut || !nights || !customer || totalAmount === undefined) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl }}>
           <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold as any, color: colors.error }}>Invalid Navigation</Text>
           <Text style={{ fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm }}>
             Missing booking parameters. Please restart the booking process.
           </Text>
           <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: spacing.xl, padding: spacing.md, backgroundColor: colors.primary, borderRadius: radius.md }}>
             <Text style={{ color: colors.textOnPrimary, fontWeight: fontWeight.bold as any }}>Go Back</Text>
           </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const canCheckInToday = isToday(checkIn);

  const formatDisplay = (d: string) => formatDisplayDate(d);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const payload = {
        roomIds: rooms.map((r: any) => r.id),
        checkInDate: checkIn,
        checkOutDate: checkOut,
        customer,
        roomAmount,
        discount,
        totalAmount,
        doCheckIn: bookingType === 'checkin',
        paymentType,
        advanceAmount: paymentType === 'ADVANCE' ? parseFloat(advanceAmount || '0') : totalAmount,
        paymentMode,
        paymentReference,
      };
      const res = await bookingService.create(payload);
      const booking = res.data.data;

      Alert.alert(
        bookingType === 'checkin' ? '✅ Checked In!' : '✅ Booking Confirmed!',
        `Booking #${booking.bookingNumber} created successfully.`,
        [{ 
          text: 'OK', 
          onPress: () => {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Main', params: { screen: 'Bookings' } }],
            });
          } 
        }]
      );
    } catch (err: any) {
      Alert.alert('Booking Failed', err?.response?.data?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const SummaryRow = ({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) => (
    <View style={{
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.divider,
    }}>
      <Text style={{ fontSize: fontSize.sm, color: colors.textMuted }}>{label}</Text>
      <Text style={{
        fontSize: highlight ? fontSize.md : fontSize.sm,
        fontWeight: (highlight ? fontWeight.bold : fontWeight.semiBold) as any,
        color: highlight ? colors.primary : colors.textPrimary,
      }}>{value}</Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <Header title="Confirm Booking" subtitle="Step 5 of 5" showBack />
      <StepIndicator currentStep={5} />

      <ScrollView contentContainerStyle={{ padding: spacing.base, gap: spacing.base }}>
        {/* Rooms & Dates Summary */}
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
            <BedDouble size={18} color={colors.primary} />
            <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold as any, color: colors.textPrimary }}>
              Rooms & Dates
            </Text>
          </View>

          {/* List each room */}
          {rooms.map((room: any, idx: number) => (
            <View key={room.id} style={{
              flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
              paddingVertical: spacing.sm,
              borderBottomWidth: idx < rooms.length - 1 ? 1 : 0,
              borderBottomColor: colors.divider,
            }}>
              <View>
                <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semiBold as any, color: colors.textPrimary }}>
                  Room {room.roomNumber}
                </Text>
                <Text style={{ fontSize: fontSize.xs, color: colors.textMuted }}>
                  {room.roomType?.name} · Floor {room.floor} · {room.capacity} guests
                </Text>
              </View>
              {room.amenities?.slice(0, 2).map((a: any) => (
                <View key={a.id} style={{
                  backgroundColor: colors.backgroundSecondary, borderRadius: radius.full,
                  paddingHorizontal: spacing.sm, paddingVertical: 2, marginLeft: spacing.xs,
                }}>
                  <Text style={{ fontSize: fontSize.xs, color: colors.textMuted }}>{a.name}</Text>
                </View>
              ))}
            </View>
          ))}

          <View style={{ marginTop: spacing.sm }}>
            <SummaryRow label="Check-In"  value={formatDisplay(checkIn)} />
            <SummaryRow label="Check-Out" value={formatDisplay(checkOut)} />
            <SummaryRow label="Nights"    value={`${nights} night${nights > 1 ? 's' : ''}`} />
            <SummaryRow label="Rooms"     value={`${rooms.length} room${rooms.length > 1 ? 's' : ''}`} />
          </View>
        </Card>

        {/* Customer Summary */}
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
            <User size={18} color={colors.primary} />
            <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold as any, color: colors.textPrimary }}>
              Customer
            </Text>
          </View>
          <SummaryRow label="Name"   value={customer.name} />
          <SummaryRow label="Mobile" value={customer.mobile} />
          {customer.email   && <SummaryRow label="Email"   value={customer.email} />}
          {customer.address && <SummaryRow label="Address" value={customer.address} />}
          <View style={{
            backgroundColor: colors.successBg, borderRadius: radius.sm,
            padding: spacing.sm, marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
          }}>
            <CheckCircle size={14} color={colors.success} />
            <Text style={{ fontSize: fontSize.xs, color: colors.success, fontWeight: fontWeight.semiBold as any }}>
              Aadhaar document uploaded
            </Text>
          </View>
        </Card>

        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
            <Banknote size={18} color={colors.primary} />
            <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold as any, color: colors.textPrimary }}>
              Total Amount
            </Text>
          </View>
          <SummaryRow label="Room Charges" value={`₹${Number(roomAmount || 0).toLocaleString('en-IN')}`} />
          {Number(discount || 0) > 0 && <SummaryRow label="Discount" value={`-₹${Number(discount).toLocaleString('en-IN')}`} />}
          <SummaryRow label="Final Amount" value={`₹${totalAmount.toLocaleString('en-IN')}`} highlight />
        </Card>

        {/* Payment Options */}
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
            <CreditCard size={18} color={colors.primary} />
            <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold as any, color: colors.textPrimary }}>
              Payment Information
            </Text>
          </View>

          {/* Payment Type Selection */}
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
            {(['FULL', 'ADVANCE'] as const).map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => setPaymentType(type)}
                style={{
                  flex: 1,
                  paddingVertical: spacing.sm,
                  borderRadius: radius.md,
                  borderWidth: 2,
                  borderColor: paymentType === type ? colors.primary : colors.border,
                  backgroundColor: paymentType === type ? colors.primaryMuted : 'transparent',
                  alignItems: 'center',
                }}
              >
                <Text style={{
                  color: paymentType === type ? colors.primary : colors.textMuted,
                  fontWeight: fontWeight.bold as any,
                  fontSize: fontSize.sm
                }}>
                  {type === 'FULL' ? 'Full Payment' : 'Advance'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {paymentType === 'ADVANCE' && (
            <Input
              label="Advance Amount"
              placeholder="Enter amount"
              keyboardType="numeric"
              value={advanceAmount}
              onChangeText={setAdvanceAmount}
              prefix={<Text style={{ color: colors.textMuted }}>₹</Text>}
            />
          )}

          <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.sm }}>
            Payment Mode
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md }}>
            {(['CASH', 'UPI', 'CARD'] as const).map((mode) => (
              <TouchableOpacity
                key={mode}
                onPress={() => setPaymentMode(mode)}
                style={{
                  flex: 1,
                  paddingVertical: spacing.sm,
                  borderRadius: radius.md,
                  borderWidth: 1.5,
                  borderColor: paymentMode === mode ? colors.primary : colors.border,
                  backgroundColor: paymentMode === mode ? colors.primaryMuted : 'transparent',
                  alignItems: 'center',
                }}
              >
                <Text style={{
                  color: paymentMode === mode ? colors.primary : colors.textSecondary,
                  fontWeight: fontWeight.semiBold as any,
                  fontSize: fontSize.xs
                }}>
                  {mode}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input
            label="Reference (Optional)"
            placeholder="Transaction ID, Cheque No, etc."
            value={paymentReference}
            onChangeText={setPaymentReference}
          />
        </Card>

        {/* Booking Option Selection */}
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
            <BedDouble size={18} color={colors.primary} />
            <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold as any, color: colors.textPrimary }}>
              Booking Option
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setBookingType('book')}
            activeOpacity={0.85}
            style={{
              flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md,
              padding: spacing.md, borderRadius: radius.md, borderWidth: 2,
              borderColor: bookingType === 'book' ? colors.primary : colors.border,
              backgroundColor: bookingType === 'book' ? colors.primaryMuted : colors.surface,
              marginBottom: spacing.sm,
            }}>
            <View style={{
              width: 22, height: 22, borderRadius: 11, borderWidth: 2,
              borderColor: bookingType === 'book' ? colors.primary : colors.border,
              backgroundColor: bookingType === 'book' ? colors.primary : 'transparent',
              justifyContent: 'center', alignItems: 'center',
            }}>
              {bookingType === 'book' && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.textOnPrimary }} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold as any, color: colors.textPrimary }}>
                Book Only
              </Text>
              <Text style={{ fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 }}>
                Reserve the room · Status: BOOKED · Guest can check-in on arrival
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              if (!canCheckInToday) {
                Alert.alert('Not Available', 'Immediate check-in is only available when today is the check-in date.');
                return;
              }
              setBookingType('checkin');
            }}
            activeOpacity={0.85}
            style={{
              flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md,
              padding: spacing.md, borderRadius: radius.md, borderWidth: 2,
              borderColor: bookingType === 'checkin' ? colors.primary : colors.border,
              backgroundColor: bookingType === 'checkin' ? colors.primaryMuted : colors.surface,
              opacity: canCheckInToday ? 1 : 0.5,
            }}>
            <View style={{
              width: 22, height: 22, borderRadius: 11, borderWidth: 2,
              borderColor: bookingType === 'checkin' ? colors.primary : colors.border,
              backgroundColor: bookingType === 'checkin' ? colors.primary : 'transparent',
              justifyContent: 'center', alignItems: 'center',
            }}>
              {bookingType === 'checkin' && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.textOnPrimary }} />}
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
                <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold as any, color: colors.textPrimary }}>
                  Book & Check-In Now
                </Text>
                {!canCheckInToday && (
                  <View style={{ backgroundColor: colors.warningBg, borderRadius: radius.xs, paddingHorizontal: spacing.xs, paddingVertical: 2 }}>
                    <Text style={{ fontSize: fontSize.xs, color: colors.warning }}>Today only</Text>
                  </View>
                )}
              </View>
              <Text style={{ fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 }}>
                Immediately check-in guest · Status: CHECKED_IN · All rooms marked Occupied
              </Text>
            </View>
          </TouchableOpacity>
        </Card>


        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {/* Sticky CTA */}
      <View style={{
        padding: spacing.base, backgroundColor: colors.surface,
        borderTopWidth: 1, borderTopColor: colors.divider, ...theme.shadow.lg,
      }}>
        <Button
          label={bookingType === 'checkin' ? '✓ Confirm & Check-In' : '✓ Confirm Booking'}
          onPress={handleConfirm}
          loading={loading}
          fullWidth size="lg"
        />
      </View>
    </SafeAreaView>
  );
}
