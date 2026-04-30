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
    const trimmed = newAmenity.trim();
    if (!trimmed) return;
    
    // Duplicate check
    const exists = amenities.some(a => a.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      Alert.alert('Duplicate', 'This amenity already exists');
      return;
    }

    setActionLoading('addAmenity');
    try {
      await roomService.createAmenity(trimmed);
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
          paddingBottom: insets.bottom + 60 
        }}
        keyboardShouldPersistTaps="handled"
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
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md }}>
          {amenities.map(a => (
            <View key={a.id} style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              backgroundColor: colors.backgroundSecondary,
              paddingHorizontal: spacing.md, 
              paddingVertical: spacing.sm, 
              borderRadius: radius.full, 
              margin: 2,
              maxWidth: '90%',
              borderWidth: 1,
              borderColor: colors.border,
            }}>
              <Text 
                numberOfLines={1} 
                ellipsizeMode="tail"
                style={{ 
                  fontSize: fontSize.sm, 
                  color: colors.textPrimary, 
                  flexShrink: 1,
                  marginRight: spacing.xs,
                  fontWeight: fontWeight.medium as any
                }}
              >
                {a.name}
              </Text>
              <TouchableOpacity 
                onPress={() => handleDeleteAmenity(a.id, a.name)}
                style={{ padding: 2 }}
              >
                <X size={16} color={colors.error} opacity={0.8} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          gap: spacing.sm, 
          paddingHorizontal: spacing.md, 
          paddingVertical: 6, 
          backgroundColor: colors.backgroundSecondary, 
          borderRadius: radius.md, 
          borderWidth: 1, 
          borderStyle: 'dashed', 
          borderColor: colors.primary + '60' 
        }}>
          <TextInput
            style={{ flex: 1, height: 40, fontSize: fontSize.sm, color: colors.textPrimary }}
            placeholder="e.g. Free WiFi, Pool..." placeholderTextColor={colors.textMuted}
            value={newAmenity} onChangeText={setNewAmenity} onSubmitEditing={handleAddAmenity}
          />
          <TouchableOpacity 
            onPress={handleAddAmenity}
            disabled={!newAmenity.trim()}
            style={{ 
              backgroundColor: newAmenity.trim() ? colors.primary : colors.border,
              paddingHorizontal: spacing.md,
              paddingVertical: 6,
              borderRadius: radius.sm
            }}
          >
            <Text style={{ color: colors.textOnPrimary, fontSize: fontSize.xs, fontWeight: fontWeight.bold as any }}>ADD</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
