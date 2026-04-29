import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Alert, StatusBar, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { roomService, Room, RoomType, Amenity } from '../../services/roomService';
import { Header } from '../../components/Header';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { useNavigation, useRoute } from '@react-navigation/native';

export default function AddRoomScreen() {
  const { theme } = useTheme();
  const { colors, spacing, fontSize, fontWeight, radius } = theme;
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const existingRoom: Room | undefined = route.params?.room;
  const onRefresh = route.params?.onRefresh;
  const isEdit = !!existingRoom;

  const [form, setForm] = useState({
    roomNumber: existingRoom?.roomNumber ?? '',
    type: existingRoom?.typeId ?? '',
    floor: String(existingRoom?.floor ?? '1'),
    capacity: String(existingRoom?.capacity ?? '2'),
    baseTariff: String(existingRoom?.baseTariff ?? ''),
    description: existingRoom?.description ?? '',
  });

  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [allAmenities, setAllAmenities] = useState<Amenity[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(
    existingRoom?.amenities?.map(a => a.id) ?? []
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [fetchingOptions, setFetchingOptions] = useState(true);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [typesRes, amenitiesRes] = await Promise.all([
          roomService.getTypes(),
          roomService.getAmenities()
        ]);
        setRoomTypes(typesRes.data.data);
        setAllAmenities(amenitiesRes.data.data);
        
        // Default to first type if not editing
        if (!isEdit && typesRes.data.data.length > 0) {
          setForm(p => ({ ...p, type: typesRes.data.data[0].id }));
        }
      } catch {
        Alert.alert('Error', 'Failed to load room types and amenities');
      } finally {
        setFetchingOptions(false);
      }
    };
    fetchOptions();
  }, [isEdit]);

  const set = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const toggleAmenity = (id: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.roomNumber) e.roomNumber = 'Room number required';
    if (!form.type) e.type = 'Room type required';
    if (!form.floor || isNaN(Number(form.floor))) e.floor = 'Valid floor required';
    if (!form.baseTariff || isNaN(Number(form.baseTariff)) || Number(form.baseTariff) <= 0) {
      e.baseTariff = 'Valid nightly tariff required';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        roomNumber: form.roomNumber,
        type: form.type,
        floor: parseInt(form.floor),
        capacity: parseInt(form.capacity),
        baseTariff: parseFloat(form.baseTariff),
        amenities: selectedAmenities,
        description: form.description,
      };
      if (isEdit) {
        await roomService.update(existingRoom!.id, payload);
        Alert.alert('Success', 'Room updated successfully');
      } else {
        await roomService.create(payload);
        Alert.alert('Success', 'Room created successfully');
      }
      onRefresh?.();
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Failed to save room');
    } finally {
      setLoading(false);
    }
  };

  if (fetchingOptions) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <Header title={isEdit ? 'Edit Room' : 'Add Room'} showBack />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: spacing.md, color: colors.textSecondary }}>Loading options...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <Header title={isEdit ? 'Edit Room' : 'Add New Room'} showBack />

      <ScrollView contentContainerStyle={{ padding: spacing.base, gap: spacing.base }}>
        <Card>
          <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold as any, color: colors.textPrimary, marginBottom: spacing.md }}>
            Basic Information
          </Text>
          <Input label="Room Number" placeholder="e.g. 101" value={form.roomNumber} onChangeText={(v) => set('roomNumber', v)} error={errors.roomNumber} />
          <Input label="Floor" placeholder="e.g. 1" value={form.floor} onChangeText={(v) => set('floor', v)} keyboardType="numeric" error={errors.floor} />
          <Input label="Nightly Tariff (₹) *" placeholder="e.g. 1500" value={form.baseTariff} onChangeText={(v) => set('baseTariff', v)} keyboardType="numeric" error={errors.baseTariff} />
          <Input label="Capacity (guests)" placeholder="e.g. 2" value={form.capacity} onChangeText={(v) => set('capacity', v)} keyboardType="numeric" />
          <Input label="Description (optional)" placeholder="Brief room description..." value={form.description} onChangeText={(v) => set('description', v)} multiline numberOfLines={3} />
        </Card>

        {/* Room Type */}
        <Card>
          <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold as any, color: colors.textPrimary, marginBottom: spacing.md }}>
            Room Type
          </Text>
          {roomTypes.length === 0 ? (
            <Text style={{ color: colors.error, fontSize: fontSize.sm }}>No room types found. Please add them in Settings.</Text>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {roomTypes.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => set('type', t.id)}
                  style={{
                    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
                    borderRadius: radius.md, borderWidth: 1.5,
                    borderColor: form.type === t.id ? colors.primary : colors.border,
                    backgroundColor: form.type === t.id ? colors.primaryMuted : colors.surface,
                    flex: 1, minWidth: '45%', alignItems: 'center',
                  }}>
                  <Text style={{
                    fontSize: fontSize.sm, fontWeight: fontWeight.semiBold as any, textAlign: 'center',
                    color: form.type === t.id ? colors.primary : colors.textSecondary,
                  }}>
                    {t.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {errors.type && <Text style={{ color: colors.error, fontSize: fontSize.xs, marginTop: spacing.xs }}>{errors.type}</Text>}
        </Card>

        {/* Amenities */}
        <Card>
          <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold as any, color: colors.textPrimary, marginBottom: spacing.md }}>
            Amenities
          </Text>
          {allAmenities.length === 0 ? (
            <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>No amenities found. Please add them in Settings.</Text>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {allAmenities.map((a) => {
                const selected = selectedAmenities.includes(a.id);
                return (
                  <TouchableOpacity
                    key={a.id}
                    onPress={() => toggleAmenity(a.id)}
                    style={{
                      paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
                      borderRadius: radius.full, borderWidth: 1.5,
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: selected ? colors.primaryMuted : colors.surface,
                    }}>
                    <Text style={{
                      fontSize: fontSize.sm,
                      color: selected ? colors.primary : colors.textSecondary,
                      fontWeight: selected ? fontWeight.semiBold as any : fontWeight.regular as any,
                    }}>
                      {a.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </Card>

        <Button label={isEdit ? 'Update Room' : 'Create Room'} onPress={handleSubmit} loading={loading} fullWidth size="lg" />
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}
