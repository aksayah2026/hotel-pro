import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Box, Package, Calendar, AlertCircle } from 'lucide-react-native';
import { useTheme } from '../theme';
import { Card } from './Card';

interface SubscriptionCardProps {
  planName: string;
  status: 'ACTIVE' | 'EXPIRED' | 'INACTIVE';
  expiryDate?: string;
  onRenew?: () => void;
}

export const SubscriptionCard = ({ planName, status, expiryDate, onRenew }: SubscriptionCardProps) => {
  const { theme } = useTheme();
  const { colors, spacing, fontSize, fontWeight, radius } = theme;

  const getStatusColor = () => {
    switch (status) {
      case 'ACTIVE': return colors.success;
      case 'EXPIRED': return colors.error;
      case 'INACTIVE': return colors.textMuted;
      default: return colors.textMuted;
    }
  };

  const getStatusBg = () => {
    switch (status) {
      case 'ACTIVE': return colors.success + '15';
      case 'EXPIRED': return colors.error + '15';
      case 'INACTIVE': return colors.surface;
      default: return colors.surface;
    }
  };

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Package size={18} color={colors.primary} />
          <Text style={[styles.title, { fontSize: fontSize.md, fontWeight: fontWeight.bold as any, color: colors.textPrimary }]}>
            Subscription Details
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: getStatusBg() }]}>
          <Text style={[styles.badgeText, { color: getStatusColor(), fontWeight: fontWeight.bold as any }]}>
            {status}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.row}>
          <Text style={[styles.label, { fontSize: fontSize.xs, color: colors.textMuted }]}>PLAN</Text>
          <Text style={[styles.value, { fontSize: fontSize.sm, fontWeight: fontWeight.semiBold as any, color: colors.textPrimary }]}>
            {planName || 'No Plan'}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={[styles.label, { fontSize: fontSize.xs, color: colors.textMuted }]}>EXPIRY</Text>
          <Text style={[styles.value, { fontSize: fontSize.sm, fontWeight: fontWeight.semiBold as any, color: colors.textPrimary }]}>
            {expiryDate ? new Date(expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
          </Text>
        </View>
      </View>

      {status === 'EXPIRED' && (
        <View style={[styles.alert, { backgroundColor: colors.error + '10', borderRadius: radius.md }]}>
          <AlertCircle size={16} color={colors.error} />
          <Text style={[styles.alertText, { color: colors.error, fontSize: fontSize.xs }]}>
            Your subscription has expired. Please renew.
          </Text>
        </View>
      )}

      {status === 'INACTIVE' && (
        <View style={[styles.alert, { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.divider }]}>
          <AlertCircle size={16} color={colors.textMuted} />
          <Text style={[styles.alertText, { color: colors.textMuted, fontSize: fontSize.xs }]}>
            No active subscription
          </Text>
        </View>
      )}

      <TouchableOpacity 
        onPress={() => Linking.openURL('tel:0000000000')}
        style={[styles.button, { backgroundColor: colors.primary, borderRadius: radius.md }]}
      >
        <Text style={[styles.buttonText, { color: colors.textOnPrimary, fontWeight: fontWeight.bold as any, fontSize: fontSize.sm }]}>
          Contact Admin / Renew
        </Text>
      </TouchableOpacity>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {},
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  row: {
    gap: 2,
  },
  label: {
    letterSpacing: 1,
  },
  value: {},
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    marginBottom: 16,
  },
  alertText: {
    fontWeight: '500',
  },
  button: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {},
});
