import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../theme';

type BadgeVariant = 'available' | 'occupied' | 'cleaning' | 'maintenance' |
                   'booked' | 'checked_in' | 'completed' | 'cancelled' |
                   'paid' | 'partial' | 'pending' | 'default';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'default', size = 'sm' }) => {
  const { theme } = useTheme();
  const { colors, spacing, radius, fontSize, fontWeight } = theme;

  const colorMap: Record<BadgeVariant, { bg: string; text: string }> = {
    available:   { bg: colors.success,       text: colors.textOnPrimary },
    occupied:    { bg: colors.warning,       text: colors.textOnPrimary },
    cleaning:    { bg: colors.info,          text: colors.textOnPrimary },
    maintenance: { bg: colors.error,         text: colors.textOnPrimary },
    booked:      { bg: colors.primary,       text: colors.textOnPrimary },
    checked_in:  { bg: colors.accent,        text: colors.textOnPrimary },
    completed:   { bg: colors.success,       text: colors.textOnPrimary },
    cancelled:   { bg: colors.error,         text: colors.textOnPrimary },
    paid:        { bg: colors.paid,          text: colors.textOnPrimary },
    partial:     { bg: colors.warning,       text: colors.textOnPrimary },
    pending:     { bg: colors.error,         text: colors.textOnPrimary },
    default:     { bg: colors.neutral,       text: colors.textOnPrimary },
  };

  const { bg, text } = colorMap[variant] ?? colorMap.default;
  const padH = size === 'sm' ? spacing.sm : spacing.md;
  const padV = size === 'sm' ? 3 : spacing.xs;
  const fSize = size === 'sm' ? fontSize.xs : fontSize.sm;

  return (
    <View style={{
      backgroundColor: bg,
      borderRadius: radius.full,
      paddingHorizontal: padH,
      paddingVertical: padV,
      alignSelf: 'flex-start',
    }}>
      <Text style={{
        color: text,
        fontSize: fSize,
        fontWeight: fontWeight.bold as any,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
      }}>
        {label.replace(/_/g, ' ')}
      </Text>
    </View>
  );
};

// Helper to map status strings to variant
export const statusVariant = (status: string): BadgeVariant => {
  const map: Record<string, BadgeVariant> = {
    AVAILABLE: 'available', OCCUPIED: 'occupied', CLEANING: 'cleaning',
    MAINTENANCE: 'maintenance', BOOKED: 'booked', CHECKED_IN: 'checked_in',
    COMPLETED: 'completed', CANCELLED: 'cancelled',
    PAID: 'paid', PARTIAL: 'partial', PENDING: 'pending',
  };
  return map[status] ?? 'default';
};
