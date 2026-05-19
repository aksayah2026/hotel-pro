import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Alert, StatusBar, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Edit3, X, UserPlus, Phone, Trash2 } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { authService, User } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { Header } from '../../components/Header';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';

export default function StaffScreen() {
  const { theme } = useTheme();
  const { colors, spacing, fontSize, fontWeight, radius } = theme;
  const { user: currentUser, refreshUser } = useAuth();
  const insets = useSafeAreaInsets();

  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [staff, setStaff] = useState<User[]>([]);
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<User | null>(null);
  const [staffForm, setStaffForm] = useState({
    name: '', mobile: '', password: '', role: 'STAFF' as User['role'],
  });
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const passwordError = passwordTouched && staffForm.password.length > 0 && staffForm.password.length < 6
    ? 'Password must be at least 6 characters'
    : undefined;

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
    setPasswordTouched(false);
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

    // Safely prevent invalid API requests if password length < 6
    if (staffForm.password.length < 6) {
      return;
    }

    setActionLoading('saveStaff');
    try {
      if (editingStaff) {
        await authService.updateUser(editingStaff.id, { ...staffForm, mobile: cleanMobile });
        if (editingStaff.id === currentUser?.id) {
          await refreshUser();
        }
        Alert.alert('Success', 'Staff updated successfully');
      } else {
        await authService.createUser({ ...staffForm, mobile: cleanMobile });
        Alert.alert('Success', 'Staff added successfully');
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
    Alert.alert('Delete', `Are you sure you want to delete ${user.name} permanently? This action cannot be undone.`, [
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

  const activeCount = staff.filter(u => u.isActive).length;

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Header title="Staff Directory" showBack />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <Header 
        title="Staff Storage" 
        subtitle={`Welcome, ${currentUser?.name || 'Admin'} · ${activeCount}/4 active`} 
        showBack 
        rightAction={
          currentUser?.role === 'TENANT_ADMIN' && activeCount < 4 && (
            <TouchableOpacity onPress={() => openStaffModal()} style={{ padding: 4 }}>
              <UserPlus size={20} color={colors.primary} />
            </TouchableOpacity>
          )
        }
      />

      <ScrollView 
        contentContainerStyle={{ 
          padding: spacing.base,
          paddingBottom: insets.bottom + 40 
        }}
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
                <TouchableOpacity 
                  onPress={() => openStaffModal(u)} 
                  disabled={currentUser?.role === 'STAFF'}
                  style={{ padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.backgroundSecondary, opacity: currentUser?.role === 'STAFF' ? 0.5 : 1 }}
                >
                  <Edit3 size={16} color={colors.primary} />
                </TouchableOpacity>
                {u.id !== currentUser?.id && (
                  <TouchableOpacity 
                    onPress={() => handleDeleteStaff(u)} 
                    disabled={currentUser?.role === 'STAFF'}
                    style={{ padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.errorBg, opacity: currentUser?.role === 'STAFF' ? 0.5 : 1 }}
                  >
                    <Trash2 size={16} color={colors.error} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <Modal visible={staffModalOpen} animationType="slide" transparent statusBarTranslucent>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
        >
          <View style={{ 
            backgroundColor: colors.surface, 
            borderTopLeftRadius: radius.xl, 
            borderTopRightRadius: radius.xl, 
            maxHeight: '90%'
          }}>
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: spacing.xl,
              paddingBottom: spacing.sm,
              borderBottomWidth: 1,
              borderBottomColor: colors.divider
            }}>
              <Text style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold as any, color: colors.textPrimary }}>
                {editingStaff ? 'Update User' : 'New User'}
              </Text>
              <TouchableOpacity onPress={() => setStaffModalOpen(false)} style={{ padding: spacing.sm }}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ 
                padding: spacing.xl,
                paddingBottom: Platform.OS === 'android' ? 120 : insets.bottom + spacing.xl 
              }}
            >
              <View style={{ gap: spacing.md }}>
                <Input
                  label="Name"
                  placeholder="User Name"
                  value={staffForm.name}
                  onChangeText={v => setStaffForm(p => ({ ...p, name: v }))}
                  editable={!editingStaff || currentUser?.role === 'SUPER_ADMIN'}
                  style={{ opacity: (editingStaff && currentUser?.role !== 'SUPER_ADMIN') ? 0.6 : 1 }}
                />
                <Input
                  label="Mobile Number"
                  placeholder="10-digit mobile number"
                  value={staffForm.mobile}
                  onChangeText={v => setStaffForm(p => ({ ...p, mobile: v.replace(/\D/g, "") }))}
                  keyboardType="numeric"
                  maxLength={10}
                  editable={!editingStaff || currentUser?.role === 'SUPER_ADMIN'}
                  style={{ opacity: (editingStaff && currentUser?.role !== 'SUPER_ADMIN') ? 0.6 : 1 }}
                />
                <Input
                  label="Password"
                  placeholder="••••••••"
                  value={staffForm.password}
                  onChangeText={v => {
                    setPasswordTouched(true);
                    setStaffForm(p => ({ ...p, password: v }));
                  }}
                  secureTextEntry
                  error={passwordError}
                />
                
                {!editingStaff && (
                  <View>
                    <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semiBold as any, color: colors.textPrimary, marginBottom: spacing.xs }}>Role</Text>
                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                      <View style={{ flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.primaryMuted, alignItems: 'center' }}>
                        <Text style={{ color: colors.primary, fontWeight: fontWeight.bold as any }}>STAFF</Text>
                      </View>
                    </View>
                  </View>
                )}

                {editingStaff && currentUser?.role === 'SUPER_ADMIN' && (
                  <View>
                    <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semiBold as any, color: colors.textPrimary, marginBottom: spacing.xs }}>Role</Text>
                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                      {['STAFF', 'TENANT_ADMIN'].map(r => (
                        <TouchableOpacity key={r} onPress={() => setStaffForm(p => ({ ...p, role: r as any }))} style={{ flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1.5, borderColor: staffForm.role === r ? colors.primary : colors.divider, backgroundColor: staffForm.role === r ? colors.primaryMuted : 'transparent', alignItems: 'center' }}>
                          <Text style={{ color: staffForm.role === r ? colors.primary : colors.textSecondary, fontWeight: fontWeight.bold as any }}>{r === 'TENANT_ADMIN' ? 'ADMIN' : r}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                <Button 
                  label={editingStaff ? 'Update User' : 'Register User'} 
                  fullWidth 
                  size="lg" 
                  onPress={handleSaveStaff} 
                  loading={actionLoading === 'saveStaff'} 
                  disabled={staffForm.password.length < 6}
                  style={{ marginTop: spacing.md }} 
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
