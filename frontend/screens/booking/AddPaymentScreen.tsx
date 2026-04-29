import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StatusBar, Alert, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { CreditCard, Banknote, Smartphone, AlertCircle } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Loading } from '../../components/LoadingState';
import { paymentService } from '../../services/paymentService';
import { bookingService, Booking } from '../../services/bookingService';

type PaymentMode = 'CASH' | 'UPI' | 'CARD';

const PAYMENT_MODES: { key: PaymentMode; label: string; icon: React.ReactNode; color: string }[] = [
  { key: 'CASH', label: 'Cash',  icon: null, color: '#22C55E' },
  { key: 'UPI',  label: 'UPI',   icon: null, color: '#8B5CF6' },
  { key: 'CARD', label: 'Card',  icon: null, color: '#3B82F6' },
];

export default function AddPaymentScreen() {
  const { theme } = useTheme();
  const { colors, spacing, fontSize, fontWeight, radius } = theme;
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [initLoading, setInitLoading] = useState(true);

  const [mode,      setMode]      = useState<PaymentMode>('CASH');
  const [amount,    setAmount]    = useState('');
  const [reference, setReference] = useState('');
  const [notes,     setNotes]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [errors,    setErrors]    = useState<Record<string, string>>({});

  const bookingId = route?.params?.bookingId;

  useEffect(() => {
    if (bookingId) {
      bookingService.getById(bookingId)
        .then((res) => {
          const b = res.data.data;
          setBooking(b);
          const totalPaidAmt = b.payments?.reduce((s: number, p: any) => s + Number(p.amount), 0) ?? 0;
          const remainingAmt = Number(b.totalAmount) - totalPaidAmt;
          setAmount(String(remainingAmt > 0 ? remainingAmt : ''));
          setInitLoading(false);
        })
        .catch(() => {
          setInitLoading(false);
        });
    } else {
      setInitLoading(false);
    }
  }, [bookingId]);

  if (!route?.params?.bookingId) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <Header title="Add Payment" showBack />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, gap: spacing.md }}>
           <AlertCircle size={48} color={colors.error} />
           <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold as any, color: colors.textPrimary, textAlign: 'center' }}>
             Invalid Navigation
           </Text>
           <Text style={{ fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center' }}>
             Error: Missing Booking ID parameter. Cannot proceed with payment.
           </Text>
           <Button label="Go Back" onPress={() => navigation.goBack()} />
        </View>
      </SafeAreaView>
    );
  }

  if (initLoading) return <Loading message="Loading payment details..." />;
  if (!booking) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Add Payment" showBack />
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.error }}>Failed to load booking details.</Text>
        <Button label="Go Back" onPress={() => navigation.goBack()} style={{ marginTop: spacing.md }} />
      </View>
    </SafeAreaView>
  );

  const totalPaid = booking.payments?.reduce((s, p) => s + Number(p.amount), 0) ?? 0;
  const remaining = Number(booking.totalAmount) - totalPaid;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0)
      e.amount = 'Enter a valid payment amount';
    if (remaining > 0 && Number(amount) > remaining)
      e.amount = `Amount cannot exceed ₹${remaining.toLocaleString('en-IN')} (remaining)`;
    if ((mode === 'UPI' || mode === 'CARD') && !reference.trim())
      e.reference = 'Transaction reference is required for UPI/Card payments';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await paymentService.add({
        bookingId: booking.id,
        amount: Number(amount),
        mode,
        reference: reference || undefined,
        notes: notes || undefined,
      });
      Alert.alert('✅ Payment Added', `₹${Number(amount).toLocaleString('en-IN')} received via ${mode}`, [
        { text: 'OK', onPress: () => { navigation.reset({ index: 0, routes: [{ name: 'Main', params: { screen: 'Bookings' } }] }); } },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  const modeIcons: Record<PaymentMode, React.ReactNode> = {
    CASH: <Banknote size={22} color={colors.success} />,
    UPI:  <Smartphone size={22} color={colors.primary} />,
    CARD: <CreditCard size={22} color={colors.info} />,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <Header title="Add Payment" subtitle={`Booking ${booking.bookingNumber}`} showBack />

      <ScrollView contentContainerStyle={{ padding: spacing.base, gap: spacing.base }}>
        {/* Due Summary */}
        <View style={{
          backgroundColor: remaining > 0 ? colors.errorBg : colors.successBg,
          borderRadius: radius.lg, padding: spacing.lg,
          flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <View>
            <Text style={{ fontSize: fontSize.xs, color: remaining > 0 ? colors.error : colors.success, fontWeight: fontWeight.semiBold as any }}>
              {remaining > 0 ? 'Amount Due' : 'Fully Paid'}
            </Text>
            <Text style={{ fontSize: fontSize['3xl'], fontWeight: fontWeight.extraBold as any, color: remaining > 0 ? colors.error : colors.success }}>
              ₹{remaining.toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: fontSize.xs, color: colors.textMuted }}>Total</Text>
            <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold as any, color: colors.textPrimary }}>
              ₹{Number(booking.totalAmount).toLocaleString('en-IN')}
            </Text>
            <Text style={{ fontSize: fontSize.xs, color: colors.textMuted }}>Paid: ₹{totalPaid.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {/* Payment Mode */}
        <Card>
          <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold as any, color: colors.textPrimary, marginBottom: spacing.md }}>
            Payment Mode
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {PAYMENT_MODES.map(({ key, label }) => {
              const active = mode === key;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => setMode(key)}
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
                    fontSize: fontSize.sm, fontWeight: fontWeight.bold as any,
                    color: active ? colors.primary : colors.textSecondary,
                  }}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* Amount & Reference */}
        <Card>
          <Input
            label="Amount (₹) *"
            placeholder={`Max ₹${remaining.toLocaleString('en-IN')}`}
            value={amount}
            onChangeText={(v) => setAmount(v.replace(/[^0-9.]/g, ''))}
            keyboardType="decimal-pad"
            error={errors.amount}
          />
          {(mode === 'UPI' || mode === 'CARD') && (
            <Input
              label={`${mode === 'UPI' ? 'UPI' : 'Card'} Transaction Reference *`}
              placeholder={mode === 'UPI' ? 'UPI transaction ID / UTR' : 'Last 4 digits or auth code'}
              value={reference}
              onChangeText={setReference}
              error={errors.reference}
            />
          )}
          <Input
            label="Notes (optional)"
            placeholder="Any additional notes..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={2}
          />
        </Card>

        <Button
          label={`Confirm Payment · ₹${(parseFloat(amount) || 0).toLocaleString('en-IN')}`}
          onPress={handleSubmit}
          loading={loading}
          fullWidth size="lg"
        />
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}
