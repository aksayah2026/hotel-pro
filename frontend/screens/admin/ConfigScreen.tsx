import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Alert, StatusBar, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Send, Trash2, X } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { roomService, RoomType, Amenity } from '../../services/roomService';
import { useAuth } from '../../context/AuthContext';
import { Header } from '../../components/Header';

export default function ConfigScreen() {
  const { theme } = useTheme();
  const { colors, spacing, fontSize, fontWeight, radius } = theme;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [newType, setNewType] = useState('');
  const [newAmenity, setNewAmenity] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [typesRes, amenitiesRes] = await Promise.all([
        roomService.getTypes(),
        roomService.getAmenities()
      ]);
      setRoomTypes(typesRes.data.data);
      setAmenities(amenitiesRes.data.data);
    } catch {
      Alert.alert('Error', 'Failed to load configuration');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddType = async () => {
    if (!newType.trim()) return;
    setActionLoading('addType');
    try {
      await roomService.createType(newType);
      setNewType('');
      fetchData();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Failed to add room type');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteType = (id: string, name: string) => {
    Alert.alert('Delete', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await roomService.deleteType(id); fetchData(); }
        catch (err: any) { Alert.alert('Error', err?.response?.data?.message ?? 'Failed to delete'); }
      }}
    ]);
  };

  const handleAddAmenity = async () => {
    if (!newAmenity.trim()) return;
    setActionLoading('addAmenity');
    try {
      await roomService.createAmenity(newAmenity);
      setNewAmenity('');
      fetchData();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Failed to add amenity');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteAmenity = (id: string, name: string) => {
    Alert.alert('Delete', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await roomService.deleteAmenity(id); fetchData(); }
        catch (err: any) { Alert.alert('Error', err?.response?.data?.message ?? 'Failed to delete'); }
      }}
    ]);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Header title="Hotel Config" showBack />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  const SectionTitle = ({ title }: { title: string }) => (
    <View style={{ marginBottom: spacing.md, marginTop: spacing.lg, paddingHorizontal: 4 }}>
      <Text style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold as any, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.5 }}>
        {title}
      </Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <Header 
        title="Hotel Config" 
        subtitle={`Welcome, ${user?.name || 'Admin'}`} 
        showBack 
      />

      <ScrollView 
        contentContainerStyle={{ 
          paddingHorizontal: spacing.base, 
          paddingBottom: insets.bottom + 40 
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} colors={[colors.primary]} />}
      >
        <SectionTitle title="Room Types" />
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.divider }}>
          {roomTypes.map((t, idx) => (
            <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, borderBottomWidth: idx === roomTypes.length - 1 ? 0 : 1, borderBottomColor: colors.divider }}>
              <Text style={{ fontSize: fontSize.md, color: colors.textPrimary, fontWeight: fontWeight.medium as any }}>{t.name}</Text>
              <TouchableOpacity onPress={() => handleDeleteType(t.id, t.name)} style={{ padding: 4 }}>
                <Trash2 size={16} color={colors.error} opacity={0.6} />
              </TouchableOpacity>
            </View>
          ))}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, paddingHorizontal: spacing.md, backgroundColor: colors.backgroundSecondary + '40' }}>
            <Plus size={18} color={colors.primary} />
            <TextInput
              style={{ flex: 1, height: 40, color: colors.textPrimary, fontSize: fontSize.md }}
              placeholder="Add new type..." placeholderTextColor={colors.textMuted}
              value={newType} onChangeText={setNewType} onSubmitEditing={handleAddType}
            />
            {newType.length > 0 && <TouchableOpacity onPress={handleAddType}><Send size={18} color={colors.primary} /></TouchableOpacity>}
          </View>
        </View>

        <SectionTitle title="Amenities" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {amenities.map(a => (
            <View key={a.id} style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.divider, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: fontSize.sm, color: colors.textPrimary }}>{a.name}</Text>
              <TouchableOpacity onPress={() => handleDeleteAmenity(a.id, a.name)}>
                <X size={14} color={colors.error} opacity={0.6} />
              </TouchableOpacity>
            </View>
          ))}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: 4, backgroundColor: colors.backgroundSecondary, borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary + '40', minWidth: 140 }}>
            <TextInput
              style={{ flex: 1, height: 32, fontSize: fontSize.sm, color: colors.textPrimary }}
              placeholder="Add amenity..." placeholderTextColor={colors.textMuted}
              value={newAmenity} onChangeText={setNewAmenity} onSubmitEditing={handleAddAmenity}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
