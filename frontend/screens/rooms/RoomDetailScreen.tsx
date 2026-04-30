import React, { useState } from 'react';
import {
  View, Text, ScrollView, Alert, StatusBar, TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { roomService, Room, Amenity } from '../../services/roomService';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge, statusVariant } from '../../components/Badge';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Edit2, Trash2, CheckCircle } from 'lucide-react-native';

const STATUS_OPTIONS: Room['status'][] = ['AVAILABLE', 'OCCUPIED', 'CLEANING', 'MAINTENANCE'];

export default function RoomDetailScreen() {
  const { theme } = useTheme();
  const { colors, spacing, fontSize, fontWeight, radius } = theme;
  const { isAdmin } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const initialRoom = route?.params?.room;
  const onRefresh = route?.params?.onRefresh;

  const [room, setRoom]     = useState<Room>(initialRoom);
  const [loading, setLoading] = useState(false);

  if (!initialRoom) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Header title="Room Details" showBack />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl }}>
           <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold as any, color: colors.error }}>Invalid Navigation</Text>
           <Text style={{ fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm }}>
             Missing room data parameter.
           </Text>
           <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: spacing.xl, padding: spacing.md, backgroundColor: colors.primary, borderRadius: radius.md }}>
             <Text style={{ color: colors.textOnPrimary, fontWeight: fontWeight.bold as any }}>Go Back</Text>
           </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleStatusChange = async (status: Room['status']) => {
    if (status === room.status) return;
    setLoading(true);
    try {
      await roomService.updateStatus(room.id, status);
      setRoom((prev) => ({ ...prev, status }));
      onRefresh?.();
    } catch {
      Alert.alert('Error', 'Failed to update room status');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Deactivate Room',
      `Are you sure you want to deactivate Room ${room.roomNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate', style: 'destructive',
          onPress: async () => {
            try {
              await roomService.delete(room.id);
              onRefresh?.();
              navigation.goBack();
            } catch {
              Alert.alert('Error', 'Failed to deactivate room');
            }
          },
        },
      ]
    );
  };

  const typeIcons: Record<string, string> = { SINGLE: '🛏️', DOUBLE: '🛏️🛏️', SUITE: '👑', DELUXE: '✨' };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <Header
        title={`Room ${room.roomNumber}`}
        subtitle={`Floor ${room.floor} · ${room.roomType?.name ?? 'Unknown'}`}
        showBack
        rightAction={
          isAdmin ? (
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <TouchableOpacity
                onPress={() => navigation.navigate('AddRoom', { room, onRefresh: () => { onRefresh?.(); navigation.goBack(); } })}
                style={{ padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.primaryMuted }}>
                <Edit2 size={18} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDelete}
                style={{ padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.errorBg }}>
                <Trash2 size={18} color={colors.error} />
              </TouchableOpacity>
            </View>
          ) : undefined
        }
      />

      <ScrollView contentContainerStyle={{ 
        padding: spacing.base, 
        gap: spacing.base,
        paddingBottom: insets.bottom + 40
      }}>
        {/* Hero Card */}
        <View style={{
          backgroundColor: colors.primary,
          borderRadius: radius.xl, padding: spacing.xl,
          ...theme.shadow.lg,
        }}>
          <Text style={{ fontSize: 56, textAlign: 'center' }}>{typeIcons[room.roomType?.name] ?? '🏨'}</Text>

          <View style={{ alignItems: 'center', marginTop: spacing.md }}>
            <Badge label={room.status} variant={statusVariant(room.status)} size="md" />
          </View>
        </View>

        {/* Details */}
        <Card>
          <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold as any, color: colors.textPrimary, marginBottom: spacing.md }}>
            Room Details
          </Text>
          {[
            { label: 'Room Type',  value: room.roomType?.name ?? 'Unknown' },
            { label: 'Nightly Tariff', value: `₹${Number(room.baseTariff || 0).toLocaleString('en-IN')}` },
            { label: 'Floor',      value: `Floor ${room.floor}` },
            { label: 'Capacity',   value: `${room.capacity} guests` },
            { label: 'Room No.',   value: room.roomNumber },
          ].map(({ label, value }) => (
            <View key={label} style={{
              flexDirection: 'row', justifyContent: 'space-between',
              paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.divider,
            }}>
              <Text style={{ fontSize: fontSize.sm, color: colors.textMuted }}>{label}</Text>
              <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semiBold as any, color: colors.textPrimary }}>{value}</Text>
            </View>
          ))}
        </Card>

        {/* Amenities */}
        {room.amenities?.length > 0 && (
          <Card>
            <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold as any, color: colors.textPrimary, marginBottom: spacing.md }}>
              Amenities
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {room.amenities.map((a: Amenity) => (
                <View key={a.id} style={{
                  flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
                  backgroundColor: colors.successBg, borderRadius: radius.full,
                  paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
                }}>
                  <CheckCircle size={12} color={colors.success} />
                  <Text style={{ fontSize: fontSize.sm, color: colors.success }}>{a.name}</Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Status Change */}
        <Card>
          <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold as any, color: colors.textPrimary, marginBottom: spacing.md }}>
            Update Status
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {STATUS_OPTIONS.map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => handleStatusChange(s)}
                style={{
                  paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
                  borderRadius: radius.md, borderWidth: 1.5,
                  borderColor: s === room.status ? colors.primary : colors.border,
                  backgroundColor: s === room.status ? colors.primaryMuted : colors.surface,
                }}>
                <Text style={{
                  fontSize: fontSize.sm, fontWeight: fontWeight.semiBold as any,
                  color: s === room.status ? colors.primary : colors.textSecondary,
                }}>
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

      </ScrollView>
    </View>
  );
}
