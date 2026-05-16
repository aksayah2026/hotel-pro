import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StatusBar, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useIsFocused } from '@react-navigation/native';
import { BedDouble, ChevronRight, CheckCircle } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { roomService, Room, Amenity } from '../../services/roomService';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { EmptyState, Loading } from '../../components/LoadingState';
import { StepIndicator } from '../../components/StepIndicator';
import { formatDisplayShort } from '../../utils/date';

export default function AvailableRoomsScreen() {
  const { theme } = useTheme();
  const { colors, spacing, fontSize, fontWeight, radius } = theme;
  const navigation = useNavigation<any>();
  const route      = useRoute<any>();
  
  const checkIn = route?.params?.checkIn;
  const checkOut = route?.params?.checkOut;
  const nights = route?.params?.nights;

  const [rooms, setRooms]         = useState<Room[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<Room[]>([]);

  const isFocused = useIsFocused();
  const [validating, setValidating] = useState(false);

  const [totalRooms, setTotalRooms] = useState<number | null>(null);

  const fetchRooms = async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const [availRes, allRes] = await Promise.all([
        roomService.getAvailable(checkIn, checkOut),
        roomService.getAll()
      ]);
      setRooms(availRes.data.data);
      setTotalRooms(allRes.data.data.length);
    } catch {
      Alert.alert('Error', 'Failed to fetch available rooms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused && checkIn && checkOut) {
      fetchRooms(rooms.length === 0); // Show loading spinner only on first load
    }
  }, [isFocused, checkIn, checkOut]);

  const handleContinue = async () => {
    setValidating(true);
    try {
      const res = await roomService.getAvailable(checkIn, checkOut);
      const fresh = res.data.data;
      
      const unavailable = selected.filter(s => !fresh.some(f => f.id === s.id));
      if (unavailable.length > 0) {
        setRooms(fresh);
        // Deselect rooms that are no longer available
        setSelected(prev => prev.filter(p => fresh.some(f => f.id === p.id)));
        
        Alert.alert(
          'Room Unavailable',
          'Selected room is currently under cleaning and unavailable for booking. Please choose another room.'
        );
        return;
      }
      
      navigation.navigate('CustomerDetails', { rooms: selected, checkIn, checkOut, nights });
    } catch {
      Alert.alert('Verification Failed', 'Failed to verify room availability. Please try again.');
    } finally {
      setValidating(false);
    }
  };

  if (!checkIn || !checkOut || !nights) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl }}>
           <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold as any, color: colors.error }}>Invalid Navigation</Text>
           <Text style={{ fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm }}>
             Missing booking date parameters.
           </Text>
           <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: spacing.xl, padding: spacing.md, backgroundColor: colors.primary, borderRadius: radius.md }}>
             <Text style={{ color: colors.textOnPrimary, fontWeight: fontWeight.bold as any }}>Go Back</Text>
           </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const formatDisplay = (d: string) => formatDisplayShort(d);

  const typeIcons: Record<string, string> = { SINGLE: '🛏️', DOUBLE: '🛏️🛏️', SUITE: '👑', DELUXE: '✨' };

  const toggleRoom = (room: Room) => {
    setSelected((prev) => {
      const alreadySelected = prev.some((r) => r.id === room.id);
      if (alreadySelected) return prev.filter((r) => r.id !== room.id);
      return [...prev, room];
    });
  };

  const renderRoom = ({ item }: { item: Room }) => {
    const isSelected = selected.some((r) => r.id === item.id);

    return (
      <TouchableOpacity activeOpacity={0.85} onPress={() => toggleRoom(item)}>
        <Card style={{
          marginBottom: spacing.sm,
          borderWidth: isSelected ? 2 : 1,
          borderColor: isSelected ? colors.primary : colors.border,
        }} padding={spacing.base}>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            {/* Icon */}
            <View style={{
              width: 64, height: 64, borderRadius: radius.md,
              backgroundColor: isSelected ? colors.primaryMuted : colors.backgroundSecondary,
              justifyContent: 'center', alignItems: 'center',
            }}>
              <Text style={{ fontSize: 30 }}>{typeIcons[item.roomType?.name] ?? '🏨'}</Text>
            </View>

            {/* Info */}
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold as any, color: colors.textPrimary }}>
                  Room {item.roomNumber}
                </Text>
                {isSelected && (
                  <CheckCircle size={22} color={colors.primary} />
                )}
              </View>
              <Text style={{ fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 }}>
                {item.roomType?.name ?? 'Unknown'} · Floor {item.floor} · {item.capacity} guests
              </Text>
              <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold as any, color: colors.primary, marginTop: 2 }}>
                ₹{Number(item.baseTariff || 0).toLocaleString('en-IN')}<Text style={{ fontSize: fontSize.xs, color: colors.textMuted, fontWeight: fontWeight.regular as any }}>/night</Text>
              </Text>

              {/* Amenities */}
              {item.amenities?.length > 0 && (
                <View style={{ flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs, flexWrap: 'wrap' }}>
                  {item.amenities.slice(0, 3).map((a: Amenity) => (
                    <View key={a.id} style={{
                      backgroundColor: colors.backgroundSecondary, borderRadius: radius.full,
                      paddingHorizontal: spacing.sm, paddingVertical: 2,
                    }}>
                      <Text style={{ fontSize: fontSize.xs, color: colors.textMuted }}>{a.name}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Tap hint */}
              <Text style={{ fontSize: fontSize.xs, color: isSelected ? colors.primary : colors.textMuted, marginTop: spacing.xs }}>
                {isSelected ? '✓ Selected' : 'Tap to select'}
              </Text>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  if (loading) return <Loading message="Checking availability..." />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <Header
        title="Available Rooms"
        subtitle={`${formatDisplay(checkIn)} → ${formatDisplay(checkOut)} · ${nights} night${nights > 1 ? 's' : ''}`}
        showBack
      />
      <StepIndicator currentStep={2} />

      <FlatList
        data={rooms}
        keyExtractor={(i) => i.id}
        renderItem={renderRoom}
        contentContainerStyle={{ padding: spacing.base, flexGrow: 1 }}
        ListHeaderComponent={
          rooms.length > 0 ? (
            <View style={{
              backgroundColor: colors.successBg, borderRadius: radius.md,
              padding: spacing.md, marginBottom: spacing.base, flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
            }}>
              <BedDouble size={16} color={colors.success} />
              <Text style={{ fontSize: fontSize.sm, color: colors.success, fontWeight: fontWeight.semiBold as any }}>
                {rooms.length} room{rooms.length > 1 ? 's' : ''} available · Select one or more
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: spacing['3xl'] }}>
            <Card style={{ width: '100%', paddingVertical: spacing['3xl'], paddingHorizontal: spacing.xl, alignItems: 'center', backgroundColor: colors.surface, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.divider }}>
              <EmptyState
                icon={<BedDouble size={64} color={colors.textMuted} strokeWidth={1} style={{ opacity: 0.6 }} />}
                title={totalRooms === 0 ? "No Rooms Available" : "Fully Booked"}
                message={totalRooms === 0 
                  ? "Rooms have not been created yet. Please create rooms in Room Management before proceeding with bookings."
                  : "All rooms are booked for the selected dates. Please try different dates."
                }
                action={
                  <View style={{ marginTop: spacing.xl, width: '100%', gap: spacing.md }}>
                    {totalRooms === 0 ? (
                      <>
                        <Button 
                          label="Create Room" 
                          onPress={() => navigation.navigate('AddRoom')}
                          fullWidth
                          size="lg"
                        />
                        <Text style={{ fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs }}>
                          You can create rooms from the Room Management section anytime.
                        </Text>
                      </>
                    ) : (
                      <Button 
                        label="Change Search Dates" 
                        onPress={() => navigation.goBack()} 
                        variant="secondary"
                        fullWidth
                      />
                    )}
                  </View>
                }
              />
            </Card>
          </View>
        }
      />

      {/* Sticky CTA */}
      {selected.length > 0 && (
        <View style={{
          padding: spacing.base, backgroundColor: colors.surface,
          borderTopWidth: 1, borderTopColor: colors.divider, ...theme.shadow.lg,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
            <Text style={{ fontSize: fontSize.sm, color: colors.textMuted }}>
              {selected.length} room{selected.length > 1 ? 's' : ''} selected
            </Text>
            <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold as any, color: colors.textPrimary }}>
              {selected.map((r) => `Room ${r.roomNumber}`).join(', ')}
            </Text>
          </View>
          <Button
            label={`Continue with ${selected.length} Room${selected.length > 1 ? 's' : ''}`}
            onPress={handleContinue}
            loading={validating}
            fullWidth size="lg"
            icon={<ChevronRight size={20} color={colors.textOnPrimary} />}
          />
        </View>
      )}
    </SafeAreaView>
  );
}
