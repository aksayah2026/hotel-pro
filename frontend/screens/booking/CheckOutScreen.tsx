import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StatusBar, Alert, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Plus, Trash2, LogOut, CreditCard, AlertCircle, Banknote, Smartphone } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Loading } from '../../components/LoadingState';
import { bookingService, Booking } from '../../services/bookingService';


type PaymentMode = 'CASH' | 'UPI' | 'CARD';
const PAYMENT_MODES: { key: PaymentMode; label: string }[] = [
  { key: 'CASH', label: 'Cash' },
  { key: 'UPI', label: 'UPI / QR' },
  { key: 'CARD', label: 'Card' },
];

export default function CheckOutScreen() {
  const { theme } = useTheme();
  const { colors, spacing, fontSize, fontWeight, radius } = theme;
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const bookingId = route?.params?.bookingId;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [initLoading, setInitLoading] = useState(true);

  const [notes,       setNotes]         = useState('');
  const [loading,     setLoading]       = useState(false);

  const [collectAmountStr, setCollectAmountStr] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
  const [reference, setReference] = useState('');

  useEffect(() => {
    if (bookingId) {
      bookingService.getById(bookingId)
        .then(res => {
          const b = res.data.data;
          setBooking(b);
          setNotes(b.notes || '');
          setInitLoading(false);
        })
        .catch(() => {
          setInitLoading(false);
        });
    } else {
      setInitLoading(false);
    }
  }, [bookingId]);

  const totalPaid    = booking?.paidAmount ?? 0;
  const extraTotal   = booking?.extraCharges?.reduce((s, c: any) => s + (parseFloat(c.amount) || 0), 0) || 0;
  const baseAmount   = Number(booking?.totalAmount || 0) - extraTotal;
  const finalTotal   = Number(booking?.totalAmount || 0);
  const remaining    = finalTotal - totalPaid;
  const canCheckOut  = true; // We always allow checkout, but we validate remaining <= collectAmount inside handleCheckOut

  // Auto-sync the collect amount when remaining charges change naturally
  useEffect(() => {
    if (remaining > 0) {
      setCollectAmountStr(remaining.toString());
    } else {
      setCollectAmountStr('');
    }
  }, [remaining]);

  if (!bookingId) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <Header title="Check-Out" showBack />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, gap: spacing.md }}>
           <AlertCircle size={48} color={colors.error} />
           <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold as any, color: colors.textPrimary, textAlign: 'center' }}>
             Invalid Navigation
           </Text>
           <Text style={{ fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center' }}>
             Error: Missing Booking ID parameter. Cannot proceed with check-out.
           </Text>
           <Button label="Go Back" onPress={() => navigation.goBack()} />
        </View>
      </SafeAreaView>
    );
  }

  if (initLoading) return <Loading message="Loading booking details..." />;
  if (!booking) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Check-Out" showBack />
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.error }}>Failed to load booking details.</Text>
        <Button label="Go Back" onPress={() => navigation.goBack()} style={{ marginTop: spacing.md }} />
      </View>
    </SafeAreaView>
  );

  const handleCheckOut = async () => {
    const collectVal = parseFloat(collectAmountStr) || 0;
    
    if (remaining > 0 && collectVal < remaining) {
      Alert.alert(
        'Payment Pending',
        `₹${(remaining - collectVal).toLocaleString('en-IN')} is still strictly due. The full balance must be settled before check-out.`
      );
      return;
    }

    Alert.alert(
      'Confirm Check-Out',
      `Final bill: ₹${finalTotal.toLocaleString('en-IN')}.${collectVal > 0 ? ` Collecting ₹${collectVal.toLocaleString('en-IN')} via ${paymentMode}.` : ''} Proceed with check-out?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Check-Out',
          onPress: async () => {
            setLoading(true);
            try {
              await bookingService.checkOut(booking.id, {
                notes: notes || undefined,
                collectAmount: collectVal > 0 ? collectVal : undefined,
                paymentMode: collectVal > 0 ? paymentMode : undefined,
                reference: collectVal > 0 ? reference || undefined : undefined
              });

              Alert.alert('✅ Checked Out!', 'Guest has been successfully checked out. Room is now set to Cleaning.', [
                { text: 'Done', onPress: () => { navigation.reset({ index: 0, routes: [{ name: 'Main', params: { screen: 'Bookings' } }] }); } },
              ]);
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message ?? 'Check-out failed');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const SummaryRow = ({
    label, value, highlight = false, error = false,
  }: { label: string; value: string; highlight?: boolean; error?: boolean }) => (
    <View style={{
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.divider,
    }}>
      <Text style={{ fontSize: fontSize.sm, color: colors.textMuted }}>{label}</Text>
      <Text style={{
        fontSize: highlight ? fontSize.lg : fontSize.sm,
        fontWeight: (highlight ? fontWeight.bold : fontWeight.semiBold) as any,
        color: error ? colors.error : highlight ? colors.textPrimary : colors.textPrimary,
      }}>
        {value}
      </Text>
    </View>
  );

  const modeIcons: Record<PaymentMode, React.ReactNode> = {
    CASH: <Banknote size={22} color={colors.success} />,
    UPI:  <Smartphone size={22} color={colors.primary} />,
    CARD: <CreditCard size={22} color={colors.info} />,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <Header title="Check-Out" subtitle={`Room ${booking.room?.roomNumber || 'Multiple'} · ${booking.bookingNumber}`} showBack />

      <ScrollView contentContainerStyle={{ padding: spacing.base, gap: spacing.base }}>

        {/* Final Bill Summary */}
        <Card>
          <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold as any, color: colors.textPrimary, marginBottom: spacing.md }}>
            📋 Final Bill Breakdown
          </Text>
          <SummaryRow label="Room Charges"  value={`₹${baseAmount.toLocaleString('en-IN')}`} />
          {booking?.extraCharges && booking.extraCharges.length > 0 && booking.extraCharges.map((ec: any, i: number) => (
            <SummaryRow key={i} label={ec.label} value={`₹${Number(ec.amount).toLocaleString('en-IN')}`} />
          ))}
          <SummaryRow label="Total Amount"  value={`₹${finalTotal.toLocaleString('en-IN')}`} highlight />
          <SummaryRow label="Amount Paid"  value={`₹${totalPaid.toLocaleString('en-IN')}`} />

          <View style={{
            marginTop: spacing.sm,
            backgroundColor: remaining > 0 ? colors.errorBg : colors.successBg,
            borderRadius: radius.md, padding: spacing.md,
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <Text style={{
              fontSize: fontSize.sm, fontWeight: fontWeight.bold as any,
              color: remaining > 0 ? colors.error : colors.success,
            }}>
              {remaining > 0 ? '❌ Still Due' : '✅ Fully Settled'}
            </Text>
            {remaining > 0 && (
              <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.extraBold as any, color: colors.error }}>
                ₹{remaining.toLocaleString('en-IN')}
              </Text>
            )}
          </View>
        </Card>


        {/* Payment Collection Inline */}
        {remaining > 0 && (
          <Card>
            <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold as any, color: colors.textPrimary, marginBottom: spacing.md }}>
              Collect Payment
            </Text>
            <Input
              label="Amount to Collect (₹)"
              placeholder="e.g. 500"
              value={collectAmountStr}
              onChangeText={setCollectAmountStr}
              keyboardType="decimal-pad"
            />
            
            <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semiBold as any, color: colors.textPrimary, marginBottom: spacing.sm, marginTop: spacing.xs }}>
              Payment Mode
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
              {PAYMENT_MODES.map(({ key, label }) => {
                const active = paymentMode === key;
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => setPaymentMode(key)}
                    style={{
                      flex: 1, alignItems: 'center', paddingVertical: spacing.md,
                      borderRadius: radius.md, borderWidth: 2,
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? colors.primaryMuted : colors.surface,
                      gap: spacing.xs,
                    }}>
                    <View style={{ opacity: active ? 1 : 0.5 }}>
                      {modeIcons[key]}
                    </View>
                    <Text style={{
                      fontSize: fontSize.xs, fontWeight: fontWeight.bold as any,
                      color: active ? colors.primary : colors.textSecondary,
                    }}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {(paymentMode === 'UPI' || paymentMode === 'CARD') && (
              <Input
                label="Transaction Reference"
                placeholder="e.g. UTR / Txn ID"
                value={reference}
                onChangeText={setReference}
              />
            )}
          </Card>
        )}

        {/* Notes */}
        <Card>
          <Input
            label="Check-Out Notes (optional)"
            placeholder="Any remarks about the stay, damages, etc."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </Card>

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {/* Sticky CTA */}
      <View style={{
        padding: spacing.base, backgroundColor: colors.surface,
        borderTopWidth: 1, borderTopColor: colors.divider, ...theme.shadow.lg,
      }}>
        <Button
          label={remaining > 0 ? "Collect & Check-Out" : "Complete Check-Out"}
          onPress={handleCheckOut}
          loading={loading}
          fullWidth size="lg"
          variant={remaining > 0 ? 'primary' : 'primary'}
          icon={<LogOut size={20} color={colors.textOnPrimary} />}
        />
      </View>
    </SafeAreaView>
  );
}
