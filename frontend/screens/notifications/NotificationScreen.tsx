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
  const [activeTab, setActiveTab] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL');

  const fetchNotifications = async (isRef = false) => {
    if (isRef) setRefreshing(true);
    try {
      const res = await notificationService.getAll(1, 100); // Load reasonable chunk for display
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
      Alert.alert("Success", "All notifications marked as read.");
    } catch {
      Alert.alert('Error', 'Failed to mark all as read');
    }
  };

  const handleClearAll = () => {
    if (notifications.length === 0) return;
    Alert.alert(
      "Clear all notifications?",
      "This will permanently remove all your notifications.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Clear", 
          style: "destructive", 
          onPress: async () => {
            try {
              await notificationService.clearAll();
              setNotifications([]);
              setUnreadCount(0);
              Alert.alert("Cleared", "All notifications have been removed.");
            } catch (err) {
              Alert.alert('Error', 'Failed to clear notifications. Please try again.');
            }
          } 
        }
      ]
    );
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

  const filteredNotifications = notifications.filter(item => {
    if (activeTab === 'UNREAD') return !item.isRead;
    if (activeTab === 'READ') return item.isRead;
    return true;
  });

  const renderNotification = ({ item }: { item: Notification }) => {
    const isUnread = !item.isRead;
    const isNewEvent = isUnread && (Date.now() - new Date(item.createdAt).getTime() < 24 * 60 * 60 * 1000);

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => {
          if (isUnread) handleMarkAsRead(item.id);
          navigation.navigate('Main', { screen: 'Bookings' });
        }}
      >
        <Card
          style={{
            marginBottom: spacing.md,
            borderLeftWidth: isUnread ? 4 : 0,
            borderLeftColor: isUnread ? '#5B3FFF' : 'transparent',
            backgroundColor: isUnread ? '#F3F0FF' : colors.surface,
            borderRadius: radius.md,
            borderWidth: isUnread ? 0 : 1,
            borderColor: colors.divider,
            ...theme.shadow.sm,
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
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flex: 1, flexWrap: 'wrap' }}>
                  <Text style={{
                    fontSize: fontSize.sm,
                    fontWeight: isUnread ? fontWeight.bold as any : fontWeight.medium as any,
                    color: colors.textPrimary,
                    marginRight: spacing.xs
                  }}>
                    {item.title}
                  </Text>
                  {isNewEvent && (
                    <Badge label="NEW" variant="booked" size="sm" />
                  )}
                </View>
                {isUnread && (
                  <View style={{
                    width: 10, height: 10, borderRadius: 5,
                    backgroundColor: '#5B3FFF',
                    marginLeft: spacing.xs
                  }} />
                )}
              </View>

              <Text style={{
                fontSize: fontSize.xs, color: isUnread ? colors.textPrimary : colors.textSecondary,
                lineHeight: 18, marginTop: 2,
                fontWeight: isUnread ? '500' as any : '400' as any
              }}>
                {item.message}
              </Text>

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.sm }}>
                <Text style={{
                  fontSize: 11, color: isUnread ? colors.primary : colors.textMuted,
                  fontWeight: isUnread ? fontWeight.bold as any : fontWeight.medium as any
                }}>
                  {new Date(item.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                  })}
                </Text>
              </View>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header Section */}
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

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          {unreadCount > 0 && (
            <TouchableOpacity
              onPress={handleMarkAllAsRead}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                paddingVertical: 6, paddingHorizontal: spacing.sm,
                borderRadius: radius.md, backgroundColor: colors.primary + '12'
              }}
            >
              <Check size={14} color={colors.primary} />
              <Text style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold as any, color: colors.primary }}>
                Read All
              </Text>
            </TouchableOpacity>
          )}
          {notifications.length > 0 && (
            <TouchableOpacity
              onPress={handleClearAll}
              style={{
                padding: 8, borderRadius: radius.md,
                backgroundColor: colors.errorBg,
                justifyContent: 'center', alignItems: 'center'
              }}
            >
              <Trash2 size={16} color={colors.error} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Tab Segment */}
      <View style={{
        flexDirection: 'row',
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.md,
        backgroundColor: colors.surface,
        gap: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider
      }}>
        {(['ALL', 'UNREAD', 'READ'] as const).map((tab) => {
          const isActive = activeTab === tab;
          const count = tab === 'UNREAD' ? unreadCount : tab === 'READ' ? notifications.filter(n => n.isRead).length : notifications.length;
          
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 8,
                paddingHorizontal: spacing.md,
                borderRadius: radius.full,
                backgroundColor: isActive ? '#5B3FFF' : colors.background,
                borderWidth: 1,
                borderColor: isActive ? '#5B3FFF' : colors.divider,
                gap: 6
              }}
            >
              <Text style={{
                fontSize: fontSize.xs,
                fontWeight: fontWeight.bold as any,
                color: isActive ? colors.textOnPrimary : colors.textSecondary
              }}>
                {tab === 'ALL' ? 'All' : tab === 'UNREAD' ? 'Unread' : 'Read'}
              </Text>
              {count > 0 && (
                <View style={{
                  backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : colors.neutral,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: radius.sm
                }}>
                  <Text style={{
                    fontSize: 10,
                    fontWeight: fontWeight.bold as any,
                    color: isActive ? colors.textOnPrimary : colors.textSecondary
                  }}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
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
            paddingBottom: spacing.xl * 2,
            flexGrow: 1
          }}
          ListEmptyComponent={
            <View style={{ flex: 1, justifyContent: 'center', marginTop: spacing.xl }}>
              <EmptyState
                icon={<Bell size={56} color={colors.textMuted} />}
                title={activeTab === 'UNREAD' ? "No unread alerts" : activeTab === 'READ' ? "No read alerts" : "All caught up!"}
                message={activeTab === 'UNREAD' 
                  ? "You have read all your recent notifications." 
                  : "Notifications and event alerts will appear here."}
              />
            </View>
          }
        />
      )}
    </View>
  );
}
