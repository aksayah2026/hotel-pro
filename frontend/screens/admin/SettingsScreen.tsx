import React from 'react';
import {
  View, Text, ScrollView, StatusBar, TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, Settings, Users, ShieldCheck } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { SubscriptionCard } from '../../components/SubscriptionCard';

export default function SettingsScreen() {
  const { theme } = useTheme();
  const { colors, spacing, fontSize, fontWeight, radius } = theme;
  const { user, subscriptionStatus, expiryDate, planName, isAdmin, isSuperAdmin } = useAuth();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    if (!isAdmin) {
      navigation.replace('Main', { screen: 'Dashboard' });
    }
  }, [isAdmin]);

  if (!isAdmin) return null;

  const getRoleLabel = () => {
    if (isSuperAdmin) return 'Master Control Unit';
    if (user?.role === 'TENANT_ADMIN') return 'Hotel Administrator';
    return 'Hotel Staff';
  };

  const menuItems = [
    {
      title: 'Hotel Configuration',
      subtitle: 'Manage room types and amenities',
      icon: Settings,
      color: colors.primary,
      onPress: () => navigation.navigate('Config'),
    },
    {
      title: 'Staff Directory',
      subtitle: 'Onboard and manage team members',
      icon: Users,
      color: colors.info,
      onPress: () => navigation.navigate('Staff'),
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <Header 
        title="Control Panel" 
        subtitle={`Welcome, ${user?.name || 'Admin'}`} 
        showBack 
      />

      <ScrollView contentContainerStyle={{ 
        padding: spacing.base, 
        gap: spacing.base,
        paddingBottom: insets.bottom + 40
      }}>
        <View style={{ 
          backgroundColor: colors.primary + '10', 
          padding: spacing.xl, 
          borderRadius: radius.xl, 
          flexDirection: 'row', 
          alignItems: 'center', 
          gap: spacing.md,
          marginBottom: spacing.sm
        }}>
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' }}>
            <ShieldCheck size={28} color={colors.textOnPrimary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold as any, color: colors.textPrimary }}>Welcome, {user?.name}</Text>
            <Text style={{ fontSize: fontSize.sm, color: colors.textMuted }}>{getRoleLabel()}</Text>
          </View>
        </View>

        {/* SUBSCRIPTION CARD (Only for Tenant Admins) */}
        {!isSuperAdmin && isAdmin && (
          <SubscriptionCard 
            planName={planName || 'Standard Plan'} 
            status={subscriptionStatus || 'INACTIVE'} 
            expiryDate={expiryDate || undefined}
          />
        )}

        {menuItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <TouchableOpacity key={idx} activeOpacity={0.7} onPress={item.onPress}>
              <Card padding={spacing.md} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <View style={{ width: 44, height: 44, borderRadius: radius.md, backgroundColor: item.color + '20', justifyContent: 'center', alignItems: 'center' }}>
                    <Icon size={22} color={item.color} />
                  </View>
                  <View>
                    <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold as any, color: colors.textPrimary }}>{item.title}</Text>
                    <Text style={{ fontSize: fontSize.xs, color: colors.textMuted }}>{item.subtitle}</Text>
                  </View>
                </View>
                <ChevronRight size={20} color={colors.divider} />
              </Card>
            </TouchableOpacity>
          );
        })}

        <View style={{ marginTop: spacing['3xl'], alignItems: 'center', opacity: 0.4 }}>
            <Text style={{ fontSize: fontSize.xs, color: colors.textMuted }}>Hotel Management System v1.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}
