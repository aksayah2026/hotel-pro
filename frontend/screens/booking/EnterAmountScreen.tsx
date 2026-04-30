import React, { useState } from 'react';
import {
  View, Text, ScrollView, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ChevronRight, Banknote, BedDouble } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { StepIndicator } from '../../components/StepIndicator';
import { Room } from '../../services/roomService';
import { formatDisplayDate } from '../../utils/date';

interface Customer {
  name: string; mobile: string; email?: string;
  address?: string; aadhaarImage: string;
}

export default function EnterAmountScreen() {
  const { theme } = useTheme();
  const { colors, spacing, fontSize, fontWeight, radius } = theme;
  const navigation = useNavigation<any>();
  const route      = useRoute<any>();
  
  const rooms = route?.params?.rooms;
  const checkIn = route?.params?.checkIn;
  const checkOut = route?.params?.checkOut;
  const nights = route?.params?.nights;
  const customer = route?.params?.customer;

  const handleDiscountChange = (val: string) => {
    // Remove non-numeric characters and leading zeros
    const cleanVal = val.replace(/[^0-9]/g, '').replace(/^0+/, '') || (val === '0' ? '0' : '');
    setDiscountStr(cleanVal);
    
    const valNum = parseFloat(cleanVal) || 0;
    if (valNum < 0) {
      setDiscountError('Invalid discount amount');
    } else if (valNum > roomSubtotal) {
      setDiscountError('Discount cannot be greater than total amount');
    } else {
      setDiscountError('');
    }
  };

  const handleNext = () => {
    if (discountError || finalAmount < 0) return;
    navigation.navigate('ConfirmBooking', {
      rooms, checkIn, checkOut, nights, customer,
      roomAmount: roomSubtotal,
      discount: discountVal,
      totalAmount: Math.max(0, finalAmount),
    });
  };

  const isInvalid = !!discountError || (discountStr !== '' && isNaN(discountVal));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <Header title="Enter Amount" subtitle="Step 4 of 5" showBack />
      <StepIndicator currentStep={4} />

      <ScrollView contentContainerStyle={{ padding: spacing.base, gap: spacing.base }}>
        {/* Booking Summary */}
        <Card style={{ backgroundColor: colors.primaryLight, borderColor: colors.primary }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
            <BedDouble size={16} color={colors.primary} />
            <Text style={{ fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.semiBold as any }}>
              {rooms.length} Room{rooms.length > 1 ? 's' : ''} Selected
            </Text>
          </View>
          <Text style={{ fontSize: fontSize.xs, color: colors.textMuted }}>
             {formatDisplayDate(checkIn)} → {formatDisplayDate(checkOut)} · {nights} night{nights > 1 ? 's' : ''}
          </Text>
        </Card>

        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
            <Banknote size={18} color={colors.primary} />
            <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold as any, color: colors.textPrimary }}>
              Billing Summary
            </Text>
          </View>

          <View style={{ gap: spacing.sm }}>
             <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
               <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>Room Subtotal ({rooms.length} rooms × {nights} nights)</Text>
               <Text style={{ color: colors.textPrimary, fontSize: fontSize.sm, fontWeight: fontWeight.semiBold as any }}>₹{roomSubtotal.toLocaleString('en-IN')}</Text>
             </View>

             <Input
               label="Discount (₹)"
               placeholder="Enter discount amount"
               value={discountStr}
               onChangeText={handleDiscountChange}
               keyboardType="numeric"
               error={discountError}
               containerStyle={{ marginTop: spacing.sm }}
               leftIcon={<Text style={{ color: colors.textMuted, fontWeight: fontWeight.bold as any }}>-₹</Text>}
             />

             <View style={{ 
               marginTop: spacing.md, 
               paddingTop: spacing.md, 
               borderTopWidth: 1, 
               borderTopColor: colors.divider,
               flexDirection: 'row', 
               justifyContent: 'space-between',
               alignItems: 'center' 
             }}>
               <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold as any, color: colors.textPrimary }}>Total Amount</Text>
               <Text style={{ fontSize: fontSize.xl, fontWeight: fontWeight.extraBold as any, color: isInvalid ? colors.textMuted : colors.primary }}>
                 ₹{Math.max(0, finalAmount).toLocaleString('en-IN')}
               </Text>
             </View>
          </View>
        </Card>

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {/* Sticky CTA */}
      <View style={{
        padding: spacing.base, backgroundColor: colors.surface,
        borderTopWidth: 1, borderTopColor: colors.divider, ...theme.shadow.lg,
      }}>
        <Button
          label="Continue to Confirmation"
          onPress={handleNext}
          fullWidth size="lg"
          disabled={isInvalid}
          style={{ opacity: isInvalid ? 0.5 : 1 }}
          icon={<ChevronRight size={20} color={colors.textOnPrimary} />}
        />
      </View>
    </SafeAreaView>
  );
}
