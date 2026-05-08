import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, RefreshControl, StatusBar,
  ActivityIndicator, Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Bell, Check, Trash2, ArrowLeft, Calendar, Key, LogOut, XCircle } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { notificationService, Notification } from '../../services/notificationService';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/LoadingState';

export default function NotificationScreen() {
  const { theme } = useTheme();
  const { colors, spacing, fontSize, fontWeight, radius } = theme;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async (isRef = false) => {
    if (isRef) setRefreshing(true);
    try {
      const res = await notificationService.getAll(1, 50);
      setNotifications(res.data.data);
      setUnreadCount(res.data.unreadCount || 0);
    } catch {
      Alert.alert('Error', 'Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [])
  );

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
      if (unreadCount > 0) setUnreadCount(p => p - 1);
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      Alert.alert('Error', 'Failed to mark all as read');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'NEW_BOOKING':
        return <Calendar size={18} color={colors.primary} />;
      case 'GUEST_CHECK_IN':
        return <Key size={18} color={colors.success} />;
      case 'GUEST_CHECK_OUT':
        return <LogOut size={18} color={colors.warning} />;
      case 'BOOKING_CANCELLATION':
        return <XCircle size={18} color={colors.error} />;
      default:
        return <Bell size={18} color={colors.textSecondary} />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'NEW_BOOKING': return colors.primaryLight;
      case 'GUEST_CHECK_IN': return colors.success + '15';
      case 'GUEST_CHECK_OUT': return colors.warning + '15';
      case 'BOOKING_CANCELLATION': return colors.errorBg;
      default: return colors.backgroundSecondary;
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => {
        if (!item.isRead) handleMarkAsRead(item.id);
        // Navigation helper depending on the type
        navigation.navigate('Main', { screen: 'Bookings' });
      }}
    >
      <Card
        style={{
          marginBottom: spacing.xs,
          borderLeftWidth: 4,
          borderLeftColor: item.isRead ? 'transparent' : colors.primary,
          backgroundColor: item.isRead ? colors.surface : colors.primary + '05',
        }}
        padding={spacing.base}
      >
        <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' }}>
          <View style={{
            width: 40, height: 40, borderRadius: radius.full,
            backgroundColor: getTypeColor(item.type),
            justifyContent: 'center', alignItems: 'center'
          }}>
            {getTypeIcon(item.type)}
          </View>

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{
                fontSize: fontSize.sm,
                fontWeight: item.isRead ? fontWeight.medium as any : fontWeight.bold as any,
                color: colors.textPrimary,
                flex: 1, marginRight: spacing.xs
              }}>
                {item.title}
              </Text>
              {!item.isRead && (
                <View style={{
                  width: 8, height: 8, borderRadius: 4,
                  backgroundColor: colors.primary
                }} />
              )}
            </View>

            <Text style={{
              fontSize: fontSize.xs, color: colors.textSecondary,
              marginTop: 4, lineHeight: 16
            }}>
              {item.message}
            </Text>

            <Text style={{
              fontSize: fontSize.xs, color: colors.textMuted,
              marginTop: 8
            }}>
              {new Date(item.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
              })}
            </Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: spacing.base,
        paddingTop: insets.top + 10,
        paddingBottom: spacing.md,
        backgroundColor: colors.surface,
        borderBottomWidth: 1, borderBottomColor: colors.divider,
        ...theme.shadow.sm,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
            <ArrowLeft size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <View>
            <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold as any, color: colors.textPrimary }}>
              Notifications
            </Text>
            {unreadCount > 0 && (
              <Text style={{ fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.bold as any }}>
                {unreadCount} unread
              </Text>
            )}
          </View>
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={handleMarkAllAsRead}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 4,
              paddingVertical: 6, paddingHorizontal: spacing.sm,
              borderRadius: radius.md, backgroundColor: colors.primary + '10'
            }}
          >
            <Check size={14} color={colors.primary} />
            <Text style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold as any, color: colors.primary }}>
              Mark all read
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotification}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchNotifications(true)}
              colors={[colors.primary]}
            />
          }
          contentContainerStyle={{
            padding: spacing.base,
            flexGrow: 1
          }}
          ListEmptyComponent={
            <EmptyState
              icon={<Bell size={56} color={colors.textMuted} />}
              title="All caught up!"
              message="No notifications yet. Real-time alerts will appear here."
            />
          }
        />
      )}
    </View>
  );
}
