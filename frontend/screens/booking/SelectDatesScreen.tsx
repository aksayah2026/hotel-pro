import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Platform, Alert, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Calendar, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

import { StepIndicator } from '../../components/StepIndicator';
import { formatLocalDate, formatDisplayDate, parseLocalDate } from '../../utils/date';

const addDays = (d: Date, n: number) => {
  const result = new Date(d);
  result.setDate(result.getDate() + n);
  return result;
};
const diffDays = (a: Date, b: Date) =>
  Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));

const today = new Date();
today.setHours(0, 0, 0, 0);

// Generate a simple date grid (next 180 days)
const generateDays = () => {
  const days: Date[] = [];
  for (let i = 0; i < 180; i++) days.push(addDays(today, i));
  return days;
};
const DAYS = generateDays();

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const WEEKDAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

export default function SelectDatesScreen() {
  const { theme } = useTheme();
  const { colors, spacing, fontSize, fontWeight, radius } = theme;
  const navigation = useNavigation<any>();
  const scrollRef = useRef<ScrollView>(null);

  const [checkIn,  setCheckIn]  = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [activeField, setActiveField] = useState<'checkIn' | 'checkOut'>('checkIn');

  const handleDayPress = (day: Date) => {
    if (activeField === 'checkIn') {
      setCheckIn(day);
      // If new check-in is after or same as current check-out, reset check-out
      if (checkOut && day >= checkOut) {
        setCheckOut(null);
      }
      setActiveField('checkOut');
      
      // Auto-scroll forward
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: spacing.xl * 2, animated: true });
      }, 100);
    } else {
      // activeField is 'checkOut'
      if (checkIn && day <= checkIn) {
        // Smart fallback: If user picks a date before check-in, update check-in instead
        setCheckIn(day);
        setCheckOut(null);
        setActiveField('checkOut');
      } else {
        setCheckOut(day);
        setActiveField('checkIn');
      }
    }
  };

  const handleClear = () => {
    setCheckIn(null);
    setCheckOut(null);
    setActiveField('checkIn');
  };

  const isInRange = (day: Date) =>
    checkIn && checkOut && day > checkIn && day < checkOut;

  const nights = checkIn && checkOut ? diffDays(checkIn, checkOut) : 0;

  const handleSearch = () => {
    if (!checkIn || !checkOut) {
      Alert.alert('Select Dates', 'Please select both check-in and check-out dates');
      return;
    }
    navigation.navigate('AvailableRooms', {
      checkIn: formatLocalDate(checkIn),
      checkOut: formatLocalDate(checkOut),
      nights,
    });
  };

  // Group days by month for display
  const monthGroups: { month: string; days: { day: Date; weekdayOffset: number }[] }[] = [];
  let currentMonth = -1;
  for (const day of DAYS) {
    if (day.getMonth() !== currentMonth) {
      currentMonth = day.getMonth();
      const firstDay = new Date(day.getFullYear(), day.getMonth(), 1);
      monthGroups.push({
        month: `${MONTHS[day.getMonth()]} ${day.getFullYear()}`,
        days: [],
      });
    }
    monthGroups[monthGroups.length - 1].days.push({ day, weekdayOffset: 0 });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <Header title="Select Dates" subtitle="Step 1 of 4" showBack />

      {/* Step Indicator */}
      <StepIndicator currentStep={1} />

      <ScrollView 
        ref={scrollRef}
        contentContainerStyle={{ padding: spacing.base, gap: spacing.base }}
      >
        {/* Selected Summary */}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {[
            { label: 'Check-In', value: checkIn ? formatDisplayDate(checkIn) : 'Select date', active: activeField === 'checkIn', onPress: () => setActiveField('checkIn') },
            { label: 'Check-Out', value: checkOut ? formatDisplayDate(checkOut) : 'Select date', active: activeField === 'checkOut', onPress: () => setActiveField('checkOut') },
          ].map(({ label, value, active, onPress }) => (
            <TouchableOpacity key={label} onPress={onPress} style={{ flex: 1 }}>
              <Card style={{ borderColor: active ? colors.primary : colors.border, borderWidth: active ? 2 : 1 }} padding={spacing.md}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs }}>
                  <Calendar size={14} color={active ? colors.primary : colors.textMuted} />
                  <Text style={{ fontSize: fontSize.xs, color: active ? colors.primary : colors.textMuted, fontWeight: fontWeight.semiBold as any }}>
                    {label}
                  </Text>
                </View>
                <Text style={{
                  fontSize: fontSize.sm, fontWeight: fontWeight.bold as any,
                  color: value.includes('Select') ? colors.textMuted : colors.textPrimary,
                }}>
                  {value}
                </Text>
              </Card>
            </TouchableOpacity>
          ))}
        </View>

        {(checkIn || checkOut) && (
          <TouchableOpacity onPress={handleClear} style={{ alignSelf: 'flex-end', paddingVertical: spacing.xs }}>
            <Text style={{ color: colors.error, fontSize: fontSize.xs, fontWeight: fontWeight.semiBold as any }}>
              ✕ Clear Selection
            </Text>
          </TouchableOpacity>
        )}

        {nights > 0 && (
          <View style={{
            backgroundColor: colors.primaryLight, borderRadius: radius.md,
            padding: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
          }}>
            <Text style={{ fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.semiBold as any }}>
              {nights} night{nights !== 1 ? 's' : ''} selected
            </Text>
          </View>
        )}

        {/* Calendar */}
        <Card>
          {/* Weekday labels */}
          <View style={{ flexDirection: 'row', marginBottom: spacing.sm }}>
            {WEEKDAYS.map((w) => (
              <View key={w} style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: fontSize.xs, color: colors.textMuted, fontWeight: fontWeight.semiBold as any }}>{w}</Text>
              </View>
            ))}
          </View>

          {monthGroups.map(({ month, days }) => (
            <View key={month}>
              <Text style={{
                fontSize: fontSize.sm, fontWeight: fontWeight.bold as any, color: colors.textPrimary,
                marginTop: spacing.md, marginBottom: spacing.sm,
              }}>
                {month}
              </Text>
              {/* Render days in a 7-column grid */}
              {(() => {
                const firstDayOfWeek = days[0].day.getDay();
                const cells: (Date | null)[] = [
                  ...Array(firstDayOfWeek).fill(null),
                  ...days.map(d => d.day),
                ];
                const rows: (Date | null)[][] = [];
                for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
                return rows.map((row, ri) => (
                  <View key={ri} style={{ flexDirection: 'row', marginBottom: 4 }}>
                    {row.map((day, di) => {
                      if (!day) return <View key={di} style={{ flex: 1 }} />;
                      const isPast     = day < today;
                      const isCheckIn  = checkIn  && day.toDateString() === checkIn.toDateString();
                      const isCheckOut = checkOut && day.toDateString() === checkOut.toDateString();
                      const inRange    = isInRange(day);
                      return (
                        <TouchableOpacity
                          key={di}
                          style={{ flex: 1, alignItems: 'center', paddingVertical: 6 }}
                          onPress={() => !isPast && handleDayPress(day)}
                          disabled={isPast}>
                          <View style={{
                            width: 34, height: 34, borderRadius: 17,
                            backgroundColor:
                              isCheckIn || isCheckOut ? colors.primary
                              : inRange ? colors.primaryMuted
                              : 'transparent',
                            justifyContent: 'center', alignItems: 'center',
                          }}>
                            <Text style={{
                              fontSize: fontSize.sm,
                              fontWeight: (isCheckIn || isCheckOut) ? fontWeight.bold as any : fontWeight.regular as any,
                              color: isCheckIn || isCheckOut ? colors.textOnPrimary : isPast ? colors.textMuted : inRange ? colors.primary : colors.textPrimary,
                            }}>
                              {day.getDate()}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ));
              })()}
            </View>
          ))}
        </Card>

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {/* Sticky CTA */}
      <View style={{
        padding: spacing.base, backgroundColor: colors.surface,
        borderTopWidth: 1, borderTopColor: colors.divider,
        ...theme.shadow.lg,
      }}>
        <Button
          label={checkIn && checkOut ? `Search Available Rooms · ${nights}N` : 'Select Dates to Continue'}
          onPress={handleSearch}
          fullWidth size="lg"
          disabled={!checkIn || !checkOut}
          icon={<ChevronRight size={20} color={colors.textOnPrimary} />}
        />
      </View>
    </SafeAreaView>
  );
}
