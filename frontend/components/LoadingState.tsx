import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useTheme } from '../theme';

interface LoadingProps { message?: string; }

export const Loading: React.FC<LoadingProps> = ({ message = 'Loading...' }) => {
  const { theme } = useTheme();
  const { colors, spacing, fontSize } = theme;
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, gap: spacing.md }}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={{ fontSize: fontSize.sm, color: colors.textMuted }}>{message}</Text>
    </View>
  );
};

interface EmptyStateProps { icon?: React.ReactNode; title: string; message?: string; action?: React.ReactNode; }

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, message, action }) => {
  const { theme } = useTheme();
  const { colors, spacing, fontSize, fontWeight } = theme;
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing['2xl'], gap: spacing.md }}>
      {icon && <View style={{ opacity: 0.4 }}>{icon}</View>}
      <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold as any, color: colors.textPrimary, textAlign: 'center' }}>
        {title}
      </Text>
      {message && (
        <Text style={{ fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', lineHeight: 20 }}>
          {message}
        </Text>
      )}
      {action}
    </View>
  );
};
