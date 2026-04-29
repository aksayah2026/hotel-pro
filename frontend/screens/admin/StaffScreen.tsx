import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Alert, StatusBar, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Edit3, X, UserPlus, Phone, Trash2 } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { authService, User } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { Header } from '../../components/Header';
import { Button } from '../../components/Button';

export default function StaffScreen() {
  const { theme } = useTheme();
  const { colors, spacing, fontSize, fontWeight, radius } = theme;
  const { user: currentUser, refreshUser } = useAuth();

  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [staff, setStaff] = useState<User[]>([]);
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<User | null>(null);
  const [staffForm, setStaffForm] = useState({
    name: '', mobile: '', password: '', role: 'STAFF' as User['role'],
  });
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const res = await authService.getAllUsers();
      setStaff(res.data.data);
    } catch {
      Alert.alert('Error', 'Failed to load staff');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openStaffModal = (user: User | null = null) => {
    setEditingStaff(user);
    if (user) {
      setStaffForm({ name: user.name, mobile: user.mobile, password: '', role: user.role });
    } else {
      setStaffForm({ name: '', mobile: '', password: '', role: 'STAFF' });
    }
    setStaffModalOpen(true);
  };

  const handleSaveStaff = async () => {
    if (!staffForm.name || !staffForm.mobile || (!editingStaff && !staffForm.password)) {
      return Alert.alert('Validation', 'Please fill all required fields');
    }
    
    const cleanMobile = staffForm.mobile.replace(/\D/g, "");
    if (cleanMobile.length !== 10) {
      return Alert.alert('Validation', 'Mobile number must be exactly 10 digits');
    }
    setActionLoading('saveStaff');
    try {
      if (editingStaff) {
        await authService.updateUser(editingStaff.id, { ...staffForm, mobile: cleanMobile });
        if (editingStaff.id === currentUser?.id) {
          await refreshUser();
        }
        Alert.alert('Success', 'Staff updated');
      } else {
        await authService.createUser({ ...staffForm, mobile: cleanMobile });
        Alert.alert('Success', 'Staff added');
      }
      setStaffModalOpen(false);
      fetchData();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Failed to save staff');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteStaff = (user: User) => {
    Alert.alert('Permanent Delete', `Delete ${user.name} permanently? This action cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { 
          await authService.deleteUser(user.id); 
          fetchData(); 
        } catch (err: any) { 
          Alert.alert('Error', err?.response?.data?.message ?? 'Failed to delete'); 
        }
      }}
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <Header title="Staff Directory" showBack />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const activeCount = staff.filter(u => u.isActive).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <Header 
        title="Staff Storage" 
        subtitle={`Welcome, ${currentUser?.name || 'Admin'} · ${activeCount}/4 active`} 
        showBack 
        rightAction={
          activeCount < 4 && (
            <TouchableOpacity onPress={() => openStaffModal()} style={{ padding: 4 }}>
              <UserPlus size={20} color={colors.primary} />
            </TouchableOpacity>
          )
        }
      />

      <ScrollView 
        contentContainerStyle={{ padding: spacing.base }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} colors={[colors.primary]} />}
      >
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.divider }}>
          {staff.map((u, idx) => (
            <View key={u.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, borderBottomWidth: idx === staff.length - 1 ? 0 : 1, borderBottomColor: colors.divider }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <View style={{ width: 4, height: 28, borderRadius: 2, backgroundColor: u.role !== 'STAFF' ? colors.primary : colors.textMuted }} />
                <View>
                  <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold as any, color: colors.textPrimary }}>{u.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Phone size={10} color={colors.textMuted} />
                    <Text style={{ fontSize: fontSize.xs, color: colors.textMuted }}>{u.mobile} · {u.role}</Text>
                  </View>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <TouchableOpacity onPress={() => openStaffModal(u)} style={{ padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.backgroundSecondary }}>
                  <Edit3 size={16} color={colors.primary} />
                </TouchableOpacity>
                {u.id !== currentUser?.id && (
                  <TouchableOpacity onPress={() => handleDeleteStaff(u)} style={{ padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.errorBg }}>
                    <Trash2 size={16} color={colors.error} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <Modal visible={staffModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl }}>
              <Text style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold as any, color: colors.textPrimary }}>{editingStaff ? 'Update User' : 'New User'}</Text>
              <TouchableOpacity onPress={() => setStaffModalOpen(false)} style={{ padding: spacing.sm }}><X size={24} color={colors.textSecondary} /></TouchableOpacity>
            </View>
            <View style={{ gap: spacing.md }}>
              <View>
                <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.xs }}>Name</Text>
                <TextInput style={{ height: 50, backgroundColor: colors.backgroundSecondary, borderRadius: radius.md, paddingHorizontal: spacing.md, color: colors.textPrimary }} value={staffForm.name} onChangeText={v => setStaffForm(p => ({ ...p, name: v }))} placeholder="John Doe" />
              </View>
              <View>
                <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.xs }}>Mobile</Text>
                <TextInput 
                  style={{ height: 50, backgroundColor: colors.backgroundSecondary, borderRadius: radius.md, paddingHorizontal: spacing.md, color: colors.textPrimary }} 
                  value={staffForm.mobile} 
                  onChangeText={v => setStaffForm(p => ({ ...p, mobile: v.replace(/\D/g, "") }))} 
                  placeholder="9988776655" 
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>
              <View>
                <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.xs }}>Password</Text>
                <TextInput style={{ height: 50, backgroundColor: colors.backgroundSecondary, borderRadius: radius.md, paddingHorizontal: spacing.md, color: colors.textPrimary }} value={staffForm.password} onChangeText={v => setStaffForm(p => ({ ...p, password: v }))} placeholder="••••••••" secureTextEntry />
              </View>
              <View>
                <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.xs }}>Role</Text>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  {['STAFF', 'TENANT_ADMIN'].map(r => (
                    <TouchableOpacity key={r} onPress={() => setStaffForm(p => ({ ...p, role: r as any }))} style={{ flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1.5, borderColor: staffForm.role === r ? colors.primary : colors.divider, backgroundColor: staffForm.role === r ? colors.primaryMuted : 'transparent', alignItems: 'center' }}>
                      <Text style={{ color: staffForm.role === r ? colors.primary : colors.textSecondary, fontWeight: fontWeight.bold as any }}>{r === 'TENANT_ADMIN' ? 'ADMIN' : r}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <Button label={editingStaff ? 'Update User' : 'Register User'} fullWidth size="lg" onPress={handleSaveStaff} loading={actionLoading === 'saveStaff'} style={{ marginTop: spacing.md }} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
