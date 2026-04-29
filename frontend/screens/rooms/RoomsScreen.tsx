import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  RefreshControl, StatusBar, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Plus, BedDouble, Filter } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { roomService, Room } from '../../services/roomService';
import { Card } from '../../components/Card';
import { Badge, statusVariant } from '../../components/Badge';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/LoadingState';

const FILTERS = ['ALL', 'AVAILABLE', 'OCCUPIED', 'CLEANING', 'MAINTENANCE'];

export default function RoomsScreen() {
  const { theme } = useTheme();
  const { colors, spacing, fontSize, fontWeight, radius } = theme;
  const { isAdmin } = useAuth();
  const navigation = useNavigation<any>();

  const [rooms, setRooms]           = useState<Room[]>([]);
  const [filtered, setFiltered]     = useState<Room[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('ALL');

  const fetchRooms = useCallback(async () => {
    try {
      const res = await roomService.getAll();
      setRooms(res.data.data);
      setFiltered(res.data.data);
    } catch (_) {
      Alert.alert('Error', 'Failed to load rooms');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  useEffect(() => {
    setFiltered(activeFilter === 'ALL' ? rooms : rooms.filter(r => r.status === activeFilter));
  }, [activeFilter, rooms]);

  const counts = FILTERS.slice(1).reduce((acc, f) => {
    acc[f] = rooms.filter(r => r.status === f).length;
    return acc;
  }, {} as Record<string, number>);

  const typeIcons: Record<string, string> = {
    SINGLE: '🛏️', DOUBLE: '🛏️🛏️', SUITE: '👑', DELUXE: '✨'
  };

  const renderRoom = ({ item }: { item: Room }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => navigation.navigate('RoomDetail', { room: item, onRefresh: fetchRooms })}>
      <Card style={{ marginBottom: spacing.sm }} padding={spacing.base}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          {/* Left */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 }}>
            <View style={{
              width: 52, height: 52, borderRadius: radius.md,
              backgroundColor: colors.primaryLight,
              justifyContent: 'center', alignItems: 'center',
            }}>
              <Text style={{ fontSize: 24 }}>{typeIcons[item.roomType?.name] ?? '🏨'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{
                fontSize: fontSize.lg, fontWeight: fontWeight.bold as any, color: colors.textPrimary,
              }}>
                Room {item.roomNumber}
              </Text>
              <Text style={{ fontSize: fontSize.sm, color: colors.textMuted, marginTop: 4, textTransform: 'capitalize' }}>
                {item.roomType?.name?.toLowerCase() ?? 'unknown'} · {item.capacity} guests
              </Text>
              <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold as any, color: colors.primary, marginTop: 2 }}>
                ₹{Number(item.baseTariff || 0).toLocaleString('en-IN')}<Text style={{ fontSize: fontSize.xs, color: colors.textMuted, fontWeight: fontWeight.regular as any }}>/night</Text>
              </Text>
            </View>
          </View>
          {/* Right */}
          <Badge label={item.status} variant={statusVariant(item.status)} />
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: spacing.base, paddingVertical: spacing.md,
        backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider,
        ...theme.shadow.sm,
      }}>
        <View>
          <Text style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold as any, color: colors.textPrimary }}>
            Rooms
          </Text>
          <Text style={{ fontSize: fontSize.sm, color: colors.textMuted }}>
            {rooms.length} total · {counts['AVAILABLE'] ?? 0} available
          </Text>
        </View>
        {isAdmin && (
          <Button
            label="Add Room"
            size="sm"
            onPress={() => navigation.navigate('AddRoom', { onRefresh: fetchRooms })}
            icon={<Plus size={16} color={colors.textOnPrimary} />}
          />
        )}
      </View>

      {/* Filter Tabs */}
      <View style={{ backgroundColor: colors.surface, paddingBottom: spacing.sm }}>
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
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.xs,
                  borderRadius: radius.full,
                  backgroundColor: active ? colors.primary : colors.backgroundSecondary,
                  flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
                }}>
                <Text style={{
                  fontSize: fontSize.sm,
                  fontWeight: fontWeight.semiBold as any,
                  color: active ? colors.textOnPrimary : colors.textSecondary,
                }}>
                  {item === 'ALL' ? 'All' : item.charAt(0) + item.slice(1).toLowerCase()}
                </Text>
                {item !== 'ALL' && counts[item] !== undefined && (
                  <View style={{
                    backgroundColor: active ? 'rgba(255,255,255,0.3)' : colors.border,
                    borderRadius: radius.full, paddingHorizontal: 6, paddingVertical: 1,
                  }}>
                    <Text style={{ fontSize: fontSize.xs, color: active ? colors.textOnPrimary : colors.textMuted }}>
                      {counts[item]}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        renderItem={renderRoom}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRooms(); }} colors={[colors.primary]} />}
        contentContainerStyle={{ padding: spacing.base, flexGrow: 1 }}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon={<BedDouble size={56} color={colors.textMuted} />}
              title="No rooms found"
              message={activeFilter !== 'ALL' ? `No ${activeFilter.toLowerCase()} rooms` : 'Add your first room to get started'}
            />
          ) : null
        }
      />
    </SafeAreaView>
  );
}
